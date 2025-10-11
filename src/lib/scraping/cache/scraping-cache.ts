/**
 * Redis-based caching system for scraping operations
 */

import Redis from 'ioredis';
import { 
  CacheConfig, 
  CacheEntry, 
  CacheMetrics, 
  DEFAULT_CACHE_CONFIG,
  CACHE_KEYS 
} from './cache-config';

export class ScrapingCache {
  private redis: Redis;
  private config: CacheConfig;
  private metrics: CacheMetrics;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config };
    this.redis = new Redis({
      host: this.config.redis.host,
      port: this.config.redis.port,
      password: this.config.redis.password,
      db: this.config.redis.db,
      keyPrefix: this.config.redis.keyPrefix,
      maxRetriesPerRequest: 3,
      lazyConnect: true
    });

    this.metrics = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      totalItems: 0,
      totalSize: 0,
      memoryUsage: 0,
      averageResponseTime: 0
    };

    this.setupEventHandlers();
  }

  /**
   * Cache page content with TTL
   */
  async cachePageContent(url: string, content: string, ttl?: number): Promise<void> {
    try {
      const key = CACHE_KEYS.PAGE_CONTENT(url);
      const cacheEntry: CacheEntry<string> = {
        data: content,
        cachedAt: Date.now(),
        ttl: ttl || this.config.ttl,
        hits: 0,
        size: Buffer.byteLength(content, 'utf8')
      };

      await this.redis.setex(key, cacheEntry.ttl, JSON.stringify(cacheEntry));
      await this.updateMetrics('set', cacheEntry.size);
    } catch (error) {
      console.error('Cache set error:', error);
      // Don't throw error - caching failures should not break the application
    }
  }

  /**
   * Get cached page content
   */
  async getCachedContent(url: string): Promise<string | null> {
    const startTime = Date.now();
    const key = CACHE_KEYS.PAGE_CONTENT(url);
    
    try {
      const cached = await this.redis.get(key);
      const responseTime = Date.now() - startTime;
      
      if (!cached) {
        await this.updateMetrics('miss', 0, responseTime);
        return null;
      }

      const entry: CacheEntry<string> = JSON.parse(cached);
      
      // Update hit count
      entry.hits++;
      await this.redis.setex(key, entry.ttl, JSON.stringify(entry));
      
      await this.updateMetrics('hit', 0, responseTime);
      return entry.data;
    } catch (error) {
      console.error('Cache get error:', error);
      await this.updateMetrics('miss', 0, Date.now() - startTime);
      return null;
    }
  }

  /**
   * Cache processed grants for a source
   */
  async cacheProcessedGrants(sourceId: string, grants: any[], ttl?: number): Promise<void> {
    try {
      const key = CACHE_KEYS.PROCESSED_GRANTS(sourceId);
      const grantsData = JSON.stringify(grants);
      const cacheEntry: CacheEntry<any[]> = {
        data: grants,
        cachedAt: Date.now(),
        ttl: ttl || this.config.ttl,
        hits: 0,
        size: Buffer.byteLength(grantsData, 'utf8')
      };

      await this.redis.setex(key, cacheEntry.ttl, JSON.stringify(cacheEntry));
      await this.updateMetrics('set', cacheEntry.size);
    } catch (error) {
      console.error('Cache set error:', error);
      // Don't throw error - caching failures should not break the application
    }
  }

  /**
   * Get cached processed grants
   */
  async getCachedGrants(sourceId: string): Promise<any[] | null> {
    const startTime = Date.now();
    const key = CACHE_KEYS.PROCESSED_GRANTS(sourceId);
    
    try {
      const cached = await this.redis.get(key);
      const responseTime = Date.now() - startTime;
      
      if (!cached) {
        await this.updateMetrics('miss', 0, responseTime);
        return null;
      }

      const entry: CacheEntry<any[]> = JSON.parse(cached);
      
      // Update hit count
      entry.hits++;
      await this.redis.setex(key, entry.ttl, JSON.stringify(entry));
      
      await this.updateMetrics('hit', 0, responseTime);
      return entry.data;
    } catch (error) {
      console.error('Cache get error:', error);
      await this.updateMetrics('miss', 0, Date.now() - startTime);
      return null;
    }
  }

  /**
   * Cache source configuration
   */
  async cacheSourceConfig(sourceId: string, config: any, ttl?: number): Promise<void> {
    try {
      const key = CACHE_KEYS.SOURCE_CONFIG(sourceId);
      const configData = JSON.stringify(config);
      const cacheEntry: CacheEntry<any> = {
        data: config,
        cachedAt: Date.now(),
        ttl: ttl || this.config.ttl * 24, // Source configs can be cached longer
        hits: 0,
        size: Buffer.byteLength(configData, 'utf8')
      };

      await this.redis.setex(key, cacheEntry.ttl, JSON.stringify(cacheEntry));
      await this.updateMetrics('set', cacheEntry.size);
    } catch (error) {
      console.error('Cache set error:', error);
      // Don't throw error - caching failures should not break the application
    }
  }

  /**
   * Get cached source configuration
   */
  async getCachedSourceConfig(sourceId: string): Promise<any | null> {
    const startTime = Date.now();
    const key = CACHE_KEYS.SOURCE_CONFIG(sourceId);
    
    try {
      const cached = await this.redis.get(key);
      const responseTime = Date.now() - startTime;
      
      if (!cached) {
        await this.updateMetrics('miss', 0, responseTime);
        return null;
      }

      const entry: CacheEntry<any> = JSON.parse(cached);
      
      // Update hit count
      entry.hits++;
      await this.redis.setex(key, entry.ttl, JSON.stringify(entry));
      
      await this.updateMetrics('hit', 0, responseTime);
      return entry.data;
    } catch (error) {
      console.error('Cache get error:', error);
      await this.updateMetrics('miss', 0, Date.now() - startTime);
      return null;
    }
  }

  /**
   * Invalidate cache for a specific source
   */
  async invalidateSourceCache(sourceId: string): Promise<void> {
    const keys = [
      CACHE_KEYS.PROCESSED_GRANTS(sourceId),
      CACHE_KEYS.SOURCE_CONFIG(sourceId),
      CACHE_KEYS.METRICS(sourceId)
    ];

    const pipeline = this.redis.pipeline();
    keys.forEach(key => pipeline.del(key));
    await pipeline.exec();

    console.log(`Invalidated cache for source: ${sourceId}`);
  }

  /**
   * Invalidate cache based on content changes
   */
  async invalidateByContentChange(sourceId: string, changedUrls: string[]): Promise<void> {
    const keys = [
      CACHE_KEYS.PROCESSED_GRANTS(sourceId),
      ...changedUrls.map(url => CACHE_KEYS.PAGE_CONTENT(url))
    ];

    const pipeline = this.redis.pipeline();
    keys.forEach(key => pipeline.del(key));
    await pipeline.exec();

    console.log(`Invalidated cache for ${keys.length} keys due to content changes`);
  }

  /**
   * Get cache metrics
   */
  async getCacheMetrics(): Promise<CacheMetrics> {
    try {
      // Get Redis memory info
      const info = await this.redis.info('memory');
      const memoryMatch = info.match(/used_memory:(\d+)/);
      const maxMemoryMatch = info.match(/maxmemory:(\d+)/);
      
      const usedMemory = memoryMatch ? parseInt(memoryMatch[1]) : 0;
      const maxMemory = maxMemoryMatch ? parseInt(maxMemoryMatch[1]) : 0;
      
      // Get total keys count
      const totalKeys = await this.redis.dbsize();
      
      this.metrics.totalItems = totalKeys;
      this.metrics.totalSize = usedMemory;
      this.metrics.memoryUsage = maxMemory > 0 ? usedMemory / maxMemory : 0;
      this.metrics.hitRate = this.metrics.hits + this.metrics.misses > 0 
        ? this.metrics.hits / (this.metrics.hits + this.metrics.misses) 
        : 0;

      return { ...this.metrics };
    } catch (error) {
      console.error('Error getting cache metrics:', error);
      return { ...this.metrics };
    }
  }

  /**
   * Clear all cache
   */
  async clearCache(): Promise<void> {
    await this.redis.flushdb();
    this.metrics = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      totalItems: 0,
      totalSize: 0,
      memoryUsage: 0,
      averageResponseTime: 0
    };
    console.log('Cache cleared');
  }

  /**
   * Get cache keys by pattern
   */
  async getKeysByPattern(pattern: string): Promise<string[]> {
    return await this.redis.keys(pattern);
  }

  /**
   * Get cache entry info
   */
  async getCacheEntryInfo(key: string): Promise<CacheEntry | null> {
    try {
      const cached = await this.redis.get(key);
      if (!cached) return null;
      
      return JSON.parse(cached) as CacheEntry;
    } catch (error) {
      console.error('Error getting cache entry info:', error);
      return null;
    }
  }

  /**
   * Set cache TTL for existing key
   */
  async updateTTL(key: string, ttl: number): Promise<boolean> {
    const result = await this.redis.expire(key, ttl);
    return result === 1;
  }

  /**
   * Check if cache is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch (error) {
      console.error('Cache health check failed:', error);
      return false;
    }
  }

  /**
   * Close Redis connection
   */
  async disconnect(): Promise<void> {
    await this.redis.quit();
  }

  /**
   * Setup Redis event handlers
   */
  private setupEventHandlers(): void {
    this.redis.on('connect', () => {
      console.log('Redis cache connected');
    });

    this.redis.on('error', (error) => {
      console.error('Redis cache error:', error);
    });

    this.redis.on('close', () => {
      console.log('Redis cache connection closed');
    });
  }

  /**
   * Update internal metrics
   */
  private async updateMetrics(
    operation: 'hit' | 'miss' | 'set', 
    size: number = 0, 
    responseTime: number = 0
  ): Promise<void> {
    switch (operation) {
      case 'hit':
        this.metrics.hits++;
        break;
      case 'miss':
        this.metrics.misses++;
        break;
      case 'set':
        // Size is handled by Redis info
        break;
    }

    if (responseTime > 0) {
      // Update average response time using exponential moving average
      const alpha = 0.1; // Smoothing factor
      this.metrics.averageResponseTime = 
        this.metrics.averageResponseTime * (1 - alpha) + responseTime * alpha;
    }
  }
}