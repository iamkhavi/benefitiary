import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ScrapingOrchestrator } from '../core/orchestrator';
import { SourceManager } from '../core/source-manager';
import { DatabaseWriter } from '../database/database-writer';
import { MetricsCollector } from '../monitoring/metrics-collector';
import { ScrapingCache } from '../cache/scraping-cache';
import { ErrorHandler } from '../monitoring/error-handler';
import { 
  ScrapedSource, 
  ScrapingResult, 
  SourceConfiguration,
  ScrapedSourceType,
  ScrapingFrequency,
  ScrapedSourceStatus,
  RawGrantData,
  ProcessedGrantData,
  GrantCategory
} from '../types';

// Mock external dependencies
vi.mock('../database/database-writer');
vi.mock('../monitoring/metrics-collector');
vi.mock('../cache/scraping-cache');
vi.mock('../monitoring/error-handler');

describe('End-to-End Scraping Workflow Tests', () => {
  let orchestrator: ScrapingOrchestrator;
  let sourceManager: SourceManager;
  let mockDatabaseWriter: vi.Mocked<DatabaseWriter>;
  let mockMetricsCollector: vi.Mocked<MetricsCollector>;
  let mockCache: vi.Mocked<ScrapingCache>;
  let mockErrorHandler: vi.Mocked<ErrorHandler>;

  const mockSource: ScrapedSource = {
    id: 'test-source-1',
    url: 'https://example-foundation.org/grants',
    type: ScrapedSourceType.FOUNDATION,
    lastScrapedAt: null,
    frequency: ScrapingFrequency.DAILY,
    status: ScrapedSourceStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockSourceConfig: SourceConfiguration = {
    id: 'test-source-1',
    url: 'https://example-foundation.org/grants',
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
      requestsPerMinute: 10,
      delayBetweenRequests: 6000,
      respectRobotsTxt: true
    },
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; GrantScraper/1.0)'
    }
  };

  const mockRawGrants: RawGrantData[] = [
    {
      title: 'Education Innovation Grant',
      description: 'Supporting innovative educational programs',
      deadline: '2024-12-31',
      fundingAmount: '$50,000 - $100,000',
      eligibility: 'Non-profit organizations',
      applicationUrl: 'https://example.org/apply/1',
      funderName: 'Example Foundation',
      sourceUrl: 'https://example-foundation.org/grants',
      scrapedAt: new Date(),
      rawContent: {}
    },
    {
      title: 'Healthcare Access Grant',
      description: 'Improving healthcare access in underserved communities',
      deadline: '2024-11-30',
      fundingAmount: '$25,000',
      eligibility: 'Healthcare organizations',
      applicationUrl: 'https://example.org/apply/2',
      funderName: 'Example Foundation',
      sourceUrl: 'https://example-foundation.org/grants',
      scrapedAt: new Date(),
      rawContent: {}
    }
  ];

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Setup mock implementations
    mockDatabaseWriter = vi.mocked(new DatabaseWriter());
    mockMetricsCollector = vi.mocked(new MetricsCollector());
    mockCache = vi.mocked(new ScrapingCache());
    mockErrorHandler = vi.mocked(new ErrorHandler());

    sourceManager = new SourceManager();
    orchestrator = new ScrapingOrchestrator(
      sourceManager,
      mockDatabaseWriter,
      mockMetricsCollector,
      mockCache,
      mockErrorHandler
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

  describe('Complete Scraping Workflow', () => {
    it('should execute full workflow from source to database', async () => {
      // Mock source manager to return test configuration
      vi.spyOn(sourceManager, 'getActiveSource').mockResolvedValue(mockSourceConfig);
      vi.spyOn(sourceManager, 'updateSourceMetrics').mockResolvedValue(undefined);

      // Mock the scraping engine to return test data
      const mockEngine = {
        scrape: vi.fn().mockResolvedValue(mockRawGrants)
      };
      
      // Mock engine factory
      vi.doMock('../engines', () => ({
        createScrapingEngine: vi.fn().mockReturnValue(mockEngine)
      }));

      const result = await orchestrator.processSource(mockSource);

      // Verify the complete workflow
      expect(sourceManager.getActiveSource).toHaveBeenCalledWith(mockSource.id);
      expect(mockEngine.scrape).toHaveBeenCalledWith(mockSourceConfig);
      expect(mockDatabaseWriter.batchInsertGrants).toHaveBeenCalled();
      expect(mockMetricsCollector.trackJobCompletion).toHaveBeenCalled();
      expect(sourceManager.updateSourceMetrics).toHaveBeenCalled();

      // Verify result structure
      expect(result).toMatchObject({
        sourceId: mockSource.id,
        totalFound: 2,
        totalInserted: expect.any(Number),
        totalUpdated: 0,
        totalSkipped: 0,
        errors: [],
        duration: expect.any(Number)
      });
    });

    it('should handle multiple sources concurrently', async () => {
      const sources: ScrapedSource[] = [
        { ...mockSource, id: 'source-1' },
        { ...mockSource, id: 'source-2' },
        { ...mockSource, id: 'source-3' }
      ];

      // Mock configurations for each source
      sources.forEach(source => {
        vi.spyOn(sourceManager, 'getActiveSource')
          .mockResolvedValueOnce({ ...mockSourceConfig, id: source.id });
      });

      const mockEngine = {
        scrape: vi.fn().mockResolvedValue(mockRawGrants)
      };
      
      vi.doMock('../engines', () => ({
        createScrapingEngine: vi.fn().mockReturnValue(mockEngine)
      }));

      const startTime = Date.now();
      const results = await Promise.all(
        sources.map(source => orchestrator.processSource(source))
      );
      const duration = Date.now() - startTime;

      // Verify all sources were processed
      expect(results).toHaveLength(3);
      results.forEach((result, index) => {
        expect(result.sourceId).toBe(sources[index].id);
        expect(result.totalFound).toBe(2);
      });

      // Verify concurrent processing (should be faster than sequential)
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
    });

    it('should handle errors gracefully and continue processing', async () => {
      const sources: ScrapedSource[] = [
        { ...mockSource, id: 'working-source' },
        { ...mockSource, id: 'failing-source' },
        { ...mockSource, id: 'another-working-source' }
      ];

      // Mock first and third sources to work, second to fail
      vi.spyOn(sourceManager, 'getActiveSource')
        .mockResolvedValueOnce({ ...mockSourceConfig, id: 'working-source' })
        .mockRejectedValueOnce(new Error('Source configuration not found'))
        .mockResolvedValueOnce({ ...mockSourceConfig, id: 'another-working-source' });

      const mockEngine = {
        scrape: vi.fn().mockResolvedValue(mockRawGrants)
      };
      
      vi.doMock('../engines', () => ({
        createScrapingEngine: vi.fn().mockReturnValue(mockEngine)
      }));

      const results = await Promise.allSettled(
        sources.map(source => orchestrator.processSource(source))
      );

      // Verify that working sources succeeded and failing source was handled
      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('rejected');
      expect(results[2].status).toBe('fulfilled');

      // Verify error handling was called
      expect(mockErrorHandler.handleScrapingError).toHaveBeenCalled();
    });
  });

  describe('Data Quality Validation Workflow', () => {
    it('should validate and clean scraped data before storage', async () => {
      const invalidRawGrants: RawGrantData[] = [
        {
          title: '', // Invalid: empty title
          description: 'Valid description',
          deadline: 'invalid-date', // Invalid: bad date format
          fundingAmount: 'not-a-number', // Invalid: non-numeric amount
          eligibility: 'Valid eligibility',
          applicationUrl: 'not-a-url', // Invalid: bad URL
          funderName: 'Valid Funder',
          sourceUrl: mockSource.url,
          scrapedAt: new Date(),
          rawContent: {}
        },
        {
          title: 'Valid Grant Title',
          description: 'Valid description with proper content',
          deadline: '2024-12-31',
          fundingAmount: '$50,000',
          eligibility: 'Non-profit organizations',
          applicationUrl: 'https://example.org/apply',
          funderName: 'Valid Funder',
          sourceUrl: mockSource.url,
          scrapedAt: new Date(),
          rawContent: {}
        }
      ];

      vi.spyOn(sourceManager, 'getActiveSource').mockResolvedValue(mockSourceConfig);

      const mockEngine = {
        scrape: vi.fn().mockResolvedValue(invalidRawGrants)
      };
      
      vi.doMock('../engines', () => ({
        createScrapingEngine: vi.fn().mockReturnValue(mockEngine)
      }));

      const result = await orchestrator.processSource(mockSource);

      // Verify that only valid grants were processed
      expect(result.totalFound).toBe(2);
      expect(result.totalInserted).toBeLessThan(result.totalFound); // Some should be filtered out
      expect(result.errors.length).toBeGreaterThan(0); // Should have validation errors
    });

    it('should detect and handle duplicate grants', async () => {
      const duplicateGrants: RawGrantData[] = [
        mockRawGrants[0], // Original grant
        { ...mockRawGrants[0], sourceUrl: 'different-source.com' }, // Duplicate from different source
        mockRawGrants[1] // Different grant
      ];

      vi.spyOn(sourceManager, 'getActiveSource').mockResolvedValue(mockSourceConfig);

      const mockEngine = {
        scrape: vi.fn().mockResolvedValue(duplicateGrants)
      };
      
      vi.doMock('../engines', () => ({
        createScrapingEngine: vi.fn().mockReturnValue(mockEngine)
      }));

      const result = await orchestrator.processSource(mockSource);

      // Verify duplicate detection
      expect(result.totalFound).toBe(3);
      expect(result.totalInserted).toBeLessThan(3); // Duplicates should be merged/skipped
    });
  });

  describe('Performance and Reliability', () => {
    it('should complete scraping within acceptable time limits', async () => {
      const largeDataSet: RawGrantData[] = Array.from({ length: 100 }, (_, i) => ({
        ...mockRawGrants[0],
        title: `Grant ${i + 1}`,
        applicationUrl: `https://example.org/apply/${i + 1}`
      }));

      vi.spyOn(sourceManager, 'getActiveSource').mockResolvedValue(mockSourceConfig);

      const mockEngine = {
        scrape: vi.fn().mockResolvedValue(largeDataSet)
      };
      
      vi.doMock('../engines', () => ({
        createScrapingEngine: vi.fn().mockReturnValue(mockEngine)
      }));

      const startTime = Date.now();
      const result = await orchestrator.processSource(mockSource);
      const duration = Date.now() - startTime;

      // Verify performance requirements
      expect(duration).toBeLessThan(30000); // Should complete within 30 seconds
      expect(result.totalFound).toBe(100);
      expect(result.duration).toBeLessThan(30000);
    });

    it('should handle memory efficiently with large datasets', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Process multiple large batches
      for (let batch = 0; batch < 5; batch++) {
        const largeDataSet: RawGrantData[] = Array.from({ length: 200 }, (_, i) => ({
          ...mockRawGrants[0],
          title: `Batch ${batch} Grant ${i + 1}`,
          applicationUrl: `https://example.org/apply/${batch}/${i + 1}`
        }));

        vi.spyOn(sourceManager, 'getActiveSource').mockResolvedValue(mockSourceConfig);

        const mockEngine = {
          scrape: vi.fn().mockResolvedValue(largeDataSet)
        };
        
        vi.doMock('../engines', () => ({
          createScrapingEngine: vi.fn().mockReturnValue(mockEngine)
        }));

        await orchestrator.processSource({ ...mockSource, id: `batch-${batch}` });
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 100MB)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
    });
  });

  describe('Integration with External Services', () => {
    it('should integrate properly with caching layer', async () => {
      vi.spyOn(sourceManager, 'getActiveSource').mockResolvedValue(mockSourceConfig);
      
      // Mock cache hit
      mockCache.getCachedContent.mockResolvedValue(JSON.stringify(mockRawGrants));

      const mockEngine = {
        scrape: vi.fn().mockResolvedValue([]) // Should not be called due to cache hit
      };
      
      vi.doMock('../engines', () => ({
        createScrapingEngine: vi.fn().mockReturnValue(mockEngine)
      }));

      const result = await orchestrator.processSource(mockSource);

      // Verify cache integration
      expect(mockCache.getCachedContent).toHaveBeenCalled();
      expect(mockEngine.scrape).not.toHaveBeenCalled(); // Should use cached data
      expect(result.totalFound).toBe(2); // Should process cached grants
    });

    it('should integrate properly with monitoring and metrics', async () => {
      vi.spyOn(sourceManager, 'getActiveSource').mockResolvedValue(mockSourceConfig);

      const mockEngine = {
        scrape: vi.fn().mockResolvedValue(mockRawGrants)
      };
      
      vi.doMock('../engines', () => ({
        createScrapingEngine: vi.fn().mockReturnValue(mockEngine)
      }));

      await orchestrator.processSource(mockSource);

      // Verify monitoring integration
      expect(mockMetricsCollector.trackJobCompletion).toHaveBeenCalled();
      expect(sourceManager.updateSourceMetrics).toHaveBeenCalled();
    });
  });
});