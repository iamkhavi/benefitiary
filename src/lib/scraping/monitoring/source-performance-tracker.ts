/**
 * Source Performance Tracker - Monitors and tracks scraping source performance
 * Provides metrics collection, analysis, and performance optimization recommendations
 */

import { prisma } from '@/lib/prisma';
import { SourceMetrics, ScrapingResult, ScrapingError } from '../types';

export interface PerformanceMetrics {
  sourceId: string;
  totalScrapes: number;
  successfulScrapes: number;
  failedScrapes: number;
  successRate: number;
  averageProcessingTime: number;
  averageGrantsFound: number;
  averageResponseTime: number;
  errorRate: number;
  lastSuccessfulScrape?: Date;
  lastError?: string;
  performanceScore: number;
  trend: 'improving' | 'stable' | 'declining';
  recommendations: string[];
}

export interface PerformanceTrend {
  period: string;
  successRate: number;
  averageProcessingTime: number;
  grantsFound: number;
  errorCount: number;
}

export interface PerformanceAlert {
  sourceId: string;
  alertType: 'performance_degradation' | 'high_error_rate' | 'no_data' | 'slow_response';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  threshold: number;
  currentValue: number;
  timestamp: Date;
}

export class SourcePerformanceTracker {
  private readonly PERFORMANCE_THRESHOLDS = {
    MIN_SUCCESS_RATE: 0.8,
    MAX_ERROR_RATE: 0.2,
    MAX_RESPONSE_TIME: 30000, // 30 seconds
    MIN_GRANTS_PER_SCRAPE: 1,
    CRITICAL_FAIL_COUNT: 5
  };

  /**
   * Track scraping result and update performance metrics
   */
  async trackScrapingResult(sourceId: string, result: ScrapingResult): Promise<void> {
    try {
      const startTime = Date.now();
      
      // Create scrape job record
      await prisma.scrapeJob.create({
        data: {
          sourceId,
          status: result.errors.length === 0 ? 'SUCCESS' : 'FAILED',
          totalFound: result.totalFound,
          totalInserted: result.totalInserted,
          totalUpdated: result.totalUpdated,
          totalSkipped: result.totalSkipped,
          startedAt: new Date(Date.now() - result.duration),
          finishedAt: new Date(),
          duration: Math.round(result.duration / 1000), // Convert to seconds
          log: result.errors.length > 0 ? JSON.stringify(result.errors) : null,
          metadata: result.metadata
        }
      });

      // Update source metrics
      await this.updateSourceMetrics(sourceId, result);

      // Check for performance alerts
      await this.checkPerformanceAlerts(sourceId);

      console.log(`Performance tracking completed for source ${sourceId} in ${Date.now() - startTime}ms`);
    } catch (error) {
      console.error(`Error tracking performance for source ${sourceId}:`, error);
    }
  }

