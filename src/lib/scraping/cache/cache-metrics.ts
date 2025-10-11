/**
 * Cache performance monitoring and metrics collection
 */

import { ScrapingCache } from './scraping-cache';
import { CacheMetrics } from './cache-config';

export interface CachePerformanceReport {
  /** Overall cache performance metrics */
  overall: CacheMetrics;
  /** Performance by cache type */
  byType: Record<string, CacheMetrics>;
  /** Top performing cache keys */
  topKeys: CacheKeyPerformance[];
  /** Cache optimization recommendations */
  recommendations: CacheRecommendation[];
  /** Report generation timestamp */
  generatedAt: Date;
}

export interface CacheKeyPerformance {
  /** Cache key */
  key: string;
  /** Number of hits */
  hits: number;
  /** Cache hit rate */
  hitRate: number;
  /** Average response time */
  avgResponseTime: number;
  /** Data size in bytes */
  size: number;
  /** Last accessed timestamp */
  lastAccessed: Date;
}

export interface CacheRecommendation {
  /** Recommendation type */
  type: 'increase_ttl' | 'decrease_ttl' | 'increase_memory' | 'optimize_keys' | 'warm_cache';
  /** Recommendation priority */
  priority: 'high' | 'medium' | 'low';
  /** Recommendation description */
  description: string;
  /** Expected impact */
  impact: string;
  /** Implementation details */
  implementation: string;
}

export class CacheMetricsCollector {
  private cache: ScrapingCache;
  private metricsHistory: CacheMetrics[] = [];
  private readonly maxHistorySize = 100;

  constructor(cache: ScrapingCache) {
    this.cache = cache;
  }

  /**
   * Collect current cache metrics
   */
  async collectMetrics(): Promise<CacheMetrics> {
    const metrics = await this.cache.getCacheMetrics();
    
    // Store in history
    this.metricsHistory.push({
      ...metrics,
      // Add timestamp for historical tracking
      timestamp: Date.now()
    } as CacheMetrics & { timestamp: number });

    // Keep history size manageable
    if (this.metricsHistory.length > this.maxHistorySize) {
      this.metricsHistory.shift();
    }

    return metrics;
  }

  /**
   * Generate comprehensive performance report
   */
  async generatePerformanceReport(): Promise<CachePerformanceReport> {
    const overall = await this.collectMetrics();
    const byType = await this.getMetricsByType();
    const topKeys = await this.getTopPerformingKeys();
    const recommendations = await this.generateRecommendations(overall, topKeys);

    return {
      overall,
      byType,
      topKeys,
      recommendations,
      generatedAt: new Date()
    };
  }

  /**
   * Get cache metrics by type (page_content, processed_grants, etc.)
   */
  private async getMetricsByType(): Promise<Record<string, CacheMetrics>> {
    const types = ['page_content', 'processed_grants', 'source_config', 'metrics'];
    const metricsByType: Record<string, CacheMetrics> = {};

    for (const type of types) {
      const keys = await this.cache.getKeysByPattern(`*${type}*`);
      let totalHits = 0;
      let totalMisses = 0;
      let totalSize = 0;
      let totalResponseTime = 0;
      let validEntries = 0;

      for (const key of keys) {
        const entry = await this.cache.getCacheEntryInfo(key);
        if (entry) {
          totalHits += entry.hits;
          totalSize += entry.size;
          validEntries++;
        }
      }

      metricsByType[type] = {
        hits: totalHits,
        misses: totalMisses, // We don't track misses per key currently
        hitRate: totalHits > 0 ? totalHits / (totalHits + totalMisses || 1) : 0,
        totalItems: keys.length,
        totalSize,
        memoryUsage: 0, // Calculated at overall level
        averageResponseTime: validEntries > 0 ? totalResponseTime / validEntries : 0
      };
    }

    return metricsByType;
  }

  /**
   * Get top performing cache keys
   */
  private async getTopPerformingKeys(limit: number = 10): Promise<CacheKeyPerformance[]> {
    const allKeys = await this.cache.getKeysByPattern('*');
    const keyPerformances: CacheKeyPerformance[] = [];

    for (const key of allKeys) {
      const entry = await this.cache.getCacheEntryInfo(key);
      if (entry && entry.hits > 0) {
        keyPerformances.push({
          key,
          hits: entry.hits,
          hitRate: entry.hits / (entry.hits + 1), // Simplified calculation
          avgResponseTime: 0, // Would need to track this separately
          size: entry.size,
          lastAccessed: new Date(entry.cachedAt)
        });
      }
    }

    // Sort by hits and return top performers
    return keyPerformances
      .sort((a, b) => b.hits - a.hits)
      .slice(0, limit);
  }

