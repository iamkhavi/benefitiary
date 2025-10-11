/**
 * Example usage of the scraping cache system
 * This file demonstrates how to integrate caching into scraping operations
 */

import { ScrapingCache } from './scraping-cache';
import { CacheMetricsCollector } from './cache-metrics';
import { CacheWarmingService } from './cache-warming';
import { CacheConfig } from './cache-config';

/**
 * Example: Basic cache setup and usage
 */
export async function basicCacheExample() {
  // Initialize cache with custom configuration
  const cacheConfig: Partial<CacheConfig> = {
    ttl: 3600, // 1 hour default TTL
    maxSize: 256, // 256 MB max cache size
    strategy: 'lru',
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: 0,
      keyPrefix: 'scraping:cache:'
    }
  };

  const cache = new ScrapingCache(cacheConfig);

  try {
    // Check cache health
    const isHealthy = await cache.healthCheck();
    if (!isHealthy) {
      throw new Error('Cache is not healthy');
    }

    // Cache page content
    const url = 'https://www.gatesfoundation.org/about/committed-grants';
    const pageContent = '<html><body>Grant listings...</body></html>';
    await cache.cachePageContent(url, pageContent, 1800); // 30 minutes TTL

    // Retrieve cached content
    const cachedContent = await cache.getCachedContent(url);
    console.log('Cached content retrieved:', cachedContent ? 'Yes' : 'No');

    // Cache processed grants
    const sourceId = 'gates-foundation';
    const processedGrants = [
      {
        id: 'grant-1',
        title: 'Global Health Initiative',
        description: 'Supporting health programs worldwide',
        fundingAmount: 1000000,
        deadline: new Date('2024-12-31'),
        sourceId
      }
    ];
    await cache.cacheProcessedGrants(sourceId, processedGrants);

    // Retrieve cached grants
    const cachedGrants = await cache.getCachedGrants(sourceId);
    console.log('Cached grants count:', cachedGrants?.length || 0);

    // Get cache metrics
    const metrics = await cache.getCacheMetrics();
    console.log('Cache metrics:', {
      hitRate: metrics.hitRate,
      totalItems: metrics.totalItems,
      memoryUsage: metrics.memoryUsage
    });

  } finally {
    await cache.disconnect();
  }
}

/**
 * Example: Integrating cache with scraping workflow
 */
export async function scrapingWorkflowWithCache() {
  const cache = new ScrapingCache();

  try {
    const sourceId = 'grants-gov';
    const sourceUrl = 'https://www.grants.gov/web/grants/search-grants.html';

    // 1. Check if we have cached grants for this source
    let grants = await cache.getCachedGrants(sourceId);
    
    if (grants) {
      console.log('Using cached grants:', grants.length);
      return grants;
    }

    // 2. Check if we have cached page content
    let pageContent = await cache.getCachedContent(sourceUrl);
    
    if (!pageContent) {
      // 3. Fetch page content (mock implementation)
      pageContent = await fetchPageContent(sourceUrl);
      
      // 4. Cache the page content
      await cache.cachePageContent(sourceUrl, pageContent, 1800); // 30 minutes
    }

    // 5. Process the page content to extract grants (mock implementation)
    grants = await processPageContent(pageContent, sourceId);

    // 6. Cache the processed grants
    await cache.cacheProcessedGrants(sourceId, grants, 3600); // 1 hour

    console.log('Processed and cached grants:', grants.length);
    return grants;

  } finally {
    await cache.disconnect();
  }
}

/**
 * Example: Cache performance monitoring
 */
export async function cachePerformanceMonitoring() {
  const cache = new ScrapingCache();
  const metricsCollector = new CacheMetricsCollector(cache);

  try {
    // Collect current metrics
    const metrics = await metricsCollector.collectMetrics();
    console.log('Current cache metrics:', metrics);

    // Generate performance report
    const report = await metricsCollector.generatePerformanceReport();
    console.log('Performance report generated at:', report.generatedAt);
    console.log('Recommendations:', report.recommendations.length);

    // Display recommendations
    report.recommendations.forEach((rec, index) => {
      console.log(`Recommendation ${index + 1}:`, {
        type: rec.type,
        priority: rec.priority,
        description: rec.description,
        impact: rec.impact
      });
    });

    // Calculate efficiency score
    const efficiency = metricsCollector.calculateEfficiencyScore(metrics);
    console.log('Cache efficiency score:', efficiency, '/100');

    // Monitor performance (would typically run in background)
    await metricsCollector.monitorPerformance();

  } finally {
    await cache.disconnect();
  }
}

/**
 * Example: Cache warming strategies
 */
