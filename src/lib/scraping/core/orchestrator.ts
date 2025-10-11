/**
 * Scraping Orchestrator for coordinating the complete scraping workflow
 * Manages the end-to-end process from job execution to data storage
 */

import { 
  ScrapeJob, 
  ScrapingResult, 
  ScrapingError, 
  SourceConfiguration, 
  RawGrantData, 
  ProcessedGrantData,
  ScrapingEngine,
  ScrapeJobStatus
} from '../types';
import { SourceManager } from './source-manager';
import { StaticParserEngine } from '../engines/static-parser';
import { BrowserEngine } from '../engines/browser-engine';
import { APIClientEngine } from '../engines/api-client';
import { DataProcessor } from '../processors/data-processor';
import { GrantValidator } from '../processors/validator';
import { ClassificationEngine } from '../processors/classifier';
import { Deduplicator } from '../processors/deduplicator';
import { ErrorTracker } from '../monitoring/error-tracker';
import { MetricsCollector } from '../monitoring/metrics-collector';

interface OrchestratorConfig {
  maxConcurrentSources: number;
  enableCaching: boolean;
  enableDeduplication: boolean;
  enableClassification: boolean;
  batchSize: number;
  timeoutMs: number;
}

interface ProcessingContext {
  job: ScrapeJob;
  source: SourceConfiguration;
  startTime: number;
  errors: ScrapingError[];
  metrics: {
    rawDataCount: number;
    processedDataCount: number;
    validDataCount: number;
    duplicatesFound: number;
    insertedCount: number;
    updatedCount: number;
    skippedCount: number;
  };
}

export class ScrapingOrchestrator {
  private sourceManager: SourceManager;
  private engines: Map<string, ScrapingEngine>;
  private dataProcessor: DataProcessor;
  private dataValidator: GrantValidator;
  private classificationEngine: ClassificationEngine;
  private deduplicator: Deduplicator;
  private errorHandler: ErrorTracker;
  private metricsCollector: MetricsCollector;
  private config: OrchestratorConfig;
  private activeJobs: Map<string, ProcessingContext>;

  constructor(
    sourceManager: SourceManager,
    config: Partial<OrchestratorConfig> = {}
  ) {
    this.sourceManager = sourceManager;
    this.config = {
      maxConcurrentSources: 5,
      enableCaching: true,
      enableDeduplication: true,
      enableClassification: true,
      batchSize: 100,
      timeoutMs: 30 * 60 * 1000, // 30 minutes
      ...config
    };

    // Initialize engines
    this.engines = new Map();
    
    // Default configurations for engines
    const staticConfig = {
      timeout: 30000,
      retries: 3,
      userAgent: 'BenefitiaryScraper/1.0',
      followRedirects: true
    };
    
    const browserConfig = {
      headless: true,
      viewport: { width: 1366, height: 768 },
      timeout: 30000,
      waitForSelector: 'body',
      blockResources: ['image', 'font'],
      stealthMode: true
    };
    
    const apiConfig = {
      baseUrl: '',
      authentication: { type: 'bearer' as const, credentials: { token: '' } },
      rateLimit: { requestsPerMinute: 60, delayBetweenRequests: 1000, respectRobotsTxt: true },
      responseFormat: 'json' as const,
      pagination: { type: 'offset' as const, pageSize: 100, maxPages: 10 }
    };
    
    this.engines.set('static', new StaticParserEngine(staticConfig));
    this.engines.set('browser', new BrowserEngine(browserConfig));
    this.engines.set('api', new APIClientEngine(apiConfig));

    // Initialize processors
    this.dataProcessor = new DataProcessor();
    this.dataValidator = new GrantValidator();
    this.classificationEngine = new ClassificationEngine();
    this.deduplicator = new Deduplicator();
    this.errorHandler = new ErrorTracker();
    this.metricsCollector = new MetricsCollector();

    this.activeJobs = new Map();
  }

