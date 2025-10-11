/**
 * Tests for MetricsCollector
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { MetricsCollector } from '../metrics-collector';
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

vi.mock('../source-performance-tracker');
vi.mock('../error-tracker');

describe('MetricsCollector', () => {
  let metricsCollector: MetricsCollector;
  let mockPerformanceTracker: Mock;
  let mockErrorTracker: Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create mock instances
    const mockPerformanceInstance = {
      getSourceComparison: vi.fn().mockResolvedValue([]),
      trackScrapingResult: vi.fn().mockResolvedValue(undefined),
      getSourcePerformanceMetrics: vi.fn().mockResolvedValue(null),
      checkPerformanceAlerts: vi.fn().mockResolvedValue([])
    };
    
    const mockErrorInstance = {
      trackError: vi.fn().mockResolvedValue(undefined),
      getRecentErrors: vi.fn().mockResolvedValue([])
    };
    
    metricsCollector = new MetricsCollector(
      mockPerformanceInstance as any,
      mockErrorInstance as any
    );
    
    mockPerformanceTracker = vi.mocked(SourcePerformanceTracker);
    mockErrorTracker = vi.mocked(ErrorTracker);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('collectCurrentMetrics', () => {
    it('should collect and return current metrics', async () => {
      // Mock database responses
      const { prisma } = await import('@/lib/prisma');
      
      (prisma.scrapeJob.findMany as Mock)
        .mockResolvedValueOnce([]) // Active jobs
        .mockResolvedValueOnce([ // Recent jobs
          { id: '1', status: 'SUCCESS', duration: 10, totalInserted: 5, totalUpdated: 2 },
          { id: '2', status: 'FAILED', duration: 15, totalInserted: 0, totalUpdated: 0 },
          { id: '3', status: 'SUCCESS', duration: 8, totalInserted: 3, totalUpdated: 1 }
        ]);

      (prisma.scrapeJob.aggregate as Mock).mockResolvedValue({
        _sum: { totalInserted: 10, totalUpdated: 5 }
      });

      // Update mock instances for this test
      (metricsCollector as any).performanceTracker.getSourceComparison.mockResolvedValue([
        { sourceId: 'source1', performanceScore: 85 },
        { sourceId: 'source2', performanceScore: 92 }
      ]);

      (metricsCollector as any).errorTracker.getRecentErrors.mockResolvedValue([
        { type: 'NETWORK_ERROR', message: 'Connection timeout', timestamp: new Date() }
      ]);

      const metrics = await metricsCollector.collectCurrentMetrics();

      expect(metrics).toMatchObject({
        activeJobs: 0,
        completedJobs: 2,
        failedJobs: 1,
        grantsScrapedToday: 15,
        successRate: expect.closeTo(0.67, 2),
        averageProcessingTime: expect.any(Number),
        topPerformingSources: expect.any(Array),
        recentErrors: expect.any(Array)
      });
    });

    it('should handle empty data gracefully', async () => {
      const { prisma } = await import('@/lib/prisma');
      
      (prisma.scrapeJob.findMany as Mock).mockResolvedValue([]);
      (prisma.scrapeJob.aggregate as Mock).mockResolvedValue({
        _sum: { totalInserted: 0, totalUpdated: 0 }
      });

      const metrics = await metricsCollector.collectCurrentMetrics();

      expect(metrics).toMatchObject({
        activeJobs: 0,
        completedJobs: 0,
        failedJobs: 0,
        grantsScrapedToday: 0,
        successRate: 0,
        averageProcessingTime: 0,
        topPerformingSources: [],
        recentErrors: []
      });
    });

    it('should cache metrics for performance', async () => {
      const { prisma } = await import('@/lib/prisma');
      
      (prisma.scrapeJob.findMany as Mock).mockResolvedValue([]);
      (prisma.scrapeJob.aggregate as Mock).mockResolvedValue({
        _sum: { totalInserted: 0, totalUpdated: 0 }
      });

      // First call
      await metricsCollector.collectCurrentMetrics();
      
      // Second call should use cache
      await metricsCollector.collectCurrentMetrics();

      // Should only call database once due to caching
      expect(prisma.scrapeJob.findMany).toHaveBeenCalledTimes(2); // Once for active, once for recent
    });
  });

  describe('trackJobCompletion', () => {
    it('should track successful job completion', async () => {
      const { prisma } = await import('@/lib/prisma');
      
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
        totalFound: 10,
        totalInserted: 8,
        totalUpdated: 2,
        totalSkipped: 0,
        errors: [],
        duration: 15000,
        metadata: {}
      };

      (prisma.scrapeJob.update as Mock).mockResolvedValue({});

      await metricsCollector.trackJobCompletion(mockJob, mockResult);

      expect(prisma.scrapeJob.update).toHaveBeenCalledWith({
        where: { id: 'job123' },
        data: {
          status: 'SUCCESS',
          finishedAt: expect.any(Date),
          totalFound: 10,
          totalInserted: 8,
          totalUpdated: 2,
          totalSkipped: 0,
          duration: 15,
          log: null,
          metadata: {}
        }
      });

      expect((metricsCollector as any).performanceTracker.trackScrapingResult).toHaveBeenCalledWith('source1', mockResult);
    });

    it('should track failed job completion', async () => {
      const { prisma } = await import('@/lib/prisma');
      
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
          { type: 'NETWORK_ERROR' as const, message: 'Connection failed', timestamp: new Date() }
        ],
        duration: 5000,
        metadata: {}
      };

      (prisma.scrapeJob.update as Mock).mockResolvedValue({});

      await metricsCollector.trackJobCompletion(mockJob, mockResult);

      expect(prisma.scrapeJob.update).toHaveBeenCalledWith({
        where: { id: 'job456' },
        data: {
          status: 'FAILED',
          finishedAt: expect.any(Date),
          totalFound: 0,
          totalInserted: 0,
          totalUpdated: 0,
          totalSkipped: 0,
          duration: 5,
          log: expect.stringContaining('Connection failed'),
          metadata: {}
        }
      });

      expect((metricsCollector as any).errorTracker.trackError).toHaveBeenCalledWith(
        mockResult.errors[0],
        expect.objectContaining({
          sourceId: 'source2',
          jobId: 'job456'
        })
      );
    });
  });

  describe('generateDailyReport', () => {
    it('should generate comprehensive daily report', async () => {
      const { prisma } = await import('@/lib/prisma');
      
      const testDate = new Date('2024-01-15');
      
      // Mock database calls
      (prisma.scrapedSource.count as Mock)
        .mockResolvedValueOnce(10) // Total sources
        .mockResolvedValueOnce(8);  // Active sources

      (prisma.scrapeJob.findMany as Mock).mockResolvedValue([
        {
          id: '1',
          status: 'SUCCESS',
          totalFound: 5,
          totalInserted: 4,
          totalUpdated: 1,
          duration: 10,
          source: { id: 'source1', url: 'https://example.com', type: 'FOUNDATION' }
        },
        {
          id: '2',
          status: 'FAILED',
          totalFound: 0,
          totalInserted: 0,
          totalUpdated: 0,
          duration: 5,
          source: { id: 'source2', url: 'https://example2.com', type: 'GOV' }
        }
      ]);

      // Update mock performance tracker
      (metricsCollector as any).performanceTracker.getSourceComparison.mockResolvedValue([
        { sourceId: 'source1', performanceScore: 90 },
        { sourceId: 'source2', performanceScore: 45 }
      ]);
      (metricsCollector as any).performanceTracker.checkPerformanceAlerts.mockResolvedValue([]);

      const report = await metricsCollector.generateDailyReport(testDate);

      expect(report).toMatchObject({
        date: '2024-01-15',
        totalSources: 10,
        activeSources: 8,
        successfulScrapes: 1,
        failedScrapes: 1,
        totalGrantsFound: 5,
        totalGrantsInserted: 4,
        totalGrantsUpdated: 1,
        successRate: 0.5,
        averageProcessingTime: expect.any(Number),
        topPerformingSources: expect.any(Array),
        errorSummary: expect.objectContaining({
          totalErrors: expect.any(Number),
          errorsByType: expect.any(Object),
          topErrorSources: expect.any(Array)
        }),
        performanceAlerts: expect.any(Array),
        recommendations: expect.any(Array)
      });
    });

    it('should cache daily reports', async () => {
      const { prisma } = await import('@/lib/prisma');
      
      const testDate = new Date('2024-01-15');
      
      (prisma.scrapedSource.count as Mock).mockResolvedValue(5);
      (prisma.scrapeJob.findMany as Mock).mockResolvedValue([]);

      // Mock instances already set up in beforeEach

      // First call
      await metricsCollector.generateDailyReport(testDate);
      
      // Second call should use cache
      await metricsCollector.generateDailyReport(testDate);

      // Should only call database once due to caching
      expect(prisma.scrapedSource.count).toHaveBeenCalledTimes(2); // Once for total, once for active
    });
  });

  describe('getRealTimeMetrics', () => {
    it('should return real-time system metrics', async () => {
      const { prisma } = await import('@/lib/prisma');
      
      (prisma.scrapeJob.findMany as Mock)
        .mockResolvedValueOnce([{ id: '1' }, { id: '2' }]) // Active jobs
        .mockResolvedValueOnce([{ id: '3' }]) // Queued jobs
        .mockResolvedValueOnce([ // Recent jobs
          { id: '4', status: 'SUCCESS', duration: 10 },
          { id: '5', status: 'FAILED', duration: 5 }
        ]);

      const metrics = await metricsCollector.getRealTimeMetrics();

      expect(metrics).toMatchObject({
        timestamp: expect.any(Date),
        activeJobs: 2,
        queuedJobs: 1,
        completedJobsLast24h: 1,
        failedJobsLast24h: 1,
        averageJobDuration: expect.any(Number),
        systemLoad: expect.objectContaining({
          cpu: expect.any(Number),
          memory: expect.any(Number),
          diskSpace: expect.any(Number)
        }),
        networkStats: expect.objectContaining({
          requestsPerMinute: expect.any(Number),
          averageResponseTime: expect.any(Number),
          errorRate: expect.any(Number)
        })
      });
    });
  });

  describe('getPerformanceBenchmarks', () => {
    it('should return performance benchmarks and recommendations', async () => {
      const { prisma } = await import('@/lib/prisma');
      
      (prisma.scrapeJob.findMany as Mock).mockResolvedValue([]);
      (prisma.scrapeJob.aggregate as Mock).mockResolvedValue({
        _sum: { totalInserted: 0, totalUpdated: 0 }
      });

      (metricsCollector as any).performanceTracker.getSourceComparison.mockResolvedValue([
        { sourceId: 'source1', performanceScore: 85 },
        { sourceId: 'source2', performanceScore: 60 }
      ]);

      const result = await metricsCollector.getPerformanceBenchmarks();

      expect(result).toMatchObject({
        benchmarks: expect.objectContaining({
          targetSuccessRate: expect.any(Number),
          currentSuccessRate: expect.any(Number),
          targetProcessingTime: expect.any(Number),
          currentProcessingTime: expect.any(Number),
          activeSources: expect.any(Number),
          healthySources: expect.any(Number)
        }),
        recommendations: expect.any(Array)
      });
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      const { prisma } = await import('@/lib/prisma');
      
      (prisma.scrapeJob.findMany as Mock).mockRejectedValue(new Error('Database error'));

      await expect(metricsCollector.collectCurrentMetrics()).rejects.toThrow('Failed to collect metrics');
    });

    it('should handle missing data gracefully', async () => {
      const { prisma } = await import('@/lib/prisma');
      
      (prisma.scrapeJob.findMany as Mock).mockResolvedValue(null);
      (prisma.scrapeJob.aggregate as Mock).mockResolvedValue({ _sum: {} });

      // Mock instances already set up in beforeEach

      const metrics = await metricsCollector.collectCurrentMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.grantsScrapedToday).toBe(0);
    });
  });
});