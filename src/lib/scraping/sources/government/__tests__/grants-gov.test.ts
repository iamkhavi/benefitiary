/**
 * Unit tests for Grants.gov API scraper
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { GrantsGovScraper } from '../grants-gov';
import { HTTPClient } from '../../../utils/http-client';
import { ScrapedSourceType } from '../../../types';

// Mock the HTTPClient
vi.mock('../../../utils/http-client', () => ({
  HTTPClient: vi.fn(),
  createDefaultHTTPClientConfig: vi.fn(() => ({
    timeout: 30000,
    retries: 3,
    userAgents: ['test-agent'],
    proxies: [],
    rateLimit: {
      requestsPerMinute: 30,
      delayBetweenRequests: 2000,
      respectRobotsTxt: true
    },
    headers: {}
  }))
}));

describe('GrantsGovScraper', () => {
  let scraper: GrantsGovScraper;
  let mockHttpClient: {
    get: Mock;
  };

  beforeEach(() => {
    mockHttpClient = {
      get: vi.fn()
    };
    
    (HTTPClient as any).mockImplementation(() => mockHttpClient);
    scraper = new GrantsGovScraper();
  });

  describe('constructor', () => {
    it('should initialize with default configuration', () => {
      const config = scraper.getConfiguration();
      
      expect(config.baseUrl).toBe('https://www.grants.gov/grantsws/rest/opportunities/search/');
      expect(config.maxResultsPerPage).toBe(1000);
      expect(config.maxPages).toBe(10);
      expect(config.sourceConfig.type).toBe(ScrapedSourceType.GOV);
    });

    it('should accept custom configuration', () => {
      const customScraper = new GrantsGovScraper({
        maxResultsPerPage: 500,
        maxPages: 5
      });
      
      const config = customScraper.getConfiguration();
      expect(config.maxResultsPerPage).toBe(500);
      expect(config.maxPages).toBe(5);
    });
  });

  describe('scrape', () => {
    it('should successfully scrape grants from API', async () => {
      const mockApiResponse = {
        data: {
          oppHits: [
            {
              oppId: '12345',
              oppNumber: 'TEST-001',
              oppTitle: 'Test Grant Opportunity',
              oppDescription: 'A test grant for research',
              agencyName: 'Test Agency',
              agencyCode: 'TA',
              openDate: '2024-01-01',
              closeDate: '2024-12-31',
              awardCeiling: '100000',
              awardFloor: '50000',
              eligibilityCriteria: 'Non-profit organizations',
              applicantTypes: ['Non-profit'],
              cfda: '12.345',
              cfdaDescription: 'Test CFDA Program'
            }
          ],
          hitCount: 1,
          totalHits: 1
        },
        status: 200
      };

      mockHttpClient.get.mockResolvedValue(mockApiResponse);

      const results = await scraper.scrape();

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Test Grant Opportunity');
      expect(results[0].description).toContain('A test grant for research');
      expect(results[0].funderName).toBe('Test Agency');
      expect(results[0].deadline).toBe('2024-12-31');
      expect(results[0].fundingAmount).toContain('$50000 - $100000');
      expect(results[0].eligibility).toContain('Non-profit organizations');
      expect(results[0].rawContent.oppId).toBe('12345');
    });

    it('should handle pagination correctly', async () => {
      const page1Response = {
        data: {
          oppHits: [
            {
              oppId: '1',
              oppTitle: 'Grant 1',
              agencyName: 'Agency 1',
              openDate: '2024-01-01',
              closeDate: '2024-12-31'
            }
          ],
          hitCount: 1,
          totalHits: 2
        },
        status: 200
      };

      const page2Response = {
        data: {
          oppHits: [
            {
              oppId: '2',
              oppTitle: 'Grant 2',
              agencyName: 'Agency 2',
              openDate: '2024-01-01',
              closeDate: '2024-12-31'
            }
          ],
          hitCount: 1,
          totalHits: 2
        },
        status: 200
      };

      mockHttpClient.get
        .mockResolvedValueOnce(page1Response)
        .mockResolvedValueOnce(page2Response);

      const customScraper = new GrantsGovScraper({ maxResultsPerPage: 1 });
      const results = await customScraper.scrape();

      expect(results).toHaveLength(2);
      expect(results[0].title).toBe('Grant 1');
      expect(results[1].title).toBe('Grant 2');
      expect(mockHttpClient.get).toHaveBeenCalledTimes(2);
    });

    it('should handle empty API response', async () => {
      const mockApiResponse = {
        data: {
          oppHits: [],
          hitCount: 0,
          totalHits: 0
        },
        status: 200
      };

      mockHttpClient.get.mockResolvedValue(mockApiResponse);

      const results = await scraper.scrape();

      expect(results).toHaveLength(0);
    });

    it('should handle API errors gracefully', async () => {
      mockHttpClient.get.mockRejectedValue(new Error('Network error'));

      await expect(scraper.scrape()).rejects.toThrow('Grants.gov API scraping failed');
    });

    it('should handle HTTP error status codes', async () => {
      mockHttpClient.get.mockResolvedValue({
        status: 500,
        statusText: 'Internal Server Error'
      });

      await expect(scraper.scrape()).rejects.toThrow('Grants.gov API scraping failed');
    });

    it('should continue scraping after individual page errors', async () => {
      const successResponse = {
        data: {
          oppHits: [
            {
              oppId: '1',
              oppTitle: 'Grant 1',
              agencyName: 'Agency 1',
              openDate: '2024-01-01',
              closeDate: '2024-12-31'
            }
          ],
          hitCount: 1,
          totalHits: 1
        },
        status: 200
      };

      mockHttpClient.get
        .mockRejectedValueOnce(new Error('Page 1 error'))
        .mockResolvedValueOnce(successResponse);

      const results = await scraper.scrape();

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Grant 1');
    });
  });

  describe('data transformation', () => {
    it('should transform complete opportunity data correctly', async () => {
      const mockApiResponse = {
        data: {
          oppHits: [
            {
              oppId: '12345',
              oppNumber: 'TEST-001',
              oppTitle: 'Complete Test Grant',
              oppDescription: 'Detailed grant description',
              agencyName: 'Test Agency',
              agencyCode: 'TA',
              cfda: '12.345',
              cfdaDescription: 'Test CFDA Program Description',
              openDate: '2024-01-01',
              closeDate: '2024-12-31',
              awardCeiling: '100000',
              awardFloor: '50000',
              estimatedTotalProgramFunding: '1000000',
              expectedNumberOfAwards: '10',
              eligibilityCriteria: 'Eligible organizations include non-profits',
              applicantTypes: ['Non-profit', 'University'],
              fundingInstrumentTypes: ['Grant', 'Cooperative Agreement'],
              categoryOfFundingActivity: 'Research',
              categoryExplanation: 'Basic and applied research',
              grantsGovLink: 'https://grants.gov/opportunity/12345'
            }
          ],
          hitCount: 1,
          totalHits: 1
        },
        status: 200
      };

      mockHttpClient.get.mockResolvedValue(mockApiResponse);

      const results = await scraper.scrape();
      const grant = results[0];

      expect(grant.title).toBe('Complete Test Grant');
      expect(grant.description).toContain('Detailed grant description');
      expect(grant.description).toContain('CFDA Program: Test CFDA Program Description');
      expect(grant.description).toContain('Category: Basic and applied research');
      expect(grant.description).toContain('CFDA Number: 12.345');
      
      expect(grant.fundingAmount).toContain('$50000 - $100000');
      expect(grant.fundingAmount).toContain('Total Program: $1000000');
      expect(grant.fundingAmount).toContain('Expected Awards: 10');
      
      expect(grant.eligibility).toContain('Eligible organizations include non-profits');
      expect(grant.eligibility).toContain('Eligible Applicants: Non-profit, University');
      expect(grant.eligibility).toContain('Funding Types: Grant, Cooperative Agreement');
      
      expect(grant.applicationUrl).toBe('https://grants.gov/opportunity/12345');
      expect(grant.funderName).toBe('Test Agency');
      
      expect(grant.rawContent.oppId).toBe('12345');
      expect(grant.rawContent.cfda).toBe('12.345');
    });

    it('should handle minimal opportunity data', async () => {
      const mockApiResponse = {
        data: {
          oppHits: [
            {
              oppId: '12345',
              oppTitle: 'Minimal Grant',
              agencyName: 'Test Agency'
            }
          ],
          hitCount: 1,
          totalHits: 1
        },
        status: 200
      };

      mockHttpClient.get.mockResolvedValue(mockApiResponse);

      const results = await scraper.scrape();
      const grant = results[0];

      expect(grant.title).toBe('Minimal Grant');
      expect(grant.funderName).toBe('Test Agency');
      expect(grant.applicationUrl).toContain('oppId=12345');
      expect(grant.fundingAmount).toBe('');
      expect(grant.eligibility).toBe('');
    });

    it('should handle missing title gracefully', async () => {
      const mockApiResponse = {
        data: {
          oppHits: [
            {
              oppId: '12345',
              agencyName: 'Test Agency'
            }
          ],
          hitCount: 1,
          totalHits: 1
        },
        status: 200
      };

      mockHttpClient.get.mockResolvedValue(mockApiResponse);

      const results = await scraper.scrape();
      const grant = results[0];

      expect(grant.title).toBe('Untitled Grant');
      expect(grant.funderName).toBe('Test Agency');
    });
  });

  describe('testConnection', () => {
    it('should return true for successful connection', async () => {
      mockHttpClient.get.mockResolvedValue({
        status: 200,
        data: { oppHits: [] }
      });

      const result = await scraper.testConnection();

      expect(result).toBe(true);
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: {
            format: 'json',
            rows: '1',
            start: '0'
          },
          timeout: 10000
        })
      );
    });

    it('should return false for failed connection', async () => {
      mockHttpClient.get.mockRejectedValue(new Error('Connection failed'));

      const result = await scraper.testConnection();

      expect(result).toBe(false);
    });
  });

  describe('API parameters', () => {
    it('should include correct API parameters in requests', async () => {
      const mockApiResponse = {
        data: { oppHits: [], hitCount: 0, totalHits: 0 },
        status: 200
      };

      mockHttpClient.get.mockResolvedValue(mockApiResponse);

      await scraper.scrape();

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        'https://www.grants.gov/grantsws/rest/opportunities/search/',
        expect.objectContaining({
          params: {
            format: 'json',
            rows: '1000',
            start: '0',
            oppStatus: 'forecasted|posted',
            sortBy: 'openDate|desc'
          }
        })
      );
    });

    it('should include API key when provided', async () => {
      process.env.GRANTS_GOV_API_KEY = 'test-api-key';
      
      const scraperWithKey = new GrantsGovScraper();
      const mockApiResponse = {
        data: { oppHits: [], hitCount: 0, totalHits: 0 },
        status: 200
      };

      mockHttpClient.get.mockResolvedValue(mockApiResponse);

      await scraperWithKey.scrape();

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({
            api_key: 'test-api-key'
          })
        })
      );

      delete process.env.GRANTS_GOV_API_KEY;
    });
  });
});