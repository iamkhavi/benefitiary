/**
 * Integration tests for database operations
 * Tests the complete workflow of database writing, deduplication, and audit logging
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { DatabaseWriter } from '../database-writer';
import { ContentHasher } from '../content-hasher';
import { AuditLogger } from '../audit-logger';
import { DeduplicationEngine } from '../deduplication-engine';
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

// Mock Prisma Client with comprehensive transaction support
const mockPrisma = {
  $transaction: vi.fn(),
  grant: {
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
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
    findMany: vi.fn(),
    count: vi.fn(),
    deleteMany: vi.fn()
  },
  $queryRaw: vi.fn()
} as unknown as PrismaClient;

describe('Database Integration Tests', () => {
  let databaseWriter: DatabaseWriter;
  let contentHasher: ContentHasher;
  let auditLogger: AuditLogger;
  let deduplicationEngine: DeduplicationEngine;

  beforeEach(() => {
    databaseWriter = new DatabaseWriter(mockPrisma, {
      batchSize: 3,
      enableDeduplication: true,
      enableAuditLogging: true,
      transactionTimeout: 10000
    });

    contentHasher = new ContentHasher();
    auditLogger = new AuditLogger(mockPrisma);
    deduplicationEngine = new DeduplicationEngine(mockPrisma);

    vi.clearAllMocks();
  });

  describe('Complete Grant Processing Workflow', () => {
    it('should process new grants end-to-end', async () => {
      const mockGrants = [
        createMockGrant('Healthcare Innovation Grant'),
        createMockGrant('Education Technology Fund'),
        createMockGrant('Climate Research Initiative')
      ];

      const mockFunder = { id: 'funder-1', name: 'Test Foundation' };
      const mockCreatedGrants = mockGrants.map((grant, index) => ({
        id: `grant-${index + 1}`,
        title: grant.title
      }));

      // Mock successful transaction flow
      mockPrisma.$transaction = vi.fn().mockImplementation(async (callback) => {
        const mockTx = {
          grant: {
            create: vi.fn()
              .mockResolvedValueOnce(mockCreatedGrants[0])
              .mockResolvedValueOnce(mockCreatedGrants[1])
              .mockResolvedValueOnce(mockCreatedGrants[2])
          },
          funder: {
            findFirst: vi.fn().mockResolvedValue(mockFunder)
          },
          grantTag: {
            createMany: vi.fn().mockResolvedValue({ count: 2 })
          }
        };

        return await callback(mockTx);
      });

      // Mock audit logging
      mockPrisma.auditLog.create = vi.fn().mockResolvedValue({});

      const result = await databaseWriter.batchInsertGrants(
        mockGrants,
        'source-123',
        'job-456'
      );

      expect(result.totalProcessed).toBe(3);
      expect(result.inserted).toBe(3);
      expect(result.updated).toBe(0);
      expect(result.skipped).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(result.duplicatesFound).toBe(0);

      // Verify transaction was called
      expect(mockPrisma.$transaction).toHaveBeenCalled();

      // Verify audit logging was called
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    });

    it('should handle mixed scenarios with new grants, updates, and duplicates', async () => {
      const mockGrants = [
        createMockGrant('New Grant'),
        createMockGrant('Existing Grant to Update'),
        createMockGrant('Duplicate Grant to Skip')
      ];

      let transactionCallCount = 0;
      mockPrisma.$transaction = vi.fn().mockImplementation(async (callback) => {
        transactionCallCount++;
        
        const mockTx = {
          grant: {
            create: vi.fn().mockResolvedValue({ id: `grant-new-${transactionCallCount}` }),
            update: vi.fn().mockResolvedValue({ id: `grant-updated-${transactionCallCount}` }),
            findUnique: vi.fn().mockResolvedValue({
              id: 'existing-grant-1',
              title: 'Existing Grant to Update',
              description: 'Old description',
              contentHash: 'old-hash'
            })
          },
          funder: {
            findFirst: vi.fn().mockResolvedValue({ id: 'funder-1', name: 'Test Foundation' })
          },
          grantTag: {
            createMany: vi.fn().mockResolvedValue({ count: 1 }),
            deleteMany: vi.fn().mockResolvedValue({ count: 1 })
          }
        };

        return await callback(mockTx);
      });

      // Mock deduplication results for each grant
      const mockDeduplicationEngine = {
        checkForDuplicates: vi.fn()
          .mockResolvedValueOnce({ // New grant
            isDuplicate: false,
            action: 'insert',
            confidence: 0.0,
            reason: 'No duplicates found'
          })
          .mockResolvedValueOnce({ // Existing grant to update
            isDuplicate: true,
            action: 'update',
            existingGrantId: 'existing-grant-1',
            confidence: 0.9,
            reason: 'Title match with content differences'
          })
          .mockResolvedValueOnce({ // Duplicate to skip
            isDuplicate: true,
            action: 'skip',
            existingGrantId: 'existing-grant-2',
            confidence: 1.0,
            reason: 'Exact content match'
          })
      };

      // Replace the deduplication engine in the database writer
      (databaseWriter as any).deduplicationEngine = mockDeduplicationEngine;

      mockPrisma.auditLog.create = vi.fn().mockResolvedValue({});

      const result = await databaseWriter.batchInsertGrants(
        mockGrants,
        'source-123',
        'job-789'
      );

      expect(result.totalProcessed).toBe(3);
      expect(result.inserted).toBe(1);
      expect(result.updated).toBe(1);
      expect(result.skipped).toBe(1);
      expect(result.duplicatesFound).toBe(2);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle partial failures gracefully', async () => {
      const mockGrants = [
        createMockGrant('Successful Grant'),
        createMockGrant('Failing Grant'),
        createMockGrant('Another Successful Grant')
      ];

      mockPrisma.$transaction = vi.fn().mockImplementation(async (callback) => {
        const mockTx = {
          grant: {
            create: vi.fn()
              .mockResolvedValueOnce({ id: 'grant-1', title: 'Successful Grant' })
              .mockRejectedValueOnce(new Error('Database constraint violation'))
              .mockResolvedValueOnce({ id: 'grant-3', title: 'Another Successful Grant' })
          },
          funder: {
            findFirst: vi.fn().mockResolvedValue({ id: 'funder-1', name: 'Test Foundation' })
          },
          grantTag: {
            createMany: vi.fn().mockResolvedValue({ count: 1 })
          }
        };

        return await callback(mockTx);
      });

      mockPrisma.auditLog.create = vi.fn().mockResolvedValue({});

      const result = await databaseWriter.batchInsertGrants(
        mockGrants,
        'source-123',
        'job-error-test'
      );

      expect(result.totalProcessed).toBe(3);
      expect(result.inserted).toBe(2);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('DATABASE');
      expect(result.errors[0].message).toContain('Database constraint violation');
    });
  });

  describe('Content Change Detection Integration', () => {
    it('should detect and handle content changes correctly', async () => {
      const originalGrant = createMockGrant('Research Grant');
      originalGrant.deadline = new Date('2024-12-31');
      originalGrant.fundingAmountMax = 50000;

      const updatedGrant = createMockGrant('Research Grant');
      updatedGrant.deadline = new Date('2025-01-31'); // Changed deadline
      updatedGrant.fundingAmountMax = 75000; // Changed funding amount

      const originalHash = contentHasher.generateHash(originalGrant);
      const updatedHash = contentHasher.generateHash(updatedGrant);

      expect(originalHash).not.toBe(updatedHash);

      const changeDetection = contentHasher.compareHashes(
        originalHash,
        updatedHash,
        originalGrant,
        updatedGrant
      );

      expect(changeDetection.changedFields).toContain('deadline');
      expect(changeDetection.changedFields).toContain('fundingAmountMax');
      expect(changeDetection.changeType).toBe('critical'); // Deadline and funding changes are critical
    });

    it('should generate consistent hashes for identical content', async () => {
      const grant1 = createMockGrant('Consistent Grant');
      const grant2 = createMockGrant('Consistent Grant');

      // Ensure all fields are identical
      grant2.deadline = grant1.deadline;
      grant2.fundingAmountMin = grant1.fundingAmountMin;
      grant2.fundingAmountMax = grant1.fundingAmountMax;
      grant2.locationEligibility = [...grant1.locationEligibility];

      const hash1 = contentHasher.generateHash(grant1);
      const hash2 = contentHasher.generateHash(grant2);

      expect(hash1).toBe(hash2);
    });
  });

  describe('Deduplication Integration', () => {
    it('should identify exact duplicates correctly', async () => {
      const grant = createMockGrant('Duplicate Test Grant');
      const contentHash = contentHasher.generateHash(grant);

      // Mock existing grant with same content hash
      mockPrisma.grant.findFirst = vi.fn().mockResolvedValue({
        id: 'existing-duplicate-grant'
      });

      const result = await deduplicationEngine.checkForDuplicates(grant);

      expect(result.isDuplicate).toBe(true);
      expect(result.action).toBe('skip');
      expect(result.confidence).toBe(1.0);
      expect(result.existingGrantId).toBe('existing-duplicate-grant');
    });

    it('should identify similar grants for potential updates', async () => {
      const grant = createMockGrant('Medical Research Grant');

      // Mock no exact match
      mockPrisma.grant.findFirst = vi.fn().mockResolvedValue(null);

      // Mock similar grant found
      mockPrisma.grant.findMany = vi.fn().mockResolvedValue([
        {
          id: 'similar-grant-1',
          title: 'Medical Research Grant 2024',
          funder: { name: 'Test Foundation' }
        }
      ]);

      // Mock existing grant details for update decision
      mockPrisma.grant.findUnique = vi.fn().mockResolvedValue({
        id: 'similar-grant-1',
        title: 'Medical Research Grant 2024',
        description: 'Old description',
        deadline: new Date('2024-11-30'),
        fundingAmountMin: 5000,
        fundingAmountMax: 25000,
        eligibilityCriteria: 'Old criteria',
        applicationUrl: 'https://old-url.com',
        category: 'HEALTHCARE_PUBLIC_HEALTH',
        locationEligibility: ['US'],
        confidenceScore: 0.8,
        contentHash: 'old-hash',
        funder: { name: 'Test Foundation' }
      });

      const result = await deduplicationEngine.checkForDuplicates(grant);

      expect(result.isDuplicate).toBe(true);
      expect(result.action).toBe('update');
      expect(result.existingGrantId).toBe('similar-grant-1');
      expect(result.confidence).toBeGreaterThan(0.8);
    });
  });

  describe('Audit Logging Integration', () => {
    it('should create comprehensive audit trail for batch operations', async () => {
      const mockResult = {
        totalProcessed: 5,
        inserted: 3,
        updated: 1,
        skipped: 1,
        errors: [
          {
            type: 'VALIDATION' as const,
            message: 'Invalid funding amount',
            timestamp: new Date()
          }
        ],
        duplicatesFound: 2,
        processingTime: 7500
      };

      mockPrisma.auditLog.create = vi.fn().mockResolvedValue({});

      await auditLogger.logBatchOperation('job-audit-test', mockResult);

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          action: 'SCRAPE_EXECUTED',
          entityType: 'scrape_job',
          entityId: 'job-audit-test',
          metadata: {
            totalProcessed: 5,
            inserted: 3,
            updated: 1,
            skipped: 1,
            duplicatesFound: 2,
            processingTime: 7500,
            errorCount: 1,
            errors: [
              {
                type: 'VALIDATION',
                message: 'Invalid funding amount',
                timestamp: expect.any(Date)
              }
            ]
          }
        }
      });
    });

    it('should track individual grant processing events', async () => {
      mockPrisma.auditLog.create = vi.fn().mockResolvedValue({});

      await auditLogger.logGrantProcessing(
        'job-123',
        'Test Grant for Audit',
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
            grantTitle: 'Test Grant for Audit',
            processingAction: 'insert',
            timestamp: expect.any(String)
          }
        }
      });
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large batches efficiently', async () => {
      const largeGrantSet = Array.from({ length: 50 }, (_, index) => 
        createMockGrant(`Grant ${index + 1}`)
      );

      let transactionCallCount = 0;
      mockPrisma.$transaction = vi.fn().mockImplementation(async (callback) => {
        transactionCallCount++;
        
        const mockTx = {
          grant: {
            create: vi.fn().mockResolvedValue({ id: `grant-${transactionCallCount}` })
          },
          funder: {
            findFirst: vi.fn().mockResolvedValue({ id: 'funder-1', name: 'Test Foundation' })
          },
          grantTag: {
            createMany: vi.fn().mockResolvedValue({ count: 2 })
          }
        };

        return await callback(mockTx);
      });

      mockPrisma.auditLog.create = vi.fn().mockResolvedValue({});

      const startTime = Date.now();
      const result = await databaseWriter.batchInsertGrants(
        largeGrantSet,
        'source-performance-test',
        'job-performance-test'
      );
      const endTime = Date.now();

      expect(result.totalProcessed).toBe(50);
      expect(result.inserted).toBe(50);
      expect(result.errors).toHaveLength(0);
      
      // Should process in multiple transactions due to batch size of 3
      expect(transactionCallCount).toBeGreaterThan(15);
      
      // Should complete in reasonable time (less than 5 seconds for mock operations)
      expect(endTime - startTime).toBeLessThan(5000);
    });

    it('should provide accurate database statistics', async () => {
      // Mock database counts
      mockPrisma.grant.count = vi.fn()
        .mockResolvedValueOnce(1000) // total grants
        .mockResolvedValueOnce(850)  // active grants
        .mockResolvedValueOnce(150); // expired grants

      mockPrisma.funder.count = vi.fn().mockResolvedValue(75);

      mockPrisma.scrapeJob.findMany = vi.fn().mockResolvedValue([
        { duration: 2000 },
        { duration: 3000 },
        { duration: 2500 },
        { duration: 1500 }
      ]);

      const stats = await databaseWriter.getDatabaseStats();

      expect(stats).toEqual({
        totalGrants: 1000,
        activeGrants: 850,
        expiredGrants: 150,
        totalFunders: 75,
        recentScrapeJobs: 4,
        avgProcessingTime: 2250 // Average of the durations
      });
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should recover from transaction failures', async () => {
      const mockGrants = [createMockGrant('Recovery Test Grant')];

      // First transaction fails, second succeeds
      mockPrisma.$transaction = vi.fn()
        .mockRejectedValueOnce(new Error('Transaction timeout'))
        .mockImplementationOnce(async (callback) => {
          const mockTx = {
            grant: { create: vi.fn().mockResolvedValue({ id: 'grant-recovery' }) },
            funder: { findFirst: vi.fn().mockResolvedValue({ id: 'funder-1' }) },
            grantTag: { createMany: vi.fn().mockResolvedValue({ count: 1 }) }
          };
          return await callback(mockTx);
        });

      const result = await databaseWriter.batchInsertGrants(
        mockGrants,
        'source-recovery-test',
        'job-recovery-test'
      );

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('DATABASE');
      expect(result.errors[0].message).toContain('Batch insert failed');
    });

    it('should handle database constraint violations gracefully', async () => {
      const mockGrants = [createMockGrant('Constraint Test Grant')];

      mockPrisma.$transaction = vi.fn().mockImplementation(async (callback) => {
        const mockTx = {
          grant: {
            create: vi.fn().mockRejectedValue(new Error('Unique constraint violation'))
          },
          funder: {
            findFirst: vi.fn().mockResolvedValue({ id: 'funder-1' })
          },
          grantTag: {
            createMany: vi.fn()
          }
        };

        return await callback(mockTx);
      });

      const result = await databaseWriter.batchInsertGrants(
        mockGrants,
        'source-constraint-test',
        'job-constraint-test'
      );

      expect(result.totalProcessed).toBe(1);
      expect(result.inserted).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Unique constraint violation');
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
    contentHash: '',
    funder: {
      name: 'Test Foundation',
      website: 'https://testfoundation.org',
      contactEmail: 'grants@testfoundation.org',
      type: ScrapedSourceType.FOUNDATION
    }
  };
}