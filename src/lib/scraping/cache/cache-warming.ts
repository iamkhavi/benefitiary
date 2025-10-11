/**
 * Cache warming strategies for popular sources and recent grants
 */

import { ScrapingCache } from './scraping-cache';
import { CACHE_KEYS } from './cache-config';

export interface CacheWarmingStrategy {
  /** Strategy name */
  name: string;
  /** Strategy priority */
  priority: number;
  /** Whether strategy is enabled */
  enabled: boolean;
  /** Execution frequency in minutes */
  frequency: number;
  /** Last execution timestamp */
  lastExecuted?: Date;
}

export interface WarmingTarget {
  /** Target type */
  type: 'popular_sources' | 'recent_grants' | 'high_traffic_pages' | 'source_configs';
  /** Target identifier */
  identifier: string;
  /** Priority score */
  priority: number;
  /** Expected cache benefit */
  benefit: number;
}

export interface WarmingResult {
  /** Strategy that was executed */
  strategy: string;
  /** Number of items warmed */
  itemsWarmed: number;
  /** Time taken in milliseconds */
  duration: number;
  /** Success rate */
  successRate: number;
  /** Errors encountered */
  errors: string[];
  /** Execution timestamp */
  executedAt: Date;
}

export class CacheWarmingService {
  private cache: ScrapingCache;
  private strategies: Map<string, CacheWarmingStrategy>;
  private isWarming: boolean = false;

  constructor(cache: ScrapingCache) {
    this.cache = cache;
    this.strategies = new Map();
    this.initializeDefaultStrategies();
  }

  /**
   * Initialize default warming strategies
   */
  private initializeDefaultStrategies(): void {
    const defaultStrategies: CacheWarmingStrategy[] = [
      {
        name: 'popular_sources',
        priority: 1,
        enabled: true,
        frequency: 60, // Every hour
      },
      {
        name: 'recent_grants',
        priority: 2,
        enabled: true,
        frequency: 30, // Every 30 minutes
      },
      {
        name: 'source_configurations',
        priority: 3,
        enabled: true,
        frequency: 240, // Every 4 hours
      },
      {
        name: 'high_traffic_pages',
        priority: 4,
        enabled: true,
        frequency: 120, // Every 2 hours
      }
    ];

    defaultStrategies.forEach(strategy => {
      this.strategies.set(strategy.name, strategy);
    });
  }

  /**
   * Execute cache warming for all enabled strategies
   */
  async executeWarmingCycle(): Promise<WarmingResult[]> {
    if (this.isWarming) {
      console.log('Cache warming already in progress, skipping cycle');
      return [];
    }

    this.isWarming = true;
    const results: WarmingResult[] = [];

    try {
      const enabledStrategies = Array.from(this.strategies.values())
        .filter(s => s.enabled)
        .sort((a, b) => a.priority - b.priority);

      for (const strategy of enabledStrategies) {
        if (this.shouldExecuteStrategy(strategy)) {
          const result = await this.executeStrategy(strategy);
          results.push(result);
          
          // Update last executed timestamp
          strategy.lastExecuted = new Date();
          this.strategies.set(strategy.name, strategy);
        }
      }

      console.log(`Cache warming cycle completed. Executed ${results.length} strategies.`);
      return results;
    } finally {
      this.isWarming = false;
    }
  }

  /**
   * Warm cache for popular sources
   */
  async warmPopularSources(): Promise<WarmingResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let itemsWarmed = 0;
    let successCount = 0;

