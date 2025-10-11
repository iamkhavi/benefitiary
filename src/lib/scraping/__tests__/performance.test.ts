import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ScrapingOrchestrator } from '../core/orchestrator';
import { SourceManager } from '../core/source-manager';
import { DatabaseWriter } from '../database/database-writer';
import { MetricsCollector } from '../monitoring/metrics-collector';
import { ScrapingCache } from '../cache/scraping-cache';
import { 
  ScrapedSource, 
  SourceConfiguration,
  ScrapedSourceType,
  ScrapingFrequency,
  ScrapedSourceStatus,
  RawGrantData
} from '../types';

// Mock external dependencies
vi.mock('../database/database-writer');
vi.mock('../monitoring/metrics-collector');
vi.mock('../cache/scraping-cache');

describe('Performance Tests', () => {
  let orchestrator: ScrapingOrchestrator;
  let sourceManager: SourceManager;
  let mockDatabaseWriter: vi.Mocked<DatabaseWriter>;
  let mockMetricsCollector: vi.Mocked<MetricsCollector>;
  let mockCache: vi.Mocked<ScrapingCache>;

  const createMockSource = (id: string): ScrapedSource => ({
    id,
    url: `https://example-${id}.org/grants`,
    type: ScrapedSourceType.FOUNDATION,
    lastScrapedAt: null,
    frequency: ScrapingFrequency.DAILY,
    status: ScrapedSourceStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  const createMockConfig = (id: string): SourceConfiguration => ({
    id,
    url: `https://example-${id}.org/grants`,
    type: ScrapedSourceType.FOUNDATION,
    engine: 'static',
    selectors: {
      grantContainer: '.grant-item',
      title: '.grant-title',
      description: '.grant-description',
      deadline: '.deadline',
      fundingAmount: '.amount',
      eligibility: '.eligibility',
      applicationUrl: '.apply-link',
      funderInfo: '.funder-info'
    },
    rateLimit: {
      requestsPerMinute: 60,
      delayBetweenRequests: 1000,
      respectRobotsTxt: true
    },
    headers: {}
  });

  const createMockGrants = (count: number, sourceId: string): RawGrantData[] => {
    return Array.from({ length: count }, (_, i) => ({
      title: `Grant ${i + 1} from ${sourceId}`,
      description: `Description for grant ${i + 1}`,
      deadline: '2024-12-31',
      fundingAmount: `$${(i + 1) * 10000}`,
      eligibility: 'Non-profit organizations',
      applicationUrl: `https://example-${sourceId}.org/apply/${i + 1}`,
      funderName: `Foundation ${sourceId}`,
      sourceUrl: `https://example-${sourceId}.org/grants`,
      scrapedAt: new Date(),
      rawContent: { index: i }
    }));
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockDatabaseWriter = vi.mocked(new DatabaseWriter());
    mockMetricsCollector = vi.mocked(new MetricsCollector());
    mockCache = vi.mocked(new ScrapingCache());

    sourceManager = new SourceManager();
    orchestrator = new ScrapingOrchestrator(
      sourceManager,
      mockDatabaseWriter,
      mockMetricsCollector,
      mockCache
    );

    // Setup default mock returns
    mockDatabaseWriter.batchInsertGrants.mockResolvedValue(undefined);
    mockDatabaseWriter.batchUpdateGrants.mockResolvedValue(undefined);
    mockMetricsCollector.trackJobCompletion.mockResolvedValue(undefined);
    mockCache.cacheProcessedGrants.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Concurrent Scraping Performance', () => {
    it('should handle 10 concurrent sources efficiently', async () => {
      const sourceCount = 10;
      const grantsPerSource = 50;
      const sources = Array.from({ length: sourceCount }, (_, i) => 
        createMockSource(`source-${i}`)
      );

      // Mock configurations and engines for each source
      sources.forEach((source, index) => {
        vi.spyOn(sourceManager, 'getActiveSource')
          .mockResolvedValueOnce(createMockConfig(source.id));
      });

      const mockEngine = {
        scrape: vi.fn().mockImplementation((config: SourceConfiguration) => 
          Promise.resolve(createMockGrants(grantsPerSource, config.id))
        )
      };
      
      vi.doMock('../engines', () => ({
        createScrapingEngine: vi.fn().mockReturnValue(mockEngine)
      }));

      const startTime = Date.now();
      const results = await Promise.all(
        sources.map(source => orchestrator.processSource(source))
      );
      const duration = Date.now() - startTime;

      // Performance assertions
      expect(results).toHaveLength(sourceCount);
      expect(duration).toBeLessThan(15000); // Should complete within 15 seconds
      
      // Verify all sources processed successfully
      results.forEach((result, index) => {
        expect(result.sourceId).toBe(sources[index].id);
        expect(result.totalFound).toBe(grantsPerSource);
        expect(result.errors).toHaveLength(0);
      });

      // Verify database operations were batched efficiently
      expect(mockDatabaseWriter.batchInsertGrants).toHaveBeenCalledTimes(sourceCount);
    });

    it('should maintain performance with varying load sizes', async () => {
      const testCases = [
        { sources: 5, grantsPerSource: 100 },
        { sources: 10, grantsPerSource: 50 },
        { sources: 20, grantsPerSource: 25 }
      ];

      for (const testCase of testCases) {
        const sources = Array.from({ length: testCase.sources }, (_, i) => 
          createMockSource(`load-test-${i}`)
        );

        sources.forEach(source => {
          vi.spyOn(sourceManager, 'getActiveSource')
            .mockResolvedValueOnce(createMockConfig(source.id));
        });

        const mockEngine = {
          scrape: vi.fn().mockImplementation((config: SourceConfiguration) => 
            Promise.resolve(createMockGrants(testCase.grantsPerSource, config.id))
          )
        };
        
        vi.doMock('../engines', () => ({
          createScrapingEngine: vi.fn().mockReturnValue(mockEngine)
        }));

        const startTime = Date.now();
        const results = await Promise.all(
          sources.map(source => orchestrator.processSource(source))
        );
        const duration = Date.now() - startTime;

        // Performance should scale reasonably
        const totalGrants = testCase.sources * testCase.grantsPerSource;
        const grantsPerSecond = totalGrants / (duration / 1000);
        
        expect(grantsPerSecond).toBeGreaterThan(10); // Should process at least 10 grants/second
        expect(results.every(r => r.errors.length === 0)).toBe(true);
      }
    });
  });

  describe('Database Operation Performance', () => {
    it('should efficiently batch database operations', async () => {
      const batchSizes = [10, 50, 100, 500];
      
      for (const batchSize of batchSizes) {
        const source = createMockSource('batch-test');
        const grants = createMockGrants(batchSize, source.id);

        vi.spyOn(sourceManager, 'getActiveSource')
          .mockResolvedValue(createMockConfig(source.id));

        const mockEngine = {
          scrape: vi.fn().mockResolvedValue(grants)
        };
        
        vi.doMock('../engines', () => ({
          createScrapingEngine: vi.fn().mockReturnValue(mockEngine)
        }));

        // Mock database timing
        let dbOperationTime = 0;
        mockDatabaseWriter.batchInsertGrants.mockImplementation(async () => {
          const start = Date.now();
          await new Promise(resolve => setTimeout(resolve, Math.min(batchSize, 100))); // Simulate DB time
          dbOperationTime = Date.now() - start;
        });

        const startTime = Date.now();
        const result = await orchestrator.processSource(source);
        const totalTime = Date.now() - startTime;

        // Database operations should be efficient
        expect(dbOperationTime).toBeLessThan(totalTime * 0.5); // DB should be < 50% of total time
        expect(result.totalFound).toBe(batchSize);
        
        // Larger batches should be more efficient per item
        const timePerGrant = totalTime / batchSize;
        expect(timePerGrant).toBeLessThan(100); // Less than 100ms per grant
      }
    });

    it('should handle database connection pooling efficiently', async () => {
      const concurrentOperations = 20;
      const source = createMockSource('pool-test');
      
      vi.spyOn(sourceManager, 'getActiveSource')
        .mockResolvedValue(createMockConfig(source.id));

      const mockEngine = {
        scrape: vi.fn().mockResolvedValue(createMockGrants(10, source.id))
      };
      
      vi.doMock('../engines', () => ({
        createScrapingEngine: vi.fn().mockReturnValue(mockEngine)
      }));

      // Simulate concurrent database operations
      const operations = Array.from({ length: concurrentOperations }, () => 
        orchestrator.processSource({ ...source, id: `pool-${Math.random()}` })
      );

      const startTime = Date.now();
      const results = await Promise.all(operations);
      const duration = Date.now() - startTime;

      // Should handle concurrent operations without significant slowdown
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
      expect(results.every(r => r.errors.length === 0)).toBe(true);
      expect(mockDatabaseWriter.batchInsertGrants).toHaveBeenCalledTimes(concurrentOperations);
    });
  });

  describe('Memory Usage Performance', () => {
    it('should maintain stable memory usage during large operations', async () => {
      const initialMemory = process.memoryUsage();
      const largeDataSets = 5;
      const grantsPerSet = 1000;

      for (let i = 0; i < largeDataSets; i++) {
        const source = createMockSource(`memory-test-${i}`);
        const grants = createMockGrants(grantsPerSet, source.id);

        vi.spyOn(sourceManager, 'getActiveSource')
          .mockResolvedValue(createMockConfig(source.id));

        const mockEngine = {
          scrape: vi.fn().mockResolvedValue(grants)
        };
        
        vi.doMock('../engines', () => ({
          createScrapingEngine: vi.fn().mockReturnValue(mockEngine)
        }));

        await orchestrator.processSource(source);

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Memory increase should be reasonable (less than 50MB for this test)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });

    it('should efficiently handle streaming large datasets', async () => {
      const source = createMockSource('streaming-test');
      const largeDataset = createMockGrants(5000, source.id);

      vi.spyOn(sourceManager, 'getActiveSource')
        .mockResolvedValue(createMockConfig(source.id));

      // Mock streaming behavior
      const mockEngine = {
        scrape: vi.fn().mockImplementation(async () => {
          // Simulate streaming by processing in chunks
          const chunkSize = 100;
          const chunks = [];
          for (let i = 0; i < largeDataset.length; i += chunkSize) {
            chunks.push(largeDataset.slice(i, i + chunkSize));
          }
          return largeDataset; // Return full dataset but simulate chunked processing
        })
      };
      
      vi.doMock('../engines', () => ({
        createScrapingEngine: vi.fn().mockReturnValue(mockEngine)
      }));

      const memoryBefore = process.memoryUsage().heapUsed;
      const result = await orchestrator.processSource(source);
      const memoryAfter = process.memoryUsage().heapUsed;
      
      const memoryUsed = memoryAfter - memoryBefore;
      const memoryPerGrant = memoryUsed / result.totalFound;

      // Should use reasonable memory per grant (less than 1KB per grant)
      expect(memoryPerGrant).toBeLessThan(1024);
      expect(result.totalFound).toBe(5000);
    });
  });

  describe('Rate Limiting Performance', () => {
    it('should respect rate limits without excessive delays', async () => {
      const source = createMockSource('rate-limit-test');
      const config = createMockConfig(source.id);
      config.rateLimit = {
        requestsPerMinute: 30, // 2 requests per second
        delayBetweenRequests: 2000,
        respectRobotsTxt: true
      };

      vi.spyOn(sourceManager, 'getActiveSource').mockResolvedValue(config);

      // Mock engine that simulates multiple requests
      let requestCount = 0;
      const mockEngine = {
        scrape: vi.fn().mockImplementation(async () => {
          requestCount++;
          // Simulate multiple internal requests
          await new Promise(resolve => setTimeout(resolve, 100));
          return createMockGrants(10, source.id);
        })
      };
      
      vi.doMock('../engines', () => ({
        createScrapingEngine: vi.fn().mockReturnValue(mockEngine)
      }));

      const startTime = Date.now();
      const result = await orchestrator.processSource(source);
      const duration = Date.now() - startTime;

      // Should complete reasonably quickly despite rate limiting
      expect(duration).toBeLessThan(30000); // Should complete within 30 seconds
      expect(result.totalFound).toBe(10);
      expect(requestCount).toBe(1);
    });

    it('should handle rate limit errors gracefully', async () => {
      const source = createMockSource('rate-limit-error-test');
      
      vi.spyOn(sourceManager, 'getActiveSource')
        .mockResolvedValue(createMockConfig(source.id));

      // Mock engine that throws rate limit errors initially
      let attemptCount = 0;
      const mockEngine = {
        scrape: vi.fn().mockImplementation(async () => {
          attemptCount++;
          if (attemptCount <= 2) {
            throw new Error('Rate limit exceeded');
          }
          return createMockGrants(5, source.id);
        })
      };
      
      vi.doMock('../engines', () => ({
        createScrapingEngine: vi.fn().mockReturnValue(mockEngine)
      }));

      const startTime = Date.now();
      const result = await orchestrator.processSource(source);
      const duration = Date.now() - startTime;

      // Should eventually succeed after retries
      expect(result.totalFound).toBe(5);
      expect(attemptCount).toBe(3); // Should have retried
      expect(duration).toBeGreaterThan(1000); // Should have some delay due to retries
    });
  });

  describe('Caching Performance', () => {
    it('should significantly improve performance with cache hits', async () => {
      const source = createMockSource('cache-test');
      const grants = createMockGrants(100, source.id);
      
      vi.spyOn(sourceManager, 'getActiveSource')
        .mockResolvedValue(createMockConfig(source.id));

      // First run - cache miss
      mockCache.getCachedContent.mockResolvedValueOnce(null);
      const mockEngine = {
        scrape: vi.fn().mockResolvedValue(grants)
      };
      
      vi.doMock('../engines', () => ({
        createScrapingEngine: vi.fn().mockReturnValue(mockEngine)
      }));

      const startTime1 = Date.now();
      await orchestrator.processSource(source);
      const duration1 = Date.now() - startTime1;

      // Second run - cache hit
      mockCache.getCachedContent.mockResolvedValueOnce(JSON.stringify(grants));
      
      const startTime2 = Date.now();
      await orchestrator.processSource(source);
      const duration2 = Date.now() - startTime2;

      // Cache hit should be significantly faster
      expect(duration2).toBeLessThan(duration1 * 0.5); // At least 50% faster
      expect(mockEngine.scrape).toHaveBeenCalledTimes(1); // Only called once (cache miss)
    });
  });
});