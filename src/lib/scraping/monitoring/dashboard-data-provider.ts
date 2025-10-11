/**
 * Dashboard Data Provider for real-time monitoring dashboard
 * Provides structured data for monitoring dashboards and admin interfaces
 */

import { MetricsCollector, DailyScrapingReport, RealTimeMetrics } from './metrics-collector';
import { SourcePerformanceTracker, PerformanceMetrics, PerformanceTrend } from './source-performance-tracker';
import { ErrorTracker } from './error-tracker';
import { AlertingService } from './alerting-service';
import { prisma } from '@/lib/prisma';

export interface DashboardData {
  overview: DashboardOverview;
  realTimeMetrics: RealTimeMetrics;
  sourcePerformance: SourcePerformanceData;
  errorAnalysis: ErrorAnalysisData;
  alerts: AlertData;
  trends: TrendData;
  recommendations: RecommendationData;
}

export interface DashboardOverview {
  totalSources: number;
  activeSources: number;
  inactiveSources: number;
  totalGrantsToday: number;
  totalGrantsThisWeek: number;
  totalGrantsThisMonth: number;
  successRate: number;
  averageProcessingTime: number;
  systemStatus: 'healthy' | 'warning' | 'critical';
  lastUpdated: Date;
}

export interface SourcePerformanceData {
  topPerformers: PerformanceMetrics[];
  underPerformers: PerformanceMetrics[];
  sourceComparison: SourceComparisonData[];
  performanceDistribution: {
    excellent: number; // 90-100%
    good: number;      // 70-89%
    fair: number;      // 50-69%
    poor: number;      // 0-49%
  };
}

export interface SourceComparisonData {
  sourceId: string;
  sourceName: string;
  sourceType: string;
  performanceScore: number;
  successRate: number;
  averageProcessingTime: number;
  grantsFound: number;
  lastScrape: Date | null;
  status: 'active' | 'inactive' | 'error';
}

export interface ErrorAnalysisData {
  totalErrors: number;
  errorsByType: Array<{ type: string; count: number; percentage: number }>;
  errorsBySource: Array<{ sourceId: string; sourceName: string; errorCount: number }>;
  errorTrends: Array<{ date: string; errorCount: number; errorRate: number }>;
  commonErrorPatterns: Array<{ pattern: string; count: number; description: string }>;
  recentCriticalErrors: Array<{
    timestamp: Date;
    sourceId: string;
    errorType: string;
    message: string;
  }>;
}

export interface AlertData {
  activeAlerts: number;
  criticalAlerts: number;
  recentAlerts: Array<{
    id: string;
    title: string;
    severity: string;
    sourceId?: string;
    triggeredAt: Date;
    status: string;
  }>;
  alertsByType: Array<{ type: string; count: number }>;
  alertTrends: Array<{ date: string; alertCount: number }>;
}

export interface TrendData {
  successRateTrend: Array<{ date: string; successRate: number }>;
  processingTimeTrend: Array<{ date: string; averageTime: number }>;
  grantsFoundTrend: Array<{ date: string; grantsFound: number }>;
  sourcesActiveTrend: Array<{ date: string; activeSources: number }>;
  performanceTrends: Map<string, PerformanceTrend[]>;
}

export interface RecommendationData {
  systemRecommendations: Array<{
    type: 'performance' | 'reliability' | 'maintenance' | 'optimization';
    priority: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    description: string;
    actionItems: string[];
    estimatedImpact: string;
  }>;
  sourceRecommendations: Array<{
    sourceId: string;
    sourceName: string;
    recommendations: string[];
    priority: 'low' | 'medium' | 'high' | 'critical';
  }>;
}

export class DashboardDataProvider {
  private metricsCollector: MetricsCollector;
  private performanceTracker: SourcePerformanceTracker;
  private errorTracker: ErrorTracker;
  private alertingService?: AlertingService;
  private dataCache: Map<string, { data: any; timestamp: Date }> = new Map();
  private readonly CACHE_TTL = 2 * 60 * 1000; // 2 minutes

  constructor(alertingService?: AlertingService) {
    this.metricsCollector = new MetricsCollector();
    this.performanceTracker = new SourcePerformanceTracker();
    this.errorTracker = new ErrorTracker();
    this.alertingService = alertingService;
  }