  /**
   * Execute a complete scraping job
   */
  async executeScrapeJob(job: ScrapeJob): Promise<ScrapingResult> {
    const context: ProcessingContext = {
      job,
      source: null as any, // Will be set below
      startTime: Date.now(),
      errors: [],
      metrics: {
        rawDataCount: 0,
        processedDataCount: 0,
        validDataCount: 0,
        duplicatesFound: 0,
        insertedCount: 0,
        updatedCount: 0,
        skippedCount: 0
      }
    };

    this.activeJobs.set(job.id, context);

    try {
      // Get source configuration
      const sourceConfig = await this.sourceManager.getActiveSource(job.sourceId);
      if (!sourceConfig) {
        throw new Error(`Source configuration not found for sourceId: ${job.sourceId}`);
      }
      context.source = sourceConfig;

      // Check if job was cancelled
      if (job.metadata.cancelRequested) {
        throw new Error('Job was cancelled');
      }

      // Execute the scraping workflow
      const result = await this.processSource(context.source, context);
      
      // Update source metrics
      await this.sourceManager.updateSourceMetrics(job.sourceId, {
        totalScrapes: 1,
        successfulScrapes: 1,
        failedScrapes: 0,
        averageProcessingTime: result.duration,
        averageGrantsFound: result.totalFound,
        lastSuccessfulScrape: new Date(),
        lastError: undefined,
        successRate: 1.0
      });

      return result;

    } catch (error) {
      const scrapingError: ScrapingError = {
        type: this.categorizeError(error),
        message: error instanceof Error ? error.message : String(error),
        url: context.source?.url,
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date()
      };

      context.errors.push(scrapingError);
      await this.handleErrors([scrapingError], context);

      // Update source metrics for failure
      if (context.source) {
        await this.sourceManager.updateSourceMetrics(job.sourceId, {
          totalScrapes: 1,
          successfulScrapes: 0,
          failedScrapes: 1,
          averageProcessingTime: Date.now() - context.startTime,
          averageGrantsFound: 0,
          lastSuccessfulScrape: undefined,
          lastError: scrapingError.message,
          successRate: 0.0
        });
      }

      // Return failed result
      return {
        sourceId: job.sourceId,
        totalFound: context.metrics.rawDataCount,
        totalInserted: context.metrics.insertedCount,
        totalUpdated: context.metrics.updatedCount,
        totalSkipped: context.metrics.skippedCount,
        errors: context.errors,
        duration: Date.now() - context.startTime,
        metadata: {
          jobId: job.id,
          startedAt: new Date(context.startTime),
          finishedAt: new Date(),
          failed: true,
          error: scrapingError.message
        }
      };

    } finally {
      this.activeJobs.delete(job.id);
    }
  }

