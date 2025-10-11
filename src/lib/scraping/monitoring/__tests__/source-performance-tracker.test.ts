/**
 * Tests for SourcePerformanceTracker class
 * Covers performance metrics tracking, analysis, and alerting
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SourcePerformanceTracker, PerformanceMetrics } from '../source-performance-tracker';
import { ScrapingResult } from '../../types';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    scrapeJob: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    scrapedSource: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    }
  }
}));

// Get the mocked prisma for test assertions
const { prisma: mockPrisma } = await import('@/lib/prisma');

describe('SourcePerformanceTracker', () => {
  let tracker: SourcePerformanceTracker;

  beforeEach(() => {
    tracker = new SourcePerformanceTracker();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('trackScrapingResult', () => {
    const sampleResult: ScrapingResult = {
      sourceId: 'source-1',
      totalFound: 10,
      totalInserted: 8,
      totalUpdated: 2,
      totalSkipped: 0,
      errors: [],
      duration: 5000,
      metadata: { userAgent: 'test' }
    };

    it('should track successful scraping result', async () => {
      mockPrisma.scrapeJob.create.mockResolvedValue({});
      mockPrisma.scrapedSource.findUnique.mockResolvedValue({
        id: 'source-1',
        avgParseTime: 4000
      });
      mockPrisma.scrapeJob.findMany.mockResolvedValue([
        { status: 'SUCCESS' },
        { status: 'SUCCESS' },
        { status: 'FAILED' }
      ]);
      mockPrisma.scrapedSource.update.mockResolvedValue({});

      await tracker.trackScrapingResult('source-1', sampleResult);

      expect(mockPrisma.scrapeJob.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          sourceId: 'source-1',
          status: 'SUCCESS',
          totalFound: 10,
          totalInserted: 8,
          totalUpdated: 2,
          totalSkipped: 0,
          duration: 5,
          log: null,
          metadata: { userAgent: 'test' }
        })
      });

      expect(mockPrisma.scrapedSource.update).toHaveBeenCalledWith({
        where: { id: 'source-1' },
        data: expect.objectContaining({
          lastScrapedAt: expect.any(Date),
          failCount: 0,
          lastError: null,
          avgParseTime: expect.any(Number),
          successRate: expect.any(Number)
        })
      });
    });

    it('should track failed scraping result', async () => {
      const failedResult: ScrapingResult = {
        ...sampleResult,
        errors: [
          {
            type: 'NETWORK',
            message: 'Connection timeout',
            timestamp: new Date()
          }
        ]
      };

      mockPrisma.scrapeJob.create.mockResolvedValue({});
      mockPrisma.scrapedSource.findUnique.mockResolvedValue({
        id: 'source-1',
        avgParseTime: 4000
      });
      mockPrisma.scrapeJob.findMany.mockResolvedValue([]);
      mockPrisma.scrapedSource.update.mockResolvedValue({});

      await tracker.trackScrapingResult('source-1', failedResult);

      expect(mockPrisma.scrapeJob.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: 'FAILED',
          log: JSON.stringify(failedResult.errors)
        })
      });

      expect(mockPrisma.scrapedSource.update).toHaveBeenCalledWith({
        where: { id: 'source-1' },
        data: expect.objectContaining({
          failCount: { increment: 1 },
          lastError: 'Connection timeout'
        })
      });
    });

    it('should handle tracking errors gracefully', async () => {
      mockPrisma.scrapeJob.create.mockRejectedValue(new Error('Database error'));

      // Should not throw error
      await expect(tracker.trackScrapingResult('source-1', sampleResult)).resolves.toBeUndefined();
    });
  });

  describe('getSourcePerformanceMetrics', () => {
    it('should return comprehensive performance metrics', async () => {
      const mockSource = {
        id: 'source-1',
        failCount: 2,
        lastError: 'Network timeout',
        scrapeJobs: [
          {
            status: 'SUCCESS',
            duration: 5,
            totalFound: 10,
            finishedAt: new Date('2024-01-15')
          },
          {
            status: 'SUCCESS',
            duration: 4,
            totalFound: 8,
            finishedAt: new Date('2024-01-14')
          },
          {
            status: 'FAILED',
            duration: 10,
            totalFound: 0,
            finishedAt: new Date('2024-01-13')
          }
        ]
      };

      mockPrisma.scrapedSource.findUnique.mockResolvedValue(mockSource);

      const result = await tracker.getSourcePerformanceMetrics('source-1');

      expect(result).toBeDefined();
      expect(result?.sourceId).toBe('source-1');
      expect(result?.totalScrapes).toBe(3);
      expect(result?.successfulScrapes).toBe(2);
      expect(result?.failedScrapes).toBe(1);
      expect(result?.successRate).toBeCloseTo(0.667, 2);
      expect(result?.averageProcessingTime).toBeCloseTo(6333, 0); // (5+4+10)/3 * 1000
      expect(result?.averageGrantsFound).toBeCloseTo(6, 0); // (10+8+0)/3
      expect(result?.lastError).toBe('Network timeout');
      expect(result?.performanceScore).toBeGreaterThan(0);
      expect(result?.trend).toMatch(/improving|stable|declining/);
      expect(result?.recommendations).toBeInstanceOf(Array);
    });

    it('should return null for non-existent source', async () => {
      mockPrisma.scrapedSource.findUnique.mockResolvedValue(null);

      const result = await tracker.getSourcePerformanceMetrics('non-existent');

      expect(result).toBeNull();
    });

    it('should return empty metrics for source with no jobs', async () => {
      const mockSource = {
        id: 'source-1',
        failCount: 0,
        scrapeJobs: []
      };

      mockPrisma.scrapedSource.findUnique.mockResolvedValue(mockSource);

      const result = await tracker.getSourcePerformanceMetrics('source-1');

      expect(result).toBeDefined();
      expect(result?.totalScrapes).toBe(0);
      expect(result?.successRate).toBe(0);
      expect(result?.performanceScore).toBe(0);
      expect(result?.recommendations).toContain('No scraping data available - run initial scrape to establish baseline metrics');
    });
  });

  describe('getPerformanceTrends', () => {
    it('should return daily performance trends', async () => {
      const mockJobs = [
        {
          startedAt: new Date('2024-01-15T10:00:00Z'),
          status: 'SUCCESS',
          duration: 5,
          totalFound: 10
        },
        {
          startedAt: new Date('2024-01-15T14:00:00Z'),
          status: 'FAILED',
          duration: 8,
          totalFound: 0
        },
        {
          startedAt: new Date('2024-01-14T10:00:00Z'),
          status: 'SUCCESS',
          duration: 4,
          totalFound: 8
        }
      ];

      mockPrisma.scrapeJob.findMany.mockResolvedValue(mockJobs);

      const result = await tracker.getPerformanceTrends('source-1', 7);

      expect(result).toHaveLength(2); // 2 days with data
      
      // Results are sorted by date, so 2024-01-15 comes first
      expect(result[0].period).toBe('2024-01-15');
      expect(result[0].successRate).toBe(0.5); // 1 success out of 2
      expect(result[0].grantsFound).toBe(10);
      expect(result[0].errorCount).toBe(1);

      expect(result[1].period).toBe('2024-01-14');
      expect(result[1].successRate).toBe(1); // 1 success out of 1
      expect(result[1].grantsFound).toBe(8);
      expect(result[1].errorCount).toBe(0);
    });

    it('should handle empty job history', async () => {
      mockPrisma.scrapeJob.findMany.mockResolvedValue([]);

      const result = await tracker.getPerformanceTrends('source-1', 7);

      expect(result).toHaveLength(0);
    });
  });

  describe('getSourceComparison', () => {
    it('should return performance comparison across sources', async () => {
      const mockSources = [
        {
          id: 'source-1',
          status: 'ACTIVE',
          scrapeJobs: [
            { status: 'SUCCESS', duration: 5, totalFound: 10 },
            { status: 'SUCCESS', duration: 4, totalFound: 8 }
          ]
        },
        {
          id: 'source-2',
          status: 'ACTIVE',
          scrapeJobs: [
            { status: 'FAILED', duration: 10, totalFound: 0 },
            { status: 'SUCCESS', duration: 6, totalFound: 5 }
          ]
        }
      ];

      mockPrisma.scrapedSource.findMany.mockResolvedValue(mockSources);
      mockPrisma.scrapedSource.findUnique
        .mockResolvedValueOnce(mockSources[0])
        .mockResolvedValueOnce(mockSources[1]);

      const result = await tracker.getSourceComparison();

      expect(result).toHaveLength(2);
      expect(result[0].performanceScore).toBeGreaterThanOrEqual(result[1].performanceScore);
    });
  });

  describe('checkPerformanceAlerts', () => {
    it('should generate alerts for poor performance', async () => {
      const mockSource = {
        id: 'source-1',
        scrapeJobs: [
          { status: 'FAILED', duration: 35, totalFound: 0 }, // Slow and failed
          { status: 'FAILED', duration: 30, totalFound: 0 }, // Slow and failed
          { status: 'SUCCESS', duration: 25, totalFound: 0 } // Slow but successful, no grants
        ]
      };

      mockPrisma.scrapedSource.findUnique.mockResolvedValue(mockSource);

      const alerts = await tracker.checkPerformanceAlerts('source-1');

      expect(alerts.length).toBeGreaterThan(0);
      
      const alertTypes = alerts.map(alert => alert.alertType);
      expect(alertTypes).toContain('performance_degradation'); // Low success rate
      expect(alertTypes).toContain('high_error_rate'); // High error rate
      expect(alertTypes).toContain('no_data'); // No grants found
      
      // Note: slow_response alert depends on response time threshold (30s)
      // The durations are in seconds, so 35s should trigger slow response alert
      // But the threshold check is against averageResponseTime which equals averageProcessingTime
    });

    it('should not generate alerts for good performance', async () => {
      const mockSource = {
        id: 'source-1',
        scrapeJobs: [
          { status: 'SUCCESS', duration: 5, totalFound: 10 },
          { status: 'SUCCESS', duration: 4, totalFound: 8 },
          { status: 'SUCCESS', duration: 6, totalFound: 12 }
        ]
      };

      mockPrisma.scrapedSource.findUnique.mockResolvedValue(mockSource);

      const alerts = await tracker.checkPerformanceAlerts('source-1');

      expect(alerts).toHaveLength(0);
    });

    it('should handle missing source gracefully', async () => {
      mockPrisma.scrapedSource.findUnique.mockResolvedValue(null);

      const alerts = await tracker.checkPerformanceAlerts('non-existent');

      expect(alerts).toHaveLength(0);
    });
  });

  describe('performance score calculation', () => {
    it('should calculate high score for excellent performance', async () => {
      const mockSource = {
        id: 'source-1',
        scrapeJobs: [
          { status: 'SUCCESS', duration: 3, totalFound: 15 },
          { status: 'SUCCESS', duration: 2, totalFound: 12 },
          { status: 'SUCCESS', duration: 4, totalFound: 18 }
        ]
      };

      mockPrisma.scrapedSource.findUnique.mockResolvedValue(mockSource);

      const result = await tracker.getSourcePerformanceMetrics('source-1');

      expect(result?.performanceScore).toBeGreaterThan(80);
    });

    it('should calculate low score for poor performance', async () => {
      const mockSource = {
        id: 'source-1',
        scrapeJobs: [
          { status: 'FAILED', duration: 30, totalFound: 0 },
          { status: 'FAILED', duration: 25, totalFound: 0 },
          { status: 'FAILED', duration: 35, totalFound: 0 }
        ]
      };

      mockPrisma.scrapedSource.findUnique.mockResolvedValue(mockSource);

      const result = await tracker.getSourcePerformanceMetrics('source-1');

      expect(result?.performanceScore).toBeLessThan(30);
    });
  });

  describe('trend calculation', () => {
    it('should detect improving trend', async () => {
      const mockSource = {
        id: 'source-1',
        scrapeJobs: [
          // Recent jobs (better performance)
          ...Array(10).fill(null).map(() => ({ status: 'SUCCESS', duration: 5, totalFound: 10 })),
          // Older jobs (worse performance)
          ...Array(10).fill(null).map(() => ({ status: 'FAILED', duration: 10, totalFound: 0 }))
        ]
      };

      mockPrisma.scrapedSource.findUnique.mockResolvedValue(mockSource);

      const result = await tracker.getSourcePerformanceMetrics('source-1');

      expect(result?.trend).toBe('improving');
    });

    it('should detect declining trend', async () => {
      const mockSource = {
        id: 'source-1',
        scrapeJobs: [
          // Recent jobs (worse performance)
          ...Array(10).fill(null).map(() => ({ status: 'FAILED', duration: 10, totalFound: 0 })),
          // Older jobs (better performance)
          ...Array(10).fill(null).map(() => ({ status: 'SUCCESS', duration: 5, totalFound: 10 }))
        ]
      };

      mockPrisma.scrapedSource.findUnique.mockResolvedValue(mockSource);

      const result = await tracker.getSourcePerformanceMetrics('source-1');

      expect(result?.trend).toBe('declining');
    });

    it('should detect stable trend', async () => {
      const mockSource = {
        id: 'source-1',
        scrapeJobs: Array(20).fill(null).map(() => ({ status: 'SUCCESS', duration: 5, totalFound: 10 }))
      };

      mockPrisma.scrapedSource.findUnique.mockResolvedValue(mockSource);

      const result = await tracker.getSourcePerformanceMetrics('source-1');

      expect(result?.trend).toBe('stable');
    });
  });

  describe('recommendations generation', () => {
    it('should generate specific recommendations for different issues', async () => {
      const mockSource = {
        id: 'source-1',
        failCount: 5,
        scrapeJobs: [
          { status: 'FAILED', duration: 20, totalFound: 0 },
          { status: 'FAILED', duration: 18, totalFound: 0 }
        ]
      };

      mockPrisma.scrapedSource.findUnique.mockResolvedValue(mockSource);

      const result = await tracker.getSourcePerformanceMetrics('source-1');

      expect(result?.recommendations).toContain('Consider reviewing and updating CSS selectors - low success rate may indicate website changes');
      expect(result?.recommendations).toContain('Optimize scraping speed by reducing delay between requests or using more efficient selectors');
      expect(result?.recommendations).toContain('Review source configuration - very few grants found may indicate parsing issues');
      expect(result?.recommendations).toContain('Investigate frequent errors - consider implementing better error handling or rate limiting');
      expect(result?.recommendations).toContain('Source may need maintenance - consider temporarily disabling until issues are resolved');
    });

    it('should provide positive feedback for good performance', async () => {
      const mockSource = {
        id: 'source-1',
        failCount: 0,
        scrapeJobs: [
          { status: 'SUCCESS', duration: 3, totalFound: 15 },
          { status: 'SUCCESS', duration: 2, totalFound: 12 }
        ]
      };

      mockPrisma.scrapedSource.findUnique.mockResolvedValue(mockSource);

      const result = await tracker.getSourcePerformanceMetrics('source-1');

      expect(result?.recommendations).toContain('Source is performing well - no immediate action required');
    });
  });
});