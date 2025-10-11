/**
 * DatabaseWriter - Handles efficient batch database operations for scraped grants
 * Implements transaction management, deduplication, and audit logging
 */

import { PrismaClient, Grant, Funder, ScrapeJob, AuditLog } from '@prisma/client';
import { ProcessedGrantData, ScrapingResult, ScrapingError } from '../types';
import { ContentHasher } from './content-hasher';
import { AuditLogger } from './audit-logger';
import { DeduplicationEngine } from './deduplication-engine';

export interface DatabaseWriterConfig {
  batchSize: number;
  enableDeduplication: boolean;
  enableAuditLogging: boolean;
  transactionTimeout: number; // milliseconds
}

export interface BatchOperationResult {
  totalProcessed: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: ScrapingError[];
  duplicatesFound: number;
  processingTime: number;
}

export interface GrantUpdate {
  id: string;
  data: Partial<Grant>;
  reason: string;
}

export class DatabaseWriter {
  private prisma: PrismaClient;
  private contentHasher: ContentHasher;
  private auditLogger: AuditLogger;
  private deduplicationEngine: DeduplicationEngine;
  private config: DatabaseWriterConfig;

  constructor(
    prisma: PrismaClient,
    config: Partial<DatabaseWriterConfig> = {}
  ) {
    this.prisma = prisma;
    this.config = {
      batchSize: 100,
      enableDeduplication: true,
      enableAuditLogging: true,
      transactionTimeout: 30000, // 30 seconds
      ...config
    };

    this.contentHasher = new ContentHasher();
    this.auditLogger = new AuditLogger(prisma);
    this.deduplicationEngine = new DeduplicationEngine(prisma);
  }

