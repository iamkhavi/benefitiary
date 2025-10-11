/**
 * Tests for PerformanceBenchmarker
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { PerformanceBenchmarker } from '../performance-benchmarker';
import { MetricsCollector } from '../metrics-collector';
import { SourcePerformanceTracker } from '../source-performance-tracker';

// Mock dependencies
vi.mock('../metrics-collector');
vi.mock('../source-performance-tracker');
vi.mock('@/lib/prisma', () => ({
  prisma: {
    scrapedSource: {
      findMany: vi.fn()
    },
    scrapeJob: {
      findMany: vi.fn()
    }
  }
}));

describe('PerformanceBenchmarker', () => {
  let benchmarker: PerformanceBenchmarker;
  let mockMetricsCollector: Mock;
  let mockPerformanceTracker: Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockMetricsCollector = vi.mocked(MetricsCollector);
    mockPerformanceTracker = vi.mocked(SourcePerformanceTracker);

    benchmarker = new PerformanceBenchmarker();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('generatePerformanceReport', () => {
    it('should generate comprehensive performance report', async () => {
      // Mock system metrics
      const { prisma } = await import('@/lib/prisma');
      (prisma.scrapeJob.findMany as Mock).mockResolvedValue([
        { id: '1', status: 'SUCCESS', duration: 10, totalInserted: 5, totalUpdated: 2 },
        { id: '2', status: 'FAILED', duration: 15, totalInserted: 0, totalUpdated: 0 },
        { id: '3', status: 'SUCCESS', duration: 8, totalInserted: 3, totalUpdated: 1 }
      ]);

      (prisma.scrapedSource.findMany as Mock).mockResolvedValue([
        { id: 'source1', status: 'ACTIVE' },
        { id: 'source2', status: 'ACTIVE' }
      ]);

      // Mock performance tracker
      const mockPerformanceInstance = {
        getSourcePerformanceMetrics: vi.fn()
          .mockResolvedValueOnce({
            sourceId: 'source1',
            performanceScore: 95,
            successRate: 0.98,
            averageProcessingTime: 5000,
            averageGrantsFound: 20,
            recommendations: ['Excellent performance - maintain current approach']
          })
          .mockResolvedValueOnce({
            sourceId: 'source2',
            performanceScore: 45,
            successRate: 0.60,
            averageProcessingTime: 25000,
            averageGrantsFound: 3,
            recommendations: ['Critical improvement needed - review configuration']
          })
      };
      mockPerformanceTracker.mockImplementation(() => mockPerformanceInstance);

      const report = await benchmarker.generatePerformanceReport(30);

      expect(report).toMatchObject({
        generatedAt: expect.any(Date),
        reportPeriod: {
          startDate: expect.any(Date),
          endDate: expect.any(Date),
          durationDays: 30
        },
        systemBenchmarks: expect.objectContaining({
          overall: expect.objectContaining({
            category: expect.any(String),
            score: expect.any(Number),
            baseline: expect.any(Number),
            target: expect.any(Number),
            improvement: expect.any(Number),
            recommendations: expect.any(Array)
          }),
          successRate: expect.any(Object),
          processingSpeed: expect.any(Object),
          errorRate: expect.any(Object),
          throughput: expect.any(Object),
          reliability: expect.any(Object),
          efficiency: expect.any(Object)
        }),
        sourceBenchmarks: expect.arrayContaining([
          expect.objectContaining({
            sourceId: expect.any(String),
            sourceName: expect.any(String),
            benchmarks: expect.objectContaining({
              performance: expect.any(Object),
              reliability: expect.any(Object),
              speed: expect.any(Object),
              dataQuality: expect.any(Object)
            }),
            overallRating: expect.any(String),
            competitivePosition: expect.any(Number),
            improvementPotential: expect.any(Number)
          })
        ]),
        topPerformers: expect.any(Array),
        underPerformers: expect.any(Array),
        optimizationRecommendations: expect.any(Array),
        keyInsights: expect.any(Array),
        actionPlan: expect.objectContaining({
          immediate: expect.any(Array),
          shortTerm: expect.any(Array),
          longTerm: expect.any(Array)
        })
      });
    });

    it('should categorize sources correctly', async () => {
      const { prisma } = await import('@/lib/prisma');
      (prisma.scrapeJob.findMany as Mock).mockResolvedValue([
        { id: '1', status: 'SUCCESS', duration: 10, totalInserted: 10, totalUpdated: 5 }
      ]);

      (prisma.scrapedSource.findMany as Mock).mockResolvedValue([
        { id: 'excellent-source', status: 'ACTIVE' },
        { id: 'poor-source', status: 'ACTIVE' }
      ]);

      const mockPerformanceInstance = {
        getSourcePerformanceMetrics: vi.fn()
          .mockResolvedValueOnce({
            sourceId: 'excellent-source',
            performanceScore: 95,
            successRate: 0.98,
            averageProcessingTime: 5000,
            averageGrantsFound: 20,
            recommendations: ['Excellent performance']
          })
          .mockResolvedValueOnce({
            sourceId: 'poor-source',
            performanceScore: 25,
            successRate: 0.40,
            averageProcessingTime: 35000,
            averageGrantsFound: 1,
            recommendations: ['Critical improvement needed']
          })
      };
      mockPerformanceTracker.mockImplementation(() => mockPerformanceInstance);

      const report = await benchmarker.generatePerformanceReport(30);

      expect(report.topPerformers).toHaveLength(1);
      expect(report.topPerformers[0].sourceId).toBe('excellent-source');
      expect(report.topPerformers[0].overallRating).toBe('excellent');

      expect(report.underPerformers).toHaveLength(1);
      expect(report.underPerformers[0].sourceId).toBe('poor-source');
      expect(report.underPerformers[0].overallRating).toBe('poor');
    });
  });

  describe('benchmarkSystem', () => {
    it('should benchmark system performance against standards', async () => {
      const { prisma } = await import('@/lib/prisma');
      (prisma.scrapeJob.findMany as Mock).mockResolvedValue([
        { id: '1', status: 'SUCCESS', duration: 8, totalInserted: 10, totalUpdated: 5 },
        { id: '2', status: 'SUCCESS', duration: 12, totalInserted: 8, totalUpdated: 3 },
        { id: '3', status: 'FAILED', duration: 20, totalInserted: 0, totalUpdated: 0 }
      ]);

      const benchmarks = await benchmarker.benchmarkSystem();

      expect(benchmarks).toMatchObject({
        overall: expect.objectContaining({
          category: expect.any(String),
          score: expect.any(Number)
        }),
        successRate: expect.objectContaining({
          category: expect.any(String),
          score: expect.any(Number),
          baseline: expect.closeTo(0.67, 2), // 2 success out of 3
          target: 0.90
        }),
        processingSpeed: expect.objectContaining({
          category: expect.any(String),
          score: expect.any(Number)
        }),
        errorRate: expect.objectContaining({
          category: expect.any(String),
          score: expect.any(Number)
        }),
        throughput: expect.objectContaining({
          category: expect.any(String),
          score: expect.any(Number)
        }),
        reliability: expect.objectContaining({
          category: expect.any(String),
          score: expect.any(Number)
        }),
        efficiency: expect.objectContaining({
          category: expect.any(String),
          score: expect.any(Number)
        })
      });
    });

    it('should categorize excellent performance correctly', async () => {
      const { prisma } = await import('@/lib/prisma');
      (prisma.scrapeJob.findMany as Mock).mockResolvedValue([
        { id: '1', status: 'SUCCESS', duration: 3, totalInserted: 20, totalUpdated: 10 },
        { id: '2', status: 'SUCCESS', duration: 4, totalInserted: 25, totalUpdated: 15 },
        { id: '3', status: 'SUCCESS', duration: 5, totalInserted: 30, totalUpdated: 20 }
      ]);

      const benchmarks = await benchmarker.benchmarkSystem();

      expect(benchmarks.successRate.category).toBe('excellent');
      expect(benchmarks.successRate.baseline).toBe(1.0); // 100% success rate
      expect(benchmarks.processingSpeed.category).toBe('excellent');
    });

    it('should categorize poor performance correctly', async () => {
      const { prisma } = await import('@/lib/prisma');
      (prisma.scrapeJob.findMany as Mock).mockResolvedValue([
        { id: '1', status: 'FAILED', duration: 45, totalInserted: 0, totalUpdated: 0 },
        { id: '2', status: 'FAILED', duration: 50, totalInserted: 0, totalUpdated: 0 },
        { id: '3', status: 'SUCCESS', duration: 60, totalInserted: 1, totalUpdated: 0 }
      ]);

      const benchmarks = await benchmarker.benchmarkSystem();

      expect(benchmarks.successRate.category).toBe('poor');
      expect(benchmarks.successRate.baseline).toBeCloseTo(0.33, 2); // 33% success rate
      expect(benchmarks.processingSpeed.category).toBe('poor');
    });
  });

  describe('benchmarkSource', () => {
    it('should benchmark individual source performance', async () => {
      const { prisma } = await import('@/lib/prisma');
      (prisma.scrapedSource.findMany as Mock).mockResolvedValue([
        { id: 'test-source', status: 'ACTIVE' }
      ]);

      const mockPerformanceInstance = {
        getSourcePerformanceMetrics: vi.fn().mockResolvedValue({
          sourceId: 'test-source',
          performanceScore: 85,
          successRate: 0.90,
          averageProcessingTime: 8000,
          averageGrantsFound: 15,
          recommendations: ['Good performance - minor optimizations possible']
        })
      };
      mockPerformanceTracker.mockImplementation(() => mockPerformanceInstance);

      const benchmark = await benchmarker.benchmarkSource('test-source');

      expect(benchmark).toMatchObject({
        sourceId: 'test-source',
        sourceName: expect.any(String),
        benchmarks: {
          performance: expect.objectContaining({
            category: 'good',
            score: expect.any(Number)
          }),
          reliability: expect.objectContaining({
            category: 'excellent',
            score: expect.any(Number)
          }),
          speed: expect.objectContaining({
            category: 'good',
            score: expect.any(Number)
          }),
          dataQuality: expect.objectContaining({
            category: 'good',
            score: expect.any(Number)
          })
        },
        overallRating: 'good',
        competitivePosition: expect.any(Number),
        improvementPotential: expect.any(Number)
      });
    });

    it('should throw error for non-existent source', async () => {
      const { prisma } = await import('@/lib/prisma');
      (prisma.scrapedSource.findMany as Mock).mockResolvedValue([]);

      const mockPerformanceInstance = {
        getSourcePerformanceMetrics: vi.fn().mockResolvedValue(null)
      };
      mockPerformanceTracker.mockImplementation(() => mockPerformanceInstance);

      await expect(benchmarker.benchmarkSource('non-existent')).rejects.toThrow('No benchmark data found');
    });
  });

  describe('getOptimizationRecommendations', () => {
    it('should generate optimization recommendations based on performance', async () => {
      const { prisma } = await import('@/lib/prisma');
      (prisma.scrapeJob.findMany as Mock).mockResolvedValue([
        { id: '1', status: 'FAILED', duration: 30, totalInserted: 0, totalUpdated: 0 },
        { id: '2', status: 'FAILED', duration: 35, totalInserted: 0, totalUpdated: 0 }
      ]);

      (prisma.scrapedSource.findMany as Mock).mockResolvedValue([
        { id: 'poor-source', status: 'ACTIVE' }
      ]);

      const mockPerformanceInstance = {
        getSourcePerformanceMetrics: vi.fn().mockResolvedValue({
          sourceId: 'poor-source',
          performanceScore: 30,
          successRate: 0.20,
          averageProcessingTime: 32000,
          averageGrantsFound: 0.5,
          recommendations: ['Critical improvement needed']
        })
      };
      mockPerformanceTracker.mockImplementation(() => mockPerformanceInstance);

      const recommendations = await benchmarker.getOptimizationRecommendations();

      expect(recommendations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: expect.any(String),
            priority: expect.any(String),
            title: expect.any(String),
            description: expect.any(String),
            expectedImprovement: expect.objectContaining({
              metric: expect.any(String),
              currentValue: expect.any(Number),
              targetValue: expect.any(Number),
              improvementPercentage: expect.any(Number)
            }),
            implementationEffort: expect.any(String),
            estimatedTimeToImplement: expect.any(String),
            prerequisites: expect.any(Array),
            riskLevel: expect.any(String)
          })
        ])
      );

      // Should have high priority recommendations for poor performance
      const highPriorityRecs = recommendations.filter(r => r.priority === 'high');
      expect(highPriorityRecs.length).toBeGreaterThan(0);
    });

    it('should prioritize recommendations correctly', async () => {
      const { prisma } = await import('@/lib/prisma');
      (prisma.scrapeJob.findMany as Mock).mockResolvedValue([
        { id: '1', status: 'SUCCESS', duration: 5, totalInserted: 10, totalUpdated: 5 }
      ]);

      (prisma.scrapedSource.findMany as Mock).mockResolvedValue([
        { id: 'good-source', status: 'ACTIVE' }
      ]);

      const mockPerformanceInstance = {
        getSourcePerformanceMetrics: vi.fn().mockResolvedValue({
          sourceId: 'good-source',
          performanceScore: 85,
          successRate: 0.95,
          averageProcessingTime: 6000,
          averageGrantsFound: 15,
          recommendations: ['Good performance']
        })
      };
      mockPerformanceTracker.mockImplementation(() => mockPerformanceInstance);

      const recommendations = await benchmarker.getOptimizationRecommendations();

      // Should have fewer and lower priority recommendations for good performance
      const criticalRecs = recommendations.filter(r => r.priority === 'critical');
      expect(criticalRecs.length).toBe(0);
    });
  });

  describe('metric benchmarking', () => {
    it('should benchmark higher-is-better metrics correctly', async () => {
      const { prisma } = await import('@/lib/prisma');
      (prisma.scrapeJob.findMany as Mock).mockResolvedValue([
        { id: '1', status: 'SUCCESS', duration: 5, totalInserted: 10, totalUpdated: 5 }
      ]);

      const benchmarks = await benchmarker.benchmarkSystem();

      // Success rate should be excellent (1.0 >= 0.95)
      expect(benchmarks.successRate.category).toBe('excellent');
      expect(benchmarks.successRate.score).toBe(100);
    });

    it('should benchmark lower-is-better metrics correctly', async () => {
      const { prisma } = await import('@/lib/prisma');
      (prisma.scrapeJob.findMany as Mock).mockResolvedValue([
        { id: '1', status: 'SUCCESS', duration: 3, totalInserted: 10, totalUpdated: 5 } // 3 seconds = 3000ms
      ]);

      const benchmarks = await benchmarker.benchmarkSystem();

      // Processing time should be excellent (3000ms <= 5000ms)
      expect(benchmarks.processingSpeed.category).toBe('excellent');
      expect(benchmarks.processingSpeed.score).toBe(100);
    });

    it('should handle edge cases in metric calculation', async () => {
      const { prisma } = await import('@/lib/prisma');
      (prisma.scrapeJob.findMany as Mock).mockResolvedValue([]); // No jobs

      const benchmarks = await benchmarker.benchmarkSystem();

      // Should handle empty data gracefully
      expect(benchmarks.successRate.baseline).toBe(0);
      expect(benchmarks.processingSpeed.baseline).toBe(0);
      expect(benchmarks.throughput.baseline).toBe(0);
    });
  });

  describe('key insights generation', () => {
    it('should generate meaningful insights from performance data', async () => {
      const { prisma } = await import('@/lib/prisma');
      (prisma.scrapeJob.findMany as Mock).mockResolvedValue([
        { id: '1', status: 'SUCCESS', duration: 8, totalInserted: 15, totalUpdated: 5 },
        { id: '2', status: 'SUCCESS', duration: 10, totalInserted: 12, totalUpdated: 3 },
        { id: '3', status: 'FAILED', duration: 25, totalInserted: 0, totalUpdated: 0 }
      ]);

      (prisma.scrapedSource.findMany as Mock).mockResolvedValue([
        { id: 'source1', status: 'ACTIVE' },
        { id: 'source2', status: 'ACTIVE' }
      ]);

      const mockPerformanceInstance = {
        getSourcePerformanceMetrics: vi.fn()
          .mockResolvedValueOnce({
            sourceId: 'source1',
            performanceScore: 90,
            successRate: 0.95,
            averageProcessingTime: 8000,
            averageGrantsFound: 15,
            recommendations: ['Excellent performance']
          })
          .mockResolvedValueOnce({
            sourceId: 'source2',
            performanceScore: 40,
            successRate: 0.60,
            averageProcessingTime: 20000,
            averageGrantsFound: 5,
            recommendations: ['Needs improvement']
          })
      };
      mockPerformanceTracker.mockImplementation(() => mockPerformanceInstance);

      const report = await benchmarker.generatePerformanceReport(30);

      expect(report.keyInsights).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Overall system performance'),
          expect.stringContaining('Success rate'),
          expect.stringContaining('sources are performing excellently'),
          expect.stringContaining('improvement potential')
        ])
      );
    });
  });

  describe('action plan creation', () => {
    it('should create prioritized action plan', async () => {
      const { prisma } = await import('@/lib/prisma');
      (prisma.scrapeJob.findMany as Mock).mockResolvedValue([
        { id: '1', status: 'FAILED', duration: 40, totalInserted: 0, totalUpdated: 0 }
      ]);

      (prisma.scrapedSource.findMany as Mock).mockResolvedValue([
        { id: 'critical-source', status: 'ACTIVE' }
      ]);

      const mockPerformanceInstance = {
        getSourcePerformanceMetrics: vi.fn().mockResolvedValue({
          sourceId: 'critical-source',
          performanceScore: 20,
          successRate: 0.10,
          averageProcessingTime: 40000,
          averageGrantsFound: 0.1,
          recommendations: ['Critical improvement needed']
        })
      };
      mockPerformanceTracker.mockImplementation(() => mockPerformanceInstance);

      const report = await benchmarker.generatePerformanceReport(30);

      expect(report.actionPlan).toMatchObject({
        immediate: expect.any(Array),
        shortTerm: expect.any(Array),
        longTerm: expect.any(Array)
      });

      // Should have immediate actions for critical issues
      expect(report.actionPlan.immediate.length).toBeGreaterThan(0);
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      const { prisma } = await import('@/lib/prisma');
      (prisma.scrapeJob.findMany as Mock).mockRejectedValue(new Error('Database error'));

      await expect(benchmarker.generatePerformanceReport(30)).rejects.toThrow('Failed to generate performance report');
    });

    it('should handle missing performance data', async () => {
      const { prisma } = await import('@/lib/prisma');
      (prisma.scrapeJob.findMany as Mock).mockResolvedValue([]);
      (prisma.scrapedSource.findMany as Mock).mockResolvedValue([
        { id: 'source1', status: 'ACTIVE' }
      ]);

      const mockPerformanceInstance = {
        getSourcePerformanceMetrics: vi.fn().mockResolvedValue(null)
      };
      mockPerformanceTracker.mockImplementation(() => mockPerformanceInstance);

      const report = await benchmarker.generatePerformanceReport(30);

      expect(report.sourceBenchmarks).toHaveLength(0);
      expect(report.topPerformers).toHaveLength(0);
      expect(report.underPerformers).toHaveLength(0);
    });
  });
});