  /**
   * Process a single source through the complete workflow
   */
  async processSource(source: SourceConfiguration, context?: ProcessingContext): Promise<ScrapingResult> {
    const startTime = context?.startTime || Date.now();
    const errors: ScrapingError[] = context?.errors || [];
    const metrics = context?.metrics || {
      rawDataCount: 0,
      processedDataCount: 0,
      validDataCount: 0,
      duplicatesFound: 0,
      insertedCount: 0,
      updatedCount: 0,
      skippedCount: 0
    };

    try {
      console.log(`Starting to process source: ${source.id} (${source.url})`);

      // Step 1: Extract raw data using appropriate engine
      const rawData = await this.extractRawData(source);
      metrics.rawDataCount = rawData.length;
      console.log(`Extracted ${rawData.length} raw grants from ${source.id}`);

      if (rawData.length === 0) {
        console.warn(`No grants found for source ${source.id}`);
        return this.createResult(source.id, startTime, metrics, errors);
      }

      // Step 2: Process raw data
      const processedData = await this.processRawData(rawData, source);
      metrics.processedDataCount = processedData.length;
      console.log(`Processed ${processedData.length} grants from ${source.id}`);

      // Step 3: Validate processed data
      const validatedData = await this.validateData(processedData);
      metrics.validDataCount = validatedData.length;
      console.log(`Validated ${validatedData.length} grants from ${source.id}`);

      // Step 4: Classify grants (if enabled)
      let classifiedData = validatedData;
      if (this.config.enableClassification) {
        classifiedData = await this.classifyGrants(validatedData);
        console.log(`Classified ${classifiedData.length} grants from ${source.id}`);
      }

      // Step 5: Deduplicate grants (if enabled)
      let deduplicatedData = classifiedData;
      if (this.config.enableDeduplication) {
        const deduplicationResult = await this.deduplicateGrants(classifiedData, source.id);
        deduplicatedData = deduplicationResult.unique;
        metrics.duplicatesFound = deduplicationResult.duplicatesFound;
        console.log(`Found ${metrics.duplicatesFound} duplicates, ${deduplicatedData.length} unique grants from ${source.id}`);
      }

      // Step 6: Store grants in database
      const storageResult = await this.storeGrants(deduplicatedData, source.id);
      metrics.insertedCount = storageResult.inserted;
      metrics.updatedCount = storageResult.updated;
      metrics.skippedCount = storageResult.skipped;

      console.log(`Stored grants from ${source.id}: ${metrics.insertedCount} inserted, ${metrics.updatedCount} updated, ${metrics.skippedCount} skipped`);

      return this.createResult(source.id, startTime, metrics, errors);

    } catch (error) {
      const scrapingError: ScrapingError = {
        type: this.categorizeError(error),
        message: error instanceof Error ? error.message : String(error),
        url: source.url,
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date()
      };

      errors.push(scrapingError);
      console.error(`Error processing source ${source.id}:`, scrapingError);

      return this.createResult(source.id, startTime, metrics, errors);
    }
  }

  /**
   * Process multiple sources concurrently
   */
  async processMultipleSources(sources: SourceConfiguration[]): Promise<ScrapingResult[]> {
    const semaphore = new Semaphore(this.config.maxConcurrentSources);
    
    const promises = sources.map(async (source) => {
      const release = await semaphore.acquire();
      try {
        return await this.processSource(source);
      } finally {
        release();
      }
    });

    return Promise.all(promises);
  }

  /**
   * Get active job status
   */
  getActiveJobStatus(jobId: string): ProcessingContext | null {
    return this.activeJobs.get(jobId) || null;
  }

  /**
   * Cancel an active job
   */
  async cancelActiveJob(jobId: string): Promise<boolean> {
    const context = this.activeJobs.get(jobId);
    if (context) {
      context.job.metadata.cancelRequested = true;
      return true;
    }
    return false;
  }

  /**
   * Private helper methods
   */
  private async extractRawData(source: SourceConfiguration): Promise<RawGrantData[]> {
    const engine = this.engines.get(source.engine);
    if (!engine) {
      throw new Error(`Unsupported scraping engine: ${source.engine}`);
    }

    return await engine.scrape(source);
  }

  private async processRawData(rawData: RawGrantData[], source: SourceConfiguration): Promise<ProcessedGrantData[]> {
    const processedData: ProcessedGrantData[] = [];

    for (const batch of this.createBatches(rawData, this.config.batchSize)) {
      for (const rawGrant of batch) {
        const result = await this.dataProcessor.processGrant(rawGrant);
        processedData.push(result.data);
      }
    }

    return processedData;
  }

  private async validateData(processedData: ProcessedGrantData[]): Promise<ProcessedGrantData[]> {
    const validatedData: ProcessedGrantData[] = [];

    for (const grant of processedData) {
      const validationResult = this.dataValidator.validate(grant);
      if (validationResult.isValid) {
        validatedData.push(grant);
      } else {
        console.warn(`Grant validation failed for "${grant.title}":`, validationResult.errors);
      }
    }

    return validatedData;
  }

