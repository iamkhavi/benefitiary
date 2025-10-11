/**
 * AuditLogger - Handles audit logging for all scraping operations and data changes
 */

import { PrismaClient, AuditAction } from '@prisma/client';
import { BatchOperationResult } from './database-writer';

export interface AuditLogEntry {
  userId?: string;
  action: AuditAction;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export class AuditLogger {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Log a batch operation completion
   */
  async logBatchOperation(
    jobId: string,
    result: BatchOperationResult,
    tx?: any
  ): Promise<void> {
    const client = tx || this.prisma;

    await client.auditLog.create({
      data: {
        action: 'SCRAPE_EXECUTED',
        entityType: 'scrape_job',
        entityId: jobId,
        metadata: {
          totalProcessed: result.totalProcessed,
          inserted: result.inserted,
          updated: result.updated,
          skipped: result.skipped,
          duplicatesFound: result.duplicatesFound,
          processingTime: result.processingTime,
          errorCount: result.errors.length,
          errors: result.errors.map(error => ({
            type: error.type,
            message: error.message,
            timestamp: error.timestamp
          }))
        }
      }
    });
  }

  /**
   * Log individual grant processing
   */
  async logGrantProcessing(
    jobId: string,
    grantTitle: string,
    action: 'insert' | 'update' | 'skip',
    grantId?: string | null,
    tx?: any
  ): Promise<void> {
    const client = tx || this.prisma;

    let auditAction: AuditAction;
    switch (action) {
      case 'insert':
        auditAction = 'GRANT_SAVED'; // Reusing existing enum value
        break;
      case 'update':
        auditAction = 'PROFILE_UPDATED'; // Reusing for grant updates
        break;
      case 'skip':
        auditAction = 'SCRAPE_EXECUTED'; // Generic scrape action
        break;
    }

    await client.auditLog.create({
      data: {
        action: auditAction,
        entityType: 'grant',
        entityId: grantId,
        metadata: {
          jobId,
          grantTitle,
          processingAction: action,
          timestamp: new Date().toISOString()
        }
      }
    });
  }

  /**
   * Log grant updates with field-level changes
   */
  async logGrantUpdate(
    grantId: string,
    reason: string,
    updatedFields: Record<string, any>,
    tx?: any
  ): Promise<void> {
    const client = tx || this.prisma;

    await client.auditLog.create({
      data: {
        action: 'PROFILE_UPDATED', // Reusing for grant updates
        entityType: 'grant',
        entityId: grantId,
        metadata: {
          reason,
          updatedFields: Object.keys(updatedFields),
          fieldValues: updatedFields,
          timestamp: new Date().toISOString()
        }
      }
    });
  }

  /**
   * Log scrape job lifecycle events
   */
  async logScrapeJobEvent(
    jobId: string,
    event: 'started' | 'completed' | 'failed' | 'cancelled',
    metadata?: Record<string, any>,
    tx?: any
  ): Promise<void> {
    const client = tx || this.prisma;

    await client.auditLog.create({
      data: {
        action: 'SCRAPE_EXECUTED',
        entityType: 'scrape_job',
        entityId: jobId,
        metadata: {
          event,
          timestamp: new Date().toISOString(),
          ...metadata
        }
      }
    });
  }

  /**
   * Log duplicate detection events
   */
  async logDuplicateDetection(
    originalGrantId: string,
    duplicateGrantTitle: string,
    action: 'merged' | 'skipped' | 'flagged',
    confidence: number,
    tx?: any
  ): Promise<void> {
    const client = tx || this.prisma;

    await client.auditLog.create({
      data: {
        action: 'SCRAPE_EXECUTED',
        entityType: 'grant_duplicate',
        entityId: originalGrantId,
        metadata: {
          duplicateTitle: duplicateGrantTitle,
          deduplicationAction: action,
          confidence,
          timestamp: new Date().toISOString()
        }
      }
    });
  }

  /**
   * Log content change detection
   */
  async logContentChange(
    grantId: string,
    changedFields: string[],
    changeType: 'minor' | 'major' | 'critical',
    previousHash: string,
    newHash: string,
    tx?: any
  ): Promise<void> {
    const client = tx || this.prisma;

    await client.auditLog.create({
      data: {
        action: 'PROFILE_UPDATED',
        entityType: 'grant_content_change',
        entityId: grantId,
        metadata: {
          changedFields,
          changeType,
          previousHash,
          newHash,
          timestamp: new Date().toISOString()
        }
      }
    });
  }

  /**
   * Log database errors for troubleshooting
   */
  async logDatabaseError(
    operation: string,
    error: Error,
    context?: Record<string, any>,
    tx?: any
  ): Promise<void> {
    const client = tx || this.prisma;

    try {
      await client.auditLog.create({
        data: {
          action: 'SCRAPE_EXECUTED',
          entityType: 'database_error',
          metadata: {
            operation,
            errorMessage: error.message,
            errorStack: error.stack,
            context,
            timestamp: new Date().toISOString()
          }
        }
      });
    } catch (auditError) {
      // If audit logging fails, log to console as fallback
      console.error('Failed to log database error to audit log:', auditError);
      console.error('Original error:', error);
    }
  }

  /**
   * Log source configuration changes
   */
  async logSourceConfigChange(
    sourceId: string,
    changes: Record<string, any>,
    userId?: string,
    tx?: any
  ): Promise<void> {
    const client = tx || this.prisma;

    await client.auditLog.create({
      data: {
        userId,
        action: 'PROFILE_UPDATED',
        entityType: 'scraped_source',
        entityId: sourceId,
        metadata: {
          configChanges: changes,
          timestamp: new Date().toISOString()
        }
      }
    });
  }

  /**
   * Log performance metrics for monitoring
   */
  async logPerformanceMetrics(
    operation: string,
    metrics: {
      duration: number;
      recordsProcessed: number;
      memoryUsage?: number;
      cpuUsage?: number;
    },
    tx?: any
  ): Promise<void> {
    const client = tx || this.prisma;

    await client.auditLog.create({
      data: {
        action: 'SCRAPE_EXECUTED',
        entityType: 'performance_metrics',
        metadata: {
          operation,
          ...metrics,
          timestamp: new Date().toISOString()
        }
      }
    });
  }

  /**
   * Get audit logs for a specific entity
   */
  async getEntityAuditLogs(
    entityType: string,
    entityId: string,
    limit: number = 50
  ): Promise<any[]> {
    return await this.prisma.auditLog.findMany({
      where: {
        entityType,
        entityId
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit
    });
  }

  /**
   * Get recent scraping activity
   */
  async getRecentScrapingActivity(
    hours: number = 24,
    limit: number = 100
  ): Promise<any[]> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    return await this.prisma.auditLog.findMany({
      where: {
        action: 'SCRAPE_EXECUTED',
        createdAt: { gte: since }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit
    });
  }

  /**
   * Get audit statistics for reporting
   */
  async getAuditStatistics(days: number = 7): Promise<{
    totalEvents: number;
    scrapeEvents: number;
    grantEvents: number;
    errorEvents: number;
    eventsByDay: Array<{ date: string; count: number }>;
  }> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [totalEvents, scrapeEvents, grantEvents, errorEvents] = await Promise.all([
      this.prisma.auditLog.count({
        where: { createdAt: { gte: since } }
      }),
      this.prisma.auditLog.count({
        where: {
          action: 'SCRAPE_EXECUTED',
          createdAt: { gte: since }
        }
      }),
      this.prisma.auditLog.count({
        where: {
          entityType: 'grant',
          createdAt: { gte: since }
        }
      }),
      this.prisma.auditLog.count({
        where: {
          entityType: 'database_error',
          createdAt: { gte: since }
        }
      })
    ]);

    // Get events by day for trending
    const eventsByDay = await this.prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM audit_log 
      WHERE created_at >= ${since}
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `;

    return {
      totalEvents,
      scrapeEvents,
      grantEvents,
      errorEvents,
      eventsByDay: eventsByDay.map(row => ({
        date: row.date,
        count: Number(row.count)
      }))
    };
  }

  /**
   * Clean up old audit logs
   */
  async cleanupOldLogs(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

    const result = await this.prisma.auditLog.deleteMany({
      where: {
        createdAt: { lt: cutoffDate }
      }
    });

    // Log the cleanup operation
    await this.logPerformanceMetrics('audit_log_cleanup', {
      duration: 0, // Will be calculated by caller if needed
      recordsProcessed: result.count
    });

    return result.count;
  }

  /**
   * Create a generic audit log entry
   */
  async createAuditLog(entry: AuditLogEntry, tx?: any): Promise<void> {
    const client = tx || this.prisma;

    await client.auditLog.create({
      data: {
        userId: entry.userId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        metadata: entry.metadata,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent
      }
    });
  }
}