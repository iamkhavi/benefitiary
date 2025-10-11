/**
 * Tests for DatabaseWriter class
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { DatabaseWriter, DatabaseWriterConfig } from '../database-writer';
import { ProcessedGrantData, GrantCategory, ScrapedSourceType } from '../../types';

// Mock the dependencies
vi.mock('../content-hasher', () => ({
  ContentHasher: vi.fn().mockImplementation(() => ({
    generateHash: vi.fn().mockReturnValue('mock-hash-123'),
    identifyChangedFields: vi.fn().mockReturnValue([])
  }))
}));

vi.mock('../audit-logger', () => ({
  AuditLogger: vi.fn().mockImplementation(() => ({
    logBatchOperation: vi.fn().mockResolvedValue(undefined),
    logGrantProcessing: vi.fn().mockResolvedValue(undefined),
    logGrantUpdate: vi.fn().mockResolvedValue(undefined)
  }))
}));

vi.mock('../deduplication-engine', () => ({
  DeduplicationEngine: vi.fn().mockImplementation(() => ({
    checkForDuplicates: vi.fn().mockResolvedValue({
      isDuplicate: false,
      action: 'insert',
      confidence: 0.0,
      reason: 'No duplicates found'
    })
  }))
}));

// Mock Prisma Client
const mockPrisma = {
  $transaction: vi.fn(),
  grant: {
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn()
  },
  funder: {
    findFirst: vi.fn(),
    create: vi.fn(),
    count: vi.fn()
  },
  grantTag: {
    createMany: vi.fn(),
    deleteMany: vi.fn()
  },
  scrapeJob: {
    update: vi.fn(),
    findMany: vi.fn()
  },
  auditLog: {
    create: vi.fn(),
    deleteMany: vi.fn()
  }
} as unknown as PrismaClient;

describe('DatabaseWriter', () => {
  let databaseWriter: DatabaseWriter;
  let mockConfig: DatabaseWriterConfig;

  beforeEach(() => {
    mockConfig = {
      batchSize: 2, // Small batch size for testing
      enableDeduplication: true,
      enableAuditLogging: true,
      transactionTimeout: 5000
    };

    databaseWriter = new DatabaseWriter(mockPrisma, mockConfig);

    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('batchInsertGrants', () => {
    it('should successfully insert grants in batches', async () => {
      const mockGrants: ProcessedGrantData[] = [
        createMockGrant('Grant 1'),
        createMockGrant('Grant 2'),
        createMockGrant('Grant 3')
      ];

      const mockFunder = { id: 'funder-1', name: 'Test Funder' };
      const mockCreatedGrant = { id: 'grant-1', title: 'Grant 1' };

      // Mock transaction behavior
      mockPrisma.$transaction = vi.fn().mockImplementation(async (callback) => {
        return await callback({
          grant: {
            create: vi.fn().mockResolvedValue(mockCreatedGrant)
          },
          funder: {
            findFirst: vi.fn().mockResolvedValue(mockFunder)
          },
          grantTag: {
            createMany: vi.fn().mockResolvedValue({ count: 2 })
          }
        });
      });

      const result = await databaseWriter.batchInsertGrants(
        mockGrants,
        'source-1',
        'job-1'
      );

      expect(result.totalProcessed).toBe(3);
      expect(result.inserted).toBe(3);
      expect(result.updated).toBe(0);
      expect(result.skipped).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should handle deduplication when enabled', async () => {
      const mockGrants: ProcessedGrantData[] = [
        createMockGrant('Duplicate Grant')
      ];

      // Override the mock to return duplicate found
      const mockDeduplicationEngine = {
        checkForDuplicates: vi.fn().mockResolvedValue({
          isDuplicate: true,
          action: 'skip',
          existingGrantId: 'existing-grant-1',
          confidence: 0.95,
          reason: 'Exact match found'
        })
      };

      // Replace the deduplication engine in the database writer
      (databaseWriter as any).deduplicationEngine = mockDeduplicationEngine;

      // Mock transaction
      mockPrisma.$transaction = vi.fn().mockImplementation(async (callback) => {
        return await callback({
          grant: { create: vi.fn() },
          funder: { findFirst: vi.fn() },
          grantTag: { createMany: vi.fn() }
        });
      });

      const result = await databaseWriter.batchInsertGrants(
        mockGrants,
        'source-1',
        'job-1'
      );

      expect(result.totalProcessed).toBe(1);
      expect(result.skipped).toBe(1);
      expect(result.duplicatesFound).toBe(1);
    });

    it('should handle database errors gracefully', async () => {
      const mockGrants: ProcessedGrantData[] = [
        createMockGrant('Error Grant')
      ];

      // Mock transaction to throw error
      mockPrisma.$transaction = vi.fn().mockRejectedValue(
        new Error('Database connection failed')
      );

      const result = await databaseWriter.batchInsertGrants(
        mockGrants,
        'source-1',
        'job-1'
      );

      expect(result.totalProcessed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('DATABASE');
      expect(result.errors[0].message).toContain('Batch insert failed');
    });

    it('should process grants in configured batch sizes', async () => {
      const mockGrants: ProcessedGrantData[] = [
        createMockGrant('Grant 1'),
        createMockGrant('Grant 2'),
        createMockGrant('Grant 3'),
        createMockGrant('Grant 4'),
        createMockGrant('Grant 5')
      ];

      let transactionCallCount = 0;
      mockPrisma.$transaction = vi.fn().mockImplementation(async (callback) => {
        transactionCallCount++;
        return await callback({
          grant: { create: vi.fn().mockResolvedValue({ id: `grant-${transactionCallCount}` }) },
          funder: { findFirst: vi.fn().mockResolvedValue({ id: 'funder-1' }) },
          grantTag: { createMany: vi.fn().mockResolvedValue({ count: 1 }) }
        });
      });

      await databaseWriter.batchInsertGrants(mockGrants, 'source-1', 'job-1');

      // With batch size of 2, we should have 3 transactions (2+2+1)
      expect(transactionCallCount).toBe(3);
    });
  });

  describe('batchUpdateGrants', () => {
    it('should successfully update grants in batch', async () => {
      const mockUpdates = [
        {
          id: 'grant-1',
          data: { title: 'Updated Grant 1' },
          reason: 'Content changed'
        },
        {
          id: 'grant-2',
          data: { deadline: new Date('2024-12-31') },
          reason: 'Deadline updated'
        }
      ];

      mockPrisma.$transaction = vi.fn().mockImplementation(async (callback) => {
        return await callback({
          grant: {
            update: vi.fn()
              .mockResolvedValueOnce({ id: 'grant-1' })
              .mockResolvedValueOnce({ id: 'grant-2' })
          }
        });
      });

      const result = await databaseWriter.batchUpdateGrants(mockUpdates);

      expect(result.totalProcessed).toBe(2);
      expect(result.updated).toBe(2);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle update errors for individual grants', async () => {
      const mockUpdates = [
        {
          id: 'grant-1',
          data: { title: 'Updated Grant 1' },
          reason: 'Content changed'
        },
        {
          id: 'invalid-grant',
          data: { title: 'This will fail' },
          reason: 'Test error'
        }
      ];

      mockPrisma.$transaction = vi.fn().mockImplementation(async (callback) => {
        return await callback({
          grant: {
            update: vi.fn()
              .mockResolvedValueOnce({ id: 'grant-1' })
              .mockRejectedValueOnce(new Error('Grant not found'))
          }
        });
      });

      const result = await databaseWriter.batchUpdateGrants(mockUpdates);

      expect(result.totalProcessed).toBe(2);
      expect(result.updated).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Failed to update grant invalid-grant');
    });
  });

  describe('markGrantsAsExpired', () => {
    it('should mark inactive grants as expired', async () => {
      const activeHashes = ['hash1', 'hash2', 'hash3'];
      
      mockPrisma.grant.updateMany = vi.fn().mockResolvedValue({ count: 5 });

      const expiredCount = await databaseWriter.markGrantsAsExpired(
        'source-1',
        activeHashes
      );

      expect(expiredCount).toBe(5);
      expect(mockPrisma.grant.updateMany).toHaveBeenCalledWith({
        where: {
          scrapedFrom: 'source-1',
          contentHash: { notIn: activeHashes },
          status: 'ACTIVE'
        },
        data: {
          status: 'EXPIRED',
          updatedAt: expect.any(Date)
        }
      });
    });
  });

  describe('updateScrapeJobStatus', () => {
    it('should update scrape job with results', async () => {
      const mockResult = {
        totalFound: 10,
        totalInserted: 8,
        totalUpdated: 2,
        totalSkipped: 0,
        duration: 5000,
        errors: [],
        metadata: { source: 'test' }
      };

      mockPrisma.scrapeJob.update = vi.fn().mockResolvedValue({});

      await databaseWriter.updateScrapeJobStatus('job-1', 'COMPLETED', mockResult);

      expect(mockPrisma.scrapeJob.update).toHaveBeenCalledWith({
        where: { id: 'job-1' },
        data: {
          status: 'COMPLETED',
          finishedAt: expect.any(Date),
          totalFound: 10,
          totalInserted: 8,
          totalUpdated: 2,
          totalSkipped: 0,
          duration: 5000,
          metadata: { source: 'test' }
        }
      });
    });

    it('should handle job status update with errors', async () => {
      const mockResult = {
        totalFound: 5,
        totalInserted: 3,
        totalUpdated: 0,
        totalSkipped: 2,
        duration: 3000,
        errors: [
          {
            type: 'NETWORK' as const,
            message: 'Connection timeout',
            timestamp: new Date()
          }
        ],
        metadata: {}
      };

      mockPrisma.scrapeJob.update = vi.fn().mockResolvedValue({});

      await databaseWriter.updateScrapeJobStatus('job-1', 'FAILED', mockResult);

      expect(mockPrisma.scrapeJob.update).toHaveBeenCalledWith({
        where: { id: 'job-1' },
        data: {
          status: 'FAILED',
          finishedAt: expect.any(Date),
          totalFound: 5,
          totalInserted: 3,
          totalUpdated: 0,
          totalSkipped: 2,
          duration: 3000,
          log: JSON.stringify(mockResult.errors),
          metadata: {}
        }
      });
    });
  });

  describe('getDatabaseStats', () => {
    it('should return comprehensive database statistics', async () => {
      // Mock all the count queries
      mockPrisma.grant.count = vi.fn()
        .mockResolvedValueOnce(100) // total grants
        .mockResolvedValueOnce(85)  // active grants
        .mockResolvedValueOnce(15); // expired grants

      mockPrisma.funder.count = vi.fn().mockResolvedValue(25);

      mockPrisma.scrapeJob.findMany = vi.fn().mockResolvedValue([
        { duration: 1000 },
        { duration: 2000 },
        { duration: 1500 }
      ]);

      const stats = await databaseWriter.getDatabaseStats();

      expect(stats).toEqual({
        totalGrants: 100,
        activeGrants: 85,
        expiredGrants: 15,
        totalFunders: 25,
        recentScrapeJobs: 3,
        avgProcessingTime: 1500
      });
    });

    it('should handle zero recent jobs gracefully', async () => {
      mockPrisma.grant.count = vi.fn()
        .mockResolvedValueOnce(50)
        .mockResolvedValueOnce(45)
        .mockResolvedValueOnce(5);

      mockPrisma.funder.count = vi.fn().mockResolvedValue(10);
      mockPrisma.scrapeJob.findMany = vi.fn().mockResolvedValue([]);

      const stats = await databaseWriter.getDatabaseStats();

      expect(stats.avgProcessingTime).toBe(0);
      expect(stats.recentScrapeJobs).toBe(0);
    });
  });

  describe('cleanupOldAuditLogs', () => {
    it('should delete old audit logs', async () => {
      mockPrisma.auditLog.deleteMany = vi.fn().mockResolvedValue({ count: 150 });

      const deletedCount = await databaseWriter.cleanupOldAuditLogs(30);

      expect(deletedCount).toBe(150);
      expect(mockPrisma.auditLog.deleteMany).toHaveBeenCalledWith({
        where: {
          createdAt: { lt: expect.any(Date) }
        }
      });
    });
  });
});

// Helper function to create mock grant data
function createMockGrant(title: string): ProcessedGrantData {
  return {
    title,
    description: `Description for ${title}`,
    deadline: new Date('2024-12-31'),
    fundingAmountMin: 10000,
    fundingAmountMax: 50000,
    eligibilityCriteria: 'Test eligibility criteria',
    applicationUrl: 'https://example.com/apply',
    category: GrantCategory.HEALTHCARE_PUBLIC_HEALTH,
    locationEligibility: ['US', 'CA'],
    confidenceScore: 0.95,
    contentHash: `hash-${title.replace(/\s+/g, '-').toLowerCase()}`,
    funder: {
      name: 'Test Foundation',
      website: 'https://testfoundation.org',
      contactEmail: 'grants@testfoundation.org',
      type: ScrapedSourceType.FOUNDATION
    }
  };
}