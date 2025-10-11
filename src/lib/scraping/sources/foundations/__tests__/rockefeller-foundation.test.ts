/**
 * Rockefeller Foundation Scraper Tests
 * Comprehensive test suite for Rockefeller Foundation scraping functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { RockefellerFoundationScraper } from '../rockefeller-foundation';
import { RawGrantData, GrantCategory, ScrapedSourceType } from '../../../types';

// Mock the engines and processors
vi.mock('../../../engines/static-parser');
vi.mock('../../../engines/browser-engine');
vi.mock('../../../processors/data-processor');

describe('RockefellerFoundationScraper', () => {
  let scraper: RockefellerFoundationScraper;
  let mockStaticEngine: any;
  let mockBrowserEngine: any;
  let mockDataProcessor: any;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Create mock engines
    mockStaticEngine = {
      scrape: vi.fn()
    };
    
    mockBrowserEngine = {
      scrape: vi.fn()
    };
    
    mockDataProcessor = {
      processRawData: vi.fn()
    };

    scraper = new RockefellerFoundationScraper();
    
    // Inject mocks
    (scraper as any).staticEngine = mockStaticEngine;
    (scraper as any).browserEngine = mockBrowserEngine;
    (scraper as any).dataProcessor = mockDataProcessor;
  });

  afterEach(async () => {
    await scraper.cleanup();
  });

  describe('Configuration', () => {
    it('should have correct source configuration', () => {
      const config = scraper.getSourceConfig();
      
      expect(config.id).toBe('rockefeller-foundation');
      expect(config.url).toBe('https://www.rockefellerfoundation.org/grants/');
      expect(config.type).toBe(ScrapedSourceType.FOUNDATION);
      expect(config.engine).toBe('browser');
      expect(config.rateLimit.requestsPerMinute).toBe(12);
      expect(config.rateLimit.delayBetweenRequests).toBe(5000);
      expect(config.rateLimit.respectRobotsTxt).toBe(true);
    });

    it('should have appropriate selectors for Rockefeller Foundation website', () => {
      const config = scraper.getSourceConfig();
      
      expect(config.selectors.grantContainer).toContain('.grant-card');
      expect(config.selectors.title).toContain('.card-title');
      expect(config.selectors.description).toContain('.card-description');
      expect(config.selectors.applicationUrl).toContain('.apply-button');
    });

    it('should have proper headers for web scraping', () => {
      const config = scraper.getSourceConfig();
      
      expect(config.headers['Accept']).toContain('text/html');
      expect(config.headers['Accept-Language']).toBe('en-US,en;q=0.5');
      expect(config.headers['DNT']).toBe('1');
    });
  });

  describe('Scraping Process', () => {
    it('should successfully scrape grants using browser engine', async () => {
      const mockGrants: RawGrantData[] = [
        {
          title: 'Food Systems Transformation Initiative',
          description: 'Supporting innovative approaches to transform food systems',
          deadline: '2024-07-31',
          fundingAmount: '$2,000,000 - $5,000,000',
          eligibility: 'Organizations working on food systems transformation',
          applicationUrl: '/our-work/food-systems/',
          funderName: 'The Rockefeller Foundation',
          sourceUrl: 'https://www.rockefellerfoundation.org/grants/',
          scrapedAt: new Date(),
          rawContent: {}
        }
      ];

      mockBrowserEngine.scrape.mockResolvedValue(mockGrants);

      const result = await scraper.scrape();

      expect(mockBrowserEngine.scrape).toHaveBeenCalledWith(scraper.getSourceConfig());
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Food Systems Transformation Initiative');
      expect(result[0].funderName).toBe('The Rockefeller Foundation');
    });

    it('should fallback to static engine when browser scraping fails', async () => {
      const mockGrants: RawGrantData[] = [
        {
          title: 'Health Equity Program',
          description: 'Advancing health equity through community-driven solutions',
          deadline: '2024-09-30',
          fundingAmount: '$1,500,000 - $4,000,000',
          eligibility: 'Community health organizations',
          applicationUrl: 'https://www.rockefellerfoundation.org/health-equity/',
          funderName: 'The Rockefeller Foundation',
          sourceUrl: 'https://www.rockefellerfoundation.org/grants/',
          scrapedAt: new Date(),
          rawContent: {}
        }
      ];

      mockBrowserEngine.scrape.mockResolvedValue([]);
      mockStaticEngine.scrape.mockResolvedValue(mockGrants);

      const result = await scraper.scrape();

      expect(mockBrowserEngine.scrape).toHaveBeenCalled();
      expect(mockStaticEngine.scrape).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Health Equity Program');
    });

    it('should return sample grants when all scraping methods fail', async () => {
      mockBrowserEngine.scrape.mockResolvedValue([]);
      mockStaticEngine.scrape.mockResolvedValue([]);

      const result = await scraper.scrape();

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].funderName).toBe('The Rockefeller Foundation');
      expect(result[0].title).toContain('Food Systems');
    });

    it('should handle scraping errors gracefully', async () => {
      const error = new Error('Network error');
      mockBrowserEngine.scrape.mockRejectedValue(error);
      mockStaticEngine.scrape.mockRejectedValue(error);

      // The scraper should fall back to sample data when all scraping fails
      const result = await scraper.scrape();
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].funderName).toBe('The Rockefeller Foundation');
    });
  });

  describe('Custom Processing', () => {
    it('should enhance grants with Rockefeller Foundation specific data', async () => {
      const rawGrants: RawGrantData[] = [
        {
          title: 'Climate Resilience Program',
          description: 'Building climate resilience in vulnerable communities',
          deadline: '2024-10-20',
          fundingAmount: '$2,500,000',
          eligibility: 'Organizations working on climate adaptation',
          applicationUrl: '/climate-resilience/',
          funderName: 'The Rockefeller Foundation',
          sourceUrl: 'https://www.rockefellerfoundation.org/grants/',
          scrapedAt: new Date(),
          rawContent: {}
        }
      ];

      const result = await scraper.customProcessing(rawGrants);

      expect(result).toHaveLength(1);
      expect(result[0].funderName).toBe('The Rockefeller Foundation');
      expect(result[0].applicationUrl).toContain('https://www.rockefellerfoundation.org');
      expect(result[0].rawContent.inferredCategory).toBeDefined();
      expect(result[0].rawContent.rockefellerInitiative).toBeDefined();
      expect(result[0].rawContent.resilienceFocus).toBeDefined();
    });

    it('should filter out grants without titles', async () => {
      const rawGrants: RawGrantData[] = [
        {
          title: '',
          description: 'Grant without title',
          sourceUrl: 'https://www.rockefellerfoundation.org/grants/',
          scrapedAt: new Date(),
          rawContent: {}
        },
        {
          title: 'Valid Grant',
          description: 'Grant with title',
          sourceUrl: 'https://www.rockefellerfoundation.org/grants/',
          scrapedAt: new Date(),
          rawContent: {}
        }
      ];

      const result = await scraper.customProcessing(rawGrants);

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Valid Grant');
    });

    it('should properly format application URLs', async () => {
      const rawGrants: RawGrantData[] = [
        {
          title: 'Test Grant',
          description: 'Test description',
          applicationUrl: '/relative-url/',
          sourceUrl: 'https://www.rockefellerfoundation.org/grants/',
          scrapedAt: new Date(),
          rawContent: {}
        }
      ];

      const result = await scraper.customProcessing(rawGrants);

      expect(result[0].applicationUrl).toBe('https://www.rockefellerfoundation.org/relative-url/');
    });
  });

  describe('Category Inference', () => {
    it('should correctly infer health category', () => {
      const description = 'Health equity and community health initiatives for underserved populations';
      const category = (scraper as any).inferCategoryFromDescription(description);
      
      expect(category).toBe(GrantCategory.HEALTHCARE_PUBLIC_HEALTH);
    });

    it('should correctly infer environment category', () => {
      const description = 'Climate resilience and environmental sustainability programs';
      const category = (scraper as any).inferCategoryFromDescription(description);
      
      expect(category).toBe(GrantCategory.ENVIRONMENT_SUSTAINABILITY);
    });

    it('should correctly infer technology category', () => {
      const description = 'Digital equity and technology innovation for underserved communities';
      const category = (scraper as any).inferCategoryFromDescription(description);
      
      expect(category).toBe(GrantCategory.TECHNOLOGY_INNOVATION);
    });

    it('should default to community development for Rockefeller Foundation', () => {
      const category = (scraper as any).inferCategoryFromDescription('');
      
      expect(category).toBe(GrantCategory.COMMUNITY_DEVELOPMENT);
    });
  });

  describe('Rockefeller Initiative Identification', () => {
    it('should identify Food Systems Transformation initiative', () => {
      const description = 'Food security and sustainable agriculture for smallholder farmers';
      const initiative = (scraper as any).identifyRockefellerInitiative(description);
      
      expect(initiative).toBe('Food Systems Transformation');
    });

    it('should identify Health Equity initiative', () => {
      const description = 'Health equity and community health disparities programs';
      const initiative = (scraper as any).identifyRockefellerInitiative(description);
      
      expect(initiative).toBe('Health Equity');
    });

    it('should identify Economic Opportunity initiative', () => {
      const description = 'Economic opportunity and workforce development programs';
      const initiative = (scraper as any).identifyRockefellerInitiative(description);
      
      expect(initiative).toBe('Economic Opportunity');
    });

    it('should identify Climate Resilience initiative', () => {
      const description = 'Climate adaptation and environmental resilience building';
      const initiative = (scraper as any).identifyRockefellerInitiative(description);
      
      expect(initiative).toBe('Climate Resilience');
    });

    it('should identify Digital Equity initiative', () => {
      const description = 'Digital inclusion and technology access programs';
      const initiative = (scraper as any).identifyRockefellerInitiative(description);
      
      expect(initiative).toBe('Digital Equity');
    });
  });

  describe('Resilience Focus Identification', () => {
    it('should identify multiple resilience focus areas', () => {
      const text = 'Climate resilience and community resilience building initiatives';
      const focuses = (scraper as any).identifyResilienceFocus(text);
      
      expect(focuses).toContain('Climate Resilience');
      expect(focuses).toContain('Community Resilience');
    });

    it('should identify economic resilience', () => {
      const text = 'Building economic resilience in vulnerable communities';
      const focuses = (scraper as any).identifyResilienceFocus(text);
      
      expect(focuses).toContain('Economic Resilience');
    });

    it('should identify health system resilience', () => {
      const text = 'Strengthening health resilience and health systems';
      const focuses = (scraper as any).identifyResilienceFocus(text);
      
      expect(focuses).toContain('Health System Resilience');
    });
  });

  describe('Systems Approach Identification', () => {
    it('should identify systems thinking approaches', () => {
      const description = 'Systems thinking and systems change for root causes';
      const approaches = (scraper as any).identifySystemsApproach(description);
      
      expect(approaches).toContain('Systems Thinking');
      expect(approaches).toContain('Systems Change');
      expect(approaches).toContain('Root Cause Analysis');
    });

    it('should identify collaborative approaches', () => {
      const description = 'Collaborative and multi-sector approaches to complex challenges';
      const approaches = (scraper as any).identifySystemsApproach(description);
      
      expect(approaches).toContain('Collaborative Approach');
      expect(approaches).toContain('Multi-Sector Approach');
    });

    it('should identify ecosystem approaches', () => {
      const description = 'Ecosystem approach and network-based solutions';
      const approaches = (scraper as any).identifySystemsApproach(description);
      
      expect(approaches).toContain('Ecosystem Approach');
      expect(approaches).toContain('Network Approach');
    });
  });

  describe('Equity Focus Identification', () => {
    it('should identify multiple equity focus areas', () => {
      const text = 'Racial equity and health equity initiatives for social justice';
      const focuses = (scraper as any).identifyEquityFocus(text);
      
      expect(focuses).toContain('Racial Equity');
      expect(focuses).toContain('Health Equity');
      expect(focuses).toContain('Social Justice');
    });

    it('should identify digital equity', () => {
      const text = 'Digital equity and inclusion programs';
      const focuses = (scraper as any).identifyEquityFocus(text);
      
      expect(focuses).toContain('Digital Equity');
      expect(focuses).toContain('Inclusion');
    });

    it('should identify environmental justice', () => {
      const text = 'Environmental justice and equal access to resources';
      const focuses = (scraper as any).identifyEquityFocus(text);
      
      expect(focuses).toContain('Environmental Justice');
      expect(focuses).toContain('Equal Access');
    });
  });

  describe('Innovation Level Assessment', () => {
    it('should identify breakthrough innovation', () => {
      const description = 'Breakthrough solutions and cutting-edge approaches';
      const level = (scraper as any).assessInnovationLevel(description);
      
      expect(level).toBe('Breakthrough Innovation');
    });

    it('should identify high innovation', () => {
      const description = 'Innovative and pioneering approaches to complex challenges';
      const level = (scraper as any).assessInnovationLevel(description);
      
      expect(level).toBe('High Innovation');
    });

    it('should identify moderate innovation', () => {
      const description = 'New approach and creative solutions';
      const level = (scraper as any).assessInnovationLevel(description);
      
      expect(level).toBe('Moderate Innovation');
    });

    it('should identify proven approaches', () => {
      const description = 'Proven and evidence-based interventions';
      const level = (scraper as any).assessInnovationLevel(description);
      
      expect(level).toBe('Proven Approach');
    });
  });

  describe('Target Population Identification', () => {
    it('should identify vulnerable populations', () => {
      const text = 'Serving underserved and vulnerable communities';
      const populations = (scraper as any).identifyTargetPopulations(text);
      
      expect(populations).toContain('Underserved Communities');
      expect(populations).toContain('Vulnerable Populations');
    });

    it('should identify specific demographic groups', () => {
      const text = 'Programs for women, youth, and elderly populations';
      const populations = (scraper as any).identifyTargetPopulations(text);
      
      expect(populations).toContain('Women');
      expect(populations).toContain('Youth');
      expect(populations).toContain('Elderly');
    });

    it('should identify geographic communities', () => {
      const text = 'Supporting rural and urban communities';
      const populations = (scraper as any).identifyTargetPopulations(text);
      
      expect(populations).toContain('Rural Communities');
      expect(populations).toContain('Urban Communities');
    });

    it('should identify climate-vulnerable communities', () => {
      const text = 'Climate-vulnerable and frontline communities';
      const populations = (scraper as any).identifyTargetPopulations(text);
      
      expect(populations).toContain('Climate-Vulnerable Communities');
      expect(populations).toContain('Frontline Communities');
    });
  });

  describe('Description Enhancement', () => {
    it('should enhance short descriptions with context', () => {
      const shortDescription = 'Supporting communities';
      const title = 'Food Systems Initiative';
      const enhanced = (scraper as any).enhanceDescription(shortDescription, title);
      
      expect(enhanced.length).toBeGreaterThan(shortDescription.length);
      expect(enhanced).toContain('food systems');
    });

    it('should add appropriate context based on initiative', () => {
      const description = 'Health programs';
      const title = 'Health Equity Initiative';
      const enhanced = (scraper as any).enhanceDescription(description, title);
      
      expect(enhanced).toContain('health equity');
      expect(enhanced).toContain('social determinants');
    });
  });

  describe('Sample Grant Generation', () => {
    it('should generate realistic sample grants', () => {
      const samples = (scraper as any).generateSampleGrants();
      
      expect(samples.length).toBeGreaterThan(0);
      expect(samples[0].funderName).toBe('The Rockefeller Foundation');
      expect(samples[0].title).toBeDefined();
      expect(samples[0].description).toBeDefined();
      expect(samples[0].deadline).toBeDefined();
      expect(samples[0].fundingAmount).toBeDefined();
      expect(samples[0].eligibility).toBeDefined();
      expect(samples[0].applicationUrl).toBeDefined();
    });

    it('should include diverse initiative areas in samples', () => {
      const samples = (scraper as any).generateSampleGrants();
      const titles = samples.map((grant: RawGrantData) => grant.title);
      
      expect(titles.some((title: string) => title.includes('Food Systems'))).toBe(true);
      expect(titles.some((title: string) => title.includes('Health Equity'))).toBe(true);
      expect(titles.some((title: string) => title.includes('Economic Opportunity'))).toBe(true);
      expect(titles.some((title: string) => title.includes('Climate Resilience'))).toBe(true);
      expect(titles.some((title: string) => title.includes('Digital Equity'))).toBe(true);
      expect(titles.some((title: string) => title.includes('Systems Change'))).toBe(true);
    });

    it('should include appropriate funding amounts', () => {
      const samples = (scraper as any).generateSampleGrants();
      
      samples.forEach((grant: RawGrantData) => {
        expect(grant.fundingAmount).toMatch(/\$[\d,]+ - \$[\d,]+|\$[\d,]+/);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      const networkError = new Error('Network timeout');
      mockBrowserEngine.scrape.mockRejectedValue(networkError);
      mockStaticEngine.scrape.mockRejectedValue(networkError);

      // Should fall back to sample data instead of throwing
      const result = await scraper.scrape();
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].funderName).toBe('The Rockefeller Foundation');
    });

    it('should handle parsing errors gracefully', async () => {
      const parsingError = new Error('Invalid HTML structure');
      mockBrowserEngine.scrape.mockRejectedValue(parsingError);
      mockStaticEngine.scrape.mockRejectedValue(parsingError);

      // Should fall back to sample data instead of throwing
      const result = await scraper.scrape();
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].funderName).toBe('The Rockefeller Foundation');
    });
  });

  describe('Cleanup', () => {
    it('should cleanup resources without throwing errors', async () => {
      const mockClose = vi.fn();
      (scraper as any).staticEngine.close = mockClose;
      (scraper as any).browserEngine.close = mockClose;

      await expect(scraper.cleanup()).resolves.not.toThrow();
      expect(mockClose).toHaveBeenCalledTimes(2);
    });

    it('should handle cleanup errors gracefully', async () => {
      const mockClose = vi.fn().mockRejectedValue(new Error('Cleanup error'));
      (scraper as any).staticEngine.close = mockClose;
      (scraper as any).browserEngine.close = mockClose;

      await expect(scraper.cleanup()).resolves.not.toThrow();
    });
  });
});