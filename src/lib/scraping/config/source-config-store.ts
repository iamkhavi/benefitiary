/**
 * Source Configuration Store - Handles persistent storage of scraping configurations
 * Provides CRUD operations for source configurations with validation and caching
 */

import { prisma } from '@/lib/prisma';
import { 
  SourceConfiguration, 
  SourceSelectors, 
  RateLimitConfig, 
  AuthConfig,
  ScrapedSourceType,
  ScrapingFrequency,
  ScrapedSourceStatus
} from '../types';

export interface StoredSourceConfig {
  id: string;
  url: string;
  type: ScrapedSourceType;
  engine: 'static' | 'browser' | 'api';
  selectors: SourceSelectors;
  rateLimit: RateLimitConfig;
  headers: Record<string, string>;
  authentication?: AuthConfig;
  customLogic?: string;
  frequency: ScrapingFrequency;
  status: ScrapedSourceStatus;
  category?: string;
  region?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConfigurationTemplate {
  name: string;
  description: string;
  type: ScrapedSourceType;
  engine: 'static' | 'browser' | 'api';
  selectors: SourceSelectors;
  rateLimit: RateLimitConfig;
  headers: Record<string, string>;
  tags: string[];
}

export class SourceConfigStore {
  private configCache = new Map<string, StoredSourceConfig>();
  private cacheExpiry = new Map<string, number>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Store a new source configuration
   */
  async storeConfiguration(config: Omit<StoredSourceConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<StoredSourceConfig> {
    try {
      // Serialize complex objects for database storage
      const configData = {
        url: config.url,
        type: config.type,
        frequency: config.frequency,
        status: config.status,
        category: config.category,
        region: config.region,
        notes: config.notes,
        // Store configuration as JSON in notes field for now
        // In production, you might want dedicated JSON columns
        lastError: JSON.stringify({
          engine: config.engine,
          selectors: config.selectors,
          rateLimit: config.rateLimit,
          headers: config.headers,
          authentication: config.authentication,
          customLogic: config.customLogic
        })
      };

      const stored = await prisma.scrapedSource.create({
        data: {
          ...configData,
          type: configData.type as any,
          frequency: configData.frequency as any,
          status: configData.status as any
        }
      });

      const result: StoredSourceConfig = {
        id: stored.id,
        url: stored.url,
        type: stored.type as any,
        engine: config.engine,
        selectors: config.selectors,
        rateLimit: config.rateLimit,
        headers: config.headers,
        authentication: config.authentication,
        customLogic: config.customLogic,
        frequency: stored.frequency as any,
        status: stored.status as any,
        category: stored.category || undefined,
        region: stored.region || undefined,
        notes: stored.notes || undefined,
        createdAt: stored.createdAt,
        updatedAt: stored.updatedAt
      };

      // Cache the result
      this.cacheConfiguration(result);

      return result;
    } catch (error) {
      console.error('Error storing configuration:', error);
      throw new Error(`Failed to store configuration: ${error}`);
    }
  }

  /**
   * Retrieve a source configuration by ID
   */
  async getConfiguration(id: string): Promise<StoredSourceConfig | null> {
    try {
      // Check cache first
      const cached = this.getCachedConfiguration(id);
      if (cached) {
        return cached;
      }

      const stored = await prisma.scrapedSource.findUnique({
        where: { id }
      });

      if (!stored) {
        return null;
      }

      const result = this.deserializeConfiguration(stored);
      this.cacheConfiguration(result);

      return result;
    } catch (error) {
      console.error(`Error retrieving configuration ${id}:`, error);
      throw new Error(`Failed to retrieve configuration: ${error}`);
    }
  }

  /**
   * Update an existing source configuration
   */
  async updateConfiguration(id: string, updates: Partial<StoredSourceConfig>): Promise<StoredSourceConfig> {
    try {
      const existing = await this.getConfiguration(id);
      if (!existing) {
        throw new Error(`Configuration ${id} not found`);
      }

      const merged = { ...existing, ...updates };
      
      const updateData = {
        url: merged.url,
        type: merged.type,
        frequency: merged.frequency,
        status: merged.status,
        category: merged.category,
        region: merged.region,
        notes: merged.notes,
        updatedAt: new Date(),
        lastError: JSON.stringify({
          engine: merged.engine,
          selectors: merged.selectors,
          rateLimit: merged.rateLimit,
          headers: merged.headers,
          authentication: merged.authentication,
          customLogic: merged.customLogic
        })
      };

      const updated = await prisma.scrapedSource.update({
        where: { id },
        data: {
          ...updateData,
          type: updateData.type as any,
          frequency: updateData.frequency as any,
          status: updateData.status as any
        }
      });

      const result = this.deserializeConfiguration(updated);
      
      // Update cache
      this.cacheConfiguration(result);

      return result;
    } catch (error) {
      console.error(`Error updating configuration ${id}:`, error);
      throw new Error(`Failed to update configuration: ${error}`);
    }
  }

  /**
   * Delete a source configuration
   */
  async deleteConfiguration(id: string): Promise<void> {
    try {
      await prisma.scrapedSource.delete({
        where: { id }
      });

      // Remove from cache
      this.configCache.delete(id);
      this.cacheExpiry.delete(id);
    } catch (error) {
      console.error(`Error deleting configuration ${id}:`, error);
      throw new Error(`Failed to delete configuration: ${error}`);
    }
  }

  /**
   * List all configurations with optional filtering
   */
  async listConfigurations(filters?: {
    type?: ScrapedSourceType;
    status?: ScrapedSourceStatus;
    category?: string;
    region?: string;
  }): Promise<StoredSourceConfig[]> {
    try {
      const where: any = {};
      
      if (filters?.type) where.type = filters.type;
      if (filters?.status) where.status = filters.status;
      if (filters?.category) where.category = filters.category;
      if (filters?.region) where.region = filters.region;

      const stored = await prisma.scrapedSource.findMany({
        where,
        orderBy: { updatedAt: 'desc' }
      });

      return stored.map(s => this.deserializeConfiguration(s));
    } catch (error) {
      console.error('Error listing configurations:', error);
      throw new Error(`Failed to list configurations: ${error}`);
    }
  }

  /**
   * Get configuration templates for common source types
   */
  getConfigurationTemplates(): ConfigurationTemplate[] {
    return [
      {
        name: 'Foundation Website (Static)',
        description: 'Template for foundation websites with static HTML content',
        type: ScrapedSourceType.FOUNDATION,
        engine: 'static',
        selectors: {
          grantContainer: '.grant-item, .opportunity-item, .funding-opportunity',
          title: '.title, .grant-title, h2, h3',
          description: '.description, .summary, .excerpt, p',
          deadline: '.deadline, .due-date, .application-deadline, .closing-date',
          fundingAmount: '.amount, .funding-amount, .award-amount, .grant-size',
          eligibility: '.eligibility, .requirements, .criteria',
          applicationUrl: '.apply-link, .application-link, a[href*="apply"]',
          funderInfo: '.funder, .organization, .foundation-name'
        },
        rateLimit: {
          requestsPerMinute: 20,
          delayBetweenRequests: 3000,
          respectRobotsTxt: true
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        tags: ['foundation', 'static', 'html']
      },
      {
        name: 'Government Portal (API)',
        description: 'Template for government grant portals with API access',
        type: ScrapedSourceType.GOV,
        engine: 'api',
        selectors: {
          grantContainer: '',
          title: 'title',
          description: 'description',
          deadline: 'closeDate',
          fundingAmount: 'awardCeiling',
          eligibility: 'eligibilityCriteria',
          applicationUrl: 'applicationUrl',
          funderInfo: 'agencyName'
        },
        rateLimit: {
          requestsPerMinute: 60,
          delayBetweenRequests: 1000,
          respectRobotsTxt: true
        },
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        tags: ['government', 'api', 'json']
      },
      {
        name: 'Dynamic Website (Browser)',
        description: 'Template for JavaScript-heavy websites requiring browser rendering',
        type: ScrapedSourceType.FOUNDATION,
        engine: 'browser',
        selectors: {
          grantContainer: '[data-testid="grant-card"], .grant-listing-item',
          title: '[data-testid="grant-title"], .grant-name',
          description: '[data-testid="grant-description"], .grant-summary',
          deadline: '[data-testid="deadline"], .deadline-date',
          fundingAmount: '[data-testid="amount"], .funding-range',
          eligibility: '[data-testid="eligibility"], .requirements-text',
          applicationUrl: '[data-testid="apply-button"], .apply-now-link',
          funderInfo: '[data-testid="funder"], .organization-info'
        },
        rateLimit: {
          requestsPerMinute: 10,
          delayBetweenRequests: 6000,
          respectRobotsTxt: true
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        tags: ['dynamic', 'javascript', 'spa']
      },
      {
        name: 'International Organization',
        description: 'Template for international funding organizations',
        type: ScrapedSourceType.NGO,
        engine: 'static',
        selectors: {
          grantContainer: '.funding-opportunity, .call-for-proposals',
          title: '.opportunity-title, .call-title',
          description: '.opportunity-description, .call-description',
          deadline: '.submission-deadline, .closing-date',
          fundingAmount: '.budget-range, .funding-available',
          eligibility: '.eligibility-section, .who-can-apply',
          applicationUrl: '.how-to-apply a, .application-portal',
          funderInfo: '.funding-organization, .donor-info'
        },
        rateLimit: {
          requestsPerMinute: 15,
          delayBetweenRequests: 4000,
          respectRobotsTxt: true
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9'
        },
        tags: ['international', 'multilingual', 'development']
      }
    ];
  }

  /**
   * Create configuration from template
   */
  async createFromTemplate(templateName: string, url: string, customizations?: Partial<StoredSourceConfig>): Promise<StoredSourceConfig> {
    const templates = this.getConfigurationTemplates();
    const template = templates.find(t => t.name === templateName);
    
    if (!template) {
      throw new Error(`Template "${templateName}" not found`);
    }

    const config: Omit<StoredSourceConfig, 'id' | 'createdAt' | 'updatedAt'> = {
      url,
      type: template.type,
      engine: template.engine,
      selectors: template.selectors,
      rateLimit: template.rateLimit,
      headers: template.headers,
      frequency: ScrapingFrequency.WEEKLY,
      status: ScrapedSourceStatus.ACTIVE,
      ...customizations
    };

    return this.storeConfiguration(config);
  }

  /**
   * Bulk import configurations
   */
  async bulkImport(configurations: Omit<StoredSourceConfig, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<StoredSourceConfig[]> {
    const results: StoredSourceConfig[] = [];
    
    for (const config of configurations) {
      try {
        const stored = await this.storeConfiguration(config);
        results.push(stored);
      } catch (error) {
        console.error(`Failed to import configuration for ${config.url}:`, error);
        // Continue with other configurations
      }
    }

    return results;
  }

  /**
   * Export configurations
   */
  async exportConfigurations(filters?: {
    type?: ScrapedSourceType;
    status?: ScrapedSourceStatus;
  }): Promise<StoredSourceConfig[]> {
    return this.listConfigurations(filters);
  }

  /**
   * Cache a configuration
   */
  private cacheConfiguration(config: StoredSourceConfig): void {
    this.configCache.set(config.id, config);
    this.cacheExpiry.set(config.id, Date.now() + this.CACHE_TTL);
  }

  /**
   * Get cached configuration if not expired
   */
  private getCachedConfiguration(id: string): StoredSourceConfig | null {
    const expiry = this.cacheExpiry.get(id);
    if (!expiry || Date.now() > expiry) {
      this.configCache.delete(id);
      this.cacheExpiry.delete(id);
      return null;
    }

    return this.configCache.get(id) || null;
  }

  /**
   * Deserialize configuration from database format
   */
  private deserializeConfiguration(stored: any): StoredSourceConfig {
    let configData: any = {};
    
    try {
      if (stored.lastError) {
        configData = JSON.parse(stored.lastError);
      }
    } catch (error) {
      console.warn(`Failed to parse configuration data for ${stored.id}:`, error);
    }

    return {
      id: stored.id,
      url: stored.url,
      type: stored.type,
      engine: configData.engine || 'static',
      selectors: configData.selectors || this.getDefaultSelectors(),
      rateLimit: configData.rateLimit || this.getDefaultRateLimit(),
      headers: configData.headers || {},
      authentication: configData.authentication,
      customLogic: configData.customLogic,
      frequency: stored.frequency,
      status: stored.status,
      category: stored.category || undefined,
      region: stored.region || undefined,
      notes: stored.notes || undefined,
      createdAt: stored.createdAt,
      updatedAt: stored.updatedAt
    };
  }

  /**
   * Get default selectors
   */
  private getDefaultSelectors(): SourceSelectors {
    return {
      grantContainer: '.grant-item, .opportunity-item',
      title: '.title, h2, h3',
      description: '.description, .summary',
      deadline: '.deadline, .due-date',
      fundingAmount: '.amount, .funding-amount',
      eligibility: '.eligibility, .requirements',
      applicationUrl: '.apply-link, a[href*="apply"]',
      funderInfo: '.funder, .organization'
    };
  }

  /**
   * Get default rate limit configuration
   */
  private getDefaultRateLimit(): RateLimitConfig {
    return {
      requestsPerMinute: 30,
      delayBetweenRequests: 2000,
      respectRobotsTxt: true
    };
  }
}