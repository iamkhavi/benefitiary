/**
 * Metrics Collector for tracking scraping performance and success rates
 * Provides comprehensive monitoring and analytics for the scraping system
 */

import { prisma } from '@/lib/prisma';
import { ScrapingMetrics, ScrapeJob, ScrapingResult, SourcePerformance, ScrapingError } from '../types';
import { SourcePerformanceTracker, PerformanceAlert } from './source-performance-tracker';
import { ErrorTracker } from './error-tracker';

export interface DailyScrapingReport {
  date: string;
  totalSources: number;
  activeSources: number;
  successfulScrapes: number;
  failedScrapes: number;
  totalGrantsFound: number;
  totalGrantsInserted: number;
  totalGrantsUpdated: number;
  averageProcessingTime: number;
  successRate: number;
  topPerformingSources: SourcePerformance[];
  errorSummary: {
    totalErrors: number;
    errorsByType: Record<string, number>;
    topErrorSources: Array<{ sourceId: string; errorCount: number }>;
  };
  performanceAlerts: PerformanceAlert[];
  recommendations: string[];
}

export interface RealTimeMetrics {
  timestamp: Date;
  activeJobs: number;
  queuedJobs: number;
  completedJobsLast24h: number;
  failedJobsLast24h: number;
  averageJobDuration: number;
  systemLoad: {
    cpu: number;
    memory: number;
    diskSpace: number;
  };
  networkStats: {
    requestsPerMinute: number;
    averageResponseTime: number;
    errorRate: number;
  };
}

export class MetricsCollector {
  private performanceTracker: SourcePerformanceTracker;
  private errorTracker: ErrorTracker;
  private metricsCache: Map<string, { data: any; timestamp: Date }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(
    performanceTracker?: SourcePerformanceTracker,
    errorTracker?: ErrorTracker
  ) {
    this.performanceTracker = performanceTracker || new SourcePerformanceTracker();
    this.errorTracker = errorTracker || new ErrorTracker();
  }

  /**
   * Collect current scraping metrics for dashboard display
   */
  async collectCurrentMetrics(): Promise<ScrapingMetrics> {
    try {
      const cacheKey = 'current_metrics';
      const cached = this.getCachedData(cacheKey);
      if (cached) {
        return cached;
      }

      const startTime = Date.now();
      
      // Get active and recent jobs
      const [activeJobs, recentJobs] = await Promise.all([
        this.getActiveJobs(),
        this.getRecentJobs(24) // Last 24 hours
      ]);

      // Calculate basic metrics
      const safeRecentJobs = recentJobs || [];
      const completedJobs = safeRecentJobs.filter(job => job.status === 'SUCCESS').length;
      const failedJobs = safeRecentJobs.filter(job => job.status === 'FAILED').length;
      const totalJobs = safeRecentJobs.length;
      const successRate = totalJobs > 0 ? completedJobs / totalJobs : 0;

      // Calculate average processing time
      const processingTimes = safeRecentJobs
        .filter(job => job.duration)
        .map(job => job.duration! * 1000); // Convert to milliseconds
      const averageProcessingTime = processingTimes.length > 0
        ? processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length
        : 0;

      // Get grants scraped today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const grantsScrapedToday = await this.getGrantsScrapedSince(today);

      // Get top performing sources
      const topPerformingSources = await this.getTopPerformingSources(5);

      // Get recent errors
      const recentErrors = await this.getRecentErrors(10);

      const metrics: ScrapingMetrics = {
        activeJobs: activeJobs ? activeJobs.length : 0,
        completedJobs,
        failedJobs,
        averageProcessingTime,
        grantsScrapedToday,
        successRate,
        topPerformingSources,
        recentErrors,
      };

      // Cache the results
      this.setCachedData(cacheKey, metrics);

      console.log(`Metrics collection completed in ${Date.now() - startTime}ms`);
      return metrics;
    } catch (error) {
      console.error('Error collecting current metrics:', error);
      throw new Error(`Failed to collect metrics: ${error}`);
    }
  }

