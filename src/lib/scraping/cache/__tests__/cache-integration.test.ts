/**
 * Integration tests for caching functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ScrapingCache } from '../scraping-cache';
import { CacheMetricsCollector } from '../cache-metrics';
import { CacheWarmingService } from '../cache-warming';
import { CacheConfig } from '../cache-config';

// Mock Redis for integration tests
vi.mock('ioredis', () => {
  const mockData = new Map<string, string>();
  const mockExpiry = new Map<string, number>();

  const mockRedis = {
    setex: vi.fn().mockImplementation((key: string, ttl: number, value: string) => {
      mockData.set(key, value);
      mockExpiry.set(key, Date.now() + ttl * 1000);
      return Promise.resolve('OK');
    }),
    get: vi.fn().mockImplementation((key: string) => {
      const expiry = mockExpiry.get(key);
      if (expiry && Date.now() > expiry) {
        mockData.delete(key);
        mockExpiry.delete(key);
        return Promise.resolve(null);
      }
      return Promise.resolve(mockData.get(key) || null);
    }),
    del: vi.fn().mockImplementation((key: string) => {
      const existed = mockData.has(key);
      mockData.delete(key);
      mockExpiry.delete(key);
      return Promise.resolve(existed ? 1 : 0);
    }),
    flushdb: vi.fn().mockImplementation(() => {
      mockData.clear();
      mockExpiry.clear();
      return Promise.resolve('OK');
    }),
    keys: vi.fn().mockImplementation((pattern: string) => {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      return Promise.resolve(
        Array.from(mockData.keys()).filter(key => regex.test(key))
      );
    }),
    dbsize: vi.fn().mockImplementation(() => {
      return Promise.resolve(mockData.size);
    }),
    info: vi.fn().mockResolvedValue('used_memory:2048\nmaxmemory:10240'),
    ping: vi.fn().mockResolvedValue('PONG'),
    quit: vi.fn().mockResolvedValue('OK'),
    expire: vi.fn().mockImplementation((key: string, ttl: number) => {
      if (mockData.has(key)) {
        mockExpiry.set(key, Date.now() + ttl * 1000);
        return Promise.resolve(1);
      }
      return Promise.resolve(0);
    }),
    pipeline: vi.fn().mockImplementation(() => {
      const keysToDelete: string[] = [];
      return {
        del: vi.fn().mockImplementation((key: string) => {
          keysToDelete.push(key);
          return this;
        }),
        exec: vi.fn().mockImplementation(() => {
          keysToDelete.forEach(key => {
            mockData.delete(key);
            mockExpiry.delete(key);
          });
          return Promise.resolve([]);
        })
      };
    }),
    on: vi.fn()
  };

  return {
    default: vi.fn(() => mockRedis)
  };
});

describe('Cache Integration Tests', () => {
  let cache: ScrapingCache;
  let metricsCollector: CacheMetricsCollector;
  let warmingService: CacheWarmingService;

  beforeEach(async () => {
    const config: Partial<CacheConfig> = {
      ttl: 3600,
      redis: {
        host: 'localhost',
        port: 6379,
        db: 0,
        keyPrefix: 'test:'
      }
    };

    cache = new ScrapingCache(config);
    metricsCollector = new CacheMetricsCollector(cache);
    warmingService = new CacheWarmingService(cache);
  });

  afterEach(async () => {
    await cache.clearCache();
    await cache.disconnect();
    vi.clearAllMocks();
  });

  describe('End-to-End Cache Operations', () => {
    it('should perform complete cache lifecycle', async () => {
      const url = 'https://example.com/grants';
      const content = '<html><body>Grant content</body></html>';
      const sourceId = 'test-source';
      const grants = [
        { id: '1', title: 'Grant 1', sourceId },
        { id: '2', title: 'Grant 2', sourceId }
      ];

      // 1. Cache page content
      await cache.cachePageContent(url, content);
      
      // 2. Cache processed grants
      await cache.cacheProcessedGrants(sourceId, grants);
      
      // 3. Verify cached content can be retrieved
      const cachedContent = await cache.getCachedContent(url);
      const cachedGrants = await cache.getCachedGrants(sourceId);
      
      expect(cachedContent).toBe(content);
      expect(cachedGrants).toEqual(grants);
      
      // 4. Collect metrics
      const metrics = await metricsCollector.collectMetrics();
      expect(metrics.totalItems).toBeGreaterThan(0);
      
      // 5. Generate performance report
      const report = await metricsCollector.generatePerformanceReport();
      expect(report.overall).toBeDefined();
      expect(report.recommendations).toBeDefined();
      
      // 6. Invalidate cache
      await cache.invalidateSourceCache(sourceId);
      
      // 7. Verify cache is invalidated
      const invalidatedGrants = await cache.getCachedGrants(sourceId);
      expect(invalidatedGrants).toBeNull();
    });

    it('should handle cache warming workflow', async () => {
      // 1. Execute warming cycle
      const results = await warmingService.executeWarmingCycle();
      
      expect(results.length).toBeGreaterThan(0);
      expect(results.every(r => r.executedAt instanceof Date)).toBe(true);
      
      // 2. Verify cache has been warmed
      const metrics = await metricsCollector.collectMetrics();
      expect(metrics.totalItems).toBeGreaterThan(0);
      
      // 3. Check that strategies were executed
      const strategies = warmingService.getStrategies();
      const executedStrategies = strategies.filter(s => s.lastExecuted);
      expect(executedStrategies.length).toBeGreaterThan(0);
    });

    it('should handle cache invalidation by content change', async () => {
      const sourceId = 'test-source';
      const urls = [
        'https://example.com/page1',
        'https://example.com/page2'
      ];
      
      // Cache content for multiple URLs
      await cache.cachePageContent(urls[0], 'Content 1');
      await cache.cachePageContent(urls[1], 'Content 2');
      await cache.cacheProcessedGrants(sourceId, [{ id: '1', title: 'Grant' }]);
      
      // Verify content is cached
      expect(await cache.getCachedContent(urls[0])).toBe('Content 1');
      expect(await cache.getCachedContent(urls[1])).toBe('Content 2');
      expect(await cache.getCachedGrants(sourceId)).toHaveLength(1);
      
      // Invalidate by content change
      await cache.invalidateByContentChange(sourceId, urls);
      
      // Verify invalidation
      expect(await cache.getCachedContent(urls[0])).toBeNull();
      expect(await cache.getCachedContent(urls[1])).toBeNull();
      expect(await cache.getCachedGrants(sourceId)).toBeNull();
    });
  });

  describe('Performance and Metrics Integration', () => {
    it('should track hit/miss ratios accurately', async () => {
      const url = 'https://example.com/test';
      const content = 'Test content';
      
      // Initial miss
      const miss1 = await cache.getCachedContent(url);
      expect(miss1).toBeNull();
      
      // Cache content
      await cache.cachePageContent(url, content);
      
      // Multiple hits
      const hit1 = await cache.getCachedContent(url);
      const hit2 = await cache.getCachedContent(url);
      const hit3 = await cache.getCachedContent(url);
      
      expect(hit1).toBe(content);
      expect(hit2).toBe(content);
      expect(hit3).toBe(content);
      
      // Check metrics reflect hits
      const metrics = await metricsCollector.collectMetrics();
      expect(metrics.hits).toBeGreaterThan(0);
    });

    it('should generate accurate performance recommendations', async () => {
      // Create scenario with large, infrequently accessed data
      const largeContent = 'x'.repeat(100000); // 100KB content
      await cache.cachePageContent('https://large-content.com', largeContent);
      
      // Access it only once (low hit rate)
      await cache.getCachedContent('https://large-content.com');
      
      // Create a scenario that will trigger recommendations by mocking poor metrics
      const mockMetrics = {
        hits: 1,
        misses: 10, // High miss rate
        hitRate: 0.09, // Very low hit rate
        totalItems: 1,
        totalSize: 100000,
        memoryUsage: 0.95, // High memory usage
        averageResponseTime: 150 // Slow response time
      };
      
      // Mock the cache metrics to return poor performance
      const originalGetMetrics = cache.getCacheMetrics;
      (cache as any).getCacheMetrics = vi.fn().mockResolvedValue(mockMetrics);
      
      const report = await metricsCollector.generatePerformanceReport();
      
      // Should have recommendations for optimization
      expect(report.recommendations.length).toBeGreaterThan(0);
      
      const hasOptimizationRecommendation = report.recommendations.some(
        r => r.type === 'optimize_keys' || r.type === 'warm_cache' || r.type === 'increase_memory'
      );
      expect(hasOptimizationRecommendation).toBe(true);
      
      // Restore original method
      (cache as any).getCacheMetrics = originalGetMetrics;
    });

    it('should calculate efficiency scores correctly', async () => {
      // Create good cache scenario
      const url = 'https://popular-content.com';
      const content = 'Popular content';
      
      await cache.cachePageContent(url, content);
      
      // Generate multiple hits
      for (let i = 0; i < 10; i++) {
        await cache.getCachedContent(url);
      }
      
      const metrics = await metricsCollector.collectMetrics();
      const efficiency = metricsCollector.calculateEfficiencyScore(metrics);
      
      expect(efficiency).toBeGreaterThan(50); // Should be reasonably efficient
    });
  });

  describe('Cache Warming Integration', () => {
    it('should warm cache based on strategies', async () => {
      // Execute specific warming strategies
      const popularSourcesResult = await warmingService.warmPopularSources();
      const recentGrantsResult = await warmingService.warmRecentGrants();
      
      expect(popularSourcesResult.itemsWarmed).toBeGreaterThan(0);
      expect(recentGrantsResult.itemsWarmed).toBeGreaterThan(0);
      
      // Verify cache contains warmed data
      const metrics = await metricsCollector.collectMetrics();
      expect(metrics.totalItems).toBeGreaterThan(0);
    });

    it('should respect strategy frequency settings', async () => {
      // Execute warming cycle
      const firstResults = await warmingService.executeWarmingCycle();
      expect(firstResults.length).toBeGreaterThan(0);
      
      // Immediately try again - should skip due to frequency
      const secondResults = await warmingService.executeWarmingCycle();
      expect(secondResults.length).toBe(0);
    });

    it('should handle warming errors gracefully', async () => {
      // Mock cache to throw errors
      const originalCacheMethod = cache.cacheSourceConfig;
      (cache as any).cacheSourceConfig = vi.fn().mockRejectedValue(new Error('Cache error'));
      
      const result = await warmingService.warmSourceConfigurations();
      
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.successRate).toBeLessThan(1);
      
      // Restore original method
      (cache as any).cacheSourceConfig = originalCacheMethod;
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle Redis connection failures gracefully', async () => {
      // Mock Redis to fail
      const mockRedis = (cache as any).redis;
      mockRedis.get.mockRejectedValueOnce(new Error('Connection failed'));
      
      const result = await cache.getCachedContent('https://example.com');
      
      expect(result).toBeNull(); // Should return null instead of throwing
    });

    it('should handle malformed cache data', async () => {
      // Mock Redis to return invalid JSON
      const mockRedis = (cache as any).redis;
      mockRedis.get.mockResolvedValueOnce('invalid json data');
      
      const result = await cache.getCachedContent('https://example.com');
      
      expect(result).toBeNull(); // Should handle parsing error gracefully
    });

    it('should maintain cache health monitoring', async () => {
      const isHealthy = await cache.healthCheck();
      expect(isHealthy).toBe(true);
      
      // Mock health check failure
      const mockRedis = (cache as any).redis;
      mockRedis.ping.mockRejectedValueOnce(new Error('Health check failed'));
      
      const isUnhealthy = await cache.healthCheck();
      expect(isUnhealthy).toBe(false);
    });
  });

  describe('Memory and Performance Optimization', () => {
    it('should handle TTL updates correctly', async () => {
      const url = 'https://example.com/ttl-test';
      const content = 'TTL test content';
      
      await cache.cachePageContent(url, content, 60); // 1 minute TTL
      
      // Update TTL to longer duration
      const key = (cache as any).redis.setex.mock.calls[0][0]; // Get the actual key used
      const updated = await cache.updateTTL(key, 3600); // 1 hour
      
      expect(updated).toBe(true);
    });

    it('should provide cache entry information', async () => {
      const url = 'https://example.com/info-test';
      const content = 'Info test content';
      
      await cache.cachePageContent(url, content);
      
      // Get cache entry info
      const keys = await cache.getKeysByPattern('*page_content*');
      expect(keys.length).toBeGreaterThan(0);
      
      const entryInfo = await cache.getCacheEntryInfo(keys[0]);
      expect(entryInfo).toBeDefined();
      expect(entryInfo?.data).toBe(content);
      expect(entryInfo?.size).toBeGreaterThan(0);
    });

    it('should handle cache size monitoring', async () => {
      // Add multiple items to cache
      for (let i = 0; i < 10; i++) {
        await cache.cachePageContent(
          `https://example.com/page${i}`,
          `Content for page ${i}`
        );
      }
      
      const metrics = await metricsCollector.collectMetrics();
      expect(metrics.totalItems).toBe(10);
      expect(metrics.totalSize).toBeGreaterThan(0);
    });
  });
});