    try {
      // Get popular sources (this would typically come from analytics/metrics)
      const popularSources = await this.getPopularSources();
      
      for (const source of popularSources) {
        try {
          // Pre-cache source configuration
          await this.warmSourceConfiguration(source.id);
          
          // Pre-cache recent grants for this source
          await this.warmSourceGrants(source.id);
          
          itemsWarmed++;
          successCount++;
        } catch (error) {
          errors.push(`Failed to warm source ${source.id}: ${error}`);
        }
      }

      return {
        strategy: 'popular_sources',
        itemsWarmed,
        duration: Date.now() - startTime,
        successRate: popularSources.length > 0 ? successCount / popularSources.length : 0,
        errors,
        executedAt: new Date()
      };
    } catch (error) {
      errors.push(`Popular sources warming failed: ${error}`);
      return {
        strategy: 'popular_sources',
        itemsWarmed: 0,
        duration: Date.now() - startTime,
        successRate: 0,
        errors,
        executedAt: new Date()
      };
    }
  }

  /**
   * Warm cache for recent grants
   */
  async warmRecentGrants(): Promise<WarmingResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let itemsWarmed = 0;
    let successCount = 0;

    try {
      // Get recent grants that are likely to be accessed
      const recentGrants = await this.getRecentHighValueGrants();
      
      for (const grant of recentGrants) {
        try {
          // Cache grant details
          const key = `grant_details:${grant.id}`;
          await this.cache.cacheProcessedGrants(grant.sourceId, [grant], 3600); // 1 hour TTL
          
          itemsWarmed++;
          successCount++;
        } catch (error) {
          errors.push(`Failed to warm grant ${grant.id}: ${error}`);
        }
      }

      return {
        strategy: 'recent_grants',
        itemsWarmed,
        duration: Date.now() - startTime,
        successRate: recentGrants.length > 0 ? successCount / recentGrants.length : 0,
        errors,
        executedAt: new Date()
      };
    } catch (error) {
      errors.push(`Recent grants warming failed: ${error}`);
      return {
        strategy: 'recent_grants',
        itemsWarmed: 0,
        duration: Date.now() - startTime,
        successRate: 0,
        errors,
        executedAt: new Date()
      };
    }
  }

  /**
   * Warm cache for source configurations
   */
  async warmSourceConfigurations(): Promise<WarmingResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let itemsWarmed = 0;
    let successCount = 0;

    try {
      const activeSources = await this.getActiveSources();
      
      for (const source of activeSources) {
        try {
          await this.warmSourceConfiguration(source.id);
          itemsWarmed++;
          successCount++;
        } catch (error) {
          errors.push(`Failed to warm config for ${source.id}: ${error}`);
        }
      }

      return {
        strategy: 'source_configurations',
        itemsWarmed,
        duration: Date.now() - startTime,
        successRate: activeSources.length > 0 ? successCount / activeSources.length : 0,
        errors,
        executedAt: new Date()
      };
    } catch (error) {
      errors.push(`Source configurations warming failed: ${error}`);
      return {
        strategy: 'source_configurations',
        itemsWarmed: 0,
        duration: Date.now() - startTime,
        successRate: 0,
        errors,
        executedAt: new Date()
      };
    }
  }

  /**
   * Warm cache for high traffic pages
   */
  async warmHighTrafficPages(): Promise<WarmingResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let itemsWarmed = 0;
    let successCount = 0;

    try {
      const highTrafficUrls = await this.getHighTrafficUrls();
      
      for (const url of highTrafficUrls) {
        try {
          // Pre-fetch and cache page content
          const content = await this.fetchPageContent(url);
          if (content) {
            await this.cache.cachePageContent(url, content, 1800); // 30 minutes TTL
            itemsWarmed++;
            successCount++;
          }
        } catch (error) {
          errors.push(`Failed to warm page ${url}: ${error}`);
        }
      }

      return {
        strategy: 'high_traffic_pages',
        itemsWarmed,
        duration: Date.now() - startTime,
        successRate: highTrafficUrls.length > 0 ? successCount / highTrafficUrls.length : 0,
        errors,
        executedAt: new Date()
      };
    } catch (error) {
      errors.push(`High traffic pages warming failed: ${error}`);
      return {
        strategy: 'high_traffic_pages',
        itemsWarmed: 0,
        duration: Date.now() - startTime,
        successRate: 0,
        errors,
        executedAt: new Date()
      };
    }
  }

  /**
   * Add or update a warming strategy
   */
  addStrategy(strategy: CacheWarmingStrategy): void {
    this.strategies.set(strategy.name, strategy);
  }

  /**
   * Remove a warming strategy
   */
  removeStrategy(name: string): boolean {
    return this.strategies.delete(name);
  }

  /**
   * Get all warming strategies
   */
  getStrategies(): CacheWarmingStrategy[] {
    return Array.from(this.strategies.values());
  }

  /**
   * Enable/disable a strategy
   */
  toggleStrategy(name: string, enabled: boolean): boolean {
    const strategy = this.strategies.get(name);
    if (strategy) {
      strategy.enabled = enabled;
      this.strategies.set(name, strategy);
      return true;
    }
    return false;
  }

  /**
   * Check if a strategy should be executed based on frequency
   */
  private shouldExecuteStrategy(strategy: CacheWarmingStrategy): boolean {
    if (!strategy.lastExecuted) {
      return true;
    }

    const timeSinceLastExecution = Date.now() - strategy.lastExecuted.getTime();
    const frequencyMs = strategy.frequency * 60 * 1000; // Convert minutes to milliseconds
    
    return timeSinceLastExecution >= frequencyMs;
  }

  /**
   * Execute a specific warming strategy
   */
  private async executeStrategy(strategy: CacheWarmingStrategy): Promise<WarmingResult> {
    console.log(`Executing cache warming strategy: ${strategy.name}`);
    
    switch (strategy.name) {
      case 'popular_sources':
        return await this.warmPopularSources();
      case 'recent_grants':
        return await this.warmRecentGrants();
      case 'source_configurations':
        return await this.warmSourceConfigurations();
      case 'high_traffic_pages':
        return await this.warmHighTrafficPages();
      default:
        throw new Error(`Unknown warming strategy: ${strategy.name}`);
    }
  }

  /**
   * Get popular sources (mock implementation - would integrate with analytics)
   */
  private async getPopularSources(): Promise<Array<{ id: string; popularity: number }>> {
    // This would typically query analytics data or database metrics
    return [
      { id: 'gates-foundation', popularity: 0.9 },
      { id: 'grants-gov', popularity: 0.8 },
      { id: 'ford-foundation', popularity: 0.7 }
    ];
  }

  /**
   * Get recent high-value grants (mock implementation)
   */
  private async getRecentHighValueGrants(): Promise<Array<{ id: string; sourceId: string; value: number }>> {
    // This would typically query the database for recent grants with high funding amounts
    return [
      { id: 'grant-1', sourceId: 'gates-foundation', value: 1000000 },
      { id: 'grant-2', sourceId: 'grants-gov', value: 500000 }
    ];
  }

  /**
   * Get active sources (mock implementation)
   */
  private async getActiveSources(): Promise<Array<{ id: string; status: string }>> {
    // This would typically query the database for active scraping sources
    return [
      { id: 'gates-foundation', status: 'active' },
      { id: 'grants-gov', status: 'active' },
      { id: 'ford-foundation', status: 'active' }
    ];
  }

  /**
   * Get high traffic URLs (mock implementation)
   */
  private async getHighTrafficUrls(): Promise<string[]> {
    // This would typically come from web analytics or access logs
    return [
      'https://www.gatesfoundation.org/about/committed-grants',
      'https://www.grants.gov/web/grants/search-grants.html'
    ];
  }

  /**
   * Warm source configuration
   */
  private async warmSourceConfiguration(sourceId: string): Promise<void> {
    // Mock source configuration - in real implementation, this would fetch from database
    const mockConfig = {
      id: sourceId,
      url: `https://example.com/${sourceId}`,
      type: 'FOUNDATION',
      selectors: {
        title: '.grant-title',
        description: '.grant-description'
      }
    };

    await this.cache.cacheSourceConfig(sourceId, mockConfig, 86400); // 24 hours TTL
  }

  /**
   * Warm source grants
   */
  private async warmSourceGrants(sourceId: string): Promise<void> {
    // Mock grants data - in real implementation, this would fetch recent grants
    const mockGrants = [
      {
        id: `${sourceId}-grant-1`,
        title: 'Sample Grant 1',
        description: 'Sample grant description',
        sourceId
      }
    ];

    await this.cache.cacheProcessedGrants(sourceId, mockGrants, 3600); // 1 hour TTL
  }

  /**
   * Fetch page content (mock implementation)
   */
  private async fetchPageContent(url: string): Promise<string | null> {
    // This would typically use the HTTP client to fetch actual page content
    // For now, return mock content
    return `<html><body>Mock content for ${url}</body></html>`;
  }
}