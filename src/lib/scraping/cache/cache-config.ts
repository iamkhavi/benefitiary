/**
 * Cache configuration and types
 */

export interface CacheConfig {
  /** Time to live in seconds */
  ttl: number;
  /** Maximum cache size in MB */
  maxSize: number;
  /** Cache eviction strategy */
  strategy: 'lru' | 'fifo' | 'lfu';
  /** Redis connection options */
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
    keyPrefix: string;
  };
}

export interface CacheKey {
  /** Cache key type */
  type: 'page_content' | 'processed_grants' | 'source_config' | 'metrics';
  /** Source identifier */
  sourceId?: string;
  /** URL for page content */
  url?: string;
  /** Additional identifier */
  identifier?: string;
}

export interface CacheEntry<T = any> {
  /** Cached data */
  data: T;
  /** Timestamp when cached */
  cachedAt: number;
  /** Time to live in seconds */
  ttl: number;
  /** Cache hit count */
  hits: number;
  /** Data size in bytes */
  size: number;
}

export interface CacheMetrics {
  /** Total cache hits */
  hits: number;
  /** Total cache misses */
  misses: number;
  /** Cache hit rate (0-1) */
  hitRate: number;
  /** Total cached items */
  totalItems: number;
  /** Total cache size in bytes */
  totalSize: number;
  /** Memory usage percentage */
  memoryUsage: number;
  /** Average response time in ms */
  averageResponseTime: number;
}

export const DEFAULT_CACHE_CONFIG: CacheConfig = {
  ttl: 3600, // 1 hour
  maxSize: 512, // 512 MB
  strategy: 'lru',
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
    keyPrefix: 'scraping:cache:'
  }
};

export const CACHE_KEYS = {
  PAGE_CONTENT: (url: string) => `page_content:${Buffer.from(url).toString('base64')}`,
  PROCESSED_GRANTS: (sourceId: string) => `processed_grants:${sourceId}`,
  SOURCE_CONFIG: (sourceId: string) => `source_config:${sourceId}`,
  METRICS: (sourceId: string) => `metrics:${sourceId}`,
  POPULAR_SOURCES: () => 'popular_sources',
  RECENT_GRANTS: () => 'recent_grants'
} as const;