  /**
   * Batch insert new grants with deduplication and transaction management
   */
  async batchInsertGrants(
    grants: ProcessedGrantData[],
    sourceId: string,
    jobId: string
  ): Promise<BatchOperationResult> {
    const startTime = Date.now();
    const result: BatchOperationResult = {
      totalProcessed: grants.length,
      inserted: 0,
      updated: 0,
      skipped: 0,
      errors: [],
      duplicatesFound: 0,
      processingTime: 0
    };

    try {
      // Process grants in batches to avoid memory issues and long transactions
      const batches = this.chunkArray(grants, this.config.batchSize);

      for (const batch of batches) {
        const batchResult = await this.processBatch(batch, sourceId, jobId);
        
        result.inserted += batchResult.inserted;
        result.updated += batchResult.updated;
        result.skipped += batchResult.skipped;
        result.duplicatesFound += batchResult.duplicatesFound;
        result.errors.push(...batchResult.errors);
      }

      result.processingTime = Date.now() - startTime;

      // Log batch operation completion
      if (this.config.enableAuditLogging) {
        await this.auditLogger.logBatchOperation(jobId, result);
      }

      return result;
    } catch (error) {
      const scrapingError: ScrapingError = {
        type: 'DATABASE',
        message: `Batch insert failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        stack: error instanceof Error ? error.stack : undefined
      };

      result.errors.push(scrapingError);
      result.processingTime = Date.now() - startTime;

      return result;
    }
  }

  /**
   * Process a single batch of grants within a transaction
   */
  private async processBatch(
    grants: ProcessedGrantData[],
    sourceId: string,
    jobId: string
  ): Promise<BatchOperationResult> {
    const result: BatchOperationResult = {
      totalProcessed: grants.length,
      inserted: 0,
      updated: 0,
      skipped: 0,
      errors: [],
      duplicatesFound: 0,
      processingTime: 0
    };

    return await this.prisma.$transaction(
      async (tx) => {
        for (const grant of grants) {
          try {
            // Generate content hash for change detection
            const contentHash = this.contentHasher.generateHash(grant);
            
            // Check for duplicates if enabled
            let duplicateAction: 'insert' | 'update' | 'skip' = 'insert';
            let existingGrantId: string | null = null;

            if (this.config.enableDeduplication) {
              const duplicateResult = await this.deduplicationEngine.checkForDuplicates(
                grant,
                tx
              );

              if (duplicateResult.isDuplicate) {
                duplicateAction = duplicateResult.action;
                existingGrantId = duplicateResult.existingGrantId || null;
                result.duplicatesFound++;
              }
            }

            // Execute the appropriate action
            switch (duplicateAction) {
              case 'insert':
                await this.insertNewGrant(grant, contentHash, sourceId, tx);
                result.inserted++;
                break;

              case 'update':
                if (existingGrantId) {
                  await this.updateExistingGrant(
                    existingGrantId,
                    grant,
                    contentHash,
                    tx
                  );
                  result.updated++;
                }
                break;

              case 'skip':
                result.skipped++;
                break;
            }

            // Log individual grant processing if audit logging is enabled
            if (this.config.enableAuditLogging) {
              await this.auditLogger.logGrantProcessing(
                jobId,
                grant.title,
                duplicateAction,
                existingGrantId,
                tx
              );
            }

          } catch (error) {
            const scrapingError: ScrapingError = {
              type: 'DATABASE',
              message: `Failed to process grant "${grant.title}": ${
                error instanceof Error ? error.message : 'Unknown error'
              }`,
              timestamp: new Date(),
              stack: error instanceof Error ? error.stack : undefined
            };

            result.errors.push(scrapingError);
          }
        }

        return result;
      },
      {
        timeout: this.config.transactionTimeout,
        isolationLevel: 'ReadCommitted'
      }
    );
  }

  /**
   * Insert a new grant into the database
   */
  private async insertNewGrant(
    grant: ProcessedGrantData,
    contentHash: string,
    sourceId: string,
    tx: any
  ): Promise<Grant> {
    // First, ensure the funder exists
    const funder = await this.ensureFunderExists(grant.funder, tx);

    // Create the grant record
    const newGrant = await tx.grant.create({
      data: {
        title: grant.title,
        description: grant.description,
        eligibilityCriteria: grant.eligibilityCriteria,
        deadline: grant.deadline,
        fundingAmountMin: grant.fundingAmountMin,
        fundingAmountMax: grant.fundingAmountMax,
        applicationUrl: grant.applicationUrl,
        category: grant.category,
        locationEligibility: grant.locationEligibility,
        confidenceScore: grant.confidenceScore,
        contentHash: contentHash,
        scrapedFrom: sourceId,
        funderId: funder.id,
        status: 'ACTIVE',
        sourceUpdatedAt: new Date()
      }
    });

    // Add tags if any
    if (grant.locationEligibility && grant.locationEligibility.length > 0) {
      const tagData = grant.locationEligibility.map(location => ({
        grantId: newGrant.id,
        tag: `location:${location}`,
        source: 'system'
      }));

      await tx.grantTag.createMany({
        data: tagData,
        skipDuplicates: true
      });
    }

    return newGrant;
  }

  /**
   * Update an existing grant with new information
   */
  private async updateExistingGrant(
    grantId: string,
    grant: ProcessedGrantData,
    contentHash: string,
    tx: any
  ): Promise<Grant> {
    // Detect what fields have changed
    const existingGrant = await tx.grant.findUnique({
      where: { id: grantId }
    });

    if (!existingGrant) {
      throw new Error(`Grant with ID ${grantId} not found for update`);
    }

    // Only update if content has actually changed
    if (existingGrant.contentHash === contentHash) {
      return existingGrant;
    }

    // Update the grant
    const updatedGrant = await tx.grant.update({
      where: { id: grantId },
      data: {
        title: grant.title,
        description: grant.description,
        eligibilityCriteria: grant.eligibilityCriteria,
        deadline: grant.deadline,
        fundingAmountMin: grant.fundingAmountMin,
        fundingAmountMax: grant.fundingAmountMax,
        applicationUrl: grant.applicationUrl,
        category: grant.category,
        locationEligibility: grant.locationEligibility,
        confidenceScore: grant.confidenceScore,
        contentHash: contentHash,
        sourceUpdatedAt: new Date(),
        updatedAt: new Date()
      }
    });

    // Update tags - remove old location tags and add new ones
    await tx.grantTag.deleteMany({
      where: {
        grantId: grantId,
        tag: { startsWith: 'location:' },
        source: 'system'
      }
    });

    if (grant.locationEligibility && grant.locationEligibility.length > 0) {
      const tagData = grant.locationEligibility.map(location => ({
        grantId: grantId,
        tag: `location:${location}`,
        source: 'system'
      }));

      await tx.grantTag.createMany({
        data: tagData,
        skipDuplicates: true
      });
    }

    return updatedGrant;
  }

  /**
   * Ensure a funder exists in the database, create if not found
   */
  private async ensureFunderExists(
    funderData: ProcessedGrantData['funder'],
    tx: any
  ): Promise<Funder> {
    // Try to find existing funder by name
    let funder = await tx.funder.findFirst({
      where: {
        name: { equals: funderData.name, mode: 'insensitive' }
      }
    });

    if (!funder) {
      // Create new funder
      funder = await tx.funder.create({
        data: {
          name: funderData.name,
          website: funderData.website,
          contactEmail: funderData.contactEmail,
          type: this.mapSourceTypeToFunderType(funderData.type)
        }
      });
    }

    return funder;
  }

  /**
   * Map scraping source type to funder type
   */
  private mapSourceTypeToFunderType(sourceType: string): string {
    switch (sourceType) {
      case 'FOUNDATION':
        return 'PRIVATE_FOUNDATION';
      case 'GOV':
        return 'GOVERNMENT';
      case 'INTERNATIONAL':
        return 'NGO';
      case 'CORPORATE':
        return 'CORPORATE';
      default:
        return 'PRIVATE_FOUNDATION';
    }
  }

  /**
   * Batch update existing grants
   */
  async batchUpdateGrants(updates: GrantUpdate[]): Promise<BatchOperationResult> {
    const startTime = Date.now();
    const result: BatchOperationResult = {
      totalProcessed: updates.length,
      inserted: 0,
      updated: 0,
      skipped: 0,
      errors: [],
      duplicatesFound: 0,
      processingTime: 0
    };

    try {
      await this.prisma.$transaction(
        async (tx) => {
          for (const update of updates) {
            try {
              // Clean the data to convert null to undefined for Prisma
              const cleanData = Object.fromEntries(
                Object.entries(update.data).map(([key, value]) => [
                  key, 
                  value === null ? undefined : value
                ])
              );

              await tx.grant.update({
                where: { id: update.id },
                data: {
                  ...cleanData,
                  updatedAt: new Date()
                }
              });

              result.updated++;

              // Log the update if audit logging is enabled
              if (this.config.enableAuditLogging) {
                await this.auditLogger.logGrantUpdate(
                  update.id,
                  update.reason,
                  update.data,
                  tx
                );
              }

            } catch (error) {
              const scrapingError: ScrapingError = {
                type: 'DATABASE',
                message: `Failed to update grant ${update.id}: ${
                  error instanceof Error ? error.message : 'Unknown error'
                }`,
                timestamp: new Date(),
                stack: error instanceof Error ? error.stack : undefined
              };

              result.errors.push(scrapingError);
            }
          }
        },
        {
          timeout: this.config.transactionTimeout
        }
      );

      result.processingTime = Date.now() - startTime;
      return result;

    } catch (error) {
      const scrapingError: ScrapingError = {
        type: 'DATABASE',
        message: `Batch update failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        stack: error instanceof Error ? error.stack : undefined
      };

      result.errors.push(scrapingError);
      result.processingTime = Date.now() - startTime;

      return result;
    }
  }

