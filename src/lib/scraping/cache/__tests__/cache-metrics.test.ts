/**
 * Tests for CacheMetricsCollector class
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CacheMetricsCollector } from '../cache-metrics';
import { ScrapingCache } from '../scraping-cache';
import { CacheMetrics } from '../cache-config';

// Mock ScrapingCache
const mockCache = {
  getCacheMetrics: vi.fn(),
  getKeysByPattern: vi.fn(),
  getCacheEntryInfo: vi.fn()
} as unknown as ScrapingCache;

describe('CacheMetricsCollector', () => {
  let metricsCollector: CacheMetricsCollector;

  beforeEach(() => {
    metricsCollector = new CacheMetricsCollector(mockCache);
    vi.clearAllMocks();
  });

  describe('Metrics Collection', () => {
    it('should collect current cache metrics', async () => {
      const mockMetrics: CacheMetrics = {
        hits: 100,
        misses: 20,
        hitRate: 0.83,
        totalItems: 50,
        totalSize: 1024000,
        memoryUsage: 0.5,
        averageResponseTime: 25
      };

      (mockCache.getCacheMetrics as any).mockResolvedValue(mockMetrics);

      const metrics = await metricsCollector.collectMetrics();

      expect(metrics).toEqual(mockMetrics);
      expect(mockCache.getCacheMetrics).toHaveBeenCalled();
    });

    it('should maintain metrics history', async () => {
      const mockMetrics: CacheMetrics = {
        hits: 100,
        misses: 20,
        hitRate: 0.83,
        totalItems: 50,
        totalSize: 1024000,
        memoryUsage: 0.5,
        averageResponseTime: 25
      };

      (mockCache.getCacheMetrics as any).mockResolvedValue(mockMetrics);

      await metricsCollector.collectMetrics();
      await metricsCollector.collectMetrics();

      const history = metricsCollector.getMetricsHistory();
      expect(history).toHaveLength(2);
    });

    it('should limit history size', async () => {
      const mockMetrics: CacheMetrics = {
        hits: 100,
        misses: 20,
        hitRate: 0.83,
        totalItems: 50,
        totalSize: 1024000,
        memoryUsage: 0.5,
        averageResponseTime: 25
      };

      (mockCache.getCacheMetrics as any).mockResolvedValue(mockMetrics);

      // Collect more than max history size (100)
      for (let i = 0; i < 105; i++) {
        await metricsCollector.collectMetrics();
      }

      const history = metricsCollector.getMetricsHistory();
      expect(history.length).toBeLessThanOrEqual(100);
    });
  });

  describe('Performance Report Generation', () => {
    it('should generate comprehensive performance report', async () => {
      const mockMetrics: CacheMetrics = {
        hits: 100,
        misses: 20,
        hitRate: 0.83,
        totalItems: 50,
        totalSize: 1024000,
        memoryUsage: 0.5,
        averageResponseTime: 25
      };

      (mockCache.getCacheMetrics as any).mockResolvedValue(mockMetrics);
      (mockCache.getKeysByPattern as any).mockResolvedValue(['key1', 'key2']);
      (mockCache.getCacheEntryInfo as any).mockResolvedValue({
        hits: 10,
        size: 1000,
        cachedAt: Date.now()
      });

      const report = await metricsCollector.generatePerformanceReport();

      expect(report).toMatchObject({
        overall: mockMetrics,
        byType: expect.any(Object),
        topKeys: expect.any(Array),
        recommendations: expect.any(Array),
        generatedAt: expect.any(Date)
      });
    });

    it('should generate metrics by type', async () => {
      const mockMetrics: CacheMetrics = {
        hits: 100,
        misses: 20,
        hitRate: 0.83,
        totalItems: 50,
        totalSize: 1024000,
        memoryUsage: 0.5,
        averageResponseTime: 25
      };

      (mockCache.getCacheMetrics as any).mockResolvedValue(mockMetrics);
      (mockCache.getKeysByPattern as any)
        .mockResolvedValueOnce(['page_content:key1', 'page_content:key2'])
        .mockResolvedValueOnce(['processed_grants:key1'])
        .mockResolvedValueOnce(['source_config:key1'])
        .mockResolvedValueOnce(['metrics:key1']);

      (mockCache.getCacheEntryInfo as any).mockResolvedValue({
        hits: 5,
        size: 500,
        cachedAt: Date.now()
      });

      const report = await metricsCollector.generatePerformanceReport();

      expect(report.byType).toHaveProperty('page_content');
      expect(report.byType).toHaveProperty('processed_grants');
      expect(report.byType).toHaveProperty('source_config');
      expect(report.byType).toHaveProperty('metrics');
    });
  });

  describe('Recommendations Generation', () => {
    it('should recommend cache warming for low hit rate', async () => {
      const mockMetrics: CacheMetrics = {
        hits: 10,
        misses: 40,
        hitRate: 0.2, // Low hit rate
        totalItems: 50,
        totalSize: 1024000,
        memoryUsage: 0.3,
        averageResponseTime: 25
      };

      (mockCache.getCacheMetrics as any).mockResolvedValue(mockMetrics);
      (mockCache.getKeysByPattern as any).mockResolvedValue([]);
      (mockCache.getCacheEntryInfo as any).mockResolvedValue(null);

      const report = await metricsCollector.generatePerformanceReport();

      const warmingRecommendation = report.recommendations.find(
        r => r.type === 'warm_cache'
      );
      expect(warmingRecommendation).toBeDefined();
      expect(warmingRecommendation?.priority).toBe('high');
    });

    it('should recommend memory increase for high usage', async () => {
      const mockMetrics: CacheMetrics = {
        hits: 100,
        misses: 20,
        hitRate: 0.83,
        totalItems: 50,
        totalSize: 1024000,
        memoryUsage: 0.9, // High memory usage
        averageResponseTime: 25
      };

      (mockCache.getCacheMetrics as any).mockResolvedValue(mockMetrics);
      (mockCache.getKeysByPattern as any).mockResolvedValue([]);
      (mockCache.getCacheEntryInfo as any).mockResolvedValue(null);

      const report = await metricsCollector.generatePerformanceReport();

      const memoryRecommendation = report.recommendations.find(
        r => r.type === 'increase_memory'
      );
      expect(memoryRecommendation).toBeDefined();
      expect(memoryRecommendation?.priority).toBe('high');
    });

    it('should recommend TTL increase for popular keys', async () => {
      const mockMetrics: CacheMetrics = {
        hits: 100,
        misses: 20,
        hitRate: 0.83,
        totalItems: 50,
        totalSize: 1024000,
        memoryUsage: 0.5,
        averageResponseTime: 25
      };

      (mockCache.getCacheMetrics as any).mockResolvedValue(mockMetrics);
      (mockCache.getKeysByPattern as any).mockResolvedValue(['key1', 'key2']);
      (mockCache.getCacheEntryInfo as any).mockResolvedValue({
        hits: 15, // High hit count
        size: 1000,
        cachedAt: Date.now()
      });

      const report = await metricsCollector.generatePerformanceReport();

      const ttlRecommendation = report.recommendations.find(
        r => r.type === 'increase_ttl'
      );
      expect(ttlRecommendation).toBeDefined();
    });

    it('should recommend key optimization for large, low-hit keys', async () => {
      const mockMetrics: CacheMetrics = {
        hits: 100,
        misses: 20,
        hitRate: 0.83,
        totalItems: 50,
        totalSize: 1024000,
        memoryUsage: 0.5,
        averageResponseTime: 25
      };

      (mockCache.getCacheMetrics as any).mockResolvedValue(mockMetrics);
      (mockCache.getKeysByPattern as any).mockResolvedValue(['key1']);
      (mockCache.getCacheEntryInfo as any).mockResolvedValue({
        hits: 2, // Low hit count
        size: 200000, // Large size
        cachedAt: Date.now()
      });

      const report = await metricsCollector.generatePerformanceReport();

      const optimizeRecommendation = report.recommendations.find(
        r => r.type === 'optimize_keys'
      );
      expect(optimizeRecommendation).toBeDefined();
    });

    it('should recommend optimization for slow response times', async () => {
      const mockMetrics: CacheMetrics = {
        hits: 100,
        misses: 20,
        hitRate: 0.83,
        totalItems: 50,
        totalSize: 1024000,
        memoryUsage: 0.5,
        averageResponseTime: 150 // Slow response time
      };

      (mockCache.getCacheMetrics as any).mockResolvedValue(mockMetrics);
      (mockCache.getKeysByPattern as any).mockResolvedValue([]);
      (mockCache.getCacheEntryInfo as any).mockResolvedValue(null);

      const report = await metricsCollector.generatePerformanceReport();

      const optimizeRecommendation = report.recommendations.find(
        r => r.type === 'optimize_keys' && r.description.includes('response time')
      );
      expect(optimizeRecommendation).toBeDefined();
    });
  });

  describe('Efficiency Score Calculation', () => {
    it('should calculate high efficiency score for good metrics', async () => {
      const goodMetrics: CacheMetrics = {
        hits: 100,
        misses: 10,
        hitRate: 0.91, // High hit rate
        totalItems: 50,
        totalSize: 1024000,
        memoryUsage: 0.3, // Low memory usage
        averageResponseTime: 20 // Fast response
      };

      const score = metricsCollector.calculateEfficiencyScore(goodMetrics);

      expect(score).toBeGreaterThan(80);
    });

    it('should calculate low efficiency score for poor metrics', async () => {
      const poorMetrics: CacheMetrics = {
        hits: 10,
        misses: 90,
        hitRate: 0.1, // Low hit rate
        totalItems: 50,
        totalSize: 1024000,
        memoryUsage: 0.95, // High memory usage
        averageResponseTime: 300 // Slow response
      };

      const score = metricsCollector.calculateEfficiencyScore(poorMetrics);

      expect(score).toBeLessThan(30);
    });

    it('should handle edge cases in efficiency calculation', async () => {
      const edgeMetrics: CacheMetrics = {
        hits: 0,
        misses: 0,
        hitRate: 0,
        totalItems: 0,
        totalSize: 0,
        memoryUsage: 0,
        averageResponseTime: 0
      };

      const score = metricsCollector.calculateEfficiencyScore(edgeMetrics);

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe('Performance Monitoring', () => {
    it('should monitor performance and log warnings for low efficiency', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const poorMetrics: CacheMetrics = {
        hits: 10,
        misses: 90,
        hitRate: 0.1,
        totalItems: 50,
        totalSize: 1024000,
        memoryUsage: 0.5,
        averageResponseTime: 50
      };

      (mockCache.getCacheMetrics as any).mockResolvedValue(poorMetrics);

      await metricsCollector.monitorPerformance();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Cache efficiency is low'),
        expect.any(Object)
      );

      consoleSpy.mockRestore();
    });

    it('should monitor performance and log errors for critical memory usage', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const criticalMetrics: CacheMetrics = {
        hits: 100,
        misses: 20,
        hitRate: 0.83,
        totalItems: 50,
        totalSize: 1024000,
        memoryUsage: 0.95, // Critical memory usage
        averageResponseTime: 25
      };

      (mockCache.getCacheMetrics as any).mockResolvedValue(criticalMetrics);

      await metricsCollector.monitorPerformance();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Cache memory usage critical:',
        0.95
      );

      consoleSpy.mockRestore();
    });

    it('should monitor performance and warn about poor hit rate', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const poorHitRateMetrics: CacheMetrics = {
        hits: 20,
        misses: 80,
        hitRate: 0.2, // Very low hit rate
        totalItems: 50,
        totalSize: 1024000,
        memoryUsage: 0.5,
        averageResponseTime: 25
      };

      (mockCache.getCacheMetrics as any).mockResolvedValue(poorHitRateMetrics);

      await metricsCollector.monitorPerformance();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Cache hit rate is very low:',
        0.2
      );

      consoleSpy.mockRestore();
    });
  });
});