  private async classifyGrants(grants: ProcessedGrantData[]): Promise<ProcessedGrantData[]> {
    const classifiedGrants: ProcessedGrantData[] = [];

    for (const grant of grants) {
      try {
        const classification = await this.classificationEngine.classifyGrant(grant);
        const classifiedGrant = {
          ...grant,
          category: classification.category,
          // Add classification tags to existing tags or create new array
          tags: [...(grant as any).tags || [], ...classification.tags],
          confidenceScore: classification.confidence
        };
        classifiedGrants.push(classifiedGrant);
      } catch (error) {
        console.warn(`Classification failed for grant "${grant.title}":`, error);
        classifiedGrants.push(grant); // Keep original grant if classification fails
      }
    }

    return classifiedGrants;
  }

  private async deduplicateGrants(grants: ProcessedGrantData[], sourceId: string): Promise<{ unique: ProcessedGrantData[], duplicatesFound: number }> {
    const unique = await this.deduplicator.detectDuplicates(grants);
    return {
      unique,
      duplicatesFound: grants.length - unique.length
    };
  }

  private async storeGrants(grants: ProcessedGrantData[], sourceId: string): Promise<{ inserted: number, updated: number, skipped: number }> {
    // This would integrate with the database layer
    // For now, return mock results
    return {
      inserted: grants.length,
      updated: 0,
      skipped: 0
    };
  }

  private async handleErrors(errors: ScrapingError[], context?: ProcessingContext): Promise<void> {
    for (const error of errors) {
      await this.errorHandler.trackError(error, context as any);
      await this.metricsCollector.trackError(error);
    }

    // Send notifications for critical errors
    const criticalErrors = errors.filter(error => 
      error.type === 'DATABASE' || error.type === 'AUTHENTICATION'
    );

    if (criticalErrors.length > 0) {
      // This would integrate with notification system
      console.error(`Critical errors detected:`, criticalErrors);
    }
  }

  private categorizeError(error: any): ScrapingError['type'] {
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return 'NETWORK';
    }
    if (error.message?.includes('timeout')) {
      return 'NETWORK';
    }
    if (error.message?.includes('parse') || error.message?.includes('selector')) {
      return 'PARSING';
    }
    if (error.message?.includes('validation')) {
      return 'VALIDATION';
    }
    if (error.message?.includes('rate limit')) {
      return 'RATE_LIMIT';
    }
    if (error.message?.includes('auth')) {
      return 'AUTHENTICATION';
    }
    if (error.message?.includes('captcha')) {
      return 'CAPTCHA';
    }
    if (error.message?.includes('database')) {
      return 'DATABASE';
    }
    return 'NETWORK'; // Default fallback
  }

  private createResult(sourceId: string, startTime: number, metrics: any, errors: ScrapingError[]): ScrapingResult {
    return {
      sourceId,
      totalFound: metrics.rawDataCount,
      totalInserted: metrics.insertedCount,
      totalUpdated: metrics.updatedCount,
      totalSkipped: metrics.skippedCount,
      errors,
      duration: Date.now() - startTime,
      metadata: {
        processedCount: metrics.processedDataCount,
        validatedCount: metrics.validDataCount,
        duplicatesFound: metrics.duplicatesFound,
        startedAt: new Date(startTime),
        finishedAt: new Date()
      }
    };
  }

  private createBatches<T>(array: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }
}

/**
 * Simple semaphore implementation for controlling concurrency
 */
class Semaphore {
  private permits: number;
  private waitQueue: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<() => void> {
    return new Promise((resolve) => {
      if (this.permits > 0) {
        this.permits--;
        resolve(() => this.release());
      } else {
        this.waitQueue.push(() => {
          this.permits--;
          resolve(() => this.release());
        });
      }
    });
  }

  private release(): void {
    this.permits++;
    if (this.waitQueue.length > 0) {
      const next = this.waitQueue.shift();
      if (next) {
        next();
      }
    }
  }
}