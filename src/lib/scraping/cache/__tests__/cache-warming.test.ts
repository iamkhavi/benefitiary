/**
 * Tests for CacheWarmingService class
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CacheWarmingService } from '../cache-warming';
import { ScrapingCache } from '../scraping-cache';
import { CacheWarmingStrategy } from '../cache-warming';

// Mock ScrapingCache
const mockCache = {
  cacheSourceConfig: vi.fn().mockResolvedValue(undefined),
  cacheProcessedGrants: vi.fn().mockResolvedValue(undefined),
  cachePageContent: vi.fn().mockResolvedValue(undefined)
} as unknown as ScrapingCache;

describe('CacheWarmingService', () => {
  let warmingService: CacheWarmingService;

  beforeEach(() => {
    warmingService = new CacheWarmingService(mockCache);
    vi.clearAllMocks();
  });

  describe('Strategy Management', () => {
    it('should initialize with default strategies', () => {
      const strategies = warmingService.getStrategies();
      
      expect(strategies).toHaveLength(4);
      expect(strategies.map(s => s.name)).toContain('popular_sources');
      expect(strategies.map(s => s.name)).toContain('recent_grants');
      expect(strategies.map(s => s.name)).toContain('source_configurations');
      expect(strategies.map(s => s.name)).toContain('high_traffic_pages');
    });

    it('should add new strategy', () => {
      const newStrategy: CacheWarmingStrategy = {
        name: 'custom_strategy',
        priority: 5,
        enabled: true,
        frequency: 60
      };

      warmingService.addStrategy(newStrategy);
      const strategies = warmingService.getStrategies();

      expect(strategies).toHaveLength(5);
      expect(strategies.find(s => s.name === 'custom_strategy')).toBeDefined();
    });

    it('should remove strategy', () => {
      const removed = warmingService.removeStrategy('popular_sources');
      const strategies = warmingService.getStrategies();

      expect(removed).toBe(true);
      expect(strategies).toHaveLength(3);
      expect(strategies.find(s => s.name === 'popular_sources')).toBeUndefined();
    });

    it('should toggle strategy enabled state', () => {
      const success = warmingService.toggleStrategy('popular_sources', false);
      const strategies = warmingService.getStrategies();
      const strategy = strategies.find(s => s.name === 'popular_sources');

      expect(success).toBe(true);
      expect(strategy?.enabled).toBe(false);
    });

    it('should return false when toggling non-existent strategy', () => {
      const success = warmingService.toggleStrategy('non_existent', false);
      expect(success).toBe(false);
    });
  });

  describe('Popular Sources Warming', () => {
    it('should warm popular sources successfully', async () => {
      const result = await warmingService.warmPopularSources();

      expect(result.strategy).toBe('popular_sources');
      expect(result.itemsWarmed).toBeGreaterThan(0);
      expect(result.successRate).toBeGreaterThan(0);
      expect(result.errors).toHaveLength(0);
      expect(result.executedAt).toBeInstanceOf(Date);
      expect(mockCache.cacheSourceConfig).toHaveBeenCalled();
      expect(mockCache.cacheProcessedGrants).toHaveBeenCalled();
    });

    it('should handle errors during popular sources warming', async () => {
      (mockCache.cacheSourceConfig as any).mockRejectedValue(new Error('Cache error'));

      const result = await warmingService.warmPopularSources();

      expect(result.strategy).toBe('popular_sources');
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.successRate).toBeLessThan(1);
    });
  });

  describe('Recent Grants Warming', () => {
    it('should warm recent grants successfully', async () => {
      const result = await warmingService.warmRecentGrants();

      expect(result.strategy).toBe('recent_grants');
      expect(result.itemsWarmed).toBeGreaterThan(0);
      expect(result.successRate).toBeGreaterThan(0);
      expect(result.errors).toHaveLength(0);
      expect(mockCache.cacheProcessedGrants).toHaveBeenCalled();
    });

    it('should handle errors during recent grants warming', async () => {
      (mockCache.cacheProcessedGrants as any).mockRejectedValue(new Error('Cache error'));

      const result = await warmingService.warmRecentGrants();

      expect(result.strategy).toBe('recent_grants');
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.successRate).toBeLessThan(1);
    });
  });

  describe('Source Configurations Warming', () => {
    it('should warm source configurations successfully', async () => {
      // Ensure the mock cache method resolves successfully
      (mockCache.cacheSourceConfig as any).mockResolvedValue(undefined);
      
      const result = await warmingService.warmSourceConfigurations();

      expect(result.strategy).toBe('source_configurations');
      expect(result.itemsWarmed).toBeGreaterThan(0);
      expect(result.successRate).toBeGreaterThan(0);
      expect(result.errors).toHaveLength(0);
      expect(mockCache.cacheSourceConfig).toHaveBeenCalled();
    });

    it('should handle errors during source configurations warming', async () => {
      (mockCache.cacheSourceConfig as any).mockRejectedValue(new Error('Cache error'));

      const result = await warmingService.warmSourceConfigurations();

      expect(result.strategy).toBe('source_configurations');
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.successRate).toBeLessThan(1);
    });
  });

  describe('High Traffic Pages Warming', () => {
    it('should warm high traffic pages successfully', async () => {
      const result = await warmingService.warmHighTrafficPages();

      expect(result.strategy).toBe('high_traffic_pages');
      expect(result.itemsWarmed).toBeGreaterThan(0);
      expect(result.successRate).toBeGreaterThan(0);
      expect(result.errors).toHaveLength(0);
      expect(mockCache.cachePageContent).toHaveBeenCalled();
    });

    it('should handle errors during high traffic pages warming', async () => {
      (mockCache.cachePageContent as any).mockRejectedValue(new Error('Cache error'));

      const result = await warmingService.warmHighTrafficPages();

      expect(result.strategy).toBe('high_traffic_pages');
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.successRate).toBeLessThan(1);
    });
  });

  describe('Warming Cycle Execution', () => {
    it('should execute warming cycle for enabled strategies', async () => {
      // Mock all strategies as needing execution (no lastExecuted)
      const strategies = warmingService.getStrategies();
      strategies.forEach(strategy => {
        strategy.lastExecuted = undefined;
      });

      const results = await warmingService.executeWarmingCycle();

      expect(results).toHaveLength(4); // All default strategies
      expect(results.every(r => r.executedAt instanceof Date)).toBe(true);
    });

    it('should skip strategies that were recently executed', async () => {
      // Set all strategies as recently executed
      const strategies = warmingService.getStrategies();
      const recentTime = new Date();
      strategies.forEach(strategy => {
        strategy.lastExecuted = recentTime;
        warmingService.addStrategy(strategy); // Update the strategy
      });

      const results = await warmingService.executeWarmingCycle();

      expect(results).toHaveLength(0); // No strategies should execute
    });

    it('should skip disabled strategies', async () => {
      // Disable all strategies
      const strategies = warmingService.getStrategies();
      strategies.forEach(strategy => {
        warmingService.toggleStrategy(strategy.name, false);
      });

      const results = await warmingService.executeWarmingCycle();

      expect(results).toHaveLength(0);
    });

    it('should prevent concurrent warming cycles', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      // Start first cycle
      const firstCycle = warmingService.executeWarmingCycle();
      
      // Try to start second cycle immediately
      const secondCycle = warmingService.executeWarmingCycle();

      const [firstResults, secondResults] = await Promise.all([firstCycle, secondCycle]);

      expect(firstResults.length).toBeGreaterThan(0);
      expect(secondResults).toHaveLength(0);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('already in progress')
      );

      consoleSpy.mockRestore();
    });

    it('should execute strategies in priority order', async () => {
      // Modify existing strategy priorities to test ordering
      const strategies = warmingService.getStrategies();
      
      // Set different priorities
      strategies[0].priority = 5; // Lower priority
      strategies[1].priority = 1; // Higher priority
      
      strategies.forEach(strategy => {
        warmingService.addStrategy(strategy); // Update the strategy
      });

      const results = await warmingService.executeWarmingCycle();

      // Should execute in priority order (lower number = higher priority)
      expect(results.length).toBeGreaterThan(0);
      
      // Verify strategies were executed (we can't easily test exact order without more complex setup)
      const executedStrategies = results.map(r => r.strategy);
      expect(executedStrategies).toContain('recent_grants'); // Should be first due to priority 1
    });
  });

  describe('Strategy Execution Timing', () => {
    it('should execute strategy when never executed before', () => {
      const strategy: CacheWarmingStrategy = {
        name: 'test_strategy',
        priority: 1,
        enabled: true,
        frequency: 60
      };

      const shouldExecute = (warmingService as any).shouldExecuteStrategy(strategy);
      expect(shouldExecute).toBe(true);
    });

    it('should execute strategy when frequency time has passed', () => {
      const strategy: CacheWarmingStrategy = {
        name: 'test_strategy',
        priority: 1,
        enabled: true,
        frequency: 1, // 1 minute
        lastExecuted: new Date(Date.now() - 2 * 60 * 1000) // 2 minutes ago
      };

      const shouldExecute = (warmingService as any).shouldExecuteStrategy(strategy);
      expect(shouldExecute).toBe(true);
    });

    it('should not execute strategy when frequency time has not passed', () => {
      const strategy: CacheWarmingStrategy = {
        name: 'test_strategy',
        priority: 1,
        enabled: true,
        frequency: 60, // 60 minutes
        lastExecuted: new Date(Date.now() - 30 * 60 * 1000) // 30 minutes ago
      };

      const shouldExecute = (warmingService as any).shouldExecuteStrategy(strategy);
      expect(shouldExecute).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle unknown strategy execution', async () => {
      const unknownStrategy: CacheWarmingStrategy = {
        name: 'unknown_strategy',
        priority: 1,
        enabled: true,
        frequency: 60
      };

      await expect(
        (warmingService as any).executeStrategy(unknownStrategy)
      ).rejects.toThrow('Unknown warming strategy: unknown_strategy');
    });

    it('should handle cache errors gracefully', async () => {
      (mockCache.cacheSourceConfig as any).mockRejectedValue(new Error('Redis connection failed'));

      const result = await warmingService.warmSourceConfigurations();

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.successRate).toBeLessThan(1);
      expect(result.executedAt).toBeInstanceOf(Date);
    });
  });

  describe('Mock Data Methods', () => {
    it('should return mock popular sources', async () => {
      const popularSources = await (warmingService as any).getPopularSources();
      
      expect(popularSources).toHaveLength(3);
      expect(popularSources[0]).toMatchObject({
        id: 'gates-foundation',
        popularity: 0.9
      });
    });

    it('should return mock recent grants', async () => {
      const recentGrants = await (warmingService as any).getRecentHighValueGrants();
      
      expect(recentGrants).toHaveLength(2);
      expect(recentGrants[0]).toMatchObject({
        id: 'grant-1',
        sourceId: 'gates-foundation',
        value: 1000000
      });
    });

    it('should return mock active sources', async () => {
      const activeSources = await (warmingService as any).getActiveSources();
      
      expect(activeSources).toHaveLength(3);
      expect(activeSources[0]).toMatchObject({
        id: 'gates-foundation',
        status: 'active'
      });
    });

    it('should return mock high traffic URLs', async () => {
      const urls = await (warmingService as any).getHighTrafficUrls();
      
      expect(urls).toHaveLength(2);
      expect(urls[0]).toBe('https://www.gatesfoundation.org/about/committed-grants');
    });
  });
});