  /**
   * Get comprehensive performance metrics for a source
   */
  async getSourcePerformanceMetrics(sourceId: string): Promise<PerformanceMetrics | null> {
    try {
      const source = await prisma.scrapedSource.findUnique({
        where: { id: sourceId },
        include: {
          scrapeJobs: {
            orderBy: { startedAt: 'desc' },
            take: 50 // Last 50 jobs for analysis
          }
        }
      });

      if (!source) {
        return null;
      }

      const jobs = source.scrapeJobs;
      const totalScrapes = jobs.length;
      
      if (totalScrapes === 0) {
        return this.createEmptyMetrics(sourceId);
      }

      const successfulScrapes = jobs.filter(job => job.status === 'SUCCESS').length;
      const failedScrapes = jobs.filter(job => job.status === 'FAILED').length;
      const successRate = totalScrapes > 0 ? successfulScrapes / totalScrapes : 0;
      const errorRate = totalScrapes > 0 ? failedScrapes / totalScrapes : 0;

      const processingTimes = jobs
        .filter(job => job.duration)
        .map(job => job.duration!);
      const averageProcessingTime = processingTimes.length > 0 
        ? processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length * 1000 // Convert to ms
        : 0;

      const grantsFound = jobs
        .filter(job => job.totalFound !== null)
        .map(job => job.totalFound!);
      const averageGrantsFound = grantsFound.length > 0
        ? grantsFound.reduce((sum, count) => sum + count, 0) / grantsFound.length
        : 0;

      const lastSuccessfulJob = jobs.find(job => job.status === 'SUCCESS');
      const lastFailedJob = jobs.find(job => job.status === 'FAILED');

      const performanceScore = this.calculatePerformanceScore({
        successRate,
        averageProcessingTime,
        averageGrantsFound,
        errorRate
      });

      const trend = this.calculateTrend(jobs);
      const recommendations = this.generateRecommendations({
        successRate,
        averageProcessingTime,
        averageGrantsFound,
        errorRate,
        failCount: source.failCount || 0
      });

      return {
        sourceId,
        totalScrapes,
        successfulScrapes,
        failedScrapes,
        successRate,
        averageProcessingTime,
        averageGrantsFound,
        averageResponseTime: averageProcessingTime, // Approximation
        errorRate,
        lastSuccessfulScrape: lastSuccessfulJob?.finishedAt || undefined,
        lastError: source.lastError || undefined,
        performanceScore,
        trend,
        recommendations
      };
    } catch (error) {
      console.error(`Error getting performance metrics for source ${sourceId}:`, error);
      throw new Error(`Failed to get performance metrics: ${error}`);
    }
  }

