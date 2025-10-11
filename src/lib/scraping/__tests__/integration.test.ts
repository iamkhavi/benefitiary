/**
 * Integration tests for complete scraping infrastructure setup
 */

import { describe, it, expect } from 'vitest';
import { loadScrapingConfig, validateScrapingConfig } from '../config';
import { 
  SchedulerService, 
  ScrapingOrchestrator, 
  SourceManager,
  StaticParserEngine,
  BrowserEngine,
  APIClientEngine,
  DataProcessor,
  DataValidator,
  ClassificationEngine,
  Deduplicator,
  MetricsCollector,
  ErrorTracker,
  NotificationSender,
  GatesFoundationScraper,
  GrantsGovScraper
} from '../index';

describe('Scraping Infrastructure Integration', () => {
  describe('Configuration Integration', () => {
    it('should load and validate configuration successfully', () => {
      const config = loadScrapingConfig();
      config.redis.url = 'redis://localhost:6379'; // Ensure Redis URL is set for validation
      
      const validation = validateScrapingConfig(config);
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });

  describe('Core Components Integration', () => {
    it('should instantiate scheduler service', () => {
      const config = loadScrapingConfig();
      const scheduler = new SchedulerService(config.scheduler);
      
      expect(scheduler).toBeDefined();
      expect(scheduler.scheduleJob).toBeDefined();
      expect(scheduler.getNextJob).toBeDefined();
    });

    it('should instantiate scraping orchestrator', () => {
      const orchestrator = new ScrapingOrchestrator();
      
      expect(orchestrator).toBeDefined();
      expect(orchestrator.executeScrapeJob).toBeDefined();
      expect(orchestrator.processSource).toBeDefined();
    });

    it('should instantiate source manager', () => {
      const sourceManager = new SourceManager();
      
      expect(sourceManager).toBeDefined();
      expect(sourceManager.getActiveSource).toBeDefined();
      expect(sourceManager.validateSourceConfiguration).toBeDefined();
    });
  });

  describe('Scraping Engines Integration', () => {
    it('should instantiate static parser engine', () => {
      const config = loadScrapingConfig();
      const engine = new StaticParserEngine(config.staticParser);
      
      expect(engine).toBeDefined();
      expect(engine.scrape).toBeDefined();
    });

    it('should instantiate browser engine', () => {
      const config = loadScrapingConfig();
      const engine = new BrowserEngine(config.browser);
      
      expect(engine).toBeDefined();
      expect(engine.scrape).toBeDefined();
      expect(engine.close).toBeDefined();
    });

    it('should instantiate API client engine', () => {
      const apiConfig = {
        baseUrl: 'https://api.example.com',
        authentication: { type: 'bearer' as const, credentials: { token: 'test' } },
        rateLimit: { requestsPerMinute: 10, delayBetweenRequests: 2000, respectRobotsTxt: true },
        responseFormat: 'json' as const,
        pagination: { type: 'offset' as const, pageSize: 100, maxPages: 10 }
      };
      
      const engine = new APIClientEngine(apiConfig);
      
      expect(engine).toBeDefined();
      expect(engine.scrape).toBeDefined();
    });
  });

  describe('Data Processing Integration', () => {
    it('should instantiate data processor', () => {
      const processor = new DataProcessor();
      
      expect(processor).toBeDefined();
      expect(processor.processRawData).toBeDefined();
    });

    it('should instantiate data validator', () => {
      const validator = new GrantValidator();
      
      expect(validator).toBeDefined();
      expect(validator.validateGrant).toBeDefined();
    });

    it('should instantiate classification engine', () => {
      const classifier = new ClassificationEngine();
      
      expect(classifier).toBeDefined();
      expect(classifier.classifyGrant).toBeDefined();
    });

    it('should instantiate deduplicator', () => {
      const deduplicator = new Deduplicator();
      
      expect(deduplicator).toBeDefined();
      expect(deduplicator.detectDuplicates).toBeDefined();
      expect(deduplicator.generateContentHash).toBeDefined();
    });
  });

  describe('Monitoring Integration', () => {
    it('should instantiate metrics collector', () => {
      const collector = new MetricsCollector();
      
      expect(collector).toBeDefined();
      expect(collector.collectCurrentMetrics).toBeDefined();
      expect(collector.trackJobCompletion).toBeDefined();
    });

    it('should instantiate error tracker', () => {
      const tracker = new ErrorTracker();
      
      expect(tracker).toBeDefined();
      expect(tracker.logError).toBeDefined();
      expect(tracker.getRecentErrors).toBeDefined();
    });

    it('should instantiate notification sender', () => {
      const sender = new NotificationSender();
      
      expect(sender).toBeDefined();
      expect(sender.sendAlert).toBeDefined();
      expect(sender.sendErrorNotification).toBeDefined();
    });
  });

  describe('Source-Specific Scrapers Integration', () => {
    it('should instantiate Gates Foundation scraper', () => {
      const scraper = new GatesFoundationScraper();
      
      expect(scraper).toBeDefined();
      expect(scraper.scrape).toBeDefined();
      expect(scraper.customProcessing).toBeDefined();
    });

    it('should instantiate Grants.gov scraper', () => {
      const scraper = new GrantsGovScraper();
      
      expect(scraper).toBeDefined();
      expect(scraper.scrape).toBeDefined();
    });
  });

  describe('End-to-End Workflow Simulation', () => {
    it('should simulate basic scraping workflow', async () => {
      // Load configuration
      const config = loadScrapingConfig();
      config.redis.url = 'redis://localhost:6379';
      
      // Validate configuration
      const validation = validateScrapingConfig(config);
      expect(validation.isValid).toBe(true);
      
      // Initialize components
      const scheduler = new SchedulerService(config.scheduler);
      const orchestrator = new ScrapingOrchestrator();
      const sourceManager = new SourceManager();
      const processor = new DataProcessor();
      const validator = new GrantValidator();
      const classifier = new ClassificationEngine();
      const metricsCollector = new MetricsCollector();
      
      // Simulate job scheduling
      const job = await scheduler.scheduleJob('test-source', 1);
      expect(job.id).toBeDefined();
      expect(job.sourceId).toBe('test-source');
      expect(job.priority).toBe(1);
      
      // Simulate job execution
      const result = await orchestrator.executeScrapeJob(job);
      expect(result.sourceId).toBe('test-source');
      expect(result.duration).toBeGreaterThanOrEqual(0);
      
      // Simulate metrics collection
      const metrics = await metricsCollector.collectCurrentMetrics();
      expect(metrics.activeJobs).toBeGreaterThanOrEqual(0);
      expect(metrics.successRate).toBeGreaterThanOrEqual(0);
      
      console.log('✅ End-to-end workflow simulation completed successfully');
    });
  });
});