  /**
   * Get comprehensive dashboard data
   */
  async getDashboardData(): Promise<DashboardData> {
    try {
      const cacheKey = 'dashboard_data';
      const cached = this.getCachedData(cacheKey);
      if (cached) {
        return cached;
      }

      console.log('Generating dashboard data...');
      const startTime = Date.now();

      // Collect all data in parallel
      const [
        overview,
        realTimeMetrics,
        sourcePerformance,
        errorAnalysis,
        alerts,
        trends,
        recommendations
      ] = await Promise.all([
        this.getDashboardOverview(),
        this.getRealTimeMetrics(),
        this.getSourcePerformanceData(),
        this.getErrorAnalysisData(),
        this.getAlertData(),
        this.getTrendData(),
        this.getRecommendationData()
      ]);

      const dashboardData: DashboardData = {
        overview,
        realTimeMetrics,
        sourcePerformance,
        errorAnalysis,
        alerts,
        trends,
        recommendations
      };

      // Cache the data
      this.setCachedData(cacheKey, dashboardData);

      console.log(`Dashboard data generated in ${Date.now() - startTime}ms`);
      return dashboardData;
    } catch (error) {
      console.error('Error generating dashboard data:', error);
      throw new Error(`Failed to generate dashboard data: ${error}`);
    }
  }

