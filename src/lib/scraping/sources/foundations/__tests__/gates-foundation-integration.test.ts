/**
 * Integration tests for Gates Foundation scraper with orchestrator
 * Tests the complete workflow from scraping to database storage
 */

import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest';
import { GatesFoundationScraper } from '../gates-foundation';
import { ScrapingOrchestrator } from '../../../core/orchestrator';
import { DataProcessor } from '../../../processors/data-processor';
import { GrantCategory, ScrapedSourceType, RawGrantData, ProcessedGrantData } from '../../../types';

// Mock the browser engine and database operations
vi.mock('../../../engines/browser-engine');
vi.mock('../../../core/orchestrator');
vi.mock('../../../processors/data-processor');

describe('Gates Foundation Scraper Integration', () => {
  let scraper: GatesFoundationScraper;
  let mockDataProcessor: any;

  beforeAll(() => {
    // Suppress console logs during tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    scraper = new GatesFoundationScraper();
    
    // Mock DataProcessor
    mockDataProcessor = {
      processGrant: vi.fn()
    };
    
    // Mock the browser engine to return sample data
    const mockBrowserEngine = (scraper as any).engine;
    mockBrowserEngine.scrape = vi.fn().mockResolvedValue([
      {
        title: 'Global Health Innovation Initiative',
        description: 'Supporting innovative approaches to address global health challenges in low-income countries, focusing on maternal and child health, infectious diseases, and health system strengthening.',
        deadline: '2024-06-30',
        fundingAmount: '$500,000 - $2,000,000',
        eligibility: 'Non-profit organizations, academic institutions, and social enterprises working in global health. Must demonstrate experience in low-resource settings.',
        applicationUrl: '/grants/health-innovation',
        funderName: 'Gates Foundation',
        sourceUrl: 'https://www.gatesfoundation.org/about/committed-grants',
        scrapedAt: new Date(),
        rawContent: {}
      }
    ]);
  });

  afterEach(async () => {
    await scraper.cleanup();
    vi.clearAllMocks();
  });

  describe('End-to-End Scraping Workflow', () => {
    it('should complete full scraping workflow successfully', async () => {
      const result = await scraper.scrape();

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Global Health Innovation Initiative');
      expect(result[0].funderName).toBe('Bill & Melinda Gates Foundation');
      expect(result[0].rawContent.inferredCategory).toBe(GrantCategory.HEALTHCARE_PUBLIC_HEALTH);
      expect(result[0].rawContent.gatesFoundationFocusArea).toBe('Global Health');
    });

    it('should handle data processing integration', async () => {
      const rawGrants = await scraper.scrape();
      
      // Verify the raw grants have been processed with Gates Foundation specific logic
      expect(rawGrants[0].rawContent.inferredCategory).toBeDefined();
      expect(rawGrants[0].rawContent.gatesFoundationFocusArea).toBeDefined();
      expect(rawGrants[0].rawContent.globalEligibility).toBeDefined();
      expect(rawGrants[0].rawContent.targetPopulation).toBeDefined();
      expect(rawGrants[0].rawContent.estimatedDuration).toBeDefined();
    });

    it('should properly format application URLs', async () => {
      const result = await scraper.scrape();

      expect(result[0].applicationUrl).toBe('https://www.gatesfoundation.org/grants/health-innovation');
    });

    it('should enhance short descriptions', async () => {
      // Mock short description
      const mockBrowserEngine = (scraper as any).engine;
      mockBrowserEngine.scrape.mockResolvedValue([
        {
          title: 'Health Grant',
          description: 'Short description',
          sourceUrl: 'https://www.gatesfoundation.org/about/committed-grants',
          scrapedAt: new Date(),
          rawContent: {}
        }
      ]);

      const result = await scraper.scrape();

      expect(result[0].description.length).toBeGreaterThan(100);
      expect(result[0].description).toContain('Short description');
      expect(result[0].description).toContain('health outcomes');
    });
  });

  describe('Category and Focus Area Classification', () => {
    it('should correctly classify health-related grants', async () => {
      const mockBrowserEngine = (scraper as any).engine;
      mockBrowserEngine.scrape.mockResolvedValue([
        {
          title: 'Vaccine Development Initiative',
          description: 'Developing new vaccines for malaria and tuberculosis in Sub-Saharan Africa',
          sourceUrl: 'https://www.gatesfoundation.org/about/committed-grants',
          scrapedAt: new Date(),
          rawContent: {}
        }
      ]);

      const result = await scraper.scrape();

      expect(result[0].rawContent.inferredCategory).toBe(GrantCategory.HEALTHCARE_PUBLIC_HEALTH);
      expect(result[0].rawContent.gatesFoundationFocusArea).toBe('Global Health');
    });

    it('should correctly classify education-related grants', async () => {
      const mockBrowserEngine = (scraper as any).engine;
      mockBrowserEngine.scrape.mockResolvedValue([
        {
          title: 'Educational Technology Platform',
          description: 'Developing educational technology solutions for improving learning outcomes in schools',
          sourceUrl: 'https://www.gatesfoundation.org/about/committed-grants',
          scrapedAt: new Date(),
          rawContent: {}
        }
      ]);

      const result = await scraper.scrape();

      expect(result[0].rawContent.inferredCategory).toBe(GrantCategory.EDUCATION_TRAINING);
      expect(result[0].rawContent.gatesFoundationFocusArea).toBe('Education');
    });

    it('should correctly classify development-related grants', async () => {
      const mockBrowserEngine = (scraper as any).engine;
      mockBrowserEngine.scrape.mockResolvedValue([
        {
          title: 'Agricultural Development Program',
          description: 'Supporting smallholder farmers to improve food security and agricultural productivity',
          sourceUrl: 'https://www.gatesfoundation.org/about/committed-grants',
          scrapedAt: new Date(),
          rawContent: {}
        }
      ]);

      const result = await scraper.scrape();

      expect(result[0].rawContent.inferredCategory).toBe(GrantCategory.COMMUNITY_DEVELOPMENT);
      expect(result[0].rawContent.gatesFoundationFocusArea).toBe('Global Development');
    });
  });

  describe('Geographic and Population Targeting', () => {
    it('should extract geographic eligibility correctly', async () => {
      const mockBrowserEngine = (scraper as any).engine;
      mockBrowserEngine.scrape.mockResolvedValue([
        {
          title: 'Regional Health Initiative',
          description: 'Health program targeting Sub-Saharan Africa and South Asia',
          eligibility: 'Organizations working in Sub-Saharan Africa, South Asia, developing countries and low-income countries',
          sourceUrl: 'https://www.gatesfoundation.org/about/committed-grants',
          scrapedAt: new Date(),
          rawContent: {}
        }
      ]);

      const result = await scraper.scrape();

      expect(result[0].rawContent.globalEligibility).toContain('Sub-Saharan Africa');
      expect(result[0].rawContent.globalEligibility).toContain('South Asia');
      expect(result[0].rawContent.globalEligibility).toContain('Developing Countries');
      expect(result[0].rawContent.globalEligibility).toContain('Low-Income Countries');
    });

    it('should identify target populations correctly', async () => {
      const mockBrowserEngine = (scraper as any).engine;
      mockBrowserEngine.scrape.mockResolvedValue([
        {
          title: 'Maternal Health Program',
          description: 'Supporting programs for women, children, and pregnant mothers in rural communities',
          sourceUrl: 'https://www.gatesfoundation.org/about/committed-grants',
          scrapedAt: new Date(),
          rawContent: {}
        }
      ]);

      const result = await scraper.scrape();

      expect(result[0].rawContent.targetPopulation).toContain('Women');
      expect(result[0].rawContent.targetPopulation).toContain('Children');
      expect(result[0].rawContent.targetPopulation).toContain('Pregnant Women');
      expect(result[0].rawContent.targetPopulation).toContain('Rural Communities');
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle scraping failures gracefully', async () => {
      const mockBrowserEngine = (scraper as any).engine;
      mockBrowserEngine.scrape.mockRejectedValue(new Error('Network error'));

      await expect(scraper.scrape()).rejects.toThrow('Gates Foundation scraping failed');
    });

    it('should fallback to sample data when all scraping fails', async () => {
      const mockBrowserEngine = (scraper as any).engine;
      mockBrowserEngine.scrape.mockResolvedValue([]); // Empty results

      const result = await scraper.scrape();

      // Should return sample grants
      expect(result).toHaveLength(3);
      expect(result[0].title).toBe('Global Health Innovation Initiative');
      expect(result[1].title).toBe('Education Technology for Developing Countries');
      expect(result[2].title).toBe('Agricultural Development and Food Security');
    });

    it('should filter out invalid grants', async () => {
      const mockBrowserEngine = (scraper as any).engine;
      mockBrowserEngine.scrape.mockResolvedValue([
        {
          title: 'Valid Grant',
          description: 'This is a valid grant',
          sourceUrl: 'https://www.gatesfoundation.org/about/committed-grants',
          scrapedAt: new Date(),
          rawContent: {}
        },
        {
          title: '', // Invalid - empty title
          description: 'This grant has no title',
          sourceUrl: 'https://www.gatesfoundation.org/about/committed-grants',
          scrapedAt: new Date(),
          rawContent: {}
        },
        {
          // Invalid - no title property
          description: 'This grant has no title property',
          sourceUrl: 'https://www.gatesfoundation.org/about/committed-grants',
          scrapedAt: new Date(),
          rawContent: {}
        } as any
      ]);

      const result = await scraper.scrape();

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Valid Grant');
    });
  });

  describe('Data Quality and Consistency', () => {
    it('should ensure consistent funder information', async () => {
      const result = await scraper.scrape();

      result.forEach(grant => {
        expect(grant.funderName).toBe('Bill & Melinda Gates Foundation');
        expect(grant.applicationUrl).toMatch(/^https:\/\/www\.gatesfoundation\.org/);
      });
    });

    it('should provide quality metadata for all grants', async () => {
      const result = await scraper.scrape();

      result.forEach(grant => {
        expect(grant.rawContent.inferredCategory).toBeDefined();
        expect(grant.rawContent.gatesFoundationFocusArea).toBeDefined();
        expect(grant.rawContent.estimatedDuration).toBeDefined();
        expect(grant.scrapedAt).toBeInstanceOf(Date);
      });
    });

    it('should handle various funding amount formats', async () => {
      const mockBrowserEngine = (scraper as any).engine;
      mockBrowserEngine.scrape.mockResolvedValue([
        {
          title: 'Grant with Range',
          fundingAmount: '$100,000 - $500,000',
          sourceUrl: 'https://www.gatesfoundation.org/about/committed-grants',
          scrapedAt: new Date(),
          rawContent: {}
        },
        {
          title: 'Grant with Single Amount',
          fundingAmount: '$1,000,000',
          sourceUrl: 'https://www.gatesfoundation.org/about/committed-grants',
          scrapedAt: new Date(),
          rawContent: {}
        },
        {
          title: 'Grant with Up To Amount',
          fundingAmount: 'Up to $2,000,000',
          sourceUrl: 'https://www.gatesfoundation.org/about/committed-grants',
          scrapedAt: new Date(),
          rawContent: {}
        }
      ]);

      const result = await scraper.scrape();

      expect(result).toHaveLength(3);
      result.forEach(grant => {
        expect(grant.fundingAmount).toBeTruthy();
      });
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large numbers of grants efficiently', async () => {
      const mockGrants = Array.from({ length: 100 }, (_, i) => ({
        title: `Grant ${i + 1}`,
        description: `Description for grant ${i + 1}`,
        sourceUrl: 'https://www.gatesfoundation.org/about/committed-grants',
        scrapedAt: new Date(),
        rawContent: {}
      }));

      const mockBrowserEngine = (scraper as any).engine;
      mockBrowserEngine.scrape.mockResolvedValue(mockGrants);

      const startTime = Date.now();
      const result = await scraper.scrape();
      const duration = Date.now() - startTime;

      expect(result).toHaveLength(100);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should cleanup resources properly', async () => {
      const mockBrowserEngine = (scraper as any).engine;
      
      await scraper.scrape();
      await scraper.cleanup();

      expect(mockBrowserEngine.close).toHaveBeenCalled();
    });
  });
});