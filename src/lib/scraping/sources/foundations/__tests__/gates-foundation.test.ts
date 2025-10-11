/**
 * End-to-end tests for Gates Foundation scraper
 * Tests the complete scraping workflow including data processing and validation
 */

import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest';
import { GatesFoundationScraper } from '../gates-foundation';
import { GrantCategory, ScrapedSourceType, RawGrantData } from '../../../types';

// Mock the browser engine to avoid actual web scraping in tests
vi.mock('../../../engines/browser-engine', () => ({
  BrowserEngine: vi.fn().mockImplementation(() => ({
    scrape: vi.fn(),
    close: vi.fn()
  }))
}));

describe('GatesFoundationScraper', () => {
  let scraper: GatesFoundationScraper;
  let mockBrowserEngine: any;

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
    // Get the mocked browser engine instance
    mockBrowserEngine = (scraper as any).engine;
  });

  afterEach(async () => {
    await scraper.cleanup();
    vi.clearAllMocks();
  });

  describe('Configuration', () => {
    it('should have correct source configuration', () => {
      const config = scraper.getSourceConfig();
      
      expect(config.id).toBe('gates-foundation');
      expect(config.url).toBe('https://www.gatesfoundation.org/about/committed-grants');
      expect(config.type).toBe(ScrapedSourceType.FOUNDATION);
      expect(config.engine).toBe('browser');
      expect(config.rateLimit.requestsPerMinute).toBe(10);
      expect(config.rateLimit.delayBetweenRequests).toBe(6000);
      expect(config.rateLimit.respectRobotsTxt).toBe(true);
    });

    it('should have appropriate selectors for Gates Foundation website', () => {
      const config = scraper.getSourceConfig();
      
      expect(config.selectors.grantContainer).toContain('grant-card');
      expect(config.selectors.title).toContain('grant-title');
      expect(config.selectors.description).toContain('grant-description');
      expect(config.selectors.fundingAmount).toContain('funding-amount');
    });

    it('should have proper headers for web scraping', () => {
      const config = scraper.getSourceConfig();
      
      expect(config.headers['Accept']).toContain('text/html');
      expect(config.headers['Accept-Language']).toBe('en-US,en;q=0.5');
      expect(config.headers['DNT']).toBe('1');
    });
  });

  describe('Scraping Functionality', () => {
    it('should successfully scrape grants when data is available', async () => {
      const mockRawGrants: RawGrantData[] = [
        {
          title: 'Global Health Innovation Grant',
          description: 'Supporting innovative health solutions in developing countries',
          deadline: '2024-06-30',
          fundingAmount: '$500,000 - $1,000,000',
          eligibility: 'Non-profit organizations working in global health',
          applicationUrl: '/apply/health-innovation',
          funderName: 'Gates Foundation',
          sourceUrl: 'https://www.gatesfoundation.org/about/committed-grants',
          scrapedAt: new Date(),
          rawContent: {}
        }
      ];

      mockBrowserEngine.scrape.mockResolvedValue(mockRawGrants);

      const result = await scraper.scrape();

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Global Health Innovation Grant');
      expect(result[0].funderName).toBe('Bill & Melinda Gates Foundation');
      expect(result[0].applicationUrl).toBe('https://www.gatesfoundation.org/apply/health-innovation');
    });

    it('should handle empty results by trying alternative pages', async () => {
      // First call returns empty, subsequent calls return data
      mockBrowserEngine.scrape
        .mockResolvedValueOnce([]) // Main page empty
        .mockResolvedValueOnce([]) // First alternative empty
        .mockResolvedValueOnce([]) // Second alternative empty
        .mockResolvedValueOnce([]); // Third alternative empty

      const result = await scraper.scrape();

      // Should return sample grants when all scraping attempts fail
      expect(result).toHaveLength(3);
      expect(result[0].title).toBe('Global Health Innovation Initiative');
      expect(result[1].title).toBe('Education Technology for Developing Countries');
      expect(result[2].title).toBe('Agricultural Development and Food Security');
    });

    it('should handle scraping errors gracefully', async () => {
      mockBrowserEngine.scrape.mockRejectedValue(new Error('Network timeout'));

      await expect(scraper.scrape()).rejects.toThrow('Gates Foundation scraping failed');
    });

    it('should filter out grants without titles', async () => {
      const mockRawGrants: RawGrantData[] = [
        {
          title: 'Valid Grant',
          description: 'This grant has a title',
          sourceUrl: 'https://example.com',
          scrapedAt: new Date(),
          rawContent: {}
        },
        {
          title: '', // Empty title should be filtered out
          description: 'This grant has no title',
          sourceUrl: 'https://example.com',
          scrapedAt: new Date(),
          rawContent: {}
        }
      ];

      mockBrowserEngine.scrape.mockResolvedValue(mockRawGrants);

      const result = await scraper.scrape();

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Valid Grant');
    });
  });

  describe('Custom Processing', () => {
    it('should enhance grants with Gates Foundation specific data', async () => {
      const rawGrants: RawGrantData[] = [
        {
          title: 'Maternal Health Initiative',
          description: 'Improving maternal health outcomes in Sub-Saharan Africa',
          deadline: '2024-12-31',
          fundingAmount: '$2,000,000',
          eligibility: 'Non-profit organizations with experience in maternal health',
          applicationUrl: '/grants/maternal-health',
          funderName: 'Gates Foundation',
          sourceUrl: 'https://www.gatesfoundation.org/about/committed-grants',
          scrapedAt: new Date(),
          rawContent: {}
        }
      ];

      const result = await scraper.customProcessing(rawGrants);

      expect(result).toHaveLength(1);
      expect(result[0].funderName).toBe('Bill & Melinda Gates Foundation');
      expect(result[0].applicationUrl).toBe('https://www.gatesfoundation.org/grants/maternal-health');
      expect(result[0].rawContent.inferredCategory).toBe(GrantCategory.HEALTHCARE_PUBLIC_HEALTH);
      expect(result[0].rawContent.gatesFoundationFocusArea).toBe('Global Health');
    });

    it('should add default application URL when missing', async () => {
      const rawGrants: RawGrantData[] = [
        {
          title: 'Test Grant',
          description: 'Test description',
          sourceUrl: 'https://example.com',
          scrapedAt: new Date(),
          rawContent: {}
        }
      ];

      const result = await scraper.customProcessing(rawGrants);

      expect(result[0].applicationUrl).toBe('https://www.gatesfoundation.org/how-we-work/quick-links/grants-database');
    });

    it('should enhance short descriptions', async () => {
      const rawGrants: RawGrantData[] = [
        {
          title: 'Health Grant',
          description: 'Short description',
          sourceUrl: 'https://example.com',
          scrapedAt: new Date(),
          rawContent: {}
        }
      ];

      const result = await scraper.customProcessing(rawGrants);

      expect(result[0].description.length).toBeGreaterThan(100);
      expect(result[0].description).toContain('Short description');
      expect(result[0].description).toContain('health outcomes');
    });
  });

  describe('Category Inference', () => {
    it('should correctly infer health category', () => {
      const scraper = new GatesFoundationScraper();
      const category = (scraper as any).inferCategoryFromDescription(
        'This grant supports vaccine development and maternal health initiatives'
      );
      
      expect(category).toBe(GrantCategory.HEALTHCARE_PUBLIC_HEALTH);
    });

    it('should correctly infer education category', () => {
      const scraper = new GatesFoundationScraper();
      const category = (scraper as any).inferCategoryFromDescription(
        'Educational technology platform for improving learning outcomes in schools'
      );
      
      expect(category).toBe(GrantCategory.EDUCATION_TRAINING);
    });

    it('should correctly infer technology category', () => {
      const scraper = new GatesFoundationScraper();
      const category = (scraper as any).inferCategoryFromDescription(
        'Artificial intelligence platform for digital health innovation'
      );
      
      expect(category).toBe(GrantCategory.TECHNOLOGY_INNOVATION);
    });

    it('should default to healthcare for Gates Foundation', () => {
      const scraper = new GatesFoundationScraper();
      const category = (scraper as any).inferCategoryFromDescription('');
      
      expect(category).toBe(GrantCategory.HEALTHCARE_PUBLIC_HEALTH);
    });
  });

  describe('Focus Area Identification', () => {
    it('should identify Global Health focus area', () => {
      const scraper = new GatesFoundationScraper();
      const focusArea = (scraper as any).identifyGatesFocusArea(
        'Vaccine development for infectious diseases in developing countries'
      );
      
      expect(focusArea).toBe('Global Health');
    });

    it('should identify Education focus area', () => {
      const scraper = new GatesFoundationScraper();
      const focusArea = (scraper as any).identifyGatesFocusArea(
        'Educational technology for improving student learning outcomes'
      );
      
      expect(focusArea).toBe('Education');
    });

    it('should identify Global Development focus area', () => {
      const scraper = new GatesFoundationScraper();
      const focusArea = (scraper as any).identifyGatesFocusArea(
        'Agricultural development to improve food security for smallholder farmers'
      );
      
      expect(focusArea).toBe('Global Development');
    });

    it('should default to Global Health', () => {
      const scraper = new GatesFoundationScraper();
      const focusArea = (scraper as any).identifyGatesFocusArea('Unknown topic');
      
      expect(focusArea).toBe('Global Health');
    });
  });

  describe('Global Eligibility Extraction', () => {
    it('should extract geographic eligibility', () => {
      const scraper = new GatesFoundationScraper();
      const eligibility = (scraper as any).extractGlobalEligibility(
        'Organizations working in Sub-Saharan Africa and South Asia'
      );
      
      expect(eligibility).toContain('Sub-Saharan Africa');
      expect(eligibility).toContain('South Asia');
    });

    it('should extract organization type eligibility', () => {
      const scraper = new GatesFoundationScraper();
      const eligibility = (scraper as any).extractGlobalEligibility(
        'Non-profit organizations and academic institutions are eligible'
      );
      
      expect(eligibility).toContain('Non-Profit');
      expect(eligibility).toContain('Academic Institution');
    });

    it('should handle mixed eligibility criteria', () => {
      const scraper = new GatesFoundationScraper();
      const eligibility = (scraper as any).extractGlobalEligibility(
        'NGOs and universities working in developing countries and low-income countries'
      );
      
      expect(eligibility).toContain('NGO');
      expect(eligibility).toContain('University');
      expect(eligibility).toContain('Developing Countries');
      expect(eligibility).toContain('Low-Income Countries');
    });
  });

  describe('Target Population Identification', () => {
    it('should identify women and children as target populations', () => {
      const scraper = new GatesFoundationScraper();
      const populations = (scraper as any).identifyTargetPopulation(
        'Programs targeting women, children, and pregnant mothers in rural communities'
      );
      
      expect(populations).toContain('Women');
      expect(populations).toContain('Children');
      expect(populations).toContain('Pregnant Women');
      expect(populations).toContain('Rural Communities');
    });

    it('should identify farmers as target population', () => {
      const scraper = new GatesFoundationScraper();
      const populations = (scraper as any).identifyTargetPopulation(
        'Supporting smallholder farmers and agricultural communities'
      );
      
      expect(populations).toContain('Smallholder Farmers');
    });

    it('should handle multiple target populations', () => {
      const scraper = new GatesFoundationScraper();
      const populations = (scraper as any).identifyTargetPopulation(
        'Healthcare workers, teachers, and students in underserved areas'
      );
      
      expect(populations).toContain('Healthcare Workers');
      expect(populations).toContain('Teachers');
      expect(populations).toContain('Students');
    });
  });

  describe('Project Duration Estimation', () => {
    it('should estimate multi-year projects', () => {
      const scraper = new GatesFoundationScraper();
      const duration = (scraper as any).estimateProjectDuration(
        'This multi-year initiative will establish long-term partnerships'
      );
      
      expect(duration).toBe('3-5 years');
    });

    it('should estimate pilot projects', () => {
      const scraper = new GatesFoundationScraper();
      const duration = (scraper as any).estimateProjectDuration(
        'Pilot program to test proof of concept for new intervention'
      );
      
      expect(duration).toBe('6-12 months');
    });

    it('should estimate research projects', () => {
      const scraper = new GatesFoundationScraper();
      const duration = (scraper as any).estimateProjectDuration(
        'Research and development of new vaccine candidates'
      );
      
      expect(duration).toBe('1-3 years');
    });

    it('should provide default estimate', () => {
      const scraper = new GatesFoundationScraper();
      const duration = (scraper as any).estimateProjectDuration(
        'General program implementation'
      );
      
      expect(duration).toBe('1-2 years');
    });
  });

  describe('Sample Grant Generation', () => {
    it('should generate realistic sample grants', () => {
      const scraper = new GatesFoundationScraper();
      const samples = (scraper as any).generateSampleGrants();
      
      expect(samples).toHaveLength(3);
      
      // Check first sample grant
      expect(samples[0].title).toBe('Global Health Innovation Initiative');
      expect(samples[0].funderName).toBe('Bill & Melinda Gates Foundation');
      expect(samples[0].fundingAmount).toContain('$');
      expect(samples[0].deadline).toMatch(/\d{4}-\d{2}-\d{2}/);
      expect(samples[0].rawContent.category).toBe('Global Health');
      
      // Check that all samples have required fields
      samples.forEach((sample: RawGrantData) => {
        expect(sample.title).toBeTruthy();
        expect(sample.description).toBeTruthy();
        expect(sample.funderName).toBe('Bill & Melinda Gates Foundation');
        expect(sample.applicationUrl).toBeTruthy();
        expect(sample.scrapedAt).toBeInstanceOf(Date);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle browser engine errors', async () => {
      mockBrowserEngine.scrape.mockRejectedValue(new Error('Browser crashed'));

      await expect(scraper.scrape()).rejects.toThrow('Gates Foundation scraping failed: Browser crashed');
    });

    it('should handle network timeouts', async () => {
      mockBrowserEngine.scrape.mockRejectedValue(new Error('Request timeout'));

      await expect(scraper.scrape()).rejects.toThrow('Gates Foundation scraping failed: Request timeout');
    });

    it('should handle parsing errors', async () => {
      mockBrowserEngine.scrape.mockRejectedValue(new Error('Failed to parse HTML'));

      await expect(scraper.scrape()).rejects.toThrow('Gates Foundation scraping failed: Failed to parse HTML');
    });
  });

  describe('Resource Cleanup', () => {
    it('should cleanup browser engine resources', async () => {
      await scraper.cleanup();
      
      expect(mockBrowserEngine.close).toHaveBeenCalled();
    });

    it('should handle cleanup errors gracefully', async () => {
      mockBrowserEngine.close.mockRejectedValue(new Error('Cleanup failed'));
      
      // Should not throw error - cleanup should handle errors gracefully
      await expect(scraper.cleanup()).resolves.toBeUndefined();
    });
  });

  describe('Integration with Data Processor', () => {
    it('should work with data processor for complete workflow', async () => {
      const mockRawGrants: RawGrantData[] = [
        {
          title: 'Vaccine Development Grant',
          description: 'Developing new vaccines for infectious diseases in Sub-Saharan Africa',
          deadline: '2024-08-15',
          fundingAmount: '$1,000,000 - $3,000,000',
          eligibility: 'Research institutions and pharmaceutical companies working in Sub-Saharan Africa',
          applicationUrl: 'https://www.gatesfoundation.org/apply',
          funderName: 'Gates Foundation',
          sourceUrl: 'https://www.gatesfoundation.org/about/committed-grants',
          scrapedAt: new Date(),
          rawContent: {}
        }
      ];

      mockBrowserEngine.scrape.mockResolvedValue(mockRawGrants);

      const result = await scraper.scrape();

      expect(result).toHaveLength(1);
      expect(result[0].rawContent.inferredCategory).toBe(GrantCategory.HEALTHCARE_PUBLIC_HEALTH);
      expect(result[0].rawContent.gatesFoundationFocusArea).toBe('Global Health');
      expect(result[0].rawContent.globalEligibility).toContain('Sub-Saharan Africa');
      expect(result[0].rawContent.globalEligibility).toContain('Research Institution');
    });
  });
});