  /**
   * Get dashboard overview data
   */
  async getDashboardOverview(): Promise<DashboardOverview> {
    try {
      const [sources, metrics, grantsToday, grantsWeek, grantsMonth] = await Promise.all([
        this.getSourceCounts(),
        this.metricsCollector.collectCurrentMetrics(),
        this.getGrantsCount(1), // Today
        this.getGrantsCount(7), // This week
        this.getGrantsCount(30) // This month
      ]);

      const systemStatus = this.determineSystemStatus(metrics.successRate, sources.activeSources);

      return {
        totalSources: sources.totalSources,
        activeSources: sources.activeSources,
        inactiveSources: sources.inactiveSources,
        totalGrantsToday: grantsToday,
        totalGrantsThisWeek: grantsWeek,
        totalGrantsThisMonth: grantsMonth,
        successRate: metrics.successRate,
        averageProcessingTime: metrics.averageProcessingTime,
        systemStatus,
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error('Error getting dashboard overview:', error);
      throw error;
    }
  }

  /**
   * Get real-time metrics
   */
  async getRealTimeMetrics(): Promise<RealTimeMetrics> {
    try {
      return await this.metricsCollector.getRealTimeMetrics();
    } catch (error) {
      console.error('Error getting real-time metrics:', error);
      throw error;
    }
  }

  /**
   * Get source performance data
   */
  async getSourcePerformanceData(): Promise<SourcePerformanceData> {
    try {
      const allSources = await this.performanceTracker.getSourceComparison();
      
      const topPerformers = allSources
        .filter(s => s.performanceScore >= 80)
        .slice(0, 10);

      const underPerformers = allSources
        .filter(s => s.performanceScore < 60)
        .slice(0, 10);

      const sourceComparison = await this.getSourceComparisonData();

      const performanceDistribution = this.calculatePerformanceDistribution(allSources);

      return {
        topPerformers,
        underPerformers,
        sourceComparison,
        performanceDistribution
      };
    } catch (error) {
      console.error('Error getting source performance data:', error);
      throw error;
    }
  }

  /**
   * Get error analysis data
   */
  async getErrorAnalysisData(): Promise<ErrorAnalysisData> {
    try {
      const recentErrors = await this.errorTracker.getRecentErrors(1000);
      const errorStats = this.errorTracker.getErrorMetrics();

      const totalErrors = recentErrors.length;

      // Group errors by type
      const errorTypeMap = new Map<string, number>();
      recentErrors.forEach(error => {
        errorTypeMap.set(error.type, (errorTypeMap.get(error.type) || 0) + 1);
      });

      const errorsByType = Array.from(errorTypeMap.entries())
        .map(([type, count]) => ({
          type,
          count,
          percentage: totalErrors > 0 ? (count / totalErrors) * 100 : 0
        }))
        .sort((a, b) => b.count - a.count);

      // Group errors by source
      const errorSourceMap = new Map<string, number>();
      recentErrors.forEach(error => {
        if (error.url) {
          errorSourceMap.set(error.url, (errorSourceMap.get(error.url) || 0) + 1);
        }
      });

      const errorsBySource = Array.from(errorSourceMap.entries())
        .map(([sourceId, errorCount]) => ({
          sourceId,
          sourceName: sourceId, // Would fetch actual name from database
          errorCount
        }))
        .sort((a, b) => b.errorCount - a.errorCount)
        .slice(0, 10);

      // Generate error trends (last 7 days)
      const errorTrends = await this.generateErrorTrends(7);

      // Identify common error patterns
      const commonErrorPatterns = this.identifyErrorPatterns(recentErrors);

      // Get recent critical errors
      const recentCriticalErrors = recentErrors
        .filter(error => this.isCriticalError(error))
        .slice(0, 10)
        .map(error => ({
          timestamp: error.timestamp,
          sourceId: error.url || 'unknown',
          errorType: error.type,
          message: error.message
        }));

      return {
        totalErrors,
        errorsByType,
        errorsBySource,
        errorTrends,
        commonErrorPatterns,
        recentCriticalErrors
      };
    } catch (error) {
      console.error('Error getting error analysis data:', error);
      throw error;
    }
  }

  /**
   * Get alert data
   */
  async getAlertData(): Promise<AlertData> {
    try {
      // In a full implementation, this would fetch from alert storage
      // For now, return mock data structure
      return {
        activeAlerts: 0,
        criticalAlerts: 0,
        recentAlerts: [],
        alertsByType: [],
        alertTrends: []
      };
    } catch (error) {
      console.error('Error getting alert data:', error);
      throw error;
    }
  }

  /**
   * Get trend data
   */
  async getTrendData(): Promise<TrendData> {
    try {
      const days = 30; // Last 30 days
      
      const [
        successRateTrend,
        processingTimeTrend,
        grantsFoundTrend,
        sourcesActiveTrend
      ] = await Promise.all([
        this.generateSuccessRateTrend(days),
        this.generateProcessingTimeTrend(days),
        this.generateGrantsFoundTrend(days),
        this.generateSourcesActiveTrend(days)
      ]);

      // Get performance trends for top sources
      const topSources = await this.performanceTracker.getSourceComparison();
      const performanceTrends = new Map<string, PerformanceTrend[]>();
      
      for (const source of topSources.slice(0, 5)) {
        const trends = await this.performanceTracker.getPerformanceTrends(source.sourceId, days);
        performanceTrends.set(source.sourceId, trends);
      }

      return {
        successRateTrend,
        processingTimeTrend,
        grantsFoundTrend,
        sourcesActiveTrend,
        performanceTrends
      };
    } catch (error) {
      console.error('Error getting trend data:', error);
      throw error;
    }
  }

  /**
   * Get recommendation data
   */
  async getRecommendationData(): Promise<RecommendationData> {
    try {
      const [systemRecommendations, sourceRecommendations] = await Promise.all([
        this.generateSystemRecommendations(),
        this.generateSourceRecommendations()
      ]);

      return {
        systemRecommendations,
        sourceRecommendations
      };
    } catch (error) {
      console.error('Error getting recommendation data:', error);
      throw error;
    }
  }

  // Private helper methods

  private async getSourceCounts(): Promise<{
    totalSources: number;
    activeSources: number;
    inactiveSources: number;
  }> {
    const [totalSources, activeSources] = await Promise.all([
      prisma.scrapedSource.count(),
      prisma.scrapedSource.count({ where: { status: 'ACTIVE' } })
    ]);

    return {
      totalSources,
      activeSources,
      inactiveSources: totalSources - activeSources
    };
  }

  private async getGrantsCount(days: number): Promise<number> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
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

  private determineSystemStatus(
    successRate: number,
    activeSources: number
  ): 'healthy' | 'warning' | 'critical' {
    if (successRate < 0.5 || activeSources === 0) {
      return 'critical';
    } else if (successRate < 0.8 || activeSources < 3) {
      return 'warning';
    } else {
      return 'healthy';
    }
  }

  private async getSourceComparisonData(): Promise<SourceComparisonData[]> {
    const sources = await prisma.scrapedSource.findMany({
      include: {
        scrapeJobs: {
          orderBy: { startedAt: 'desc' },
          take: 1
        }
      }
    });

    const comparisonData: SourceComparisonData[] = [];

    for (const source of sources) {
      const performance = await this.performanceTracker.getSourcePerformanceMetrics(source.id);
      
      comparisonData.push({
        sourceId: source.id,
        sourceName: source.url, // Would use actual name if available
        sourceType: source.type,
        performanceScore: performance?.performanceScore || 0,
        successRate: performance?.successRate || 0,
        averageProcessingTime: performance?.averageProcessingTime || 0,
        grantsFound: performance?.averageGrantsFound || 0,
        lastScrape: source.lastScrapedAt,
        status: source.status === 'ACTIVE' ? 'active' : 'inactive'
      });
    }

    return comparisonData.sort((a, b) => b.performanceScore - a.performanceScore);
  }

  private calculatePerformanceDistribution(sources: PerformanceMetrics[]): {
    excellent: number;
    good: number;
    fair: number;
    poor: number;
  } {
    const distribution = { excellent: 0, good: 0, fair: 0, poor: 0 };

    sources.forEach(source => {
      if (source.performanceScore >= 90) {
        distribution.excellent++;
      } else if (source.performanceScore >= 70) {
        distribution.good++;
      } else if (source.performanceScore >= 50) {
        distribution.fair++;
      } else {
        distribution.poor++;
      }
    });

    return distribution;
  }

  private async generateErrorTrends(days: number): Promise<Array<{ date: string; errorCount: number; errorRate: number }>> {
    const trends: Array<{ date: string; errorCount: number; errorRate: number }> = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const [totalJobs, failedJobs] = await Promise.all([
        prisma.scrapeJob.count({
          where: {
            startedAt: { gte: startOfDay, lte: endOfDay }
          }
        }),
        prisma.scrapeJob.count({
          where: {
            startedAt: { gte: startOfDay, lte: endOfDay },
            status: 'FAILED'
          }
        })
      ]);

      trends.push({
        date: startOfDay.toISOString().split('T')[0],
        errorCount: failedJobs,
        errorRate: totalJobs > 0 ? failedJobs / totalJobs : 0
      });
    }

    return trends;
  }

