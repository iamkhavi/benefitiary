/**
 * Tests for AuditLogger class
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PrismaClient, AuditAction } from '@prisma/client';
import { AuditLogger } from '../audit-logger';
import { BatchOperationResult } from '../database-writer';

// Mock Prisma Client
const mockPrisma = {
  auditLog: {
    create: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    deleteMany: vi.fn()
  },
  $queryRaw: vi.fn()
} as unknown as PrismaClient;

describe('AuditLogger', () => {
  let auditLogger: AuditLogger;

  beforeEach(() => {
    auditLogger = new AuditLogger(mockPrisma);
    vi.clearAllMocks();
  });

  describe('logBatchOperation', () => {
    it('should log batch operation results', async () => {
      const mockResult: BatchOperationResult = {
        totalProcessed: 10,
        inserted: 8,
        updated: 2,
        skipped: 0,
        errors: [],
        duplicatesFound: 1,
        processingTime: 5000
      };

      mockPrisma.auditLog.create = vi.fn().mockResolvedValue({});

      await auditLogger.logBatchOperation('job-123', mockResult);

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          action: 'SCRAPE_EXECUTED',
          entityType: 'scrape_job',
          entityId: 'job-123',
          metadata: {
            totalProcessed: 10,
            inserted: 8,
            updated: 2,
            skipped: 0,
            duplicatesFound: 1,
            processingTime: 5000,
            errorCount: 0,
            errors: []
          }
        }
      });
    });

    it('should log batch operation with errors', async () => {
      const mockResult: BatchOperationResult = {
        totalProcessed: 5,
        inserted: 3,
        updated: 0,
        skipped: 2,
        errors: [
          {
            type: 'NETWORK',
            message: 'Connection timeout',
            timestamp: new Date('2024-01-01T10:00:00Z')
          },
          {
            type: 'PARSING',
            message: 'Invalid HTML structure',
            timestamp: new Date('2024-01-01T10:01:00Z')
          }
        ],
        duplicatesFound: 0,
        processingTime: 3000
      };

      mockPrisma.auditLog.create = vi.fn().mockResolvedValue({});

      await auditLogger.logBatchOperation('job-456', mockResult);

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          action: 'SCRAPE_EXECUTED',
          entityType: 'scrape_job',
          entityId: 'job-456',
          metadata: {
            totalProcessed: 5,
            inserted: 3,
            updated: 0,
            skipped: 2,
            duplicatesFound: 0,
            processingTime: 3000,
            errorCount: 2,
            errors: [
              {
                type: 'NETWORK',
                message: 'Connection timeout',
                timestamp: new Date('2024-01-01T10:00:00Z')
              },
              {
                type: 'PARSING',
                message: 'Invalid HTML structure',
                timestamp: new Date('2024-01-01T10:01:00Z')
              }
            ]
          }
        }
      });
    });

    it('should work with transaction context', async () => {
      const mockResult: BatchOperationResult = {
        totalProcessed: 1,
        inserted: 1,
        updated: 0,
        skipped: 0,
        errors: [],
        duplicatesFound: 0,
        processingTime: 1000
      };

      const mockTx = {
        auditLog: {
          create: vi.fn().mockResolvedValue({})
        }
      };

      await auditLogger.logBatchOperation('job-789', mockResult, mockTx);

      expect(mockTx.auditLog.create).toHaveBeenCalled();
      expect(mockPrisma.auditLog.create).not.toHaveBeenCalled();
    });
  });

  describe('logGrantProcessing', () => {
    it('should log grant insertion', async () => {
      mockPrisma.auditLog.create = vi.fn().mockResolvedValue({});

      await auditLogger.logGrantProcessing(
        'job-123',
        'Test Grant Title',
        'insert',
        'grant-456'
      );

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          action: 'GRANT_SAVED',
          entityType: 'grant',
          entityId: 'grant-456',
          metadata: {
            jobId: 'job-123',
            grantTitle: 'Test Grant Title',
            processingAction: 'insert',
            timestamp: expect.any(String)
          }
        }
      });
    });

    it('should log grant update', async () => {
      mockPrisma.auditLog.create = vi.fn().mockResolvedValue({});

      await auditLogger.logGrantProcessing(
        'job-123',
        'Updated Grant Title',
        'update',
        'grant-789'
      );

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          action: 'PROFILE_UPDATED',
          entityType: 'grant',
          entityId: 'grant-789',
          metadata: {
            jobId: 'job-123',
            grantTitle: 'Updated Grant Title',
            processingAction: 'update',
            timestamp: expect.any(String)
          }
        }
      });
    });

    it('should log grant skip', async () => {
      mockPrisma.auditLog.create = vi.fn().mockResolvedValue({});

      await auditLogger.logGrantProcessing(
        'job-123',
        'Skipped Grant Title',
        'skip'
      );

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          action: 'SCRAPE_EXECUTED',
          entityType: 'grant',
          entityId: undefined,
          metadata: {
            jobId: 'job-123',
            grantTitle: 'Skipped Grant Title',
            processingAction: 'skip',
            timestamp: expect.any(String)
          }
        }
      });
    });
  });

  describe('logGrantUpdate', () => {
    it('should log grant field updates', async () => {
      const updatedFields = {
        title: 'New Title',
        deadline: new Date('2025-01-01'),
        fundingAmountMax: 75000
      };

      mockPrisma.auditLog.create = vi.fn().mockResolvedValue({});

      await auditLogger.logGrantUpdate(
        'grant-123',
        'Content changed during scraping',
        updatedFields
      );

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          action: 'PROFILE_UPDATED',
          entityType: 'grant',
          entityId: 'grant-123',
          metadata: {
            reason: 'Content changed during scraping',
            updatedFields: ['title', 'deadline', 'fundingAmountMax'],
            fieldValues: updatedFields,
            timestamp: expect.any(String)
          }
        }
      });
    });
  });

  describe('logScrapeJobEvent', () => {
    it('should log job started event', async () => {
      mockPrisma.auditLog.create = vi.fn().mockResolvedValue({});

      await auditLogger.logScrapeJobEvent(
        'job-123',
        'started',
        { sourceId: 'source-456' }
      );

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          action: 'SCRAPE_EXECUTED',
          entityType: 'scrape_job',
          entityId: 'job-123',
          metadata: {
            event: 'started',
            timestamp: expect.any(String),
            sourceId: 'source-456'
          }
        }
      });
    });

    it('should log job completed event', async () => {
      mockPrisma.auditLog.create = vi.fn().mockResolvedValue({});

      await auditLogger.logScrapeJobEvent(
        'job-123',
        'completed',
        { grantsFound: 25, duration: 30000 }
      );

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          action: 'SCRAPE_EXECUTED',
          entityType: 'scrape_job',
          entityId: 'job-123',
          metadata: {
            event: 'completed',
            timestamp: expect.any(String),
            grantsFound: 25,
            duration: 30000
          }
        }
      });
    });

    it('should log job failed event', async () => {
      mockPrisma.auditLog.create = vi.fn().mockResolvedValue({});

      await auditLogger.logScrapeJobEvent(
        'job-123',
        'failed',
        { error: 'Network timeout', retryCount: 3 }
      );

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          action: 'SCRAPE_EXECUTED',
          entityType: 'scrape_job',
          entityId: 'job-123',
          metadata: {
            event: 'failed',
            timestamp: expect.any(String),
            error: 'Network timeout',
            retryCount: 3
          }
        }
      });
    });
  });

  describe('logDuplicateDetection', () => {
    it('should log duplicate merge event', async () => {
      mockPrisma.auditLog.create = vi.fn().mockResolvedValue({});

      await auditLogger.logDuplicateDetection(
        'original-grant-123',
        'Duplicate Grant Title',
        'merged',
        0.95
      );

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          action: 'SCRAPE_EXECUTED',
          entityType: 'grant_duplicate',
          entityId: 'original-grant-123',
          metadata: {
            duplicateTitle: 'Duplicate Grant Title',
            deduplicationAction: 'merged',
            confidence: 0.95,
            timestamp: expect.any(String)
          }
        }
      });
    });

    it('should log duplicate skip event', async () => {
      mockPrisma.auditLog.create = vi.fn().mockResolvedValue({});

      await auditLogger.logDuplicateDetection(
        'original-grant-456',
        'Similar Grant Title',
        'skipped',
        0.87
      );

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          action: 'SCRAPE_EXECUTED',
          entityType: 'grant_duplicate',
          entityId: 'original-grant-456',
          metadata: {
            duplicateTitle: 'Similar Grant Title',
            deduplicationAction: 'skipped',
            confidence: 0.87,
            timestamp: expect.any(String)
          }
        }
      });
    });
  });

  describe('logContentChange', () => {
    it('should log content changes', async () => {
      mockPrisma.auditLog.create = vi.fn().mockResolvedValue({});

      await auditLogger.logContentChange(
        'grant-123',
        ['title', 'deadline', 'fundingAmountMax'],
        'critical',
        'old-hash-abc123',
        'new-hash-def456'
      );

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          action: 'PROFILE_UPDATED',
          entityType: 'grant_content_change',
          entityId: 'grant-123',
          metadata: {
            changedFields: ['title', 'deadline', 'fundingAmountMax'],
            changeType: 'critical',
            previousHash: 'old-hash-abc123',
            newHash: 'new-hash-def456',
            timestamp: expect.any(String)
          }
        }
      });
    });
  });

  describe('logDatabaseError', () => {
    it('should log database errors', async () => {
      const error = new Error('Connection timeout');
      error.stack = 'Error: Connection timeout\n    at Database.connect';

      mockPrisma.auditLog.create = vi.fn().mockResolvedValue({});

      await auditLogger.logDatabaseError(
        'batch_insert',
        error,
        { batchSize: 100, sourceId: 'source-123' }
      );

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          action: 'SCRAPE_EXECUTED',
          entityType: 'database_error',
          metadata: {
            operation: 'batch_insert',
            errorMessage: 'Connection timeout',
            errorStack: 'Error: Connection timeout\n    at Database.connect',
            context: { batchSize: 100, sourceId: 'source-123' },
            timestamp: expect.any(String)
          }
        }
      });
    });

    it('should handle audit logging failures gracefully', async () => {
      const error = new Error('Original error');
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      mockPrisma.auditLog.create = vi.fn().mockRejectedValue(new Error('Audit log failed'));

      await auditLogger.logDatabaseError('test_operation', error);

      expect(consoleSpy).toHaveBeenCalledWith('Failed to log database error to audit log:', expect.any(Error));
      expect(consoleSpy).toHaveBeenCalledWith('Original error:', error);

      consoleSpy.mockRestore();
    });
  });

  describe('logSourceConfigChange', () => {
    it('should log source configuration changes', async () => {
      const changes = {
        frequency: 'DAILY',
        rateLimit: { requestsPerMinute: 30 },
        selectors: { title: '.new-title-selector' }
      };

      mockPrisma.auditLog.create = vi.fn().mockResolvedValue({});

      await auditLogger.logSourceConfigChange(
        'source-123',
        changes,
        'user-456'
      );

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-456',
          action: 'PROFILE_UPDATED',
          entityType: 'scraped_source',
          entityId: 'source-123',
          metadata: {
            configChanges: changes,
            timestamp: expect.any(String)
          }
        }
      });
    });
  });

  describe('logPerformanceMetrics', () => {
    it('should log performance metrics', async () => {
      const metrics = {
        duration: 5000,
        recordsProcessed: 100,
        memoryUsage: 256,
        cpuUsage: 75
      };

      mockPrisma.auditLog.create = vi.fn().mockResolvedValue({});

      await auditLogger.logPerformanceMetrics('batch_processing', metrics);

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          action: 'SCRAPE_EXECUTED',
          entityType: 'performance_metrics',
          metadata: {
            operation: 'batch_processing',
            duration: 5000,
            recordsProcessed: 100,
            memoryUsage: 256,
            cpuUsage: 75,
            timestamp: expect.any(String)
          }
        }
      });
    });
  });

  describe('getEntityAuditLogs', () => {
    it('should retrieve audit logs for specific entity', async () => {
      const mockLogs = [
        { id: 'log-1', action: 'GRANT_SAVED', createdAt: new Date() },
        { id: 'log-2', action: 'PROFILE_UPDATED', createdAt: new Date() }
      ];

      mockPrisma.auditLog.findMany = vi.fn().mockResolvedValue(mockLogs);

      const logs = await auditLogger.getEntityAuditLogs('grant', 'grant-123', 25);

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith({
        where: {
          entityType: 'grant',
          entityId: 'grant-123'
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 25
      });

      expect(logs).toEqual(mockLogs);
    });
  });

  describe('getRecentScrapingActivity', () => {
    it('should retrieve recent scraping activity', async () => {
      const mockActivity = [
        { id: 'log-1', action: 'SCRAPE_EXECUTED', createdAt: new Date() },
        { id: 'log-2', action: 'SCRAPE_EXECUTED', createdAt: new Date() }
      ];

      mockPrisma.auditLog.findMany = vi.fn().mockResolvedValue(mockActivity);

      const activity = await auditLogger.getRecentScrapingActivity(12, 50);

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith({
        where: {
          action: 'SCRAPE_EXECUTED',
          createdAt: { gte: expect.any(Date) }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 50
      });

      expect(activity).toEqual(mockActivity);
    });
  });

  describe('getAuditStatistics', () => {
    it('should return comprehensive audit statistics', async () => {
      // Mock count queries
      mockPrisma.auditLog.count = vi.fn()
        .mockResolvedValueOnce(150) // total events
        .mockResolvedValueOnce(75)  // scrape events
        .mockResolvedValueOnce(50)  // grant events
        .mockResolvedValueOnce(5);  // error events

      // Mock daily events query
      mockPrisma.$queryRaw = vi.fn().mockResolvedValue([
        { date: '2024-01-03', count: BigInt(25) },
        { date: '2024-01-02', count: BigInt(30) },
        { date: '2024-01-01', count: BigInt(20) }
      ]);

      const stats = await auditLogger.getAuditStatistics(3);

      expect(stats).toEqual({
        totalEvents: 150,
        scrapeEvents: 75,
        grantEvents: 50,
        errorEvents: 5,
        eventsByDay: [
          { date: '2024-01-03', count: 25 },
          { date: '2024-01-02', count: 30 },
          { date: '2024-01-01', count: 20 }
        ]
      });
    });
  });

  describe('cleanupOldLogs', () => {
    it('should delete old audit logs and log the cleanup', async () => {
      mockPrisma.auditLog.deleteMany = vi.fn().mockResolvedValue({ count: 500 });
      mockPrisma.auditLog.create = vi.fn().mockResolvedValue({});

      const deletedCount = await auditLogger.cleanupOldLogs(60);

      expect(deletedCount).toBe(500);
      expect(mockPrisma.auditLog.deleteMany).toHaveBeenCalledWith({
        where: {
          createdAt: { lt: expect.any(Date) }
        }
      });

      // Should log the cleanup operation
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          action: 'SCRAPE_EXECUTED',
          entityType: 'performance_metrics',
          metadata: {
            operation: 'audit_log_cleanup',
            duration: 0,
            recordsProcessed: 500,
            timestamp: expect.any(String)
          }
        }
      });
    });
  });

  describe('createAuditLog', () => {
    it('should create generic audit log entry', async () => {
      const entry = {
        userId: 'user-123',
        action: 'LOGIN' as AuditAction,
        entityType: 'user_session',
        entityId: 'session-456',
        metadata: { loginMethod: 'oauth' },
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...'
      };

      mockPrisma.auditLog.create = vi.fn().mockResolvedValue({});

      await auditLogger.createAuditLog(entry);

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: entry
      });
    });
  });
});