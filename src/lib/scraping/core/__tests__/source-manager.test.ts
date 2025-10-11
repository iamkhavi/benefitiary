/**
 * Tests for SourceManager class
 * Covers source configuration management, validation, and health checking
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { SourceManager, SourceConfigurationInput, SourceHealthCheck } from '../source-manager';
import { ScrapedSourceType, ScrapingFrequency, ScrapedSourceStatus } from '../../types';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    scrapedSource: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    }
  }
}));

// Get the mocked prisma for test assertions
const { prisma: mockPrisma } = await import('@/lib/prisma');

// Mock fetch for health checks
global.fetch = vi.fn();

describe('SourceManager', () => {
  let sourceManager: SourceManager;

  beforeEach(() => {
    sourceManager = new SourceManager();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('getActiveSource', () => {
    it('should return source configuration for valid active source', async () => {
      const mockSource = {
        id: 'source-1',
        url: 'https://example.com/grants',
        type: 'FOUNDATION',
        status: 'ACTIVE',
        category: 'Healthcare',
        region: 'Global',
        notes: 'Test source'
      };

      mockPrisma.scrapedSource.findUnique.mockResolvedValue(mockSource);

      const result = await sourceManager.getActiveSource('source-1');

      expect(result).toBeDefined();
      expect(result?.id).toBe('source-1');
      expect(result?.url).toBe('https://example.com/grants');
      expect(result?.type).toBe('FOUNDATION');
      expect(mockPrisma.scrapedSource.findUnique).toHaveBeenCalledWith({
        where: { id: 'source-1', status: 'ACTIVE' }
      });
    });

    it('should return null for non-existent source', async () => {
      mockPrisma.scrapedSource.findUnique.mockResolvedValue(null);

      const result = await sourceManager.getActiveSource('non-existent');

      expect(result).toBeNull();
    });

    it('should throw error on database failure', async () => {
      mockPrisma.scrapedSource.findUnique.mockRejectedValue(new Error('Database error'));

      await expect(sourceManager.getActiveSource('source-1')).rejects.toThrow('Failed to fetch source configuration');
    });
  });

  describe('getActiveSources', () => {
    it('should return all active sources', async () => {
      const mockSources = [
        {
          id: 'source-1',
          url: 'https://example1.com/grants',
          type: 'FOUNDATION',
          status: 'ACTIVE'
        },
        {
          id: 'source-2',
          url: 'https://example2.com/grants',
          type: 'GOV',
          status: 'ACTIVE'
        }
      ];

      mockPrisma.scrapedSource.findMany.mockResolvedValue(mockSources);

      const result = await sourceManager.getActiveSources();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('source-1');
      expect(result[1].id).toBe('source-2');
      expect(mockPrisma.scrapedSource.findMany).toHaveBeenCalledWith({
        where: { status: 'ACTIVE' },
        orderBy: { updatedAt: 'desc' }
      });
    });

    it('should return empty array when no active sources', async () => {
      mockPrisma.scrapedSource.findMany.mockResolvedValue([]);

      const result = await sourceManager.getActiveSources();

      expect(result).toHaveLength(0);
    });
  });

  describe('createSource', () => {
    const validConfig: SourceConfigurationInput = {
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
      category: 'Healthcare',
      region: 'Global'
    };

    it('should create source with valid configuration', async () => {
      const mockCreatedSource = {
        id: 'new-source-1',
        url: validConfig.url,
        type: validConfig.type,
        status: 'ACTIVE',
        category: validConfig.category,
        region: validConfig.region
      };

      mockPrisma.scrapedSource.create.mockResolvedValue(mockCreatedSource);
      (global.fetch as Mock).mockResolvedValue({
        ok: true,
        status: 200
      });

      const result = await sourceManager.createSource(validConfig);

      expect(result).toBeDefined();
      expect(result.id).toBe('new-source-1');
      expect(result.url).toBe(validConfig.url);
      expect(mockPrisma.scrapedSource.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          url: validConfig.url,
          type: validConfig.type,
          frequency: ScrapingFrequency.WEEKLY,
          status: ScrapedSourceStatus.ACTIVE,
          category: validConfig.category,
          region: validConfig.region
        })
      });
    });

    it('should reject invalid configuration', async () => {
      const invalidConfig = {
        ...validConfig,
        url: 'invalid-url'
      };

      await expect(sourceManager.createSource(invalidConfig)).rejects.toThrow('Invalid source configuration');
    });

    it('should handle health check failure gracefully', async () => {
      const mockCreatedSource = {
        id: 'new-source-1',
        url: validConfig.url,
        type: validConfig.type,
        status: 'ACTIVE'
      };

      mockPrisma.scrapedSource.create.mockResolvedValue(mockCreatedSource);
      (global.fetch as Mock).mockRejectedValue(new Error('Network error'));

      // Should still create the source despite health check failure
      const result = await sourceManager.createSource(validConfig);
      expect(result).toBeDefined();
    });
  });

  describe('updateSourceMetrics', () => {
    it('should update success metrics', async () => {
      const metrics = {
        successRate: 0.85,
        averageProcessingTime: 5000,
        lastSuccessfulScrape: new Date()
      };

      mockPrisma.scrapedSource.update.mockResolvedValue({});

      await sourceManager.updateSourceMetrics('source-1', metrics);

      expect(mockPrisma.scrapedSource.update).toHaveBeenCalledWith({
        where: { id: 'source-1' },
        data: expect.objectContaining({
          successRate: 0.85,
          avgParseTime: 5000,
          lastScrapedAt: metrics.lastSuccessfulScrape,
          failCount: 0
        })
      });
    });

    it('should update error metrics', async () => {
      const metrics = {
        lastError: 'Network timeout'
      };

      mockPrisma.scrapedSource.update.mockResolvedValue({});

      await sourceManager.updateSourceMetrics('source-1', metrics);

      expect(mockPrisma.scrapedSource.update).toHaveBeenCalledWith({
        where: { id: 'source-1' },
        data: expect.objectContaining({
          lastError: 'Network timeout',
          failCount: { increment: 1 }
        })
      });
    });
  });

  describe('validateSourceConfiguration', () => {
    const validConfig: SourceConfigurationInput = {
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
      }
    };

    it('should validate correct configuration', async () => {
      const result = await sourceManager.validateSourceConfiguration(validConfig);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.qualityScore).toBeGreaterThan(90);
    });

    it('should reject missing URL', async () => {
      const invalidConfig = { ...validConfig, url: '' };

      const result = await sourceManager.validateSourceConfiguration(invalidConfig);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'url',
          message: 'URL is required'
        })
      );
    });

    it('should reject invalid URL format', async () => {
      const invalidConfig = { ...validConfig, url: 'not-a-url' };

      const result = await sourceManager.validateSourceConfiguration(invalidConfig);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'url',
          message: 'Invalid URL format'
        })
      );
    });

    it('should reject invalid source type', async () => {
      const invalidConfig = { ...validConfig, type: 'INVALID' as ScrapedSourceType };

      const result = await sourceManager.validateSourceConfiguration(invalidConfig);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'type',
          message: 'Valid source type is required'
        })
      );
    });

    it('should reject invalid engine type', async () => {
      const invalidConfig = { ...validConfig, engine: 'invalid' as any };

      const result = await sourceManager.validateSourceConfiguration(invalidConfig);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'engine',
          message: 'Valid engine type is required (static, browser, api)'
        })
      );
    });

    it('should require selectors for non-API engines', async () => {
      const invalidConfig = {
        ...validConfig,
        selectors: {
          ...validConfig.selectors,
          grantContainer: '',
          title: ''
        }
      };

      const result = await sourceManager.validateSourceConfiguration(invalidConfig);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'selectors.grantContainer',
          message: 'Grant container selector is required'
        })
      );
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'selectors.title',
          message: 'Title selector is required'
        })
      );
    });

    it('should validate rate limiting configuration', async () => {
      const invalidConfig = {
        ...validConfig,
        rateLimit: {
          requestsPerMinute: -1,
          delayBetweenRequests: -100,
          respectRobotsTxt: true
        }
      };

      const result = await sourceManager.validateSourceConfiguration(invalidConfig);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'rateLimit.requestsPerMinute',
          message: 'Requests per minute must be positive'
        })
      );
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'rateLimit.delayBetweenRequests',
          message: 'Delay between requests cannot be negative'
        })
      );
    });

    it('should warn about high request rates', async () => {
      const configWithHighRate = {
        ...validConfig,
        rateLimit: {
          ...validConfig.rateLimit,
          requestsPerMinute: 120
        }
      };

      const result = await sourceManager.validateSourceConfiguration(configWithHighRate);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          field: 'rateLimit.requestsPerMinute',
          message: 'High request rate may trigger anti-bot measures'
        })
      );
    });

    it('should validate authentication configuration', async () => {
      const configWithInvalidAuth = {
        ...validConfig,
        authentication: {
          type: 'invalid' as any,
          credentials: {}
        }
      };

      const result = await sourceManager.validateSourceConfiguration(configWithInvalidAuth);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'authentication.type',
          message: 'Valid authentication type is required'
        })
      );
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'authentication.credentials',
          message: 'Authentication credentials are required'
        })
      );
    });
  });

  describe('performHealthCheck', () => {
    it('should return healthy status for successful response', async () => {
      (global.fetch as Mock).mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            status: 200
          }), 10) // Add small delay to ensure responseTime > 0
        )
      );

      const result = await sourceManager.performHealthCheck('https://example.com');

      expect(result.isHealthy).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(result.responseTime).toBeGreaterThan(0);
      expect(result.checkedAt).toBeInstanceOf(Date);
    });

    it('should return unhealthy status for failed response', async () => {
      (global.fetch as Mock).mockResolvedValue({
        ok: false,
        status: 404
      });

      const result = await sourceManager.performHealthCheck('https://example.com');

      expect(result.isHealthy).toBe(false);
      expect(result.statusCode).toBe(404);
    });

    it('should handle network errors', async () => {
      (global.fetch as Mock).mockRejectedValue(new Error('Network error'));

      const result = await sourceManager.performHealthCheck('https://example.com');

      expect(result.isHealthy).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('should include custom headers in request', async () => {
      (global.fetch as Mock).mockResolvedValue({
        ok: true,
        status: 200
      });

      const customHeaders = { 'Authorization': 'Bearer token' };
      await sourceManager.performHealthCheck('https://example.com', customHeaders);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://example.com',
        expect.objectContaining({
          headers: expect.objectContaining(customHeaders)
        })
      );
    });
  });

  describe('disableSource', () => {
    it('should disable source with reason', async () => {
      mockPrisma.scrapedSource.update.mockResolvedValue({});

      await sourceManager.disableSource('source-1', 'Too many failures');

      expect(mockPrisma.scrapedSource.update).toHaveBeenCalledWith({
        where: { id: 'source-1' },
        data: {
          status: ScrapedSourceStatus.INACTIVE,
          lastError: 'Too many failures',
          updatedAt: expect.any(Date)
        }
      });
    });
  });

  describe('enableSource', () => {
    it('should enable source after successful health check', async () => {
      const mockSource = {
        id: 'source-1',
        url: 'https://example.com/grants'
      };

      mockPrisma.scrapedSource.findUnique.mockResolvedValue(mockSource);
      mockPrisma.scrapedSource.update.mockResolvedValue({});
      (global.fetch as Mock).mockResolvedValue({
        ok: true,
        status: 200
      });

      await sourceManager.enableSource('source-1');

      expect(mockPrisma.scrapedSource.update).toHaveBeenCalledWith({
        where: { id: 'source-1' },
        data: {
          status: ScrapedSourceStatus.ACTIVE,
          lastError: null,
          updatedAt: expect.any(Date)
        }
      });
    });

    it('should not enable source if health check fails', async () => {
      const mockSource = {
        id: 'source-1',
        url: 'https://example.com/grants'
      };

      mockPrisma.scrapedSource.findUnique.mockResolvedValue(mockSource);
      (global.fetch as Mock).mockRejectedValue(new Error('Network error'));

      await expect(sourceManager.enableSource('source-1')).rejects.toThrow('Cannot enable source: Health check failed');
    });
  });

  describe('getSourcesForHealthCheck', () => {
    it('should return sources needing health checks', async () => {
      const mockSources = [
        {
          id: 'source-1',
          url: 'https://example1.com',
          type: 'FOUNDATION',
          updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          failCount: 1
        },
        {
          id: 'source-2',
          url: 'https://example2.com',
          type: 'GOV',
          updatedAt: new Date(),
          failCount: 5 // High fail count
        }
      ];

      mockPrisma.scrapedSource.findMany.mockResolvedValue(mockSources);

      const result = await sourceManager.getSourcesForHealthCheck();

      expect(result).toHaveLength(2);
      expect(mockPrisma.scrapedSource.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { updatedAt: { lt: expect.any(Date) } },
            { failCount: { gte: 3 } }
          ],
          status: { in: ['ACTIVE', 'ERROR'] }
        }
      });
    });
  });
});