  /**
   * Mark grants as expired/closed when they're no longer found in sources
   */
  async markGrantsAsExpired(
    sourceId: string,
    activeGrantHashes: string[]
  ): Promise<number> {
    const result = await this.prisma.grant.updateMany({
      where: {
        scrapedFrom: sourceId,
        contentHash: { notIn: activeGrantHashes },
        status: 'ACTIVE'
      },
      data: {
        status: 'EXPIRED',
        updatedAt: new Date()
      }
    });

    return result.count;
  }

  /**
   * Update scrape job status and results
   */
  async updateScrapeJobStatus(
    jobId: string,
    status: string,
    result?: Partial<ScrapingResult>
  ): Promise<void> {
    const updateData: any = {
      status,
      finishedAt: new Date()
    };

    if (result) {
      updateData.totalFound = result.totalFound;
      updateData.totalInserted = result.totalInserted;
      updateData.totalUpdated = result.totalUpdated;
      updateData.totalSkipped = result.totalSkipped;
      updateData.duration = result.duration;
      
      if (result.errors && result.errors.length > 0) {
        updateData.log = JSON.stringify(result.errors);
      }
      
      if (result.metadata) {
        updateData.metadata = result.metadata;
      }
    }

    await this.prisma.scrapeJob.update({
      where: { id: jobId },
      data: updateData
    });
  }

  /**
   * Clean up old audit logs to prevent database bloat
   */
  async cleanupOldAuditLogs(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.prisma.auditLog.deleteMany({
      where: {
        createdAt: { lt: cutoffDate }
      }
    });

    return result.count;
  }

  /**
   * Get database statistics for monitoring
   */
  async getDatabaseStats(): Promise<{
    totalGrants: number;
    activeGrants: number;
    expiredGrants: number;
    totalFunders: number;
    recentScrapeJobs: number;
    avgProcessingTime: number;
  }> {
    const [
      totalGrants,
      activeGrants,
      expiredGrants,
      totalFunders,
      recentJobs
    ] = await Promise.all([
      this.prisma.grant.count(),
      this.prisma.grant.count({ where: { status: 'ACTIVE' } }),
      this.prisma.grant.count({ where: { status: 'EXPIRED' } }),
      this.prisma.funder.count(),
      this.prisma.scrapeJob.findMany({
        where: {
          startedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        },
        select: { duration: true }
      })
    ]);

    const avgProcessingTime = recentJobs.length > 0
      ? recentJobs.reduce((sum, job) => sum + (job.duration || 0), 0) / recentJobs.length
      : 0;

    return {
      totalGrants,
      activeGrants,
      expiredGrants,
      totalFunders,
      recentScrapeJobs: recentJobs.length,
      avgProcessingTime
    };
  }

  /**
   * Utility method to chunk arrays into smaller batches
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
}