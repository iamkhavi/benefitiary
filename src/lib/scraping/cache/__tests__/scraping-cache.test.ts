/**
 * Tests for ScrapingCache class
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ScrapingCache } from '../scraping-cache';
import { CacheConfig } from '../cache-config';

// Mock Redis
vi.mock('ioredis', () => {
  const mockRedis = {
    setex: vi.fn().mockResolvedValue('OK'),
    get: vi.fn(),
    del: vi.fn().mockResolvedValue(1),
    flushdb: vi.fn().mockResolvedValue('OK'),
    keys: vi.fn().mockResolvedValue([]),
    dbsize: vi.fn().mockResolvedValue(0),
    info: vi.fn().mockResolvedValue('used_memory:1024\nmaxmemory:10240'),
    ping: vi.fn().mockResolvedValue('PONG'),
    quit: vi.fn().mockResolvedValue('OK'),
    expire: vi.fn().mockResolvedValue(1),
    pipeline: vi.fn().mockReturnValue({
      del: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue([])
    }),
    on: vi.fn()
  };

  return {
    default: vi.fn(() => mockRedis)
  };
});

describe('ScrapingCache', () => {
  let cache: ScrapingCache;
  let mockRedis: any;

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
    // Get the mocked Redis instance
    mockRedis = (cache as any).redis;
  });

  afterEach(async () => {
    await cache.disconnect();
    vi.clearAllMocks();
  });

  describe('Page Content Caching', () => {
    it('should cache page content successfully', async () => {
      const url = 'https://example.com/grants';
      const content = '<html><body>Grant content</body></html>';

      await cache.cachePageContent(url, content);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        expect.stringContaining('page_content:'),
        3600,
        expect.stringContaining(content)
      );
    });

    it('should retrieve cached page content', async () => {
      const url = 'https://example.com/grants';
      const content = '<html><body>Grant content</body></html>';
      const cacheEntry = {
        data: content,
        cachedAt: Date.now(),
        ttl: 3600,
        hits: 0,
        size: Buffer.byteLength(content, 'utf8')
      };

      mockRedis.get.mockResolvedValueOnce(JSON.stringify(cacheEntry));

      const result = await cache.getCachedContent(url);

      expect(result).toBe(content);
      expect(mockRedis.get).toHaveBeenCalledWith(
        expect.stringContaining('page_content:')
      );
    });

    it('should return null for cache miss', async () => {
      mockRedis.get.mockResolvedValueOnce(null);

      const result = await cache.getCachedContent('https://nonexistent.com');

      expect(result).toBeNull();
    });

    it('should handle cache errors gracefully', async () => {
      mockRedis.get.mockRejectedValueOnce(new Error('Redis error'));

      const result = await cache.getCachedContent('https://example.com');

      expect(result).toBeNull();
    });
  });

  describe('Processed Grants Caching', () => {
    it('should cache processed grants', async () => {
      const sourceId = 'gates-foundation';
      const grants = [
        { id: '1', title: 'Grant 1', sourceId },
        { id: '2', title: 'Grant 2', sourceId }
      ];

      await cache.cacheProcessedGrants(sourceId, grants);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        expect.stringContaining('processed_grants:'),
        3600,
        expect.stringContaining(JSON.stringify(grants))
      );
    });

    it('should retrieve cached grants', async () => {
      const sourceId = 'gates-foundation';
      const grants = [{ id: '1', title: 'Grant 1', sourceId }];
      const cacheEntry = {
        data: grants,
        cachedAt: Date.now(),
        ttl: 3600,
        hits: 0,
        size: 100
      };

      mockRedis.get.mockResolvedValueOnce(JSON.stringify(cacheEntry));

      const result = await cache.getCachedGrants(sourceId);

      expect(result).toEqual(grants);
    });

    it('should use custom TTL when provided', async () => {
      const sourceId = 'test-source';
      const grants = [{ id: '1', title: 'Test Grant' }];
      const customTTL = 7200;

      await cache.cacheProcessedGrants(sourceId, grants, customTTL);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        expect.any(String),
        customTTL,
        expect.any(String)
      );
    });
  });

  describe('Source Configuration Caching', () => {
    it('should cache source configuration', async () => {
      const sourceId = 'test-source';
      const config = {
        id: sourceId,
        url: 'https://example.com',
        selectors: { title: '.title' }
      };

      await cache.cacheSourceConfig(sourceId, config);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        expect.stringContaining('source_config:'),
        expect.any(Number),
        expect.stringContaining(JSON.stringify(config))
      );
    });

    it('should retrieve cached source configuration', async () => {
      const sourceId = 'test-source';
      const config = { id: sourceId, url: 'https://example.com' };
      const cacheEntry = {
        data: config,
        cachedAt: Date.now(),
        ttl: 86400,
        hits: 0,
        size: 50
      };

      mockRedis.get.mockResolvedValueOnce(JSON.stringify(cacheEntry));

      const result = await cache.getCachedSourceConfig(sourceId);

      expect(result).toEqual(config);
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate source cache', async () => {
      const sourceId = 'test-source';
      const mockPipeline = {
        del: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([])
      };
      mockRedis.pipeline.mockReturnValue(mockPipeline);

      await cache.invalidateSourceCache(sourceId);

      expect(mockPipeline.del).toHaveBeenCalledTimes(3); // processed_grants, source_config, metrics
      expect(mockPipeline.exec).toHaveBeenCalled();
    });

    it('should invalidate cache by content change', async () => {
      const sourceId = 'test-source';
      const changedUrls = ['https://example.com/page1', 'https://example.com/page2'];
      const mockPipeline = {
        del: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([])
      };
      mockRedis.pipeline.mockReturnValue(mockPipeline);

      await cache.invalidateByContentChange(sourceId, changedUrls);

      expect(mockPipeline.del).toHaveBeenCalledTimes(3); // 1 processed_grants + 2 page_content
      expect(mockPipeline.exec).toHaveBeenCalled();
    });
  });

  describe('Cache Metrics', () => {
    it('should collect cache metrics', async () => {
      mockRedis.info.mockResolvedValue('used_memory:2048\nmaxmemory:10240');
      mockRedis.dbsize.mockResolvedValue(100);

      const metrics = await cache.getCacheMetrics();

      expect(metrics).toMatchObject({
        totalItems: 100,
        totalSize: 2048,
        memoryUsage: 2048 / 10240
      });
    });

    it('should handle metrics collection errors', async () => {
      mockRedis.info.mockRejectedValue(new Error('Redis error'));

      const metrics = await cache.getCacheMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.totalItems).toBe(0);
    });
  });

  describe('Cache Management', () => {
    it('should clear all cache', async () => {
      await cache.clearCache();

      expect(mockRedis.flushdb).toHaveBeenCalled();
    });

    it('should get keys by pattern', async () => {
      const pattern = 'test:*';
      const expectedKeys = ['test:key1', 'test:key2'];
      mockRedis.keys.mockResolvedValue(expectedKeys);

      const keys = await cache.getKeysByPattern(pattern);

      expect(keys).toEqual(expectedKeys);
      expect(mockRedis.keys).toHaveBeenCalledWith(pattern);
    });

    it('should get cache entry info', async () => {
      const key = 'test:key';
      const entry = {
        data: 'test data',
        cachedAt: Date.now(),
        ttl: 3600,
        hits: 5,
        size: 100
      };
      mockRedis.get.mockResolvedValue(JSON.stringify(entry));

      const result = await cache.getCacheEntryInfo(key);

      expect(result).toEqual(entry);
    });

    it('should update TTL for existing key', async () => {
      const key = 'test:key';
      const ttl = 7200;

      const result = await cache.updateTTL(key, ttl);

      expect(result).toBe(true);
      expect(mockRedis.expire).toHaveBeenCalledWith(key, ttl);
    });

    it('should perform health check', async () => {
      const isHealthy = await cache.healthCheck();

      expect(isHealthy).toBe(true);
      expect(mockRedis.ping).toHaveBeenCalled();
    });

    it('should handle health check failure', async () => {
      mockRedis.ping.mockRejectedValue(new Error('Connection failed'));

      const isHealthy = await cache.healthCheck();

      expect(isHealthy).toBe(false);
    });
  });

  describe('Hit/Miss Tracking', () => {
    it('should track cache hits', async () => {
      const url = 'https://example.com';
      const content = 'test content';
      const cacheEntry = {
        data: content,
        cachedAt: Date.now(),
        ttl: 3600,
        hits: 0,
        size: 100
      };

      mockRedis.get.mockResolvedValueOnce(JSON.stringify(cacheEntry));

      await cache.getCachedContent(url);

      // Should update hit count
      expect(mockRedis.setex).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Number),
        expect.stringContaining('"hits":1')
      );
    });

    it('should track cache misses', async () => {
      mockRedis.get.mockResolvedValueOnce(null);

      const result = await cache.getCachedContent('https://example.com');

      expect(result).toBeNull();
      // Miss should be tracked internally (not directly testable without exposing internal state)
    });
  });

  describe('Error Handling', () => {
    it('should handle JSON parsing errors', async () => {
      mockRedis.get.mockResolvedValueOnce('invalid json');

      const result = await cache.getCachedContent('https://example.com');

      expect(result).toBeNull();
    });

    it('should handle Redis connection errors during caching', async () => {
      mockRedis.setex.mockRejectedValueOnce(new Error('Connection failed'));

      // Should not throw error
      await expect(cache.cachePageContent('https://example.com', 'content')).resolves.toBeUndefined();
    });
  });
});