  /**
   * Get performance trends over time
   */
  async getPerformanceTrends(sourceId: string, days: number = 30): Promise<PerformanceTrend[]> {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      
      const jobs = await prisma.scrapeJob.findMany({
        where: {
          sourceId,
          startedAt: { gte: startDate }
        },
        orderBy: { startedAt: 'asc' }
      });

      // Group jobs by day
      const dailyGroups = new Map<string, typeof jobs>();
      
      jobs.forEach(job => {
        const day = job.startedAt.toISOString().split('T')[0];
        if (!dailyGroups.has(day)) {
          dailyGroups.set(day, []);
        }
        dailyGroups.get(day)!.push(job);
      });

      const trends: PerformanceTrend[] = [];
      
      for (const [day, dayJobs] of dailyGroups) {
        const successfulJobs = dayJobs.filter(job => job.status === 'SUCCESS');
        const successRate = dayJobs.length > 0 ? successfulJobs.length / dayJobs.length : 0;
        
        const processingTimes = dayJobs
          .filter(job => job.duration)
          .map(job => job.duration!);
        const averageProcessingTime = processingTimes.length > 0
          ? processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length * 1000
          : 0;

        const grantsFound = dayJobs
          .filter(job => job.totalFound !== null)
          .reduce((sum, job) => sum + (job.totalFound || 0), 0);

        const errorCount = dayJobs.filter(job => job.status === 'FAILED').length;

        trends.push({
          period: day,
          successRate,
          averageProcessingTime,
          grantsFound,
          errorCount
        });
      }

      return trends;
    } catch (error) {
      console.error(`Error getting performance trends for source ${sourceId}:`, error);
      throw new Error(`Failed to get performance trends: ${error}`);
    }
  }

  /**
   * Get performance comparison across sources
   */
  async getSourceComparison(): Promise<PerformanceMetrics[]> {
    try {
      const sources = await prisma.scrapedSource.findMany({
        where: { status: 'ACTIVE' },
        include: {
          scrapeJobs: {
            orderBy: { startedAt: 'desc' },
            take: 20
          }
        }
      });

      const comparisons: PerformanceMetrics[] = [];

      for (const source of sources) {
        const metrics = await this.getSourcePerformanceMetrics(source.id);
        if (metrics) {
          comparisons.push(metrics);
        }
      }

      // Sort by performance score descending
      return comparisons.sort((a, b) => b.performanceScore - a.performanceScore);
    } catch (error) {
      console.error('Error getting source comparison:', error);
      throw new Error(`Failed to get source comparison: ${error}`);
    }
  }

  /**
   * Check for performance alerts
   */
  async checkPerformanceAlerts(sourceId: string): Promise<PerformanceAlert[]> {
    try {
      const metrics = await this.getSourcePerformanceMetrics(sourceId);
      if (!metrics) {
        return [];
      }

      const alerts: PerformanceAlert[] = [];

      // Check success rate
      if (metrics.successRate < this.PERFORMANCE_THRESHOLDS.MIN_SUCCESS_RATE) {
        alerts.push({
          sourceId,
          alertType: 'performance_degradation',
          severity: metrics.successRate < 0.5 ? 'critical' : 'high',
          message: `Success rate (${(metrics.successRate * 100).toFixed(1)}%) is below threshold`,
          threshold: this.PERFORMANCE_THRESHOLDS.MIN_SUCCESS_RATE,
          currentValue: metrics.successRate,
          timestamp: new Date()
        });
      }

      // Check error rate
      if (metrics.errorRate > this.PERFORMANCE_THRESHOLDS.MAX_ERROR_RATE) {
        alerts.push({
          sourceId,
          alertType: 'high_error_rate',
          severity: metrics.errorRate > 0.5 ? 'critical' : 'high',
          message: `Error rate (${(metrics.errorRate * 100).toFixed(1)}%) is above threshold`,
          threshold: this.PERFORMANCE_THRESHOLDS.MAX_ERROR_RATE,
          currentValue: metrics.errorRate,
          timestamp: new Date()
        });
      }

      // Check response time
      if (metrics.averageResponseTime > this.PERFORMANCE_THRESHOLDS.MAX_RESPONSE_TIME) {
        alerts.push({
          sourceId,
          alertType: 'slow_response',
          severity: 'medium',
          message: `Average response time (${(metrics.averageResponseTime / 1000).toFixed(1)}s) is above threshold`,
          threshold: this.PERFORMANCE_THRESHOLDS.MAX_RESPONSE_TIME,
          currentValue: metrics.averageResponseTime,
          timestamp: new Date()
        });
      }

      // Check for no data
      if (metrics.averageGrantsFound < this.PERFORMANCE_THRESHOLDS.MIN_GRANTS_PER_SCRAPE) {
        alerts.push({
          sourceId,
          alertType: 'no_data',
          severity: 'medium',
          message: `Average grants found (${metrics.averageGrantsFound.toFixed(1)}) is below expected threshold`,
          threshold: this.PERFORMANCE_THRESHOLDS.MIN_GRANTS_PER_SCRAPE,
          currentValue: metrics.averageGrantsFound,
          timestamp: new Date()
        });
      }

      return alerts;
    } catch (error) {
      console.error(`Error checking performance alerts for source ${sourceId}:`, error);
      return [];
    }
  }

  /**
   * Update source metrics in database
   */
  private async updateSourceMetrics(sourceId: string, result: ScrapingResult): Promise<void> {
    try {
      const isSuccess = result.errors.length === 0;
      const processingTime = Math.round(result.duration);

      const updateData: any = {
        updatedAt: new Date()
      };

      if (isSuccess) {
        updateData.lastScrapedAt = new Date();
        updateData.failCount = 0;
        updateData.lastError = null;
      } else {
        updateData.failCount = { increment: 1 };
        updateData.lastError = result.errors[0]?.message || 'Unknown error';
      }

      // Update average processing time
      const source = await prisma.scrapedSource.findUnique({
        where: { id: sourceId },
        select: { avgParseTime: true }
      });

      if (source) {
        const currentAvg = source.avgParseTime || 0;
        const newAvg = currentAvg === 0 ? processingTime : Math.round((currentAvg + processingTime) / 2);
        updateData.avgParseTime = newAvg;
      }

      // Calculate and update success rate
      const recentJobs = await prisma.scrapeJob.findMany({
        where: { sourceId },
        orderBy: { startedAt: 'desc' },
        take: 20,
        select: { status: true }
      });

      const successCount = recentJobs.filter(job => job.status === 'SUCCESS').length;
      const successRate = recentJobs.length > 0 ? successCount / recentJobs.length : 0;
      updateData.successRate = successRate;

      await prisma.scrapedSource.update({
        where: { id: sourceId },
        data: updateData
      });
    } catch (error) {
      console.error(`Error updating source metrics for ${sourceId}:`, error);
    }
  }

  /**
   * Calculate performance score (0-100)
   */
  private calculatePerformanceScore(metrics: {
    successRate: number;
    averageProcessingTime: number;
    averageGrantsFound: number;
    errorRate: number;
  }): number {
    let score = 0;

    // Success rate (40% weight)
    score += metrics.successRate * 40;

    // Processing time (20% weight) - lower is better
    const timeScore = Math.max(0, 20 - (metrics.averageProcessingTime / 1000) * 2);
    score += Math.min(20, timeScore);

    // Grants found (25% weight)
    const grantsScore = Math.min(25, metrics.averageGrantsFound * 5);
    score += grantsScore;

    // Error rate (15% weight) - lower is better
    score += Math.max(0, 15 - (metrics.errorRate * 15));

    return Math.round(Math.min(100, Math.max(0, score)));
  }

  /**
   * Calculate performance trend
   */
  private calculateTrend(jobs: any[]): 'improving' | 'stable' | 'declining' {
    if (jobs.length < 10) {
      return 'stable';
    }

    const recent = jobs.slice(0, 10);
    const older = jobs.slice(10, 20);

    const recentSuccessRate = recent.filter(job => job.status === 'SUCCESS').length / recent.length;
    const olderSuccessRate = older.length > 0 
      ? older.filter(job => job.status === 'SUCCESS').length / older.length 
      : recentSuccessRate;

    const difference = recentSuccessRate - olderSuccessRate;

    if (difference > 0.1) return 'improving';
    if (difference < -0.1) return 'declining';
    return 'stable';
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(metrics: {
    successRate: number;
    averageProcessingTime: number;
    averageGrantsFound: number;
    errorRate: number;
    failCount: number;
  }): string[] {
    const recommendations: string[] = [];

    if (metrics.successRate < 0.8) {
      recommendations.push('Consider reviewing and updating CSS selectors - low success rate may indicate website changes');
    }

    if (metrics.averageProcessingTime > 15000) {
      recommendations.push('Optimize scraping speed by reducing delay between requests or using more efficient selectors');
    }

    if (metrics.averageGrantsFound < 1) {
      recommendations.push('Review source configuration - very few grants found may indicate parsing issues');
    }

    if (metrics.errorRate > 0.3) {
      recommendations.push('Investigate frequent errors - consider implementing better error handling or rate limiting');
    }

    if (metrics.failCount > 3) {
      recommendations.push('Source may need maintenance - consider temporarily disabling until issues are resolved');
    }

    if (recommendations.length === 0) {
      recommendations.push('Source is performing well - no immediate action required');
    }

    return recommendations;
  }

  /**
   * Create empty metrics for sources with no data
   */
  private createEmptyMetrics(sourceId: string): PerformanceMetrics {
    return {
      sourceId,
      totalScrapes: 0,
      successfulScrapes: 0,
      failedScrapes: 0,
      successRate: 0,
      averageProcessingTime: 0,
      averageGrantsFound: 0,
      averageResponseTime: 0,
      errorRate: 0,
      performanceScore: 0,
      trend: 'stable',
      recommendations: ['No scraping data available - run initial scrape to establish baseline metrics']
    };
  }
}