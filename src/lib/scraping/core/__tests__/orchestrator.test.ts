/**
 * Integration tests for ScrapingOrchestrator
 * Tests complete scraping workflow coordination and error handling
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { ScrapingOrchestrator } from '../orchestrator';
import { SourceManager } from '../source-manager';
import { 
  ScrapeJob, 
  ScrapeJobStatus, 
  SourceConfiguration, 
  ScrapedSourceType, 
  RawGrantData, 
  ProcessedGrantData,
  GrantCategory
} from '../../types';

// Mock all the dependencies
vi.mock('../source-manager');
vi.mock('../../engines/static-parser', () => ({
  StaticParserEngine: vi.fn().mockImplementation(() => ({
    scrape: vi.fn().mockResolvedValue([])
  }))
}));
vi.mock('../../engines/browser-engine', () => ({
  BrowserEngine: vi.fn().mockImplementation(() => ({
    scrape: vi.fn().mockResolvedValue([])
  }))
}));
vi.mock('../../engines/api-client', () => ({
  APIClientEngine: vi.fn().mockImplementation(() => ({
    scrape: vi.fn().mockResolvedValue([])
  }))
}));
vi.mock('../../processors/data-processor', () => ({
  DataProcessor: vi.fn().mockImplementation(() => ({
    processRawData: vi.fn().mockResolvedValue([])
  }))
}));
vi.mock('../../processors/validator', () => ({
  DataValidator: vi.fn().mockImplementation(() => ({
    validateGrant: vi.fn().mockResolvedValue({ isValid: true, errors: [], warnings: [], qualityScore: 0.9 })
  }))
}));
vi.mock('../../processors/classifier', () => ({
  ClassificationEngine: vi.fn().mockImplementation(() => ({
    classifyGrant: vi.fn().mockResolvedValue({
      category: 'EDUCATION_TRAINING',
      tags: ['education'],
      confidence: 0.8,
      reasoning: ['Education keywords found']
    })
  }))
}));
vi.mock('../../processors/deduplicator', () => ({
  Deduplicator: vi.fn().mockImplementation(() => ({
    deduplicateGrants: vi.fn().mockResolvedValue({
      unique: [],
      duplicatesFound: 0
    })
  }))
}));
vi.mock('../../monitoring/error-tracker', () => ({
  ErrorHandler: vi.fn().mockImplementation(() => ({
    handleError: vi.fn().mockResolvedValue(undefined)
  }))
}));
vi.mock('../../monitoring/metrics-collector', () => ({
  MetricsCollector: vi.fn().mockImplementation(() => ({
    recordError: vi.fn().mockResolvedValue(undefined)
  }))
}));

describe('ScrapingOrchestrator', () => {
  let orchestrator: ScrapingOrchestrator;
  let mockSourceManager: SourceManager;
  let mockSource: SourceConfiguration;
  let mockJob: ScrapeJob;

  beforeEach(() => {
    mockSourceManager = new SourceManager() as any;
    orchestrator = new ScrapingOrchestrator(mockSourceManager);

    mockSource = {
      id: 'test-source',
      url: 'https://example.com/grants',
      type: ScrapedSourceType.FOUNDATION,
      engine: 'static',
      selectors: {
        grantContainer: '.grant',
        title: '.title',
        description: '.description',
        deadline: '.deadline',
        fundingAmount: '.amount',
        eligibility: '.eligibility',
        applicationUrl: '.apply-url',
        funderInfo: '.funder'
      },
      rateLimit: {
        requestsPerMinute: 10,
        delayBetweenRequests: 6000,
        respectRobotsTxt: true
      },
      headers: {}
    };

    mockJob = {
      id: 'test-job-1',
      sourceId: 'test-source',
      scheduledAt: new Date(),
      status: ScrapeJobStatus.PENDING,
      priority: 1,
      metadata: {}
    };

    // Setup default mocks
    (mockSourceManager.getActiveSource as Mock).mockResolvedValue(mockSource);
    (mockSourceManager.updateSourceMetrics as Mock).mockResolvedValue(undefined);
  });

  describe('Job Execution', () => {
    it('should execute a complete scraping job successfully', async () => {
      // Mock the scraping engine to return sample data
      const mockRawData: RawGrantData[] = [
        {
          title: 'Test Grant 1',
          description: 'A test grant for healthcare research',
          deadline: '2024-12-31',
          fundingAmount: '$100,000',
          eligibility: 'Non-profit organizations',
          applicationUrl: 'https://example.com/apply/1',
          funderName: 'Test Foundation',
          sourceUrl: 'https://example.com/grants/1',
          scrapedAt: new Date(),
          rawContent: {}
        }
      ];

      const mockProcessedData: ProcessedGrantData[] = [
        {
          title: 'Test Grant 1',
          description: 'A test grant for healthcare research',
          deadline: new Date('2024-12-31'),
          fundingAmountMin: 100000,
          fundingAmountMax: 100000,
          eligibilityCriteria: 'Non-profit organizations',
          applicationUrl: 'https://example.com/apply/1',
          funder: {
            name: 'Test Foundation',
            type: ScrapedSourceType.FOUNDATION
          },
          category: GrantCategory.HEALTHCARE_PUBLIC_HEALTH,
          locationEligibility: ['US'],
          confidenceScore: 0.95,
          contentHash: 'hash123'
        }
      ];

      // Mock all the processing steps
      const mockEngine = {
        scrape: vi.fn().mockResolvedValue(mockRawData)
      };
      (orchestrator as any).engines.set('static', mockEngine);

      const mockDataProcessor = {
        processRawData: vi.fn().mockResolvedValue(mockProcessedData)
      };
      (orchestrator as any).dataProcessor = mockDataProcessor;

      const mockValidator = {
        validateGrant: vi.fn().mockResolvedValue({ isValid: true, errors: [], warnings: [], qualityScore: 0.9 })
      };
      (orchestrator as any).dataValidator = mockValidator;

      const mockClassifier = {
        classifyGrant: vi.fn().mockResolvedValue({
          category: GrantCategory.HEALTHCARE_PUBLIC_HEALTH,
          tags: ['healthcare', 'research'],
          confidence: 0.95,
          reasoning: ['Contains healthcare keywords']
        })
      };
      (orchestrator as any).classificationEngine = mockClassifier;

      const mockDeduplicator = {
        deduplicateGrants: vi.fn().mockResolvedValue({
          unique: mockProcessedData,
          duplicatesFound: 0
        })
      };
      (orchestrator as any).deduplicator = mockDeduplicator;

      const result = await orchestrator.executeScrapeJob(mockJob);

      expect(result.sourceId).toBe('test-source');
      expect(result.totalFound).toBe(1);
      expect(result.totalInserted).toBe(1);
      expect(result.totalUpdated).toBe(0);
      expect(result.totalSkipped).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(result.duration).toBeGreaterThan(0);
      expect(result.metadata.startedAt).toBeInstanceOf(Date);

      // Verify all processing steps were called
      expect(mockEngine.scrape).toHaveBeenCalledWith(mockSource);
      expect(mockDataProcessor.processRawData).toHaveBeenCalledWith(mockRawData);
      expect(mockValidator.validateGrant).toHaveBeenCalledWith(mockProcessedData[0]);
      expect(mockClassifier.classifyGrant).toHaveBeenCalledWith(mockProcessedData[0]);
      expect(mockDeduplicator.deduplicateGrants).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            title: 'Test Grant 1',
            tags: expect.arrayContaining(['healthcare', 'research'])
          })
        ]), 
        'test-source'
      );
    });

    it('should handle job cancellation', async () => {
      mockJob.metadata.cancelRequested = true;

      const result = await orchestrator.executeScrapeJob(mockJob);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toBe('Job was cancelled');
      expect(result.metadata.failed).toBe(true);
    });

    it('should handle source not found error', async () => {
      (mockSourceManager.getActiveSource as Mock).mockResolvedValue(null);

      const result = await orchestrator.executeScrapeJob(mockJob);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Source configuration not found');
      expect(result.metadata.failed).toBe(true);
    });

    it('should handle scraping engine errors', async () => {
      const mockEngine = {
        scrape: vi.fn().mockRejectedValue(new Error('Network timeout'))
      };
      (orchestrator as any).engines.set('static', mockEngine);

      const result = await orchestrator.executeScrapeJob(mockJob);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('NETWORK');
      expect(result.errors[0].message).toBe('Network timeout');
    });
  });

  describe('Source Processing', () => {
    it('should process a source through complete workflow', async () => {
      const mockRawData: RawGrantData[] = [
        {
          title: 'Grant 1',
          description: 'Description 1',
          sourceUrl: 'https://example.com/1',
          scrapedAt: new Date(),
          rawContent: {}
        },
        {
          title: 'Grant 2',
          description: 'Description 2',
          sourceUrl: 'https://example.com/2',
          scrapedAt: new Date(),
          rawContent: {}
        }
      ];

      const mockProcessedData: ProcessedGrantData[] = mockRawData.map((raw, index) => ({
        title: raw.title,
        description: raw.description || '',
        funder: { name: 'Test Funder', type: ScrapedSourceType.FOUNDATION },
        category: GrantCategory.EDUCATION_TRAINING,
        locationEligibility: ['US'],
        confidenceScore: 0.8,
        contentHash: `hash${index}`,
        eligibilityCriteria: ''
      }));

      // Setup mocks
      const mockEngine = {
        scrape: vi.fn().mockResolvedValue(mockRawData)
      };
      (orchestrator as any).engines.set('static', mockEngine);

      const mockDataProcessor = {
        processRawData: vi.fn().mockResolvedValue(mockProcessedData)
      };
      (orchestrator as any).dataProcessor = mockDataProcessor;

      const mockValidator = {
        validateGrant: vi.fn().mockResolvedValue({ isValid: true, errors: [], warnings: [], qualityScore: 0.9 })
      };
      (orchestrator as any).dataValidator = mockValidator;

      const mockClassifier = {
        classifyGrant: vi.fn().mockResolvedValue({
          category: GrantCategory.EDUCATION_TRAINING,
          tags: ['education'],
          confidence: 0.8,
          reasoning: ['Education keywords found']
        })
      };
      (orchestrator as any).classificationEngine = mockClassifier;

      const mockDeduplicator = {
        deduplicateGrants: vi.fn().mockResolvedValue({
          unique: mockProcessedData,
          duplicatesFound: 0
        })
      };
      (orchestrator as any).deduplicator = mockDeduplicator;

      const result = await orchestrator.processSource(mockSource);

      expect(result.sourceId).toBe('test-source');
      expect(result.totalFound).toBe(2);
      expect(result.totalInserted).toBe(2);
      expect(result.errors).toHaveLength(0);
      expect(result.metadata.processedCount).toBe(2);
      expect(result.metadata.validatedCount).toBe(2);
      expect(result.metadata.duplicatesFound).toBe(0);
    });

    it('should handle empty scraping results', async () => {
      const mockEngine = {
        scrape: vi.fn().mockResolvedValue([])
      };
      (orchestrator as any).engines.set('static', mockEngine);

      const result = await orchestrator.processSource(mockSource);

      expect(result.totalFound).toBe(0);
      expect(result.totalInserted).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle validation failures', async () => {
      const mockRawData: RawGrantData[] = [
        {
          title: 'Invalid Grant',
          sourceUrl: 'https://example.com/invalid',
          scrapedAt: new Date(),
          rawContent: {}
        }
      ];

      const mockProcessedData: ProcessedGrantData[] = [
        {
          title: 'Invalid Grant',
          description: '',
          funder: { name: 'Test Funder', type: ScrapedSourceType.FOUNDATION },
          category: GrantCategory.EDUCATION_TRAINING,
          locationEligibility: [],
          confidenceScore: 0.1,
          contentHash: 'hash1',
          eligibilityCriteria: ''
        }
      ];

      const mockEngine = {
        scrape: vi.fn().mockResolvedValue(mockRawData)
      };
      (orchestrator as any).engines.set('static', mockEngine);

      const mockDataProcessor = {
        processRawData: vi.fn().mockResolvedValue(mockProcessedData)
      };
      (orchestrator as any).dataProcessor = mockDataProcessor;

      const mockValidator = {
        validateGrant: vi.fn().mockResolvedValue({ 
          isValid: false, 
          errors: [{ field: 'description', message: 'Description is required', severity: 'error' }], 
          warnings: [], 
          qualityScore: 0.1 
        })
      };
      (orchestrator as any).dataValidator = mockValidator;

      const result = await orchestrator.processSource(mockSource);

      expect(result.totalFound).toBe(1);
      expect(result.metadata.processedCount).toBe(1);
      expect(result.metadata.validatedCount).toBe(0); // Failed validation
      expect(result.totalInserted).toBe(0);
    });

    it('should handle deduplication', async () => {
      const mockRawData: RawGrantData[] = [
        {
          title: 'Duplicate Grant',
          sourceUrl: 'https://example.com/1',
          scrapedAt: new Date(),
          rawContent: {}
        },
        {
          title: 'Duplicate Grant',
          sourceUrl: 'https://example.com/2',
          scrapedAt: new Date(),
          rawContent: {}
        }
      ];

      const mockProcessedData: ProcessedGrantData[] = mockRawData.map((raw, index) => ({
        title: raw.title,
        description: '',
        funder: { name: 'Test Funder', type: ScrapedSourceType.FOUNDATION },
        category: GrantCategory.EDUCATION_TRAINING,
        locationEligibility: ['US'],
        confidenceScore: 0.8,
        contentHash: `hash${index}`,
        eligibilityCriteria: ''
      }));

      const mockEngine = {
        scrape: vi.fn().mockResolvedValue(mockRawData)
      };
      (orchestrator as any).engines.set('static', mockEngine);

      const mockDataProcessor = {
        processRawData: vi.fn().mockResolvedValue(mockProcessedData)
      };
      (orchestrator as any).dataProcessor = mockDataProcessor;

      const mockValidator = {
        validateGrant: vi.fn().mockResolvedValue({ isValid: true, errors: [], warnings: [], qualityScore: 0.9 })
      };
      (orchestrator as any).dataValidator = mockValidator;

      const mockClassifier = {
        classifyGrant: vi.fn().mockResolvedValue({
          category: GrantCategory.EDUCATION_TRAINING,
          tags: ['education'],
          confidence: 0.8,
          reasoning: ['Education keywords found']
        })
      };
      (orchestrator as any).classificationEngine = mockClassifier;

      const mockDeduplicator = {
        deduplicateGrants: vi.fn().mockResolvedValue({
          unique: [mockProcessedData[0]], // Only one unique grant
          duplicatesFound: 1
        })
      };
      (orchestrator as any).deduplicator = mockDeduplicator;

      const result = await orchestrator.processSource(mockSource);

      expect(result.totalFound).toBe(2);
      expect(result.metadata.duplicatesFound).toBe(1);
      expect(result.totalInserted).toBe(1); // Only unique grant inserted
    });
  });

  describe('Concurrent Processing', () => {
    it('should process multiple sources concurrently', async () => {
      const sources = [
        { ...mockSource, id: 'source-1' },
        { ...mockSource, id: 'source-2' },
        { ...mockSource, id: 'source-3' }
      ];

      const mockEngine = {
        scrape: vi.fn().mockResolvedValue([])
      };
      (orchestrator as any).engines.set('static', mockEngine);

      const startTime = Date.now();
      const results = await orchestrator.processMultipleSources(sources);
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(3);
      expect(results[0].sourceId).toBe('source-1');
      expect(results[1].sourceId).toBe('source-2');
      expect(results[2].sourceId).toBe('source-3');

      // Should complete faster than sequential processing
      expect(duration).toBeLessThan(1000); // Assuming each source takes some time
    });

    it('should respect concurrency limits', async () => {
      const orchestratorWithLowConcurrency = new ScrapingOrchestrator(
        mockSourceManager,
        { maxConcurrentSources: 1 }
      );

      const sources = [
        { ...mockSource, id: 'source-1' },
        { ...mockSource, id: 'source-2' }
      ];

      let concurrentCount = 0;
      let maxConcurrentCount = 0;

      const mockEngine = {
        scrape: vi.fn().mockImplementation(async () => {
          concurrentCount++;
          maxConcurrentCount = Math.max(maxConcurrentCount, concurrentCount);
          await new Promise(resolve => setTimeout(resolve, 100));
          concurrentCount--;
          return [];
        })
      };
      (orchestratorWithLowConcurrency as any).engines.set('static', mockEngine);

      await orchestratorWithLowConcurrency.processMultipleSources(sources);

      expect(maxConcurrentCount).toBe(1); // Should not exceed concurrency limit
    });
  });

  describe('Active Job Management', () => {
    it('should track active job status', async () => {
      const mockEngine = {
        scrape: vi.fn().mockImplementation(async () => {
          // Check if job is being tracked during execution
          const status = orchestrator.getActiveJobStatus(mockJob.id);
          expect(status).toBeTruthy();
          expect(status?.job.id).toBe(mockJob.id);
          return [];
        })
      };
      (orchestrator as any).engines.set('static', mockEngine);

      await orchestrator.executeScrapeJob(mockJob);

      // Job should no longer be active after completion
      const finalStatus = orchestrator.getActiveJobStatus(mockJob.id);
      expect(finalStatus).toBeNull();
    });

    it('should cancel active jobs', async () => {
      let jobCancelled = false;

      const mockEngine = {
        scrape: vi.fn().mockImplementation(async () => {
          // Simulate long-running operation
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Check if cancellation was requested
          const status = orchestrator.getActiveJobStatus(mockJob.id);
          if (status?.job.metadata.cancelRequested) {
            jobCancelled = true;
            throw new Error('Job was cancelled');
          }
          return [];
        })
      };
      (orchestrator as any).engines.set('static', mockEngine);

      // Start job execution
      const jobPromise = orchestrator.executeScrapeJob(mockJob);

      // Cancel the job while it's running
      setTimeout(() => {
        orchestrator.cancelActiveJob(mockJob.id);
      }, 50);

      const result = await jobPromise;

      expect(jobCancelled).toBe(true);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toBe('Job was cancelled');
    });
  });

  describe('Error Categorization', () => {
    it('should categorize different types of errors correctly', async () => {
      const testCases = [
        { error: new Error('ENOTFOUND example.com'), expectedType: 'NETWORK' },
        { error: new Error('Connection timeout'), expectedType: 'NETWORK' },
        { error: new Error('Failed to parse selector'), expectedType: 'PARSING' },
        { error: new Error('validation failed for field'), expectedType: 'VALIDATION' },
        { error: new Error('rate limit exceeded'), expectedType: 'RATE_LIMIT' },
        { error: new Error('Authentication failed'), expectedType: 'AUTHENTICATION' },
        { error: new Error('CAPTCHA detected'), expectedType: 'CAPTCHA' },
        { error: new Error('Database connection failed'), expectedType: 'DATABASE' }
      ];

      for (const testCase of testCases) {
        const mockEngine = {
          scrape: vi.fn().mockRejectedValue(testCase.error)
        };
        (orchestrator as any).engines.set('static', mockEngine);

        const result = await orchestrator.executeScrapeJob(mockJob);

        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].type).toBe(testCase.expectedType);
      }
    });
  });
});