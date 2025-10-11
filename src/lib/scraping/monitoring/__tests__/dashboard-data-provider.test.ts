/**
 * Tests for DashboardDataProvider
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { DashboardDataProvider } from '../dashboard-data-provider';
import { MetricsCollector } from '../metrics-collector';
import { SourcePerformanceTracker } from '../source-performance-tracker';
import { ErrorTracker } from '../error-tracker';

// Mock dependencies
vi.mock('../metrics-collector');
vi.mock('../source-performance-tracker');
vi.mock('../error-tracker');
vi.mock('@/lib/prisma', () => ({
  prisma: {
    scrapedSource: {
      count: vi.fn(),
      findMany: vi.fn()
    },
    scrapeJob: {
      count: vi.fn(),
      aggregate: vi.fn(),
      findMany: vi.fn()
    }
  }
}));

describe('DashboardDataProvider', () => {
  let dashboardProvider: DashboardDataProvider;
  let mockMetricsCollector: Mock;
  let mockPerformanceTracker: Mock;
  let mockErrorTracker: Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockMetricsCollector = vi.mocked(MetricsCollector);
    mockPerformanceTracker = vi.mocked(SourcePerformanceTracker);
    mockErrorTracker = vi.mocked(ErrorTracker);

    dashboardProvider = new DashboardDataProvider();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getDashboardData', () => {
    it('should return comprehensive dashboard data', async () => {
      // Mock all dependencies
      const mockMetricsInstance = {
        collectCurrentMetrics: vi.fn().mockResolvedValue({
          activeJobs: 5,
          completedJobs: 20,
          failedJobs: 3,
          averageProcessingTime: 12000,
          grantsScrapedToday: 150,
          successRate: 0.87,
          topPerformingSources: [],
          recentErrors: []
        }),
        getRealTimeMetrics: vi.fn().mockResolvedValue({
          timestamp: new Date(),
          activeJobs: 5,
          queuedJobs: 2,
          completedJobsLast24h: 20,
          failedJobsLast24h: 3,
          averageJobDuration: 12000,
          systemLoad: { cpu: 45, memory: 60, diskSpace: 30 },
          networkStats: { requestsPerMinute: 10, averageResponseTime: 2000, errorRate: 0.13 }
        })
      };
      mockMetricsCollector.mockImplementation(() => mockMetricsInstance);

      const mockPerformanceInstance = {
        getSourceComparison: vi.fn().mockResolvedValue([
          { sourceId: 'source1', performanceScore: 95 },
          { sourceId: 'source2', performanceScore: 85 },
          { sourceId: 'source3', performanceScore: 45 }
        ]),
        getPerformanceTrends: vi.fn().mockResolvedValue([
          { period: '2024-01-01', successRate: 0.9, averageProcessingTime: 10000, grantsFound: 50, errorCount: 2 }
        ]),
        checkPerformanceAlerts: vi.fn().mockResolvedValue([])
      };
      mockPerformanceTracker.mockImplementation(() => mockPerformanceInstance);

      const mockErrorInstance = {
        getRecentErrors: vi.fn().mockResolvedValue([
          { type: 'NETWORK_ERROR', message: 'Connection timeout', sourceId: 'source1', timestamp: new Date() }
        ]),
        getErrorStatistics: vi.fn().mockResolvedValue({
          totalErrors: 10,
          errorsByType: { NETWORK_ERROR: 6, PARSING_ERROR: 4 }
        })
      };
      mockErrorTracker.mockImplementation(() => mockErrorInstance);

      // Mock database calls
      const { prisma } = await import('@/lib/prisma');
      (prisma.scrapedSource.count as Mock)
        .mockResolvedValueOnce(15) // Total sources
        .mockResolvedValueOnce(12); // Active sources

      (prisma.scrapeJob.aggregate as Mock)
        .mockResolvedValueOnce({ _sum: { totalInserted: 100, totalUpdated: 50 } }) // Today
        .mockResolvedValueOnce({ _sum: { totalInserted: 500, totalUpdated: 200 } }) // Week
        .mockResolvedValueOnce({ _sum: { totalInserted: 2000, totalUpdated: 800 } }); // Month

      (prisma.scrapedSource.findMany as Mock).mockResolvedValue([
        { id: 'source1', url: 'https://example1.com', type: 'FOUNDATION', status: 'ACTIVE', lastScrapedAt: new Date(), scrapeJobs: [] },
        { id: 'source2', url: 'https://example2.com', type: 'GOV', status: 'ACTIVE', lastScrapedAt: new Date(), scrapeJobs: [] }
      ]);

      const dashboardData = await dashboardProvider.getDashboardData();

      expect(dashboardData).toMatchObject({
        overview: expect.objectContaining({
          totalSources: 15,
          activeSources: 12,
          inactiveSources: 3,
          totalGrantsToday: 150,
          totalGrantsThisWeek: 700,
          totalGrantsThisMonth: 2800,
          successRate: 0.87,
          averageProcessingTime: 12000,
          systemStatus: expect.any(String),
          lastUpdated: expect.any(Date)
        }),
        realTimeMetrics: expect.objectContaining({
          timestamp: expect.any(Date),
          activeJobs: 5,
          queuedJobs: 2,
          completedJobsLast24h: 20,
          failedJobsLast24h: 3
        }),
        sourcePerformance: expect.objectContaining({
          topPerformers: expect.any(Array),
          underPerformers: expect.any(Array),
          sourceComparison: expect.any(Array),
          performanceDistribution: expect.objectContaining({
            excellent: expect.any(Number),
            good: expect.any(Number),
            fair: expect.any(Number),
            poor: expect.any(Number)
          })
        }),
        errorAnalysis: expect.objectContaining({
          totalErrors: expect.any(Number),
          errorsByType: expect.any(Array),
          errorsBySource: expect.any(Array),
          errorTrends: expect.any(Array),
          commonErrorPatterns: expect.any(Array),
          recentCriticalErrors: expect.any(Array)
        }),
        alerts: expect.objectContaining({
          activeAlerts: expect.any(Number),
          criticalAlerts: expect.any(Number),
          recentAlerts: expect.any(Array),
          alertsByType: expect.any(Array),
          alertTrends: expect.any(Array)
        }),
        trends: expect.objectContaining({
          successRateTrend: expect.any(Array),
          processingTimeTrend: expect.any(Array),
          grantsFoundTrend: expect.any(Array),
          sourcesActiveTrend: expect.any(Array),
          performanceTrends: expect.any(Map)
        }),
        recommendations: expect.objectContaining({
          systemRecommendations: expect.any(Array),
          sourceRecommendations: expect.any(Array)
        })
      });
    });

    it('should cache dashboard data for performance', async () => {
      const mockMetricsInstance = {
        collectCurrentMetrics: vi.fn().mockResolvedValue({
          activeJobs: 0, completedJobs: 0, failedJobs: 0, averageProcessingTime: 0,
          grantsScrapedToday: 0, successRate: 0, topPerformingSources: [], recentErrors: []
        }),
        getRealTimeMetrics: vi.fn().mockResolvedValue({
          timestamp: new Date(), activeJobs: 0, queuedJobs: 0, completedJobsLast24h: 0,
          failedJobsLast24h: 0, averageJobDuration: 0,
          systemLoad: { cpu: 0, memory: 0, diskSpace: 0 },
          networkStats: { requestsPerMinute: 0, averageResponseTime: 0, errorRate: 0 }
        })
      };
      mockMetricsCollector.mockImplementation(() => mockMetricsInstance);

      const mockPerformanceInstance = {
        getSourceComparison: vi.fn().mockResolvedValue([]),
        getPerformanceTrends: vi.fn().mockResolvedValue([]),
        checkPerformanceAlerts: vi.fn().mockResolvedValue([])
      };
      mockPerformanceTracker.mockImplementation(() => mockPerformanceInstance);

      const mockErrorInstance = {
        getRecentErrors: vi.fn().mockResolvedValue([]),
        getErrorStatistics: vi.fn().mockResolvedValue({ totalErrors: 0, errorsByType: {} })
      };
      mockErrorTracker.mockImplementation(() => mockErrorInstance);

      const { prisma } = await import('@/lib/prisma');
      (prisma.scrapedSource.count as Mock).mockResolvedValue(0);
      (prisma.scrapeJob.aggregate as Mock).mockResolvedValue({ _sum: { totalInserted: 0, totalUpdated: 0 } });
      (prisma.scrapedSource.findMany as Mock).mockResolvedValue([]);

      // First call
      await dashboardProvider.getDashboardData();
      
      // Second call should use cache
      await dashboardProvider.getDashboardData();

      // Metrics should only be collected once due to caching
      expect(mockMetricsInstance.collectCurrentMetrics).toHaveBeenCalledTimes(1);
    });
  });

  describe('getDashboardOverview', () => {
    it('should return dashboard overview with correct system status', async () => {
      const { prisma } = await import('@/lib/prisma');
      
      (prisma.scrapedSource.count as Mock)
        .mockResolvedValueOnce(10) // Total
        .mockResolvedValueOnce(8);  // Active

      (prisma.scrapeJob.aggregate as Mock)
        .mockResolvedValueOnce({ _sum: { totalInserted: 50, totalUpdated: 25 } }) // Today
        .mockResolvedValueOnce({ _sum: { totalInserted: 300, totalUpdated: 150 } }) // Week
        .mockResolvedValueOnce({ _sum: { totalInserted: 1200, totalUpdated: 600 } }); // Month

      const mockMetricsInstance = {
        collectCurrentMetrics: vi.fn().mockResolvedValue({
          successRate: 0.95,
          averageProcessingTime: 8000
        })
      };
      mockMetricsCollector.mockImplementation(() => mockMetricsInstance);

      const overview = await dashboardProvider.getDashboardOverview();

      expect(overview).toMatchObject({
        totalSources: 10,
        activeSources: 8,
        inactiveSources: 2,
        totalGrantsToday: 75,
        totalGrantsThisWeek: 450,
        totalGrantsThisMonth: 1800,
        successRate: 0.95,
        averageProcessingTime: 8000,
        systemStatus: 'healthy', // High success rate and active sources
        lastUpdated: expect.any(Date)
      });
    });

    it('should determine warning status correctly', async () => {
      const { prisma } = await import('@/lib/prisma');
      
      (prisma.scrapedSource.count as Mock)
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(2); // Low active sources

      (prisma.scrapeJob.aggregate as Mock).mockResolvedValue({ _sum: { totalInserted: 0, totalUpdated: 0 } });

      const mockMetricsInstance = {
        collectCurrentMetrics: vi.fn().mockResolvedValue({
          successRate: 0.75, // Below 0.8 threshold
          averageProcessingTime: 15000
        })
      };
      mockMetricsCollector.mockImplementation(() => mockMetricsInstance);

      const overview = await dashboardProvider.getDashboardOverview();

      expect(overview.systemStatus).toBe('warning');
    });

    it('should determine critical status correctly', async () => {
      const { prisma } = await import('@/lib/prisma');
      
      (prisma.scrapedSource.count as Mock)
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(0); // No active sources

      (prisma.scrapeJob.aggregate as Mock).mockResolvedValue({ _sum: { totalInserted: 0, totalUpdated: 0 } });

      const mockMetricsInstance = {
        collectCurrentMetrics: vi.fn().mockResolvedValue({
          successRate: 0.3, // Very low success rate
          averageProcessingTime: 30000
        })
      };
      mockMetricsCollector.mockImplementation(() => mockMetricsInstance);

      const overview = await dashboardProvider.getDashboardOverview();

      expect(overview.systemStatus).toBe('critical');
    });
  });

  describe('getSourcePerformanceData', () => {
    it('should return source performance data with correct categorization', async () => {
      const mockPerformanceInstance = {
        getSourceComparison: vi.fn().mockResolvedValue([
          { sourceId: 'source1', performanceScore: 95 }, // Excellent
          { sourceId: 'source2', performanceScore: 85 }, // Good
          { sourceId: 'source3', performanceScore: 65 }, // Fair
          { sourceId: 'source4', performanceScore: 45 }, // Poor
          { sourceId: 'source5', performanceScore: 92 }  // Excellent
        ]),
        getSourcePerformanceMetrics: vi.fn()
          .mockResolvedValueOnce({ performanceScore: 95, successRate: 0.98, averageProcessingTime: 5000, averageGrantsFound: 20 })
          .mockResolvedValueOnce({ performanceScore: 85, successRate: 0.90, averageProcessingTime: 8000, averageGrantsFound: 15 })
          .mockResolvedValueOnce({ performanceScore: 65, successRate: 0.75, averageProcessingTime: 15000, averageGrantsFound: 8 })
          .mockResolvedValueOnce({ performanceScore: 45, successRate: 0.60, averageProcessingTime: 25000, averageGrantsFound: 3 })
          .mockResolvedValueOnce({ performanceScore: 92, successRate: 0.95, averageProcessingTime: 6000, averageGrantsFound: 18 })
      };
      mockPerformanceTracker.mockImplementation(() => mockPerformanceInstance);

      const { prisma } = await import('@/lib/prisma');
      (prisma.scrapedSource.findMany as Mock).mockResolvedValue([
        { id: 'source1', url: 'https://example1.com', type: 'FOUNDATION', status: 'ACTIVE', lastScrapedAt: new Date(), scrapeJobs: [] },
        { id: 'source2', url: 'https://example2.com', type: 'GOV', status: 'ACTIVE', lastScrapedAt: new Date(), scrapeJobs: [] },
        { id: 'source3', url: 'https://example3.com', type: 'FOUNDATION', status: 'ACTIVE', lastScrapedAt: new Date(), scrapeJobs: [] },
        { id: 'source4', url: 'https://example4.com', type: 'GOV', status: 'INACTIVE', lastScrapedAt: new Date(), scrapeJobs: [] },
        { id: 'source5', url: 'https://example5.com', type: 'FOUNDATION', status: 'ACTIVE', lastScrapedAt: new Date(), scrapeJobs: [] }
      ]);

      const performanceData = await dashboardProvider.getSourcePerformanceData();

      expect(performanceData).toMatchObject({
        topPerformers: expect.arrayContaining([
          expect.objectContaining({ performanceScore: expect.any(Number) })
        ]),
        underPerformers: expect.arrayContaining([
          expect.objectContaining({ performanceScore: expect.any(Number) })
        ]),
        sourceComparison: expect.any(Array),
        performanceDistribution: {
          excellent: 2, // 2 sources with score >= 90
          good: 1,      // 1 source with score 70-89
          fair: 1,      // 1 source with score 50-69
          poor: 1       // 1 source with score < 50
        }
      });

      expect(performanceData.topPerformers.length).toBeGreaterThan(0);
      expect(performanceData.underPerformers.length).toBeGreaterThan(0);
    });
  });

  describe('getErrorAnalysisData', () => {
    it('should analyze errors and return comprehensive error data', async () => {
      const mockErrors = [
        { type: 'NETWORK_ERROR', message: 'Connection timeout', sourceId: 'source1', timestamp: new Date() },
        { type: 'NETWORK_ERROR', message: 'DNS resolution failed', sourceId: 'source1', timestamp: new Date() },
        { type: 'PARSING_ERROR', message: 'Selector not found', sourceId: 'source2', timestamp: new Date() },
        { type: 'PARSING_ERROR', message: 'Invalid HTML structure', sourceId: 'source2', timestamp: new Date() },
        { type: 'RATE_LIMIT_ERROR', message: 'Too many requests', sourceId: 'source3', timestamp: new Date() }
      ];

      const mockErrorInstance = {
        getRecentErrors: vi.fn().mockResolvedValue(mockErrors),
        getErrorStatistics: vi.fn().mockResolvedValue({
          totalErrors: 5,
          errorsByType: {
            NETWORK_ERROR: 2,
            PARSING_ERROR: 2,
            RATE_LIMIT_ERROR: 1
          }
        })
      };
      mockErrorTracker.mockImplementation(() => mockErrorInstance);

      // Mock database for error trends
      const { prisma } = await import('@/lib/prisma');
      (prisma.scrapeJob.count as Mock)
        .mockResolvedValue(10) // Total jobs
        .mockResolvedValue(2);  // Failed jobs

      const errorAnalysis = await dashboardProvider.getErrorAnalysisData();

      expect(errorAnalysis).toMatchObject({
        totalErrors: 5,
        errorsByType: expect.arrayContaining([
          { type: 'NETWORK_ERROR', count: 2, percentage: 40 },
          { type: 'PARSING_ERROR', count: 2, percentage: 40 },
          { type: 'RATE_LIMIT_ERROR', count: 1, percentage: 20 }
        ]),
        errorsBySource: expect.arrayContaining([
          { sourceId: 'source1', sourceName: 'source1', errorCount: 2 },
          { sourceId: 'source2', sourceName: 'source2', errorCount: 2 },
          { sourceId: 'source3', sourceName: 'source3', errorCount: 1 }
        ]),
        errorTrends: expect.any(Array),
        commonErrorPatterns: expect.any(Array),
        recentCriticalErrors: expect.any(Array)
      });
    });

    it('should identify common error patterns', async () => {
      const mockErrors = [
        { type: 'NETWORK_ERROR', message: 'Connection timeout occurred', sourceId: 'source1', timestamp: new Date() },
        { type: 'NETWORK_ERROR', message: 'Network connection failed', sourceId: 'source2', timestamp: new Date() },
        { type: 'PARSING_ERROR', message: 'CSS selector not found', sourceId: 'source3', timestamp: new Date() },
        { type: 'RATE_LIMIT_ERROR', message: 'Rate limit exceeded', sourceId: 'source4', timestamp: new Date() }
      ];

      const mockErrorInstance = {
        getRecentErrors: vi.fn().mockResolvedValue(mockErrors),
        getErrorStatistics: vi.fn().mockResolvedValue({ totalErrors: 4, errorsByType: {} })
      };
      mockErrorTracker.mockImplementation(() => mockErrorInstance);

      const { prisma } = await import('@/lib/prisma');
      (prisma.scrapeJob.count as Mock).mockResolvedValue(0);

      const errorAnalysis = await dashboardProvider.getErrorAnalysisData();

      expect(errorAnalysis.commonErrorPatterns).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            pattern: 'network',
            count: 2,
            description: expect.stringContaining('Network connectivity issues')
          }),
          expect.objectContaining({
            pattern: 'selector',
            count: 1,
            description: expect.stringContaining('CSS selectors not finding elements')
          }),
          expect.objectContaining({
            pattern: 'rate_limit',
            count: 1,
            description: expect.stringContaining('Rate limiting detected')
          })
        ])
      );
    });
  });

  describe('getTrendData', () => {
    it('should generate trend data for multiple metrics', async () => {
      const { prisma } = await import('@/lib/prisma');
      
      // Mock database calls for trends
      (prisma.scrapeJob.count as Mock)
        .mockResolvedValue(10) // Total jobs
        .mockResolvedValue(8);  // Successful jobs

      (prisma.scrapeJob.aggregate as Mock)
        .mockResolvedValue({
          _avg: { duration: 12 }, // 12 seconds average
          _sum: { totalInserted: 50, totalUpdated: 25 }
        });

      (prisma.scrapedSource.count as Mock).mockResolvedValue(5); // Active sources

      const mockPerformanceInstance = {
        getSourceComparison: vi.fn().mockResolvedValue([
          { sourceId: 'source1', performanceScore: 90 },
          { sourceId: 'source2', performanceScore: 85 }
        ]),
        getPerformanceTrends: vi.fn().mockResolvedValue([
          { period: '2024-01-01', successRate: 0.9, averageProcessingTime: 10000, grantsFound: 50, errorCount: 2 }
        ])
      };
      mockPerformanceTracker.mockImplementation(() => mockPerformanceInstance);

      const trendData = await dashboardProvider.getTrendData();

      expect(trendData).toMatchObject({
        successRateTrend: expect.any(Array),
        processingTimeTrend: expect.any(Array),
        grantsFoundTrend: expect.any(Array),
        sourcesActiveTrend: expect.any(Array),
        performanceTrends: expect.any(Map)
      });

      expect(trendData.successRateTrend.length).toBe(30); // 30 days
      expect(trendData.processingTimeTrend.length).toBe(30);
      expect(trendData.grantsFoundTrend.length).toBe(30);
      expect(trendData.sourcesActiveTrend.length).toBe(30);
    });
  });

  describe('getRecommendationData', () => {
    it('should generate system and source recommendations', async () => {
      const mockMetricsInstance = {
        collectCurrentMetrics: vi.fn().mockResolvedValue({
          successRate: 0.6,  // Below threshold
          averageProcessingTime: 25000, // Above threshold
          activeJobs: 30 // Above threshold
        })
      };
      mockMetricsCollector.mockImplementation(() => mockMetricsInstance);

      const mockPerformanceInstance = {
        getSourceComparison: vi.fn().mockResolvedValue([
          { sourceId: 'source1', performanceScore: 95, recommendations: ['Excellent performance'] },
          { sourceId: 'source2', performanceScore: 45, recommendations: ['Update selectors', 'Check rate limits'] }
        ])
      };
      mockPerformanceTracker.mockImplementation(() => mockPerformanceInstance);

      const recommendations = await dashboardProvider.getRecommendationData();

      expect(recommendations).toMatchObject({
        systemRecommendations: expect.arrayContaining([
          expect.objectContaining({
            type: expect.any(String),
            priority: expect.any(String),
            title: expect.any(String),
            description: expect.any(String),
            actionItems: expect.any(Array),
            estimatedImpact: expect.any(String)
          })
        ]),
        sourceRecommendations: expect.arrayContaining([
          expect.objectContaining({
            sourceId: expect.any(String),
            sourceName: expect.any(String),
            recommendations: expect.any(Array),
            priority: expect.any(String)
          })
        ])
      });

      // Should have recommendations for poor performance
      expect(recommendations.systemRecommendations.length).toBeGreaterThan(0);
      expect(recommendations.sourceRecommendations.length).toBeGreaterThan(0);
    });
  });

  describe('error handling', () => {
    it('should handle errors gracefully', async () => {
      const mockMetricsInstance = {
        collectCurrentMetrics: vi.fn().mockRejectedValue(new Error('Metrics error')),
        getRealTimeMetrics: vi.fn().mockRejectedValue(new Error('Real-time error'))
      };
      mockMetricsCollector.mockImplementation(() => mockMetricsInstance);

      await expect(dashboardProvider.getDashboardData()).rejects.toThrow('Failed to generate dashboard data');
    });

    it('should handle missing data gracefully', async () => {
      const { prisma } = await import('@/lib/prisma');
      
      (prisma.scrapedSource.count as Mock).mockResolvedValue(0);
      (prisma.scrapeJob.aggregate as Mock).mockResolvedValue({ _sum: { totalInserted: null, totalUpdated: null } });

      const mockMetricsInstance = {
        collectCurrentMetrics: vi.fn().mockResolvedValue({
          activeJobs: 0, completedJobs: 0, failedJobs: 0, averageProcessingTime: 0,
          grantsScrapedToday: 0, successRate: 0, topPerformingSources: [], recentErrors: []
        })
      };
      mockMetricsCollector.mockImplementation(() => mockMetricsInstance);

      const overview = await dashboardProvider.getDashboardOverview();

      expect(overview.totalGrantsToday).toBe(0);
      expect(overview.totalGrantsThisWeek).toBe(0);
      expect(overview.totalGrantsThisMonth).toBe(0);
    });
  });
});