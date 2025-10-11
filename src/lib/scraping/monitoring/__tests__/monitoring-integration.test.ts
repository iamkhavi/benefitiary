/**
 * Integration tests for the complete monitoring system
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { MetricsCollector } from '../metrics-collector';
import { AlertingService, AlertingConfig } from '../alerting-service';
import { DashboardDataProvider } from '../dashboard-data-provider';
import { PerformanceBenchmarker } from '../performance-benchmarker';
import { SourcePerformanceTracker } from '../source-performance-tracker';
import { ErrorTracker } from '../error-tracker';

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
  prisma: {
    scrapeJob: {
      findMany: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
      update: vi.fn(),
      create: vi.fn()
    },
    scrapedSource: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn()
    }
  }
}));

describe('Monitoring System Integration', () => {
  let metricsCollector: MetricsCollector;
  let alertingService: AlertingService;
  let dashboardProvider: DashboardDataProvider;
  let benchmarker: PerformanceBenchmarker;
  let performanceTracker: SourcePerformanceTracker;
  let errorTracker: ErrorTracker;

  const mockAlertingConfig: AlertingConfig = {
    enabled: true,
    checkIntervalMinutes: 5,
    maxAlertsPerHour: 10,
    defaultCooldownMinutes: 15,
    escalationRules: [],
    notificationConfig: {
      console: { enabled: true, logLevel: 'error' }
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    metricsCollector = new MetricsCollector();
    alertingService = new AlertingService(mockAlertingConfig);
    dashboardProvider = new DashboardDataProvider(alertingService);
    benchmarker = new PerformanceBenchmarker();
    performanceTracker = new SourcePerformanceTracker();
    errorTracker = new ErrorTracker();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('End-to-End Monitoring Workflow', () => {
    it('should handle complete scraping job lifecycle with monitoring', async () => {
      const { prisma } = await import('@/lib/prisma');
      
      // Mock a successful scraping scenario
      const mockJob = {
        id: 'job123',
        sourceId: 'source1',
        status: 'RUNNING' as const,
        scheduledAt: new Date(),
        startedAt: new Date(),
        priority: 1,
        metadata: {}
      };

      const mockResult = {
        sourceId: 'source1',
        totalFound: 15,
        totalInserted: 12,
        totalUpdated: 3,
        totalSkipped: 0,
        errors: [],
        duration: 8000,
        metadata: { processingTime: 8000 }
      };

      // Mock database responses
      (prisma.scrapeJob.update as Mock).mockResolvedValue({});
      (prisma.scrapeJob.findMany as Mock)
        .mockResolvedValueOnce([]) // Active jobs
        .mockResolvedValueOnce([mockJob]) // Recent jobs
        .mockResolvedValueOnce([{ ...mockJob, status: 'SUCCESS' }]); // For metrics

      (prisma.scrapeJob.aggregate as Mock).mockResolvedValue({
        _sum: { totalInserted: 12, totalUpdated: 3 }
      });

      (prisma.scrapedSource.count as Mock)
        .mockResolvedValueOnce(5) // Total sources
        .mockResolvedValueOnce(4); // Active sources

      (prisma.scrapedSource.findMany as Mock).mockResolvedValue([
        { id: 'source1', status: 'ACTIVE', url: 'https://example.com', type: 'FOUNDATION', lastScrapedAt: new Date(), scrapeJobs: [] }
      ]);

      (prisma.scrapedSource.findUnique as Mock).mockResolvedValue({
        id: 'source1',
        avgParseTime: 7000,
        scrapeJobs: [{ status: 'SUCCESS', duration: 8 }]
      });

      (prisma.scrapedSource.update as Mock).mockResolvedValue({});

      // Step 1: Track job completion
      await metricsCollector.trackJobCompletion(mockJob, mockResult);

      // Step 2: Collect current metrics
      const metrics = await metricsCollector.collectCurrentMetrics();
      
      expect(metrics).toMatchObject({
        activeJobs: 0,
        completedJobs: expect.any(Number),
        failedJobs: expect.any(Number),
        grantsScrapedToday: 15,
        successRate: expect.any(Number),
        averageProcessingTime: expect.any(Number)
      });

      // Step 3: Check for alerts (should not trigger for good performance)
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      await alertingService.performAlertChecks();
      
      // Should not trigger alerts for good performance
      expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('[System Health Alert]'));
      
      consoleSpy.mockRestore();

      // Step 4: Generate dashboard data
      const dashboardData = await dashboardProvider.getDashboardData();
      
      expect(dashboardData.overview.systemStatus).toBe('healthy');
      expect(dashboardData.overview.totalGrantsToday).toBe(15);

      // Step 5: Generate performance report
      const report = await benchmarker.generatePerformanceReport(7);
      
      expect(report.systemBenchmarks.overall.category).toMatch(/excellent|good/);
      expect(report.keyInsights.length).toBeGreaterThan(0);
    });

    it('should handle failing scraping scenario with alerts', async () => {
      const { prisma } = await import('@/lib/prisma');
      
      // Mock a failing scraping scenario
      const mockJob = {
        id: 'job456',
        sourceId: 'source2',
        status: 'RUNNING' as const,
        scheduledAt: new Date(),
        startedAt: new Date(),
        priority: 1,
        metadata: {}
      };

      const mockResult = {
        sourceId: 'source2',
        totalFound: 0,
        totalInserted: 0,
        totalUpdated: 0,
        totalSkipped: 0,
        errors: [
          { type: 'NETWORK_ERROR' as const, message: 'Connection timeout', timestamp: new Date() }
        ],
        duration: 30000,
        metadata: {}
      };

      // Mock database responses for poor performance
      (prisma.scrapeJob.update as Mock).mockResolvedValue({});
      (prisma.scrapeJob.findMany as Mock)
        .mockResolvedValueOnce([]) // Active jobs
        .mockResolvedValueOnce([
          { ...mockJob, status: 'FAILED', duration: 30 },
          { ...mockJob, id: 'job457', status: 'FAILED', duration: 25 },
          { ...mockJob, id: 'job458', status: 'FAILED', duration: 35 }
        ]); // Recent failed jobs

      (prisma.scrapeJob.aggregate as Mock).mockResolvedValue({
        _sum: { totalInserted: 0, totalUpdated: 0 }
      });

      (prisma.scrapedSource.count as Mock)
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(1); // Only 1 active source (warning condition)

      (prisma.scrapedSource.findMany as Mock).mockResolvedValue([
        { id: 'source2', status: 'ACTIVE', url: 'https://failing.com', type: 'GOV', lastScrapedAt: new Date(), scrapeJobs: [] }
      ]);

      // Step 1: Track failed job completion
      await metricsCollector.trackJobCompletion(mockJob, mockResult);

      // Step 2: Collect metrics (should show poor performance)
      const metrics = await metricsCollector.collectCurrentMetrics();
      
      expect(metrics.successRate).toBe(0); // All jobs failed
      expect(metrics.grantsScrapedToday).toBe(0);

      // Step 3: Check for alerts (should trigger multiple alerts)
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      await alertingService.performAlertChecks();
      
      // Should trigger system health alerts
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[System Health Alert]'));
      
      consoleSpy.mockRestore();

      // Step 4: Generate dashboard data (should show critical status)
      const dashboardData = await dashboardProvider.getDashboardData();
      
      expect(dashboardData.overview.systemStatus).toBe('critical');
      expect(dashboardData.overview.totalGrantsToday).toBe(0);

      // Step 5: Generate performance report (should show poor performance)
      const report = await benchmarker.generatePerformanceReport(7);
      
      expect(report.systemBenchmarks.overall.category).toMatch(/poor|fair/);
      expect(report.optimizationRecommendations.length).toBeGreaterThan(0);
      
      // Should have high priority recommendations
      const highPriorityRecs = report.optimizationRecommendations.filter(r => r.priority === 'high');
      expect(highPriorityRecs.length).toBeGreaterThan(0);
    });
  });

  describe('Cross-Component Data Flow', () => {
    it('should maintain data consistency across components', async () => {
      const { prisma } = await import('@/lib/prisma');
      
      // Setup consistent mock data
      const mockJobs = [
        { id: '1', status: 'SUCCESS', duration: 10, totalInserted: 5, totalUpdated: 2, sourceId: 'source1', startedAt: new Date() },
        { id: '2', status: 'SUCCESS', duration: 8, totalInserted: 8, totalUpdated: 1, sourceId: 'source1', startedAt: new Date() },
        { id: '3', status: 'FAILED', duration: 25, totalInserted: 0, totalUpdated: 0, sourceId: 'source2', startedAt: new Date() }
      ];

      const mockSources = [
        { id: 'source1', status: 'ACTIVE', url: 'https://good.com', type: 'FOUNDATION', lastScrapedAt: new Date(), scrapeJobs: [] },
        { id: 'source2', status: 'ACTIVE', url: 'https://bad.com', type: 'GOV', lastScrapedAt: new Date(), scrapeJobs: [] }
      ];

      // Mock consistent database responses
      (prisma.scrapeJob.findMany as Mock).mockResolvedValue(mockJobs);
      (prisma.scrapeJob.count as Mock).mockResolvedValue(mockJobs.length);
      (prisma.scrapeJob.aggregate as Mock).mockResolvedValue({
        _sum: { totalInserted: 13, totalUpdated: 3 },
        _avg: { duration: 14.33 }
      });

      (prisma.scrapedSource.findMany as Mock).mockResolvedValue(mockSources);
      (prisma.scrapedSource.count as Mock).mockResolvedValue(mockSources.length);

      // Collect metrics from different components
      const metricsFromCollector = await metricsCollector.collectCurrentMetrics();
      const dashboardData = await dashboardProvider.getDashboardData();
      const performanceReport = await benchmarker.generatePerformanceReport(7);

      // Verify data consistency
      expect(metricsFromCollector.grantsScrapedToday).toBe(dashboardData.overview.totalGrantsToday);
      expect(metricsFromCollector.successRate).toBeCloseTo(dashboardData.overview.successRate, 2);
      
      // Success rate should be consistent: 2 success out of 3 jobs = 0.67
      expect(metricsFromCollector.successRate).toBeCloseTo(0.67, 2);
      expect(dashboardData.overview.successRate).toBeCloseTo(0.67, 2);
      expect(performanceReport.systemBenchmarks.successRate.baseline).toBeCloseTo(0.67, 2);
    });

    it('should propagate performance tracking data correctly', async () => {
      const { prisma } = await import('@/lib/prisma');
      
      // Mock source with performance history
      (prisma.scrapedSource.findUnique as Mock).mockResolvedValue({
        id: 'source1',
        avgParseTime: 12000,
        successRate: 0.85,
        failCount: 2,
        lastError: 'Previous timeout',
        scrapeJobs: [
          { status: 'SUCCESS', duration: 10, totalFound: 15, startedAt: new Date(), finishedAt: new Date() },
          { status: 'SUCCESS', duration: 14, totalFound: 12, startedAt: new Date(), finishedAt: new Date() },
          { status: 'FAILED', duration: 20, totalFound: 0, startedAt: new Date(), finishedAt: new Date() }
        ]
      });

      (prisma.scrapeJob.create as Mock).mockResolvedValue({});
      (prisma.scrapedSource.update as Mock).mockResolvedValue({});

      // Track performance
      const performanceMetrics = await performanceTracker.getSourcePerformanceMetrics('source1');
      
      expect(performanceMetrics).toMatchObject({
        sourceId: 'source1',
        totalScrapes: 3,
        successfulScrapes: 2,
        failedScrapes: 1,
        successRate: expect.closeTo(0.67, 2),
        averageProcessingTime: expect.any(Number),
        averageGrantsFound: expect.any(Number),
        performanceScore: expect.any(Number),
        trend: expect.any(String),
        recommendations: expect.any(Array)
      });

      // Verify performance data is used in benchmarking
      (prisma.scrapeJob.findMany as Mock).mockResolvedValue([]);
      (prisma.scrapedSource.findMany as Mock).mockResolvedValue([
        { id: 'source1', status: 'ACTIVE' }
      ]);

      const sourceBenchmark = await benchmarker.benchmarkSource('source1');
      
      expect(sourceBenchmark.sourceId).toBe('source1');
      expect(sourceBenchmark.benchmarks.reliability.baseline).toBeCloseTo(0.67, 2);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle component failures gracefully', async () => {
      const { prisma } = await import('@/lib/prisma');
      
      // Mock database failure
      (prisma.scrapeJob.findMany as Mock).mockRejectedValue(new Error('Database connection failed'));

      // Metrics collector should handle the error
      await expect(metricsCollector.collectCurrentMetrics()).rejects.toThrow('Failed to collect metrics');

      // Dashboard provider should handle the error
      await expect(dashboardProvider.getDashboardData()).rejects.toThrow('Failed to generate dashboard data');

      // Benchmarker should handle the error
      await expect(benchmarker.generatePerformanceReport(7)).rejects.toThrow('Failed to generate performance report');
    });

    it('should continue monitoring despite partial failures', async () => {
      const { prisma } = await import('@/lib/prisma');
      
      // Mock partial database failure
      (prisma.scrapeJob.findMany as Mock)
        .mockResolvedValueOnce([]) // Active jobs succeed
        .mockRejectedValueOnce(new Error('Recent jobs query failed')); // Recent jobs fail

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Alerting should continue despite metrics collection failure
      await alertingService.performAlertChecks();

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Error performing alert checks'));

      consoleSpy.mockRestore();
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large datasets efficiently', async () => {
      const { prisma } = await import('@/lib/prisma');
      
      // Mock large dataset
      const largeMockJobs = Array.from({ length: 1000 }, (_, i) => ({
        id: `job${i}`,
        status: i % 10 === 0 ? 'FAILED' : 'SUCCESS', // 10% failure rate
        duration: Math.floor(Math.random() * 20) + 5, // 5-25 seconds
        totalInserted: Math.floor(Math.random() * 20),
        totalUpdated: Math.floor(Math.random() * 10),
        sourceId: `source${i % 10}`, // 10 sources
        startedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) // Last 30 days
      }));

      (prisma.scrapeJob.findMany as Mock).mockResolvedValue(largeMockJobs);
      (prisma.scrapeJob.count as Mock).mockResolvedValue(largeMockJobs.length);
      (prisma.scrapeJob.aggregate as Mock).mockResolvedValue({
        _sum: { 
          totalInserted: largeMockJobs.reduce((sum, job) => sum + job.totalInserted, 0),
          totalUpdated: largeMockJobs.reduce((sum, job) => sum + job.totalUpdated, 0)
        },
        _avg: { 
          duration: largeMockJobs.reduce((sum, job) => sum + job.duration, 0) / largeMockJobs.length
        }
      });

      (prisma.scrapedSource.findMany as Mock).mockResolvedValue(
        Array.from({ length: 10 }, (_, i) => ({
          id: `source${i}`,
          status: 'ACTIVE',
          url: `https://source${i}.com`,
          type: i % 2 === 0 ? 'FOUNDATION' : 'GOV',
          lastScrapedAt: new Date(),
          scrapeJobs: []
        }))
      );

      (prisma.scrapedSource.count as Mock).mockResolvedValue(10);

      const startTime = Date.now();

      // Test metrics collection performance
      const metrics = await metricsCollector.collectCurrentMetrics();
      
      const metricsTime = Date.now() - startTime;
      expect(metricsTime).toBeLessThan(5000); // Should complete within 5 seconds

      expect(metrics.completedJobs).toBe(900); // 90% success rate
      expect(metrics.failedJobs).toBe(100);
      expect(metrics.successRate).toBeCloseTo(0.9, 1);

      // Test dashboard data generation performance
      const dashboardStartTime = Date.now();
      const dashboardData = await dashboardProvider.getDashboardData();
      
      const dashboardTime = Date.now() - dashboardStartTime;
      expect(dashboardTime).toBeLessThan(10000); // Should complete within 10 seconds

      expect(dashboardData.overview.systemStatus).toBe('healthy'); // 90% success rate is healthy
    });

    it('should use caching effectively', async () => {
      const { prisma } = await import('@/lib/prisma');
      
      (prisma.scrapeJob.findMany as Mock).mockResolvedValue([]);
      (prisma.scrapeJob.aggregate as Mock).mockResolvedValue({
        _sum: { totalInserted: 0, totalUpdated: 0 }
      });
      (prisma.scrapedSource.count as Mock).mockResolvedValue(0);
      (prisma.scrapedSource.findMany as Mock).mockResolvedValue([]);

      // First call should hit database
      await metricsCollector.collectCurrentMetrics();
      
      // Second call should use cache
      await metricsCollector.collectCurrentMetrics();

      // Database should only be called once for each query due to caching
      expect(prisma.scrapeJob.findMany).toHaveBeenCalledTimes(2); // Once for active, once for recent
      
      // Reset mocks and test dashboard caching
      vi.clearAllMocks();
      (prisma.scrapeJob.findMany as Mock).mockResolvedValue([]);
      (prisma.scrapeJob.aggregate as Mock).mockResolvedValue({
        _sum: { totalInserted: 0, totalUpdated: 0 }
      });
      (prisma.scrapedSource.count as Mock).mockResolvedValue(0);
      (prisma.scrapedSource.findMany as Mock).mockResolvedValue([]);

      // First dashboard call
      await dashboardProvider.getDashboardData();
      
      // Second dashboard call should use cache
      await dashboardProvider.getDashboardData();

      // Should have fewer database calls due to caching
      const totalCalls = (prisma.scrapeJob.findMany as Mock).mock.calls.length +
                        (prisma.scrapeJob.aggregate as Mock).mock.calls.length +
                        (prisma.scrapedSource.count as Mock).mock.calls.length +
                        (prisma.scrapedSource.findMany as Mock).mock.calls.length;

      expect(totalCalls).toBeLessThan(20); // Should be significantly reduced due to caching
    });
  });
});