  /**
   * Track job completion and update metrics
   */
  async trackJobCompletion(job: ScrapeJob, result: ScrapingResult): Promise<void> {
    try {
      const startTime = Date.now();

      // Update job record with completion details
      await prisma.scrapeJob.update({
        where: { id: job.id },
        data: {
          status: result.errors.length === 0 ? 'SUCCESS' : 'FAILED',
          finishedAt: new Date(),
          totalFound: result.totalFound,
          totalInserted: result.totalInserted,
          totalUpdated: result.totalUpdated,
          totalSkipped: result.totalSkipped,
          duration: Math.round(result.duration / 1000), // Convert to seconds
          log: result.errors.length > 0 ? JSON.stringify(result.errors) : null,
          metadata: result.metadata
        }
      });

      // Track performance metrics
      await this.performanceTracker.trackScrapingResult(job.sourceId, result);

      // Track errors if any
      if (result.errors.length > 0) {
        for (const error of result.errors) {
          await this.errorTracker.trackError(error, {
            sourceId: job.sourceId,
            jobId: job.id,
            sourceUrl: '', // Would be populated from source config
            attemptNumber: 1,
            startTime: job.startedAt || new Date()
          });
        }
      }

      // Clear relevant caches
      this.clearCache(['current_metrics', `source_performance_${job.sourceId}`]);

      console.log(`Job completion tracking completed in ${Date.now() - startTime}ms`);
    } catch (error) {
      console.error(`Error tracking job completion for ${job.id}:`, error);
    }
  }

  /**
   * Track individual errors
   */
  async trackError(error: ScrapingError): Promise<void> {
    try {
      await this.errorTracker.trackError(error, {
        sourceId: (error as any).sourceId || 'unknown',
        jobId: (error as any).jobId || 'unknown',
        sourceUrl: error.url || '',
        attemptNumber: 1,
        startTime: new Date()
      });

      // Clear error-related caches
      this.clearCache(['current_metrics', 'recent_errors']);
    } catch (trackingError) {
      console.error('Error tracking error:', trackingError);
    }
  }

  /**
   * Generate comprehensive daily report
   */
  async generateDailyReport(date?: Date): Promise<DailyScrapingReport> {
    try {
      const reportDate = date || new Date();
      const startOfDay = new Date(reportDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(reportDate);
      endOfDay.setHours(23, 59, 59, 999);

      const cacheKey = `daily_report_${startOfDay.toISOString().split('T')[0]}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) {
        return cached;
      }

      // Get all sources
      const [totalSources, activeSources] = await Promise.all([
        prisma.scrapedSource.count(),
        prisma.scrapedSource.count({ where: { status: 'ACTIVE' } })
      ]);

      // Get jobs for the day
      const dayJobs = await prisma.scrapeJob.findMany({
        where: {
          startedAt: {
            gte: startOfDay,
            lte: endOfDay
          }
        },
        include: {
          source: {
            select: { id: true, url: true, type: true }
          }
        }
      });

      const successfulScrapes = dayJobs.filter(job => job.status === 'SUCCESS').length;
      const failedScrapes = dayJobs.filter(job => job.status === 'FAILED').length;
      const successRate = dayJobs.length > 0 ? successfulScrapes / dayJobs.length : 0;

      // Calculate totals
      const totalGrantsFound = dayJobs.reduce((sum, job) => sum + (job.totalFound || 0), 0);
      const totalGrantsInserted = dayJobs.reduce((sum, job) => sum + (job.totalInserted || 0), 0);
      const totalGrantsUpdated = dayJobs.reduce((sum, job) => sum + (job.totalUpdated || 0), 0);

      // Calculate average processing time
      const processingTimes = dayJobs
        .filter(job => job.duration)
        .map(job => job.duration! * 1000);
      const averageProcessingTime = processingTimes.length > 0
        ? processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length
        : 0;

      // Get top performing sources
      const topPerformingSources = await this.getTopPerformingSources(10);

      // Get error summary
      const errorSummary = await this.generateErrorSummary(startOfDay, endOfDay);

      // Get performance alerts
      const performanceAlerts = await this.getPerformanceAlerts();

      // Generate recommendations
      const recommendations = this.generateRecommendations({
        successRate,
        totalSources,
        activeSources,
        errorSummary,
        performanceAlerts
      });

      const report: DailyScrapingReport = {
        date: startOfDay.toISOString().split('T')[0],
        totalSources,
        activeSources,
        successfulScrapes,
        failedScrapes,
        totalGrantsFound,
        totalGrantsInserted,
        totalGrantsUpdated,
        averageProcessingTime,
        successRate,
        topPerformingSources,
        errorSummary,
        performanceAlerts,
        recommendations
      };

      // Cache the report for 1 hour
      this.setCachedData(cacheKey, report, 60 * 60 * 1000);

      return report;
    } catch (error) {
      console.error('Error generating daily report:', error);
      throw new Error(`Failed to generate daily report: ${error}`);
    }
  }

  /**
   * Get source performance metrics
   */
  async getSourcePerformance(sourceId: string): Promise<SourcePerformance | null> {
    try {
      const cacheKey = `source_performance_${sourceId}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) {
        return cached;
      }

      const performance = await this.performanceTracker.getSourcePerformanceMetrics(sourceId);
      
      if (performance) {
        // Transform PerformanceMetrics to SourcePerformance
        const sourcePerformance: SourcePerformance = {
          sourceId,
          sourceName: (performance as any).sourceName || sourceId,
          successRate: (performance as any).successRate || 0,
          averageGrantsFound: (performance as any).averageGrantsFound || 0,
          lastScrapeTime: (performance as any).lastScrapeTime || new Date()
        };
        this.setCachedData(cacheKey, sourcePerformance);
        return sourcePerformance;
      }

      return null;
    } catch (error) {
      console.error(`Error getting source performance for ${sourceId}:`, error);
      return null;
    }
  }

