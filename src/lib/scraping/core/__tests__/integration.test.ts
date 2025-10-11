/**
 * Integration tests for SchedulerService and ScrapingOrchestrator working together
 * Tests the complete job scheduling and execution workflow
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { SchedulerService } from '../scheduler';
import { ScrapingOrchestrator } from '../orchestrator';
import { SourceManager } from '../source-manager';
import { 
  SchedulerConfig, 
  ScrapeJobStatus, 
  ScrapingFrequency,
  SourceConfiguration,
  ScrapedSourceType,
  RawGrantData,
  ProcessedGrantData,
  GrantCategory
} from '../../types';

// Mock dependencies
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

describe('Scheduler and Orchestrator Integration', () => {
  let scheduler: SchedulerService;
  let orchestrator: ScrapingOrchestrator;
  let mockSourceManager: SourceManager;
  let config: SchedulerConfig;
  let mockSource: SourceConfiguration;

  beforeEach(() => {
    config = {
      defaultFrequency: ScrapingFrequency.DAILY,
      maxConcurrentJobs: 2,
      retryAttempts: 2,
      healthCheckInterval: 1000
    };

    mockSourceManager = new SourceManager() as any;
    scheduler = new SchedulerService(config);
    orchestrator = new ScrapingOrchestrator(mockSourceManager);

    mockSource = {
      id: 'integration-test-source',
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
        delayBetweenRequests: 1000,
        respectRobotsTxt: true
      },
      headers: {}
    };

    // Setup default mocks
    (mockSourceManager.getActiveSource as Mock).mockResolvedValue(mockSource);
    (mockSourceManager.updateSourceMetrics as Mock).mockResolvedValue(undefined);

    scheduler.start();
  });

  afterEach(() => {
    scheduler.stop();
  });

  describe('Complete Workflow Integration', () => {
    it('should execute a complete job workflow from scheduling to completion', async () => {
      // Setup successful scraping scenario
      const mockRawData: RawGrantData[] = [
        {
          title: 'Integration Test Grant',
          description: 'A grant for testing integration',
          deadline: '2024-12-31',
          fundingAmount: '$50,000',
          eligibility: 'Universities',
          applicationUrl: 'https://example.com/apply',
          funderName: 'Test Foundation',
          sourceUrl: 'https://example.com/grants/1',
          scrapedAt: new Date(),
          rawContent: {}
        }
      ];

      const mockProcessedData: ProcessedGrantData[] = [
        {
          title: 'Integration Test Grant',
          description: 'A grant for testing integration',
          deadline: new Date('2024-12-31'),
          fundingAmountMin: 50000,
          fundingAmountMax: 50000,
          eligibilityCriteria: 'Universities',
          applicationUrl: 'https://example.com/apply',
          funder: {
            name: 'Test Foundation',
            type: ScrapedSourceType.FOUNDATION
          },
          category: GrantCategory.EDUCATION_TRAINING,
          locationEligibility: ['US'],
          confidenceScore: 0.9,
          contentHash: 'integration-hash'
        }
      ];

      // Mock all processing components
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
          isValid: true, 
          errors: [], 
          warnings: [], 
          qualityScore: 0.9 
        })
      };
      (orchestrator as any).dataValidator = mockValidator;

      const mockClassifier = {
        classifyGrant: vi.fn().mockResolvedValue({
          category: GrantCategory.EDUCATION_TRAINING,
          tags: ['education', 'university'],
          confidence: 0.9,
          reasoning: ['Education-related keywords found']
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

      // Step 1: Schedule a job
      const scheduledJob = await scheduler.scheduleJob('integration-test-source', 5);
      expect(scheduledJob.status).toBe(ScrapeJobStatus.PENDING);

      // Step 2: Get the job from scheduler
      const jobToExecute = await scheduler.getNextJob();
      expect(jobToExecute).toBeTruthy();
      expect(jobToExecute!.id).toBe(scheduledJob.id);
      expect(jobToExecute!.status).toBe(ScrapeJobStatus.RUNNING);

      // Step 3: Execute the job with orchestrator
      const result = await orchestrator.executeScrapeJob(jobToExecute!);

      // Step 4: Update job status based on result
      const finalStatus = result.errors.length > 0 ? ScrapeJobStatus.FAILED : ScrapeJobStatus.COMPLETED;
      await scheduler.updateJobStatus(jobToExecute!.id, finalStatus);

      // Verify the complete workflow
      expect(result.sourceId).toBe('integration-test-source');
      expect(result.totalFound).toBe(1);
      expect(result.totalInserted).toBe(1);
      expect(result.errors).toHaveLength(0);
      expect(finalStatus).toBe(ScrapeJobStatus.COMPLETED);

      // Verify all processing steps were called
      expect(mockEngine.scrape).toHaveBeenCalledWith(mockSource);
      expect(mockDataProcessor.processRawData).toHaveBeenCalled();
      expect(mockValidator.validateGrant).toHaveBeenCalled();
      expect(mockClassifier.classifyGrant).toHaveBeenCalled();
      expect(mockDeduplicator.deduplicateGrants).toHaveBeenCalled();

      // Verify source metrics were updated
      expect(mockSourceManager.updateSourceMetrics).toHaveBeenCalledWith(
        'integration-test-source',
        expect.objectContaining({
          successfulScrapes: 1,
          failedScrapes: 0
        })
      );

      // Verify final queue state
      const stats = scheduler.getQueueStats();
      expect(stats.completed).toBe(1);
      expect(stats.running).toBe(0);
      expect(stats.pending).toBe(0);
    });

    it('should handle job failures and retry logic', async () => {
      // Setup failing scraping scenario
      const mockEngine = {
        scrape: vi.fn()
          .mockRejectedValueOnce(new Error('Network timeout'))
          .mockRejectedValueOnce(new Error('Network timeout'))
          .mockResolvedValueOnce([]) // Success on third attempt
      };
      (orchestrator as any).engines.set('static', mockEngine);

      // Schedule a job
      const scheduledJob = await scheduler.scheduleJob('integration-test-source', 1);

      // First attempt - should fail and be retried
      const job1 = await scheduler.getNextJob();
      const result1 = await orchestrator.executeScrapeJob(job1!);
      await scheduler.updateJobStatus(job1!.id, ScrapeJobStatus.FAILED, 'Network timeout');

      expect(result1.errors).toHaveLength(1);
      expect(result1.errors[0].type).toBe('NETWORK');

      // Second attempt - should fail and be retried again
      const job2 = await scheduler.getNextJob();
      expect(job2).toBeTruthy();
      expect(job2!.metadata.attempts).toBe(1);

      const result2 = await orchestrator.executeScrapeJob(job2!);
      await scheduler.updateJobStatus(job2!.id, ScrapeJobStatus.FAILED, 'Network timeout');

      expect(result2.errors).toHaveLength(1);

      // Third attempt - should succeed
      const job3 = await scheduler.getNextJob();
      expect(job3).toBeTruthy();
      expect(job3!.metadata.attempts).toBe(2);

      const result3 = await orchestrator.executeScrapeJob(job3!);
      await scheduler.updateJobStatus(job3!.id, ScrapeJobStatus.COMPLETED);

      expect(result3.errors).toHaveLength(0);
      expect(result3.totalFound).toBe(0); // Empty result but successful

      // Verify final state
      const stats = scheduler.getQueueStats();
      expect(stats.completed).toBe(1);
      expect(stats.failed).toBe(0);
    });

    it('should handle permanent job failures after max retries', async () => {
      // Setup always-failing scenario
      const mockEngine = {
        scrape: vi.fn().mockRejectedValue(new Error('Permanent failure'))
      };
      (orchestrator as any).engines.set('static', mockEngine);

      // Schedule a job
      const scheduledJob = await scheduler.scheduleJob('integration-test-source', 1);

      // Execute job until it permanently fails
      for (let attempt = 0; attempt < config.retryAttempts; attempt++) {
        const job = await scheduler.getNextJob();
        expect(job).toBeTruthy();

        const result = await orchestrator.executeScrapeJob(job!);
        await scheduler.updateJobStatus(job!.id, ScrapeJobStatus.FAILED, 'Permanent failure');

        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].message).toBe('Permanent failure');
      }

      // No more jobs should be available (permanently failed)
      const noMoreJobs = await scheduler.getNextJob();
      expect(noMoreJobs).toBeNull();

      // Verify final state
      const stats = scheduler.getQueueStats();
      expect(stats.failed).toBe(1);
      expect(stats.pending).toBe(0);
    });
  });

  describe('Concurrent Job Processing', () => {
    it('should process multiple jobs concurrently within limits', async () => {
      // Setup multiple sources
      const sources = ['source-1', 'source-2', 'source-3', 'source-4'];
      
      let concurrentExecutions = 0;
      let maxConcurrentExecutions = 0;

      const mockEngine = {
        scrape: vi.fn().mockImplementation(async () => {
          concurrentExecutions++;
          maxConcurrentExecutions = Math.max(maxConcurrentExecutions, concurrentExecutions);
          
          // Simulate processing time
          await new Promise(resolve => setTimeout(resolve, 100));
          
          concurrentExecutions--;
          return [];
        })
      };
      (orchestrator as any).engines.set('static', mockEngine);

      // Schedule multiple jobs
      const scheduledJobs = await Promise.all(
        sources.map(sourceId => scheduler.scheduleJob(sourceId, 1))
      );

      // Process jobs concurrently
      const jobPromises: Promise<void>[] = [];

      const processJobs = async () => {
        while (true) {
          const job = await scheduler.getNextJob();
          if (!job) break;

          const jobPromise = orchestrator.executeScrapeJob(job).then(async (result) => {
            const status = result.errors.length > 0 ? ScrapeJobStatus.FAILED : ScrapeJobStatus.COMPLETED;
            await scheduler.updateJobStatus(job.id, status);
          });

          jobPromises.push(jobPromise);
        }
      };

      await processJobs();
      await Promise.all(jobPromises);

      // Verify concurrency was respected
      expect(maxConcurrentExecutions).toBeLessThanOrEqual(config.maxConcurrentJobs);
      expect(maxConcurrentExecutions).toBeGreaterThan(1); // Should have some concurrency

      // Verify all jobs completed
      const stats = scheduler.getQueueStats();
      expect(stats.completed).toBe(sources.length);
    });
  });

  describe('Job Cancellation Integration', () => {
    it('should cancel jobs during execution', async () => {
      let executionStarted = false;
      let executionCancelled = false;

      const mockEngine = {
        scrape: vi.fn().mockImplementation(async () => {
          executionStarted = true;
          
          // Simulate long-running operation
          for (let i = 0; i < 10; i++) {
            await new Promise(resolve => setTimeout(resolve, 50));
            
            // Check for cancellation
            const activeJob = orchestrator.getActiveJobStatus('test-job');
            if (activeJob?.job.metadata.cancelRequested) {
              executionCancelled = true;
              throw new Error('Job was cancelled');
            }
          }
          
          return [];
        })
      };
      (orchestrator as any).engines.set('static', mockEngine);

      // Schedule and start job
      const scheduledJob = await scheduler.scheduleJob('integration-test-source', 1);
      const runningJob = await scheduler.getNextJob();

      // Start job execution
      const jobPromise = orchestrator.executeScrapeJob(runningJob!);

      // Wait for execution to start, then cancel
      await new Promise(resolve => {
        const checkExecution = () => {
          if (executionStarted) {
            resolve(undefined);
          } else {
            setTimeout(checkExecution, 10);
          }
        };
        checkExecution();
      });

      // Cancel the job
      const cancelled = await scheduler.cancelJob(runningJob!.id);
      expect(cancelled).toBe(true);

      // Wait for job to complete
      const result = await jobPromise;

      expect(executionCancelled).toBe(true);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toBe('Job was cancelled');
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle and categorize different error types', async () => {
      const errorScenarios = [
        { 
          error: new Error('ENOTFOUND example.com'), 
          expectedType: 'NETWORK',
          shouldRetry: true 
        },
        { 
          error: new Error('Rate limit exceeded'), 
          expectedType: 'RATE_LIMIT',
          shouldRetry: true 
        },
        { 
          error: new Error('Authentication failed'), 
          expectedType: 'AUTHENTICATION',
          shouldRetry: false 
        }
      ];

      for (const scenario of errorScenarios) {
        const mockEngine = {
          scrape: vi.fn().mockRejectedValue(scenario.error)
        };
        (orchestrator as any).engines.set('static', mockEngine);

        // Schedule and execute job
        const scheduledJob = await scheduler.scheduleJob('integration-test-source', 1);
        const runningJob = await scheduler.getNextJob();
        const result = await orchestrator.executeScrapeJob(runningJob!);
        
        await scheduler.updateJobStatus(runningJob!.id, ScrapeJobStatus.FAILED, scenario.error.message);

        // Verify error categorization
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].type).toBe(scenario.expectedType);
        expect(result.errors[0].message).toBe(scenario.error.message);

        // Verify source metrics were updated for failure
        expect(mockSourceManager.updateSourceMetrics).toHaveBeenCalledWith(
          'integration-test-source',
          expect.objectContaining({
            failedScrapes: 1,
            successfulScrapes: 0,
            lastError: scenario.error.message
          })
        );
      }
    });
  });

  describe('Performance and Monitoring Integration', () => {
    it('should track performance metrics across the workflow', async () => {
      const mockEngine = {
        scrape: vi.fn().mockResolvedValue([])
      };
      (orchestrator as any).engines.set('static', mockEngine);

      // Schedule and execute job
      const startTime = Date.now();
      const scheduledJob = await scheduler.scheduleJob('integration-test-source', 1);
      const runningJob = await scheduler.getNextJob();
      const result = await orchestrator.executeScrapeJob(runningJob!);
      await scheduler.updateJobStatus(runningJob!.id, ScrapeJobStatus.COMPLETED);
      const endTime = Date.now();

      // Verify timing information
      expect(result.duration).toBeGreaterThan(0);
      expect(result.duration).toBeLessThan(endTime - startTime + 100); // Allow some margin

      expect(result.metadata.startedAt).toBeInstanceOf(Date);
      expect(result.metadata.finishedAt).toBeInstanceOf(Date);

      // Verify source metrics include timing
      expect(mockSourceManager.updateSourceMetrics).toHaveBeenCalledWith(
        'integration-test-source',
        expect.objectContaining({
          averageProcessingTime: result.duration,
          lastSuccessfulScrape: expect.any(Date)
        })
      );
    });

    it('should provide queue statistics during processing', async () => {
      // Schedule multiple jobs
      await scheduler.scheduleJob('source-1', 1);
      await scheduler.scheduleJob('source-2', 2);
      await scheduler.scheduleJob('source-3', 3);

      let initialStats = scheduler.getQueueStats();
      expect(initialStats.pending).toBe(3);
      expect(initialStats.running).toBe(0);
      expect(initialStats.completed).toBe(0);

      // Start processing one job
      const job1 = await scheduler.getNextJob();
      let runningStats = scheduler.getQueueStats();
      expect(runningStats.pending).toBe(2);
      expect(runningStats.running).toBe(1);

      // Complete the job
      await scheduler.updateJobStatus(job1!.id, ScrapeJobStatus.COMPLETED);
      let completedStats = scheduler.getQueueStats();
      expect(completedStats.pending).toBe(2);
      expect(completedStats.running).toBe(0);
      expect(completedStats.completed).toBe(1);
    });
  });
});