  /**
   * Generate cache optimization recommendations
   */
  private async generateRecommendations(
    metrics: CacheMetrics, 
    topKeys: CacheKeyPerformance[]
  ): Promise<CacheRecommendation[]> {
    const recommendations: CacheRecommendation[] = [];

    // Low hit rate recommendation
    if (metrics.hitRate < 0.5) {
      recommendations.push({
        type: 'warm_cache',
        priority: 'high',
        description: 'Cache hit rate is below 50%, indicating poor cache utilization',
        impact: 'Implementing cache warming could improve hit rate by 20-30%',
        implementation: 'Implement proactive cache warming for popular sources and recent grants'
      });
    }

    // High memory usage recommendation
    if (metrics.memoryUsage > 0.8) {
      recommendations.push({
        type: 'increase_memory',
        priority: 'high',
        description: 'Cache memory usage is above 80%, may cause evictions',
        impact: 'Increasing memory allocation could prevent premature evictions',
        implementation: 'Consider increasing Redis memory limit or implementing more aggressive TTL policies'
      });
    }

    // TTL optimization based on key performance
    const highHitKeys = topKeys.filter(k => k.hits > 10);
    if (highHitKeys.length > 0) {
      recommendations.push({
        type: 'increase_ttl',
        priority: 'medium',
        description: `${highHitKeys.length} keys have high hit rates and could benefit from longer TTL`,
        impact: 'Increasing TTL for popular keys could reduce cache misses by 10-15%',
        implementation: 'Implement dynamic TTL based on key popularity and access patterns'
      });
    }

    // Key optimization for large, low-hit keys
    const inefficientKeys = topKeys.filter(k => k.size > 100000 && k.hits < 5);
    if (inefficientKeys.length > 0) {
      recommendations.push({
        type: 'optimize_keys',
        priority: 'medium',
        description: `${inefficientKeys.length} large keys have low hit rates`,
        impact: 'Removing or optimizing these keys could free up significant memory',
        implementation: 'Review large, infrequently accessed keys for potential removal or compression'
      });
    }

    // Response time optimization
    if (metrics.averageResponseTime > 100) {
      recommendations.push({
        type: 'optimize_keys',
        priority: 'low',
        description: 'Average cache response time is above 100ms',
        impact: 'Optimizing cache structure could improve response times',
        implementation: 'Consider data compression or cache key restructuring'
      });
    }

    return recommendations;
  }

  /**
   * Get cache metrics history
   */
  getMetricsHistory(): CacheMetrics[] {
    return [...this.metricsHistory];
  }

  /**
   * Calculate cache efficiency score (0-100)
   */
  calculateEfficiencyScore(metrics: CacheMetrics): number {
    const hitRateScore = metrics.hitRate * 40; // 40% weight
    const memoryScore = (1 - metrics.memoryUsage) * 30; // 30% weight, lower usage is better
    const responseTimeScore = Math.max(0, (200 - metrics.averageResponseTime) / 200) * 30; // 30% weight

    return Math.round(hitRateScore + memoryScore + responseTimeScore);
  }

  /**
   * Monitor cache performance and alert on issues
   */
  async monitorPerformance(): Promise<void> {
    const metrics = await this.collectMetrics();
    const efficiency = this.calculateEfficiencyScore(metrics);

    // Alert on low efficiency
    if (efficiency < 50) {
      console.warn(`Cache efficiency is low: ${efficiency}/100`, {
        hitRate: metrics.hitRate,
        memoryUsage: metrics.memoryUsage,
        averageResponseTime: metrics.averageResponseTime
      });
    }

    // Alert on high memory usage
    if (metrics.memoryUsage > 0.9) {
      console.error('Cache memory usage critical:', metrics.memoryUsage);
    }

    // Alert on poor hit rate
    if (metrics.hitRate < 0.3) {
      console.warn('Cache hit rate is very low:', metrics.hitRate);
    }
  }
}