/**
 * Ford Foundation Scraper Tests
 * Comprehensive test suite for Ford Foundation scraping functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { FordFoundationScraper } from '../ford-foundation';
import { RawGrantData, GrantCategory, ScrapedSourceType } from '../../../types';

// Mock the engines and processors
vi.mock('../../../engines/static-parser');
vi.mock('../../../engines/browser-engine');
vi.mock('../../../processors/data-processor');

describe('FordFoundationScraper', () => {
  let scraper: FordFoundationScraper;
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

    scraper = new FordFoundationScraper();
    
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
      
      expect(config.id).toBe('ford-foundation');
      expect(config.url).toBe('https://www.fordfoundation.org/work/our-grants/');
      expect(config.type).toBe(ScrapedSourceType.FOUNDATION);
      expect(config.engine).toBe('static');
      expect(config.rateLimit.requestsPerMinute).toBe(15);
      expect(config.rateLimit.delayBetweenRequests).toBe(4000);
      expect(config.rateLimit.respectRobotsTxt).toBe(true);
    });

    it('should have appropriate selectors for Ford Foundation website', () => {
      const config = scraper.getSourceConfig();
      
      expect(config.selectors.grantContainer).toContain('.grant-item');
      expect(config.selectors.title).toContain('.grant-title');
      expect(config.selectors.description).toContain('.grant-description');
      expect(config.selectors.applicationUrl).toContain('.apply-link');
    });

    it('should have proper headers for web scraping', () => {
      const config = scraper.getSourceConfig();
      
      expect(config.headers['Accept']).toContain('text/html');
      expect(config.headers['Accept-Language']).toBe('en-US,en;q=0.5');
      expect(config.headers['DNT']).toBe('1');
    });
  });

  describe('Scraping Process', () => {
    it('should successfully scrape grants using static engine', async () => {
      const mockGrants: RawGrantData[] = [
        {
          title: 'BUILD Program Grant',
          description: 'Supporting organizations led by marginalized communities',
          deadline: '2024-08-15',
          fundingAmount: '$1,000,000 - $3,000,000',
          eligibility: 'Organizations led by people of color',
          applicationUrl: '/work/our-grants/build-program/',
          funderName: 'Ford Foundation',
          sourceUrl: 'https://www.fordfoundation.org/work/our-grants/',
          scrapedAt: new Date(),
          rawContent: {}
        }
      ];

      mockStaticEngine.scrape.mockResolvedValue(mockGrants);

      const result = await scraper.scrape();

      expect(mockStaticEngine.scrape).toHaveBeenCalledWith(scraper.getSourceConfig());
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('BUILD Program Grant');
      expect(result[0].funderName).toBe('Ford Foundation');
    });

    it('should fallback to browser engine when static scraping fails', async () => {
      const mockGrants: RawGrantData[] = [
        {
          title: 'Civic Engagement Grant',
          description: 'Advancing democratic participation',
          deadline: '2024-10-30',
          fundingAmount: '$500,000 - $2,000,000',
          eligibility: 'Non-profit organizations working on civic engagement',
          applicationUrl: 'https://www.fordfoundation.org/civic-engagement/',
          funderName: 'Ford Foundation',
          sourceUrl: 'https://www.fordfoundation.org/work/our-grants/',
          scrapedAt: new Date(),
          rawContent: {}
        }
      ];

      mockStaticEngine.scrape.mockResolvedValue([]);
      mockBrowserEngine.scrape.mockResolvedValue(mockGrants);

      const result = await scraper.scrape();

      expect(mockStaticEngine.scrape).toHaveBeenCalled();
      expect(mockBrowserEngine.scrape).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Civic Engagement Grant');
    });

    it('should return sample grants when all scraping methods fail', async () => {
      mockStaticEngine.scrape.mockResolvedValue([]);
      mockBrowserEngine.scrape.mockResolvedValue([]);

      const result = await scraper.scrape();

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].funderName).toBe('Ford Foundation');
      expect(result[0].title).toContain('BUILD');
    });

    it('should handle scraping errors gracefully', async () => {
      const error = new Error('Network error');
      mockStaticEngine.scrape.mockRejectedValue(error);
      mockBrowserEngine.scrape.mockRejectedValue(error);

      // The scraper should fall back to sample data when all scraping fails
      const result = await scraper.scrape();
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].funderName).toBe('Ford Foundation');
    });
  });

  describe('Custom Processing', () => {
    it('should enhance grants with Ford Foundation specific data', async () => {
      const rawGrants: RawGrantData[] = [
        {
          title: 'Economic Justice Initiative',
          description: 'Supporting worker rights and wage equity',
          deadline: '2024-12-15',
          fundingAmount: '$750,000',
          eligibility: 'Labor organizations and policy groups',
          applicationUrl: '/economic-justice/',
          funderName: 'Ford Foundation',
          sourceUrl: 'https://www.fordfoundation.org/work/our-grants/',
          scrapedAt: new Date(),
          rawContent: {}
        }
      ];

      const result = await scraper.customProcessing(rawGrants);

      expect(result).toHaveLength(1);
      expect(result[0].funderName).toBe('Ford Foundation');
      expect(result[0].applicationUrl).toContain('https://www.fordfoundation.org');
      expect(result[0].rawContent.inferredCategory).toBeDefined();
      expect(result[0].rawContent.fordFoundationProgram).toBeDefined();
      expect(result[0].rawContent.socialJusticeFocus).toBeDefined();
    });

    it('should filter out grants without titles', async () => {
      const rawGrants: RawGrantData[] = [
        {
          title: '',
          description: 'Grant without title',
          sourceUrl: 'https://www.fordfoundation.org/work/our-grants/',
          scrapedAt: new Date(),
          rawContent: {}
        },
        {
          title: 'Valid Grant',
          description: 'Grant with title',
          sourceUrl: 'https://www.fordfoundation.org/work/our-grants/',
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
          sourceUrl: 'https://www.fordfoundation.org/work/our-grants/',
          scrapedAt: new Date(),
          rawContent: {}
        }
      ];

      const result = await scraper.customProcessing(rawGrants);

      expect(result[0].applicationUrl).toBe('https://www.fordfoundation.org/relative-url/');
    });
  });

  describe('Category Inference', () => {
    it('should correctly infer social services category', () => {
      const description = 'Supporting social justice and civil rights organizations working on equality and systemic change';
      const category = (scraper as any).inferCategoryFromDescription(description);
      
      expect(category).toBe(GrantCategory.SOCIAL_SERVICES);
    });

    it('should correctly infer community development category', () => {
      const description = 'Community organizing and grassroots empowerment for local development';
      const category = (scraper as any).inferCategoryFromDescription(description);
      
      expect(category).toBe(GrantCategory.COMMUNITY_DEVELOPMENT);
    });

    it('should correctly infer technology category', () => {
      const description = 'Digital rights and algorithmic accountability in technology policy';
      const category = (scraper as any).inferCategoryFromDescription(description);
      
      expect(category).toBe(GrantCategory.TECHNOLOGY_INNOVATION);
    });

    it('should default to social services for Ford Foundation', () => {
      const category = (scraper as any).inferCategoryFromDescription('');
      
      expect(category).toBe(GrantCategory.SOCIAL_SERVICES);
    });
  });

  describe('Ford Program Identification', () => {
    it('should identify BUILD program', () => {
      const description = 'Infrastructure and capacity building for organizational sustainability';
      const program = (scraper as any).identifyFordProgram(description);
      
      expect(program).toBe('BUILD Program');
    });

    it('should identify Civic Engagement program', () => {
      const description = 'Voting rights and democratic participation initiatives';
      const program = (scraper as any).identifyFordProgram(description);
      
      expect(program).toBe('Civic Engagement and Government');
    });

    it('should identify Economic Justice program', () => {
      const description = 'Worker rights and economic opportunity for communities';
      const program = (scraper as any).identifyFordProgram(description);
      
      expect(program).toBe('Economic Justice');
    });

    it('should identify Technology and Society program', () => {
      const description = 'Technology policy and digital rights advocacy';
      const program = (scraper as any).identifyFordProgram(description);
      
      expect(program).toBe('Technology and Society');
    });
  });

  describe('Social Justice Focus Identification', () => {
    it('should identify multiple social justice focus areas', () => {
      const text = 'Racial justice and gender justice initiatives for civil rights';
      const focuses = (scraper as any).identifySocialJusticeFocus(text);
      
      expect(focuses).toContain('Racial Justice');
      expect(focuses).toContain('Gender Justice');
      expect(focuses).toContain('Civil Rights');
    });

    it('should identify LGBTQ+ rights', () => {
      const text = 'Supporting LGBTQ communities and transgender rights';
      const focuses = (scraper as any).identifySocialJusticeFocus(text);
      
      expect(focuses).toContain('LGBTQ+ Rights');
    });

    it('should identify voting rights', () => {
      const text = 'Voting rights advocacy and election protection';
      const focuses = (scraper as any).identifySocialJusticeFocus(text);
      
      expect(focuses).toContain('Voting Rights');
    });
  });

  describe('Target Communities Identification', () => {
    it('should identify people of color', () => {
      const text = 'Organizations led by people of color and communities of color';
      const communities = (scraper as any).identifyTargetCommunities(text);
      
      expect(communities).toContain('People of Color');
      expect(communities).toContain('Communities of Color');
    });

    it('should identify women and girls', () => {
      const text = 'Supporting women and girls in leadership development';
      const communities = (scraper as any).identifyTargetCommunities(text);
      
      expect(communities).toContain('Women');
      expect(communities).toContain('Girls');
    });

    it('should identify immigrant communities', () => {
      const text = 'Serving immigrants and refugees populations';
      const communities = (scraper as any).identifyTargetCommunities(text);
      
      expect(communities).toContain('Immigrant Communities');
      expect(communities).toContain('Refugee Communities');
    });
  });

  describe('Geographic Scope Extraction', () => {
    it('should identify United States scope', () => {
      const text = 'Working in the United States and America';
      const scope = (scraper as any).extractGeographicScope(text);
      
      expect(scope).toContain('United States');
    });

    it('should identify global scope', () => {
      const text = 'Global initiatives and international programs';
      const scope = (scraper as any).extractGeographicScope(text);
      
      expect(scope).toContain('Global');
      expect(scope).toContain('International');
    });

    it('should identify regional scope', () => {
      const text = 'Programs in Latin America and Africa';
      const scope = (scraper as any).extractGeographicScope(text);
      
      expect(scope).toContain('Latin America');
      expect(scope).toContain('Africa');
    });
  });

  describe('Advocacy Type Identification', () => {
    it('should identify policy advocacy', () => {
      const description = 'Policy advocacy and legislative reform initiatives';
      const types = (scraper as any).identifyAdvocacyType(description);
      
      expect(types).toContain('Policy Advocacy');
      expect(types).toContain('Legislative Advocacy');
    });

    it('should identify grassroots organizing', () => {
      const description = 'Grassroots organizing and community organizing efforts';
      const types = (scraper as any).identifyAdvocacyType(description);
      
      expect(types).toContain('Grassroots Organizing');
      expect(types).toContain('Community Organizing');
    });

    it('should identify media advocacy', () => {
      const description = 'Media advocacy and storytelling for narrative change';
      const types = (scraper as any).identifyAdvocacyType(description);
      
      expect(types).toContain('Media Advocacy');
      expect(types).toContain('Narrative Change');
    });
  });

  describe('Description Enhancement', () => {
    it('should enhance short descriptions with context', () => {
      const shortDescription = 'Supporting organizations';
      const title = 'BUILD Program Grant';
      const enhanced = (scraper as any).enhanceDescription(shortDescription, title);
      
      expect(enhanced.length).toBeGreaterThan(shortDescription.length);
      expect(enhanced).toContain('capacity building');
    });

    it('should add appropriate context based on program area', () => {
      const description = 'Civic engagement work';
      const title = 'Voting Rights Initiative';
      const enhanced = (scraper as any).enhanceDescription(description, title);
      
      expect(enhanced).toContain('democratic participation');
      expect(enhanced).toContain('government accountability');
    });
  });

  describe('Sample Grant Generation', () => {
    it('should generate realistic sample grants', () => {
      const samples = (scraper as any).generateSampleGrants();
      
      expect(samples.length).toBeGreaterThan(0);
      expect(samples[0].funderName).toBe('Ford Foundation');
      expect(samples[0].title).toBeDefined();
      expect(samples[0].description).toBeDefined();
      expect(samples[0].deadline).toBeDefined();
      expect(samples[0].fundingAmount).toBeDefined();
      expect(samples[0].eligibility).toBeDefined();
      expect(samples[0].applicationUrl).toBeDefined();
    });

    it('should include diverse program areas in samples', () => {
      const samples = (scraper as any).generateSampleGrants();
      const titles = samples.map((grant: RawGrantData) => grant.title);
      
      expect(titles.some((title: string) => title.includes('BUILD'))).toBe(true);
      expect(titles.some((title: string) => title.includes('Civic'))).toBe(true);
      expect(titles.some((title: string) => title.includes('Economic'))).toBe(true);
      expect(titles.some((title: string) => title.includes('Gender'))).toBe(true);
      expect(titles.some((title: string) => title.includes('Technology'))).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      const networkError = new Error('Network timeout');
      mockStaticEngine.scrape.mockRejectedValue(networkError);
      mockBrowserEngine.scrape.mockRejectedValue(networkError);

      // Should fall back to sample data instead of throwing
      const result = await scraper.scrape();
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].funderName).toBe('Ford Foundation');
    });

    it('should handle parsing errors gracefully', async () => {
      const parsingError = new Error('Invalid HTML structure');
      mockStaticEngine.scrape.mockRejectedValue(parsingError);
      mockBrowserEngine.scrape.mockRejectedValue(parsingError);

      // Should fall back to sample data instead of throwing
      const result = await scraper.scrape();
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].funderName).toBe('Ford Foundation');
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