/**
 * Tests for SourceConfigStore class
 * Covers configuration storage, retrieval, and template management
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SourceConfigStore, StoredSourceConfig } from '../source-config-store';
import { ScrapedSourceType, ScrapingFrequency, ScrapedSourceStatus } from '../../types';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    scrapedSource: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    }
  }
}));

// Get the mocked prisma for test assertions
const { prisma: mockPrisma } = await import('@/lib/prisma');

describe('SourceConfigStore', () => {
  let configStore: SourceConfigStore;

  beforeEach(() => {
    configStore = new SourceConfigStore();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('storeConfiguration', () => {
    const sampleConfig: Omit<StoredSourceConfig, 'id' | 'createdAt' | 'updatedAt'> = {
      url: 'https://example.com/grants',
      type: ScrapedSourceType.FOUNDATION,
      engine: 'static',
      selectors: {
        grantContainer: '.grant-item',
        title: '.title',
        description: '.description',
        deadline: '.deadline',
        fundingAmount: '.amount',
        eligibility: '.eligibility',
        applicationUrl: '.apply-link',
        funderInfo: '.funder'
      },
      rateLimit: {
        requestsPerMinute: 30,
        delayBetweenRequests: 2000,
        respectRobotsTxt: true
      },
      headers: {
        'User-Agent': 'Test Agent'
      },
      frequency: ScrapingFrequency.WEEKLY,
      status: ScrapedSourceStatus.ACTIVE,
      category: 'Healthcare',
      region: 'Global'
    };

    it('should store configuration successfully', async () => {
      const mockStored = {
        id: 'config-1',
        url: sampleConfig.url,
        type: sampleConfig.type,
        frequency: sampleConfig.frequency,
        status: sampleConfig.status,
        category: sampleConfig.category,
        region: sampleConfig.region,
        notes: sampleConfig.notes,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastError: JSON.stringify({
          engine: sampleConfig.engine,
          selectors: sampleConfig.selectors,
          rateLimit: sampleConfig.rateLimit,
          headers: sampleConfig.headers
        })
      };

      mockPrisma.scrapedSource.create.mockResolvedValue(mockStored);

      const result = await configStore.storeConfiguration(sampleConfig);

      expect(result.id).toBe('config-1');
      expect(result.url).toBe(sampleConfig.url);
      expect(result.engine).toBe(sampleConfig.engine);
      expect(result.selectors).toEqual(sampleConfig.selectors);
      expect(mockPrisma.scrapedSource.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          url: sampleConfig.url,
          type: sampleConfig.type,
          frequency: sampleConfig.frequency,
          status: sampleConfig.status,
          category: sampleConfig.category,
          region: sampleConfig.region
        })
      });
    });

    it('should handle storage errors', async () => {
      mockPrisma.scrapedSource.create.mockRejectedValue(new Error('Database error'));

      await expect(configStore.storeConfiguration(sampleConfig)).rejects.toThrow('Failed to store configuration');
    });
  });

  describe('getConfiguration', () => {
    it('should retrieve configuration by ID', async () => {
      const mockStored = {
        id: 'config-1',
        url: 'https://example.com/grants',
        type: 'FOUNDATION',
        frequency: 'WEEKLY',
        status: 'ACTIVE',
        category: 'Healthcare',
        region: 'Global',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastError: JSON.stringify({
          engine: 'static',
          selectors: {
            grantContainer: '.grant-item',
            title: '.title',
            description: '.description',
            deadline: '.deadline',
            fundingAmount: '.amount',
            eligibility: '.eligibility',
            applicationUrl: '.apply-link',
            funderInfo: '.funder'
          },
          rateLimit: {
            requestsPerMinute: 30,
            delayBetweenRequests: 2000,
            respectRobotsTxt: true
          },
          headers: { 'User-Agent': 'Test Agent' }
        })
      };

      mockPrisma.scrapedSource.findUnique.mockResolvedValue(mockStored);

      const result = await configStore.getConfiguration('config-1');

      expect(result).toBeDefined();
      expect(result?.id).toBe('config-1');
      expect(result?.engine).toBe('static');
      expect(result?.selectors.title).toBe('.title');
      expect(mockPrisma.scrapedSource.findUnique).toHaveBeenCalledWith({
        where: { id: 'config-1' }
      });
    });

    it('should return null for non-existent configuration', async () => {
      mockPrisma.scrapedSource.findUnique.mockResolvedValue(null);

      const result = await configStore.getConfiguration('non-existent');

      expect(result).toBeNull();
    });

    it('should handle malformed configuration data gracefully', async () => {
      const mockStored = {
        id: 'config-1',
        url: 'https://example.com/grants',
        type: 'FOUNDATION',
        frequency: 'WEEKLY',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastError: 'invalid json'
      };

      mockPrisma.scrapedSource.findUnique.mockResolvedValue(mockStored);

      const result = await configStore.getConfiguration('config-1');

      expect(result).toBeDefined();
      expect(result?.id).toBe('config-1');
      // Should use default values when JSON parsing fails
      expect(result?.engine).toBe('static');
      expect(result?.selectors).toBeDefined();
    });
  });

  describe('updateConfiguration', () => {
    it('should update existing configuration', async () => {
      const existingConfig = {
        id: 'config-1',
        url: 'https://example.com/grants',
        type: ScrapedSourceType.FOUNDATION,
        engine: 'static' as const,
        selectors: {
          grantContainer: '.grant-item',
          title: '.title',
          description: '.description',
          deadline: '.deadline',
          fundingAmount: '.amount',
          eligibility: '.eligibility',
          applicationUrl: '.apply-link',
          funderInfo: '.funder'
        },
        rateLimit: {
          requestsPerMinute: 30,
          delayBetweenRequests: 2000,
          respectRobotsTxt: true
        },
        headers: {},
        frequency: ScrapingFrequency.WEEKLY,
        status: ScrapedSourceStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockStored = {
        id: 'config-1',
        url: existingConfig.url,
        type: existingConfig.type,
        frequency: existingConfig.frequency,
        status: existingConfig.status,
        createdAt: existingConfig.createdAt,
        updatedAt: existingConfig.updatedAt,
        lastError: JSON.stringify({
          engine: existingConfig.engine,
          selectors: existingConfig.selectors,
          rateLimit: existingConfig.rateLimit,
          headers: existingConfig.headers
        })
      };

      mockPrisma.scrapedSource.findUnique.mockResolvedValue(mockStored);
      mockPrisma.scrapedSource.update.mockResolvedValue({
        ...mockStored,
        category: 'Updated Category',
        updatedAt: new Date()
      });

      const updates = { category: 'Updated Category' };
      const result = await configStore.updateConfiguration('config-1', updates);

      expect(result.category).toBe('Updated Category');
      expect(mockPrisma.scrapedSource.update).toHaveBeenCalledWith({
        where: { id: 'config-1' },
        data: expect.objectContaining({
          category: 'Updated Category',
          updatedAt: expect.any(Date)
        })
      });
    });

    it('should throw error for non-existent configuration', async () => {
      mockPrisma.scrapedSource.findUnique.mockResolvedValue(null);

      await expect(configStore.updateConfiguration('non-existent', {})).rejects.toThrow('Configuration non-existent not found');
    });
  });

  describe('deleteConfiguration', () => {
    it('should delete configuration successfully', async () => {
      mockPrisma.scrapedSource.delete.mockResolvedValue({});

      await configStore.deleteConfiguration('config-1');

      expect(mockPrisma.scrapedSource.delete).toHaveBeenCalledWith({
        where: { id: 'config-1' }
      });
    });

    it('should handle deletion errors', async () => {
      mockPrisma.scrapedSource.delete.mockRejectedValue(new Error('Database error'));

      await expect(configStore.deleteConfiguration('config-1')).rejects.toThrow('Failed to delete configuration');
    });
  });

  describe('listConfigurations', () => {
    it('should list all configurations without filters', async () => {
      const mockConfigurations = [
        {
          id: 'config-1',
          url: 'https://example1.com',
          type: 'FOUNDATION',
          frequency: 'WEEKLY',
          status: 'ACTIVE',
          createdAt: new Date(),
          updatedAt: new Date(),
          lastError: JSON.stringify({ engine: 'static', selectors: {}, rateLimit: {}, headers: {} })
        },
        {
          id: 'config-2',
          url: 'https://example2.com',
          type: 'GOV',
          frequency: 'DAILY',
          status: 'ACTIVE',
          createdAt: new Date(),
          updatedAt: new Date(),
          lastError: JSON.stringify({ engine: 'api', selectors: {}, rateLimit: {}, headers: {} })
        }
      ];

      mockPrisma.scrapedSource.findMany.mockResolvedValue(mockConfigurations);

      const result = await configStore.listConfigurations();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('config-1');
      expect(result[1].id).toBe('config-2');
      expect(mockPrisma.scrapedSource.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { updatedAt: 'desc' }
      });
    });

    it('should list configurations with filters', async () => {
      mockPrisma.scrapedSource.findMany.mockResolvedValue([]);

      const filters = {
        type: ScrapedSourceType.FOUNDATION,
        status: ScrapedSourceStatus.ACTIVE,
        category: 'Healthcare'
      };

      await configStore.listConfigurations(filters);

      expect(mockPrisma.scrapedSource.findMany).toHaveBeenCalledWith({
        where: {
          type: 'FOUNDATION',
          status: 'ACTIVE',
          category: 'Healthcare'
        },
        orderBy: { updatedAt: 'desc' }
      });
    });
  });

  describe('getConfigurationTemplates', () => {
    it('should return predefined templates', () => {
      const templates = configStore.getConfigurationTemplates();

      expect(templates).toHaveLength(4);
      expect(templates[0].name).toBe('Foundation Website (Static)');
      expect(templates[1].name).toBe('Government Portal (API)');
      expect(templates[2].name).toBe('Dynamic Website (Browser)');
      expect(templates[3].name).toBe('International Organization');

      // Verify template structure
      templates.forEach(template => {
        expect(template).toHaveProperty('name');
        expect(template).toHaveProperty('description');
        expect(template).toHaveProperty('type');
        expect(template).toHaveProperty('engine');
        expect(template).toHaveProperty('selectors');
        expect(template).toHaveProperty('rateLimit');
        expect(template).toHaveProperty('headers');
        expect(template).toHaveProperty('tags');
      });
    });
  });

  describe('createFromTemplate', () => {
    it('should create configuration from template', async () => {
      const mockCreated = {
        id: 'config-from-template',
        url: 'https://foundation.example.com',
        type: 'FOUNDATION',
        frequency: 'WEEKLY',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastError: JSON.stringify({
          engine: 'static',
          selectors: expect.any(Object),
          rateLimit: expect.any(Object),
          headers: expect.any(Object)
        })
      };

      mockPrisma.scrapedSource.create.mockResolvedValue(mockCreated);

      const result = await configStore.createFromTemplate(
        'Foundation Website (Static)',
        'https://foundation.example.com',
        { category: 'Education' }
      );

      expect(result.id).toBe('config-from-template');
      expect(result.url).toBe('https://foundation.example.com');
      expect(result.type).toBe(ScrapedSourceType.FOUNDATION);
      expect(result.engine).toBe('static');
      expect(mockPrisma.scrapedSource.create).toHaveBeenCalled();
    });

    it('should throw error for non-existent template', async () => {
      await expect(configStore.createFromTemplate(
        'Non-existent Template',
        'https://example.com'
      )).rejects.toThrow('Template "Non-existent Template" not found');
    });
  });

  describe('bulkImport', () => {
    it('should import multiple configurations', async () => {
      const configurations = [
        {
          url: 'https://example1.com',
          type: ScrapedSourceType.FOUNDATION,
          engine: 'static' as const,
          selectors: {} as any,
          rateLimit: {} as any,
          headers: {},
          frequency: ScrapingFrequency.WEEKLY,
          status: ScrapedSourceStatus.ACTIVE
        },
        {
          url: 'https://example2.com',
          type: ScrapedSourceType.GOV,
          engine: 'api' as const,
          selectors: {} as any,
          rateLimit: {} as any,
          headers: {},
          frequency: ScrapingFrequency.DAILY,
          status: ScrapedSourceStatus.ACTIVE
        }
      ];

      mockPrisma.scrapedSource.create
        .mockResolvedValueOnce({
          id: 'config-1',
          ...configurations[0],
          createdAt: new Date(),
          updatedAt: new Date(),
          lastError: '{}'
        })
        .mockResolvedValueOnce({
          id: 'config-2',
          ...configurations[1],
          createdAt: new Date(),
          updatedAt: new Date(),
          lastError: '{}'
        });

      const result = await configStore.bulkImport(configurations);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('config-1');
      expect(result[1].id).toBe('config-2');
      expect(mockPrisma.scrapedSource.create).toHaveBeenCalledTimes(2);
    });

    it('should continue importing even if some configurations fail', async () => {
      const configurations = [
        {
          url: 'https://example1.com',
          type: ScrapedSourceType.FOUNDATION,
          engine: 'static' as const,
          selectors: {} as any,
          rateLimit: {} as any,
          headers: {},
          frequency: ScrapingFrequency.WEEKLY,
          status: ScrapedSourceStatus.ACTIVE
        },
        {
          url: 'https://example2.com',
          type: ScrapedSourceType.GOV,
          engine: 'api' as const,
          selectors: {} as any,
          rateLimit: {} as any,
          headers: {},
          frequency: ScrapingFrequency.DAILY,
          status: ScrapedSourceStatus.ACTIVE
        }
      ];

      mockPrisma.scrapedSource.create
        .mockResolvedValueOnce({
          id: 'config-1',
          ...configurations[0],
          createdAt: new Date(),
          updatedAt: new Date(),
          lastError: '{}'
        })
        .mockRejectedValueOnce(new Error('Database error'));

      const result = await configStore.bulkImport(configurations);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('config-1');
    });
  });

  describe('caching', () => {
    it('should cache retrieved configurations', async () => {
      const mockStored = {
        id: 'config-1',
        url: 'https://example.com',
        type: 'FOUNDATION',
        frequency: 'WEEKLY',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastError: JSON.stringify({
          engine: 'static',
          selectors: {},
          rateLimit: {},
          headers: {}
        })
      };

      mockPrisma.scrapedSource.findUnique.mockResolvedValue(mockStored);

      // First call should hit database
      const result1 = await configStore.getConfiguration('config-1');
      expect(result1?.id).toBe('config-1');

      // Second call should use cache
      const result2 = await configStore.getConfiguration('config-1');
      expect(result2?.id).toBe('config-1');

      // Database should only be called once
      expect(mockPrisma.scrapedSource.findUnique).toHaveBeenCalledTimes(1);
    });
  });
});