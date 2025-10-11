/**
 * Source Manager - Manages scraping source configurations and health monitoring
 * Handles source validation, performance metrics, and configuration storage
 */

import { prisma } from '@/lib/prisma';
import { 
  SourceConfiguration, 
  SourceMetrics, 
  ScrapedSourceType, 
  ScrapingFrequency, 
  ScrapedSourceStatus,
  RateLimitConfig,
  AuthConfig,
  SourceSelectors,
  ValidationResult,
  ValidationError
} from '../types';

export interface SourceHealthCheck {
  isHealthy: boolean;
  responseTime: number;
  statusCode?: number;
  error?: string;
  checkedAt: Date;
}

export interface SourceConfigurationInput {
  url: string;
  type: ScrapedSourceType;
  engine: 'static' | 'browser' | 'api';
  selectors: SourceSelectors;
  rateLimit: RateLimitConfig;
  headers?: Record<string, string>;
  authentication?: AuthConfig;
  customLogic?: string;
  category?: string;
  region?: string;
  notes?: string;
}

export class SourceManager {
  private readonly DEFAULT_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  };

  /**
   * Get active source configuration by ID
   */
  async getActiveSource(sourceId: string): Promise<SourceConfiguration | null> {
    try {
      const source = await prisma.scrapedSource.findUnique({
        where: { 
          id: sourceId,
          status: 'ACTIVE'
        }
      });

      if (!source) {
        return null;
      }

      return this.mapDatabaseSourceToConfiguration(source);
    } catch (error) {
      console.error(`Error fetching source ${sourceId}:`, error);
      throw new Error(`Failed to fetch source configuration: ${error}`);
    }
  }

  /**
   * Get all active sources
   */
  async getActiveSources(): Promise<SourceConfiguration[]> {
    try {
      const sources = await prisma.scrapedSource.findMany({
        where: { status: 'ACTIVE' },
        orderBy: { updatedAt: 'desc' }
      });

      return sources.map(source => this.mapDatabaseSourceToConfiguration(source));
    } catch (error) {
      console.error('Error fetching active sources:', error);
      throw new Error(`Failed to fetch active sources: ${error}`);
    }
  }

  /**
   * Create a new scraping source
   */
  async createSource(config: SourceConfigurationInput): Promise<SourceConfiguration> {
    try {
      // Validate configuration first
      const validation = await this.validateSourceConfiguration(config);
      if (!validation.isValid) {
        throw new Error(`Invalid source configuration: ${validation.errors.map(e => e.message).join(', ')}`);
      }

      // Perform health check
      const healthCheck = await this.performHealthCheck(config.url, config.headers);
      if (!healthCheck.isHealthy) {
        console.warn(`Source health check failed for ${config.url}: ${healthCheck.error}`);
      }

      const source = await prisma.scrapedSource.create({
        data: {
          url: config.url,
          type: config.type as any,
          frequency: ScrapingFrequency.WEEKLY as any,
          status: ScrapedSourceStatus.ACTIVE as any,
          category: config.category,
          region: config.region,
          notes: config.notes,
          successRate: 0,
          avgParseTime: 0,
          failCount: 0
        }
      });

      return this.mapDatabaseSourceToConfiguration(source, config);
    } catch (error) {
      console.error('Error creating source:', error);
      throw new Error(`Failed to create source: ${error}`);
    }
  }

  /**
   * Update source configuration
   */
  async updateSource(sourceId: string, updates: Partial<SourceConfigurationInput>): Promise<SourceConfiguration> {
    try {
      const existingSource = await prisma.scrapedSource.findUnique({
        where: { id: sourceId }
      });

      if (!existingSource) {
        throw new Error(`Source ${sourceId} not found`);
      }

      // Validate updates if provided
      if (updates.url || updates.selectors) {
        const validation = await this.validateSourceConfiguration({
          ...existingSource,
          ...updates
        } as SourceConfigurationInput);
        
        if (!validation.isValid) {
          throw new Error(`Invalid source configuration: ${validation.errors.map(e => e.message).join(', ')}`);
        }
      }

      const updatedSource = await prisma.scrapedSource.update({
        where: { id: sourceId },
        data: {
          url: updates.url,
          type: updates.type as any,
          category: updates.category,
          region: updates.region,
          notes: updates.notes,
          updatedAt: new Date()
        }
      });

      return this.mapDatabaseSourceToConfiguration(updatedSource, updates);
    } catch (error) {
      console.error(`Error updating source ${sourceId}:`, error);
      throw new Error(`Failed to update source: ${error}`);
    }
  }

  /**
   * Update source performance metrics
   */
  async updateSourceMetrics(sourceId: string, metrics: Partial<SourceMetrics>): Promise<void> {
    try {
      const updateData: any = {
        updatedAt: new Date()
      };

      if (metrics.successRate !== undefined) {
        updateData.successRate = metrics.successRate;
      }

      if (metrics.averageProcessingTime !== undefined) {
        updateData.avgParseTime = Math.round(metrics.averageProcessingTime);
      }

      if (metrics.lastError) {
        updateData.lastError = metrics.lastError;
        updateData.failCount = { increment: 1 };
      }

      if (metrics.lastSuccessfulScrape) {
        updateData.lastScrapedAt = metrics.lastSuccessfulScrape;
        // Reset fail count on successful scrape
        updateData.failCount = 0;
      }

      await prisma.scrapedSource.update({
        where: { id: sourceId },
        data: updateData
      });
    } catch (error) {
      console.error(`Error updating metrics for source ${sourceId}:`, error);
      throw new Error(`Failed to update source metrics: ${error}`);
    }
  }

  /**
   * Get source performance metrics
   */
  async getSourceMetrics(sourceId: string): Promise<SourceMetrics | null> {
    try {
      const source = await prisma.scrapedSource.findUnique({
        where: { id: sourceId },
        include: {
          scrapeJobs: {
            orderBy: { startedAt: 'desc' },
            take: 10
          }
        }
      });

      if (!source) {
        return null;
      }

      const totalScrapes = source.scrapeJobs.length;
      const successfulScrapes = source.scrapeJobs.filter(job => job.status === 'SUCCESS').length;
      const failedScrapes = source.scrapeJobs.filter(job => job.status === 'FAILED').length;

      const averageProcessingTime = source.avgParseTime || 0;
      const averageGrantsFound = source.scrapeJobs.reduce((sum, job) => sum + (job.totalFound || 0), 0) / Math.max(totalScrapes, 1);

      return {
        totalScrapes,
        successfulScrapes,
        failedScrapes,
        averageProcessingTime,
        averageGrantsFound,
        lastSuccessfulScrape: source.lastScrapedAt || undefined,
        lastError: source.lastError || undefined,
        successRate: source.successRate?.toNumber() || 0
      };
    } catch (error) {
      console.error(`Error fetching metrics for source ${sourceId}:`, error);
      throw new Error(`Failed to fetch source metrics: ${error}`);
    }
  }

  /**
   * Validate source configuration
   */
  async validateSourceConfiguration(config: SourceConfigurationInput | SourceConfiguration): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Validate URL
    if (!config.url) {
      errors.push({ field: 'url', message: 'URL is required', severity: 'error' });
    } else {
      try {
        new URL(config.url);
      } catch {
        errors.push({ field: 'url', message: 'Invalid URL format', severity: 'error' });
      }
    }

    // Validate source type
    if (!config.type || !Object.values(ScrapedSourceType).includes(config.type)) {
      errors.push({ field: 'type', message: 'Valid source type is required', severity: 'error' });
    }

    // Validate engine type
    if (!config.engine || !['static', 'browser', 'api'].includes(config.engine)) {
      errors.push({ field: 'engine', message: 'Valid engine type is required (static, browser, api)', severity: 'error' });
    }

    // Validate selectors for non-API engines
    if (config.engine !== 'api' && config.selectors) {
      if (!config.selectors.grantContainer) {
        errors.push({ field: 'selectors.grantContainer', message: 'Grant container selector is required', severity: 'error' });
      }
      if (!config.selectors.title) {
        errors.push({ field: 'selectors.title', message: 'Title selector is required', severity: 'error' });
      }
    }

    // Validate rate limiting
    if (config.rateLimit) {
      if (config.rateLimit.requestsPerMinute <= 0) {
        errors.push({ field: 'rateLimit.requestsPerMinute', message: 'Requests per minute must be positive', severity: 'error' });
      }
      if (config.rateLimit.delayBetweenRequests < 0) {
        errors.push({ field: 'rateLimit.delayBetweenRequests', message: 'Delay between requests cannot be negative', severity: 'error' });
      }
    }

    // Validate authentication if provided
    if (config.authentication) {
      if (!config.authentication.type || !['bearer', 'basic', 'apikey', 'oauth2'].includes(config.authentication.type)) {
        errors.push({ field: 'authentication.type', message: 'Valid authentication type is required', severity: 'error' });
      }
      if (!config.authentication.credentials || Object.keys(config.authentication.credentials).length === 0) {
        errors.push({ field: 'authentication.credentials', message: 'Authentication credentials are required', severity: 'error' });
      }
    }

    // Performance warnings
    if (config.rateLimit && config.rateLimit.requestsPerMinute > 60) {
      warnings.push({ field: 'rateLimit.requestsPerMinute', message: 'High request rate may trigger anti-bot measures', severity: 'warning' });
    }

    const qualityScore = Math.max(0, 100 - (errors.length * 25) - (warnings.length * 10));

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      qualityScore
    };
  }

  /**
   * Perform health check on a source URL
   */
  async performHealthCheck(url: string, headers?: Record<string, string>): Promise<SourceHealthCheck> {
    const startTime = Date.now();
    
    try {
      const response = await fetch(url, {
        method: 'HEAD',
        headers: { ...this.DEFAULT_HEADERS, ...headers },
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      const responseTime = Date.now() - startTime;

      return {
        isHealthy: response.ok,
        responseTime,
        statusCode: response.status,
        checkedAt: new Date()
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        isHealthy: false,
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        checkedAt: new Date()
      };
    }
  }

  /**
   * Disable a source (mark as inactive)
   */
  async disableSource(sourceId: string, reason?: string): Promise<void> {
    try {
      await prisma.scrapedSource.update({
        where: { id: sourceId },
        data: {
          status: ScrapedSourceStatus.INACTIVE,
          lastError: reason,
          updatedAt: new Date()
        }
      });
    } catch (error) {
      console.error(`Error disabling source ${sourceId}:`, error);
      throw new Error(`Failed to disable source: ${error}`);
    }
  }

  /**
   * Enable a source (mark as active)
   */
  async enableSource(sourceId: string): Promise<void> {
    try {
      // Perform health check before enabling
      const source = await prisma.scrapedSource.findUnique({
        where: { id: sourceId }
      });

      if (!source) {
        throw new Error(`Source ${sourceId} not found`);
      }

      const healthCheck = await this.performHealthCheck(source.url);
      
      await prisma.scrapedSource.update({
        where: { id: sourceId },
        data: {
          status: healthCheck.isHealthy ? ScrapedSourceStatus.ACTIVE : ScrapedSourceStatus.INACTIVE,
          lastError: healthCheck.isHealthy ? null : healthCheck.error,
          updatedAt: new Date()
        }
      });

      if (!healthCheck.isHealthy) {
        throw new Error(`Cannot enable source: Health check failed - ${healthCheck.error}`);
      }
    } catch (error) {
      console.error(`Error enabling source ${sourceId}:`, error);
      throw new Error(`Failed to enable source: ${error}`);
    }
  }

  /**
   * Get sources that need health checks
   */
  async getSourcesForHealthCheck(): Promise<SourceConfiguration[]> {
    try {
      // Get sources that haven't been checked in the last hour or have high fail counts
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      
      const sources = await prisma.scrapedSource.findMany({
        where: {
          OR: [
            { updatedAt: { lt: oneHourAgo } },
            { failCount: { gte: 3 } }
          ],
          status: { in: ['ACTIVE', 'INACTIVE'] }
        }
      });

      return sources.map(source => this.mapDatabaseSourceToConfiguration(source));
    } catch (error) {
      console.error('Error fetching sources for health check:', error);
      throw new Error(`Failed to fetch sources for health check: ${error}`);
    }
  }

  /**
   * Map database source to configuration object
   */
  private mapDatabaseSourceToConfiguration(
    source: any, 
    configOverrides?: Partial<SourceConfigurationInput>
  ): SourceConfiguration {
    // Default selectors based on source type
    const defaultSelectors: SourceSelectors = {
      grantContainer: '.grant-item, .opportunity-item, .funding-item',
      title: '.title, .grant-title, h2, h3',
      description: '.description, .summary, .excerpt',
      deadline: '.deadline, .due-date, .application-deadline',
      fundingAmount: '.amount, .funding-amount, .award-amount',
      eligibility: '.eligibility, .requirements',
      applicationUrl: '.apply-link, .application-link, a[href*="apply"]',
      funderInfo: '.funder, .organization, .agency'
    };

    const defaultRateLimit: RateLimitConfig = {
      requestsPerMinute: 30,
      delayBetweenRequests: 2000,
      respectRobotsTxt: true
    };

    return {
      id: source.id,
      url: source.url,
      type: source.type,
      engine: configOverrides?.engine || 'static',
      selectors: configOverrides?.selectors || defaultSelectors,
      rateLimit: configOverrides?.rateLimit || defaultRateLimit,
      headers: { ...this.DEFAULT_HEADERS, ...configOverrides?.headers },
      authentication: configOverrides?.authentication,
      customLogic: configOverrides?.customLogic
    };
  }
}