  private identifyErrorPatterns(errors: any[]): Array<{ pattern: string; count: number; description: string }> {
    const patterns = new Map<string, number>();

    errors.forEach(error => {
      const message = error.message.toLowerCase();
      
      if (message.includes('timeout') || message.includes('timed out')) {
        patterns.set('timeout', (patterns.get('timeout') || 0) + 1);
      } else if (message.includes('network') || message.includes('connection')) {
        patterns.set('network', (patterns.get('network') || 0) + 1);
      } else if (message.includes('selector') || message.includes('element not found')) {
        patterns.set('selector', (patterns.get('selector') || 0) + 1);
      } else if (message.includes('rate limit') || message.includes('too many requests')) {
        patterns.set('rate_limit', (patterns.get('rate_limit') || 0) + 1);
      } else {
        patterns.set('other', (patterns.get('other') || 0) + 1);
      }
    });

    const descriptions = {
      timeout: 'Requests are timing out - may indicate slow response times or network issues',
      network: 'Network connectivity issues - check internet connection and proxy settings',
      selector: 'CSS selectors not finding elements - website structure may have changed',
      rate_limit: 'Rate limiting detected - reduce request frequency or implement delays',
      other: 'Various other errors - review individual error messages for patterns'
    };

    return Array.from(patterns.entries())
      .map(([pattern, count]) => ({
        pattern,
        count,
        description: descriptions[pattern as keyof typeof descriptions] || 'Unknown error pattern'
      }))
      .sort((a, b) => b.count - a.count);
  }

  private isCriticalError(error: any): boolean {
    const criticalKeywords = ['critical', 'fatal', 'system', 'database', 'authentication'];
    return criticalKeywords.some(keyword => 
      error.message.toLowerCase().includes(keyword) || 
      error.type.toLowerCase().includes(keyword)
    );
  }

  private async generateSuccessRateTrend(days: number): Promise<Array<{ date: string; successRate: number }>> {
    const trends: Array<{ date: string; successRate: number }> = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const [totalJobs, successfulJobs] = await Promise.all([
        prisma.scrapeJob.count({
          where: {
            startedAt: { gte: startOfDay, lte: endOfDay }
          }
        }),
        prisma.scrapeJob.count({
          where: {
            startedAt: { gte: startOfDay, lte: endOfDay },
            status: 'SUCCESS'
          }
        })
      ]);

      trends.push({
        date: startOfDay.toISOString().split('T')[0],
        successRate: totalJobs > 0 ? successfulJobs / totalJobs : 0
      });
    }