  /**
   * Update source metrics
   */
  async updateSourceMetrics(sourceId: string, metrics: any): Promise<void> {
    try {
      await prisma.scrapedSource.update({
        where: { id: sourceId },
        data: {
          ...metrics,
          updatedAt: new Date()
        }
      });

      // Clear related caches
      this.clearCache([`source_performance_${sourceId}`, 'current_metrics']);
    } catch (error) {
      console.error(`Error updating source metrics for ${sourceId}:`, error);
    }
  }

  /**
   * Get real-time system metrics
   */
  async getRealTimeMetrics(): Promise<RealTimeMetrics> {
    try {
      const [activeJobs, queuedJobs, recentJobs] = await Promise.all([
        this.getActiveJobs(),
        this.getQueuedJobs(),
        this.getRecentJobs(24)
      ]);

      const completedJobs = recentJobs.filter(job => job.status === 'SUCCESS');
      const failedJobs = recentJobs.filter(job => job.status === 'FAILED');

      const averageJobDuration = completedJobs.length > 0
        ? completedJobs.reduce((sum, job) => sum + (job.duration || 0), 0) / completedJobs.length * 1000
        : 0;

      return {
        timestamp: new Date(),
        activeJobs: activeJobs.length,
        queuedJobs: queuedJobs.length,
        completedJobsLast24h: completedJobs.length,
        failedJobsLast24h: failedJobs.length,
        averageJobDuration,
        systemLoad: {
          cpu: 0, // Would integrate with system monitoring
          memory: 0,
          diskSpace: 0
        },
        networkStats: {
          requestsPerMinute: 0, // Would track HTTP requests
          averageResponseTime: 0,
          errorRate: failedJobs.length / (recentJobs.length || 1)
        }
      };
    } catch (error) {
      console.error('Error getting real-time metrics:', error);
      throw new Error(`Failed to get real-time metrics: ${error}`);
    }
  }

  /**
   * Get performance benchmarks and optimization recommendations
   */
  async getPerformanceBenchmarks(): Promise<{
    benchmarks: Record<string, number>;
    recommendations: string[];
  }> {
    try {
      const metrics = await this.collectCurrentMetrics();
      const sources = await this.performanceTracker.getSourceComparison();

      const benchmarks = {
        targetSuccessRate: 0.95,
        currentSuccessRate: metrics.successRate,
        targetProcessingTime: 10000, // 10 seconds
        currentProcessingTime: metrics.averageProcessingTime,
        targetErrorRate: 0.05,
        currentErrorRate: 1 - metrics.successRate,
        activeSources: sources.length,
        healthySources: sources.filter(s => s.performanceScore > 80).length
      };

      const recommendations = this.generatePerformanceRecommendations(benchmarks, sources);

      return { benchmarks, recommendations };
    } catch (error) {
      console.error('Error getting performance benchmarks:', error);
      throw new Error(`Failed to get performance benchmarks: ${error}`);
    }
  }