export async function cacheWarmingExample() {
  const cache = new ScrapingCache();
  const warmingService = new CacheWarmingService(cache);

  try {
    // Get current warming strategies
    const strategies = warmingService.getStrategies();
    console.log('Available warming strategies:', strategies.map(s => s.name));

    // Execute warming cycle
    console.log('Starting cache warming cycle...');
    const results = await warmingService.executeWarmingCycle();
    
    results.forEach(result => {
      console.log(`Strategy ${result.strategy}:`, {
        itemsWarmed: result.itemsWarmed,
        duration: result.duration,
        successRate: result.successRate,
        errors: result.errors.length
      });
    });

    // Add custom warming strategy
    warmingService.addStrategy({
      name: 'custom_high_value_grants',
      priority: 1,
      enabled: true,
      frequency: 30 // Every 30 minutes
    });

    // Warm specific content types
    const popularResult = await warmingService.warmPopularSources();
    console.log('Popular sources warmed:', popularResult.itemsWarmed);

    const recentResult = await warmingService.warmRecentGrants();
    console.log('Recent grants warmed:', recentResult.itemsWarmed);

  } finally {
    await cache.disconnect();
  }
}

/**
 * Example: Cache invalidation strategies
 */
export async function cacheInvalidationExample() {
  const cache = new ScrapingCache();

  try {
    const sourceId = 'ford-foundation';
    
    // Cache some data
    await cache.cacheProcessedGrants(sourceId, [
      { id: '1', title: 'Grant 1', sourceId },
      { id: '2', title: 'Grant 2', sourceId }
    ]);

    await cache.cachePageContent(
      'https://www.fordfoundation.org/grants',
      '<html>Grant content</html>'
    );

    // Verify data is cached
    console.log('Grants cached:', (await cache.getCachedGrants(sourceId))?.length);
    console.log('Page cached:', await cache.getCachedContent('https://www.fordfoundation.org/grants') ? 'Yes' : 'No');

    // Invalidate source cache (when source configuration changes)
    await cache.invalidateSourceCache(sourceId);
    console.log('Source cache invalidated');

    // Invalidate by content change (when specific pages change)
    await cache.invalidateByContentChange(sourceId, [
      'https://www.fordfoundation.org/grants'
    ]);
    console.log('Content-based cache invalidated');

    // Verify invalidation
    console.log('Grants after invalidation:', await cache.getCachedGrants(sourceId));
    console.log('Page after invalidation:', await cache.getCachedContent('https://www.fordfoundation.org/grants'));

  } finally {
    await cache.disconnect();
  }
}

/**
 * Example: Production cache setup with error handling
 */
export async function productionCacheSetup() {
  const cacheConfig: Partial<CacheConfig> = {
    ttl: 3600,
    maxSize: 1024, // 1GB for production
    strategy: 'lru',
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      keyPrefix: 'prod:scraping:cache:'
    }
  };

  const cache = new ScrapingCache(cacheConfig);
  const metricsCollector = new CacheMetricsCollector(cache);
  const warmingService = new CacheWarmingService(cache);

  try {
    // Health check with retry
    let retries = 3;
    let isHealthy = false;
    
    while (retries > 0 && !isHealthy) {
      isHealthy = await cache.healthCheck();
      if (!isHealthy) {
        console.warn(`Cache health check failed, retries left: ${retries - 1}`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        retries--;
      }
    }

    if (!isHealthy) {
      throw new Error('Cache is not available after retries');
    }

    // Setup monitoring interval
    const monitoringInterval = setInterval(async () => {
      try {
        await metricsCollector.monitorPerformance();
      } catch (error) {
        console.error('Cache monitoring error:', error);
      }
    }, 60000); // Every minute

    // Setup warming interval
    const warmingInterval = setInterval(async () => {
      try {
        await warmingService.executeWarmingCycle();
      } catch (error) {
        console.error('Cache warming error:', error);
      }
    }, 300000); // Every 5 minutes

    console.log('Production cache setup complete');

    // Cleanup function (call this on application shutdown)
    return async () => {
      clearInterval(monitoringInterval);
      clearInterval(warmingInterval);
      await cache.disconnect();
      console.log('Cache cleanup complete');
    };

  } catch (error) {
    await cache.disconnect();
    throw error;
  }
}

// Mock helper functions (would be replaced with actual implementations)
async function fetchPageContent(url: string): Promise<string> {
  // Mock implementation - would use actual HTTP client
  console.log('Fetching page content from:', url);
  return `<html><body>Mock content for ${url}</body></html>`;
}

async function processPageContent(content: string, sourceId: string): Promise<any[]> {
  // Mock implementation - would use actual content processing
  console.log('Processing page content for source:', sourceId);
  return [
    {
      id: 'mock-grant-1',
      title: 'Mock Grant 1',
      description: 'Mock grant description',
      sourceId
    }
  ];
}

// Export all examples for easy testing
export const cacheExamples = {
  basicCacheExample,
  scrapingWorkflowWithCache,
  cachePerformanceMonitoring,
  cacheWarmingExample,
  cacheInvalidationExample,
  productionCacheSetup
};