    return trends;
  }

  private async generateProcessingTimeTrend(days: number): Promise<Array<{ date: string; averageTime: number }>> {
    const trends: Array<{ date: string; averageTime: number }> = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const result = await prisma.scrapeJob.aggregate({
        where: {
          startedAt: { gte: startOfDay, lte: endOfDay },
          duration: { not: null }
        },
        _avg: {
          duration: true
        }
      });

      trends.push({
        date: startOfDay.toISOString().split('T')[0],
        averageTime: (result._avg.duration || 0) * 1000 // Convert to milliseconds
      });
    }

    return trends;
  }

  private async generateGrantsFoundTrend(days: number): Promise<Array<{ date: string; grantsFound: number }>> {
    const trends: Array<{ date: string; grantsFound: number }> = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const result = await prisma.scrapeJob.aggregate({
        where: {
          startedAt: { gte: startOfDay, lte: endOfDay },
          status: 'SUCCESS'
        },
        _sum: {
          totalInserted: true,
          totalUpdated: true
        }
      });

      trends.push({
        date: startOfDay.toISOString().split('T')[0],
        grantsFound: (result._sum.totalInserted || 0) + (result._sum.totalUpdated || 0)
      });
    }

    return trends;
  }

  private async generateSourcesActiveTrend(days: number): Promise<Array<{ date: string; activeSources: number }>> {
    // This would track active sources over time
    // For now, return current active sources for all days
    const activeSources = await prisma.scrapedSource.count({ where: { status: 'ACTIVE' } });
    
    const trends: Array<{ date: string; activeSources: number }> = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      trends.push({
        date: date.toISOString().split('T')[0],
        activeSources
      });
    }

    return trends;
  }

  private async generateSystemRecommendations(): Promise<RecommendationData['systemRecommendations']> {
    const metrics = await this.metricsCollector.collectCurrentMetrics();
    const recommendations: RecommendationData['systemRecommendations'] = [];

    if (metrics.successRate < 0.8) {
      recommendations.push({
        type: 'reliability',
        priority: 'high',
        title: 'Improve Overall Success Rate',
        description: `Current success rate is ${(metrics.successRate * 100).toFixed(1)}%, below the 80% target`,
        actionItems: [
          'Review and update CSS selectors for failing sources',
          'Implement better error handling and retry logic',
          'Check for website structure changes'
        ],
        estimatedImpact: 'High - will significantly improve data collection reliability'
      });
    }

    if (metrics.averageProcessingTime > 20000) {
      recommendations.push({
        type: 'performance',
        priority: 'medium',
        title: 'Optimize Processing Speed',
        description: `Average processing time is ${(metrics.averageProcessingTime / 1000).toFixed(1)}s, above optimal range`,
        actionItems: [
          'Implement request caching',
          'Optimize CSS selectors',
          'Use concurrent processing where possible'
        ],
        estimatedImpact: 'Medium - will improve system responsiveness and throughput'
      });
    }

    if (metrics.activeJobs > 20) {
      recommendations.push({
        type: 'optimization',
        priority: 'medium',
        title: 'Manage Job Queue',
        description: `${metrics.activeJobs} jobs are currently active, indicating potential queue backup`,
        actionItems: [
          'Increase concurrent job processing',
          'Implement job prioritization',
          'Review job scheduling frequency'
        ],
        estimatedImpact: 'Medium - will prevent job queue bottlenecks'
      });
    }

    return recommendations;
  }

  private async generateSourceRecommendations(): Promise<RecommendationData['sourceRecommendations']> {
    const sources = await this.performanceTracker.getSourceComparison();
    const recommendations: RecommendationData['sourceRecommendations'] = [];

    sources.forEach(source => {
      if (source.performanceScore < 60) {
        recommendations.push({
          sourceId: source.sourceId,
          sourceName: source.sourceId, // Would use actual name
          recommendations: source.recommendations,
          priority: source.performanceScore < 30 ? 'critical' : 'high'
        });
      }
    });

    return recommendations.slice(0, 10); // Top 10 sources needing attention
  }

  // Cache management methods

  private getCachedData(key: string): any | null {
    const cached = this.dataCache.get(key);
    if (!cached) return null;

    const isExpired = Date.now() - cached.timestamp.getTime() > this.CACHE_TTL;
    if (isExpired) {
      this.dataCache.delete(key);
      return null;
    }

    return cached.data;
  }

  private setCachedData(key: string, data: any): void {
    this.dataCache.set(key, {
      data,
      timestamp: new Date()
    });

    // Auto-expire cache entry
    setTimeout(() => {
      this.dataCache.delete(key);
    }, this.CACHE_TTL);
  }
}