  // Private helper methods

  private async getActiveJobs(): Promise<any[]> {
    // TODO: Implement when ScrapeJob model is added to Prisma schema
    return []; // return prisma.scrapeJob.findMany({
    //   where: {
    //     status: 'RUNNING',
    //     NOT: { startedAt: null },
    //     finishedAt: null
    //   }
    // });
  }

  private async getQueuedJobs(): Promise<any[]> {
    // TODO: Implement when ScrapeJob model is added to Prisma schema
    return []; // return prisma.scrapeJob.findMany({
    //   where: {
    //     status: 'PENDING',
    //     startedAt: null
    //   }
    // });
  }

  private async getRecentJobs(hours: number): Promise<any[]> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    return prisma.scrapeJob.findMany({
      where: {
        startedAt: { gte: since }
      },
      orderBy: { startedAt: 'desc' }
    });
  }

  private async getGrantsScrapedSince(since: Date): Promise<number> {
    const result = await prisma.scrapeJob.aggregate({
      where: {
        startedAt: { gte: since },
        status: 'SUCCESS'
      },
      _sum: {
        totalInserted: true,
        totalUpdated: true
      }
    });

    return (result._sum.totalInserted || 0) + (result._sum.totalUpdated || 0);
  }

  private async getTopPerformingSources(limit: number): Promise<SourcePerformance[]> {
    try {
      const sources = await this.performanceTracker.getSourceComparison();
      if (!sources) return [];
      
      // Transform PerformanceMetrics[] to SourcePerformance[]
      const transformedSources: SourcePerformance[] = sources.slice(0, limit).map((source: any) => ({
        sourceId: source.sourceId || 'unknown',
        sourceName: source.sourceName || source.sourceId || 'unknown',
        successRate: source.successRate || 0,
        averageGrantsFound: source.averageGrantsFound || 0,
        lastScrapeTime: source.lastScrapeTime || new Date()
      }));
      
      return transformedSources;
    } catch (error) {
      console.error('Error getting top performing sources:', error);
      return [];
    }
  }

  private async getRecentErrors(limit: number): Promise<ScrapingError[]> {
    try {
      const jobs = await prisma.scrapeJob.findMany({
        where: {
          status: 'FAILED',
          log: { not: null }
        },
        orderBy: { finishedAt: 'desc' },
        take: limit,
        select: {
          id: true,
          sourceId: true,
          log: true,
          finishedAt: true
        }
      });

      return jobs ? jobs.map(job => ({
        type: 'UNKNOWN' as any,
        message: job.log || 'Unknown error',
        sourceId: job.sourceId,
        jobId: job.id,
        timestamp: job.finishedAt || new Date()
      })) : [];
    } catch (error) {
      console.error('Error getting recent errors:', error);
      return [];
    }
  }

  private async generateErrorSummary(startDate: Date, endDate: Date): Promise<any> {
    const errorJobs = await prisma.scrapeJob.findMany({
      where: {
        status: 'FAILED',
        startedAt: { gte: startDate, lte: endDate }
      },
      select: {
        sourceId: true,
        log: true
      }
    });

    const errorsByType: Record<string, number> = {};
    const errorsBySource: Record<string, number> = {};

    errorJobs.forEach(job => {
      // Count by source
      errorsBySource[job.sourceId] = (errorsBySource[job.sourceId] || 0) + 1;

      // Count by type (simplified)
      if (job.log) {
        if (job.log.includes('network') || job.log.includes('timeout')) {
          errorsByType['NETWORK_ERROR'] = (errorsByType['NETWORK_ERROR'] || 0) + 1;
        } else if (job.log.includes('parsing') || job.log.includes('selector')) {
          errorsByType['PARSING_ERROR'] = (errorsByType['PARSING_ERROR'] || 0) + 1;
        } else {
          errorsByType['UNKNOWN_ERROR'] = (errorsByType['UNKNOWN_ERROR'] || 0) + 1;
        }
      }
    });

    const topErrorSources = Object.entries(errorsBySource)
      .map(([sourceId, errorCount]) => ({ sourceId, errorCount }))
      .sort((a, b) => b.errorCount - a.errorCount)
      .slice(0, 5);

    return {
      totalErrors: errorJobs.length,
      errorsByType,
      topErrorSources
    };
  }

  private async getPerformanceAlerts(): Promise<PerformanceAlert[]> {
    try {
      const sources = await prisma.scrapedSource.findMany({
        where: { status: 'ACTIVE' }
      });

      const alerts: PerformanceAlert[] = [];

      if (sources && Array.isArray(sources)) {
        for (const source of sources) {
          try {
            const sourceAlerts = await this.performanceTracker.checkPerformanceAlerts(source.id);
            if (sourceAlerts && Array.isArray(sourceAlerts)) {
              alerts.push(...sourceAlerts);
            }
          } catch (error) {
            console.error(`Error checking alerts for source ${source.id}:`, error);
          }
        }
      }

      return alerts;
    } catch (error) {
      console.error('Error getting performance alerts:', error);
      return [];
    }
  }

  private generateRecommendations(data: {
    successRate: number;
    totalSources: number;
    activeSources: number;
    errorSummary: any;
    performanceAlerts: PerformanceAlert[];
  }): string[] {
    const recommendations: string[] = [];

    if (data.successRate < 0.8) {
      recommendations.push('Overall success rate is below 80% - review failing sources and update configurations');
    }

    if (data.activeSources < data.totalSources * 0.8) {
      recommendations.push('Many sources are inactive - consider reactivating or removing unused sources');
    }

    if (data.errorSummary.totalErrors > 50) {
      recommendations.push('High error count detected - investigate common error patterns and implement fixes');
    }

    if (data.performanceAlerts.filter(a => a.severity === 'critical').length > 0) {
      recommendations.push('Critical performance alerts detected - immediate attention required');
    }

    if (recommendations.length === 0) {
      recommendations.push('System is performing well - continue monitoring for optimal performance');
    }

    return recommendations;
  }

  private generatePerformanceRecommendations(
    benchmarks: Record<string, number>,
    sources: any[]
  ): string[] {
    const recommendations: string[] = [];

    if (benchmarks.currentSuccessRate < benchmarks.targetSuccessRate) {
      recommendations.push(`Improve success rate from ${(benchmarks.currentSuccessRate * 100).toFixed(1)}% to ${(benchmarks.targetSuccessRate * 100).toFixed(1)}%`);
    }

    if (benchmarks.currentProcessingTime > benchmarks.targetProcessingTime) {
      recommendations.push(`Optimize processing time from ${(benchmarks.currentProcessingTime / 1000).toFixed(1)}s to ${(benchmarks.targetProcessingTime / 1000).toFixed(1)}s`);
    }

    const lowPerformingSources = sources.filter(s => s.performanceScore < 60);
    if (lowPerformingSources.length > 0) {
      recommendations.push(`${lowPerformingSources.length} sources have low performance scores - review and optimize`);
    }

    return recommendations;
  }

  // Cache management methods

  private getCachedData(key: string): any | null {
    const cached = this.metricsCache.get(key);
    if (!cached) return null;

    const isExpired = Date.now() - cached.timestamp.getTime() > this.CACHE_TTL;
    if (isExpired) {
      this.metricsCache.delete(key);
      return null;
    }

    return cached.data;
  }

  private setCachedData(key: string, data: any, ttl?: number): void {
    this.metricsCache.set(key, {
      data,
      timestamp: new Date()
    });

    // Auto-expire cache entry
    setTimeout(() => {
      this.metricsCache.delete(key);
    }, ttl || this.CACHE_TTL);
  }

  private clearCache(keys: string[]): void {
    keys.forEach(key => this.metricsCache.delete(key));
  }
}