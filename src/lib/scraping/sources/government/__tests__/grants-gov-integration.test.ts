/**
 * Integration tests for Grants.gov API scraper
 * These tests verify the complete workflow including data transformation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GrantsGovScraper } from '../grants-gov';
import { ScrapedSourceType, GrantCategory } from '../../../types';

// Mock environment variables
vi.mock('process', () => ({
  env: {
    GRANTS_GOV_API_KEY: 'test-api-key'
  }
}));

describe('GrantsGovScraper Integration Tests', () => {
  let scraper: GrantsGovScraper;

  beforeEach(() => {
    scraper = new GrantsGovScraper({
      maxResultsPerPage: 10,
      maxPages: 2
    });
  });

  describe('complete scraping workflow', () => {
    it('should handle a realistic API response structure', async () => {
      // Mock a realistic Grants.gov API response
      const mockRealisticResponse = {
        data: {
          oppHits: [
            {
              oppId: 'EPA-R9-SFUND-23-001',
              oppNumber: 'EPA-R9-SFUND-23-001',
              oppTitle: 'Superfund Technical Assistance Grant Program',
              oppDescription: 'The Superfund Technical Assistance Grant (TAG) program provides funding to community groups to hire independent technical advisors to help them understand technical information about the nature of hazardous substance contamination at Superfund sites and EPA\'s response to that contamination.',
              agencyName: 'Environmental Protection Agency',
              agencyCode: 'EPA',
              cfda: '66.806',
              cfdaDescription: 'Superfund Technical Assistance Grants',
              openDate: '2024-01-15T00:00:00.000Z',
              closeDate: '2024-03-15T23:59:59.000Z',
              awardCeiling: '50000',
              awardFloor: '10000',
              estimatedTotalProgramFunding: '2000000',
              expectedNumberOfAwards: '40',
              eligibilityCriteria: 'Eligible applicants are incorporated non-profit organizations and coalitions of incorporated non-profit organizations that represent affected communities at Superfund sites.',
              applicantTypes: [
                'Non-profit organizations',
                'Community-based organizations'
              ],
              fundingInstrumentTypes: [
                'Grant'
              ],
              categoryOfFundingActivity: 'Environmental Protection',
              categoryExplanation: 'Environmental cleanup and community assistance',
              version: '1',
              lastUpdatedDate: '2024-01-10T10:30:00.000Z',
              grantsGovLink: 'https://www.grants.gov/web/grants/view-opportunity.html?oppId=EPA-R9-SFUND-23-001'
            },
            {
              oppId: 'NSF-24-12345',
              oppNumber: 'NSF 24-12345',
              oppTitle: 'Research Infrastructure Improvement Program',
              oppDescription: 'This program aims to enhance research infrastructure at institutions in EPSCoR jurisdictions to increase their capacity to conduct nationally competitive research.',
              agencyName: 'National Science Foundation',
              agencyCode: 'NSF',
              cfda: '47.083',
              cfdaDescription: 'Research Infrastructure Improvement Program - Track-1',
              openDate: '2024-02-01T00:00:00.000Z',
              closeDate: '2024-05-01T17:00:00.000Z',
              awardCeiling: '20000000',
              awardFloor: '15000000',
              estimatedTotalProgramFunding: '100000000',
              expectedNumberOfAwards: '5',
              eligibilityCriteria: 'Institutions of higher education in EPSCoR jurisdictions are eligible to apply.',
              applicantTypes: [
                'Universities',
                'Colleges'
              ],
              fundingInstrumentTypes: [
                'Cooperative Agreement'
              ],
              categoryOfFundingActivity: 'Science and Technology',
              categoryExplanation: 'Research infrastructure development',
              version: '2',
              lastUpdatedDate: '2024-01-25T14:15:00.000Z'
            }
          ],
          hitCount: 2,
          totalHits: 2
        },
        status: 200
      };

      // Mock the HTTP client
      const mockHttpClient = {
        get: vi.fn().mockResolvedValue(mockRealisticResponse)
      };

      // Replace the HTTP client in the scraper
      (scraper as any).httpClient = mockHttpClient;

      const results = await scraper.scrape();

      // Verify we got the expected number of results
      expect(results).toHaveLength(2);

      // Test first grant (EPA Superfund)
      const epaGrant = results[0];
      expect(epaGrant.title).toBe('Superfund Technical Assistance Grant Program');
      expect(epaGrant.funderName).toBe('Environmental Protection Agency');
      expect(epaGrant.deadline).toBe('2024-03-15T23:59:59.000Z');
      expect(epaGrant.applicationUrl).toBe('https://www.grants.gov/web/grants/view-opportunity.html?oppId=EPA-R9-SFUND-23-001');
      
      // Test funding amount parsing
      expect(epaGrant.fundingAmount).toContain('$10000 - $50000');
      expect(epaGrant.fundingAmount).toContain('Total Program: $2000000');
      expect(epaGrant.fundingAmount).toContain('Expected Awards: 40');
      
      // Test eligibility parsing
      expect(epaGrant.eligibility).toContain('incorporated non-profit organizations');
      expect(epaGrant.eligibility).toContain('Eligible Applicants: Non-profit organizations, Community-based organizations');
      expect(epaGrant.eligibility).toContain('Funding Types: Grant');
      
      // Test description building
      expect(epaGrant.description).toContain('Technical Assistance Grant (TAG) program');
      expect(epaGrant.description).toContain('CFDA Program: Superfund Technical Assistance Grants');
      expect(epaGrant.description).toContain('Category: Environmental cleanup and community assistance');
      expect(epaGrant.description).toContain('CFDA Number: 66.806');
      
      // Test raw content preservation
      expect(epaGrant.rawContent.oppId).toBe('EPA-R9-SFUND-23-001');
      expect(epaGrant.rawContent.agencyCode).toBe('EPA');
      expect(epaGrant.rawContent.version).toBe('1');

      // Test second grant (NSF Research)
      const nsfGrant = results[1];
      expect(nsfGrant.title).toBe('Research Infrastructure Improvement Program');
      expect(nsfGrant.funderName).toBe('National Science Foundation');
      expect(nsfGrant.deadline).toBe('2024-05-01T17:00:00.000Z');
      
      // Test large funding amounts
      expect(nsfGrant.fundingAmount).toContain('$15000000 - $20000000');
      expect(nsfGrant.fundingAmount).toContain('Total Program: $100000000');
      expect(nsfGrant.fundingAmount).toContain('Expected Awards: 5');
      
      // Test different applicant types
      expect(nsfGrant.eligibility).toContain('Eligible Applicants: Universities, Colleges');
      expect(nsfGrant.eligibility).toContain('Funding Types: Cooperative Agreement');
      
      // Test default application URL generation
      expect(nsfGrant.applicationUrl).toContain('oppId=NSF-24-12345');
    });

    it('should handle edge cases in data transformation', async () => {
      const mockEdgeCaseResponse = {
        data: {
          oppHits: [
            {
              oppId: 'EDGE-CASE-001',
              oppTitle: '', // Empty title
              agencyName: '', // Empty agency
              awardCeiling: '0', // Zero funding
              closeDate: '', // Empty deadline
              eligibilityCriteria: null, // Null eligibility
              applicantTypes: [], // Empty array
              oppDescription: null // Null description
            },
            {
              oppId: 'EDGE-CASE-002',
              // Missing oppTitle
              agencyName: 'Test Agency',
              awardFloor: '1000000', // Only floor, no ceiling
              fundingInstrumentTypes: ['Grant', 'Contract', 'Cooperative Agreement'], // Multiple types
              categoryExplanation: 'Multiple\nLine\nDescription' // Multi-line text
            }
          ],
          hitCount: 2,
          totalHits: 2
        },
        status: 200
      };

      const mockHttpClient = {
        get: vi.fn().mockResolvedValue(mockEdgeCaseResponse)
      };

      (scraper as any).httpClient = mockHttpClient;

      const results = await scraper.scrape();

      expect(results).toHaveLength(2);

      // Test first edge case
      const edgeCase1 = results[0];
      expect(edgeCase1.title).toBe('Untitled Grant'); // Should default to 'Untitled Grant'
      expect(edgeCase1.funderName).toBe('Unknown Agency'); // Should default to 'Unknown Agency'
      expect(edgeCase1.fundingAmount).toContain('$0'); // Should handle zero funding
      expect(edgeCase1.eligibility).toBe(''); // Should handle null/empty eligibility
      expect(edgeCase1.description).toBe(''); // Should handle null description

      // Test second edge case
      const edgeCase2 = results[1];
      expect(edgeCase2.title).toBe('Untitled Grant'); // Missing title
      expect(edgeCase2.funderName).toBe('Test Agency');
      expect(edgeCase2.fundingAmount).toContain('From $1000000'); // Only floor amount
      expect(edgeCase2.eligibility).toContain('Grant, Contract, Cooperative Agreement'); // Multiple funding types
      expect(edgeCase2.description).toContain('Multiple\nLine\nDescription'); // Multi-line handling
    });

    it('should handle pagination correctly with multiple pages', async () => {
      const page1Response = {
        data: {
          oppHits: [
            {
              oppId: 'PAGE1-GRANT-001',
              oppTitle: 'Page 1 Grant 1',
              agencyName: 'Agency 1',
              closeDate: '2024-12-31'
            },
            {
              oppId: 'PAGE1-GRANT-002',
              oppTitle: 'Page 1 Grant 2',
              agencyName: 'Agency 1',
              closeDate: '2024-12-31'
            }
          ],
          hitCount: 2,
          totalHits: 4
        },
        status: 200
      };

      const page2Response = {
        data: {
          oppHits: [
            {
              oppId: 'PAGE2-GRANT-001',
              oppTitle: 'Page 2 Grant 1',
              agencyName: 'Agency 2',
              closeDate: '2024-12-31'
            },
            {
              oppId: 'PAGE2-GRANT-002',
              oppTitle: 'Page 2 Grant 2',
              agencyName: 'Agency 2',
              closeDate: '2024-12-31'
            }
          ],
          hitCount: 2,
          totalHits: 4
        },
        status: 200
      };

      const mockHttpClient = {
        get: vi.fn()
          .mockResolvedValueOnce(page1Response)
          .mockResolvedValueOnce(page2Response)
      };

      (scraper as any).httpClient = mockHttpClient;

      const paginatedScraper = new GrantsGovScraper({
        maxResultsPerPage: 2,
        maxPages: 2
      });
      (paginatedScraper as any).httpClient = mockHttpClient;

      const results = await paginatedScraper.scrape();

      expect(results).toHaveLength(4);
      expect(results[0].title).toBe('Page 1 Grant 1');
      expect(results[1].title).toBe('Page 1 Grant 2');
      expect(results[2].title).toBe('Page 2 Grant 1');
      expect(results[3].title).toBe('Page 2 Grant 2');

      // Verify pagination parameters
      expect(mockHttpClient.get).toHaveBeenCalledTimes(2);
      
      // Check first page parameters
      expect(mockHttpClient.get).toHaveBeenNthCalledWith(1, 
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({
            rows: '2',
            start: '0'
          })
        })
      );

      // Check second page parameters
      expect(mockHttpClient.get).toHaveBeenNthCalledWith(2,
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({
            rows: '2',
            start: '2'
          })
        })
      );
    });

    it('should handle network errors gracefully during pagination', async () => {
      const successResponse = {
        data: {
          oppHits: [
            {
              oppId: 'SUCCESS-GRANT-001',
              oppTitle: 'Successful Grant',
              agencyName: 'Success Agency',
              closeDate: '2024-12-31'
            }
          ],
          hitCount: 1,
          totalHits: 1 // Changed to 1 so pagination stops after first page
        },
        status: 200
      };

      const mockHttpClient = {
        get: vi.fn()
          .mockResolvedValueOnce(successResponse) // Page 0 succeeds
          .mockRejectedValueOnce(new Error('Network timeout')) // Page 1 fails (but won't be called due to totalHits)
      };

      (scraper as any).httpClient = mockHttpClient;

      const results = await scraper.scrape();

      // Should get results from successful page
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Successful Grant');
      
      // Should only call first page since totalHits = 1
      expect(mockHttpClient.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('source configuration', () => {
    it('should have correct source configuration', () => {
      const config = scraper.getConfiguration();
      
      expect(config.sourceConfig.id).toBe('grants-gov');
      expect(config.sourceConfig.type).toBe(ScrapedSourceType.GOV);
      expect(config.sourceConfig.engine).toBe('api');
      expect(config.sourceConfig.url).toBe('https://www.grants.gov/grantsws/rest/opportunities/search/');
      
      expect(config.sourceConfig.rateLimit.requestsPerMinute).toBe(30);
      expect(config.sourceConfig.rateLimit.delayBetweenRequests).toBe(2000);
      expect(config.sourceConfig.rateLimit.respectRobotsTxt).toBe(true);
      
      expect(config.sourceConfig.headers['Accept']).toBe('application/json');
      expect(config.sourceConfig.headers['Content-Type']).toBe('application/json');
      
      expect(config.sourceConfig.authentication?.type).toBe('apikey');
    });
  });

  describe('error handling', () => {
    it('should throw meaningful error for API failures', async () => {
      // Use default scraper with maxPages: 10
      const defaultScraper = new GrantsGovScraper();
      
      const mockHttpClient = {
        get: vi.fn()
          .mockRejectedValue(new Error('API service unavailable')) // Always reject
      };

      (defaultScraper as any).httpClient = mockHttpClient;

      await expect(defaultScraper.scrape()).rejects.toThrow('Grants.gov API scraping failed after 3 consecutive errors');
    });

    it('should handle HTTP error status codes', async () => {
      // Use default scraper with maxPages: 10
      const defaultScraper = new GrantsGovScraper();
      
      const mockHttpClient = {
        get: vi.fn()
          .mockResolvedValue({ status: 429, statusText: 'Too Many Requests' }) // Always return error status
      };

      (defaultScraper as any).httpClient = mockHttpClient;

      await expect(defaultScraper.scrape()).rejects.toThrow('Grants.gov API scraping failed after 3 consecutive errors');
    });
  });

  describe('data quality validation', () => {
    it('should preserve all important metadata in rawContent', async () => {
      const mockResponse = {
        data: {
          oppHits: [
            {
              oppId: 'METADATA-TEST-001',
              oppNumber: 'MT-2024-001',
              oppTitle: 'Metadata Test Grant',
              agencyName: 'Test Agency',
              agencyCode: 'TA',
              cfda: '12.345',
              cfdaDescription: 'Test CFDA',
              openDate: '2024-01-01',
              closeDate: '2024-12-31',
              awardCeiling: '100000',
              awardFloor: '50000',
              estimatedTotalProgramFunding: '1000000',
              expectedNumberOfAwards: '10',
              applicantTypes: ['Non-profit'],
              fundingInstrumentTypes: ['Grant'],
              categoryOfFundingActivity: 'Research',
              categoryExplanation: 'Basic research',
              version: '3',
              lastUpdatedDate: '2024-01-15'
            }
          ],
          hitCount: 1,
          totalHits: 1
        },
        status: 200
      };

      const mockHttpClient = {
        get: vi.fn().mockResolvedValue(mockResponse)
      };

      (scraper as any).httpClient = mockHttpClient;

      const results = await scraper.scrape();
      const grant = results[0];

      // Verify all metadata is preserved
      expect(grant.rawContent.oppId).toBe('METADATA-TEST-001');
      expect(grant.rawContent.oppNumber).toBe('MT-2024-001');
      expect(grant.rawContent.agencyCode).toBe('TA');
      expect(grant.rawContent.cfda).toBe('12.345');
      expect(grant.rawContent.cfdaDescription).toBe('Test CFDA');
      expect(grant.rawContent.openDate).toBe('2024-01-01');
      expect(grant.rawContent.awardCeiling).toBe('100000');
      expect(grant.rawContent.awardFloor).toBe('50000');
      expect(grant.rawContent.estimatedTotalProgramFunding).toBe('1000000');
      expect(grant.rawContent.expectedNumberOfAwards).toBe('10');
      expect(grant.rawContent.applicantTypes).toEqual(['Non-profit']);
      expect(grant.rawContent.fundingInstrumentTypes).toEqual(['Grant']);
      expect(grant.rawContent.categoryOfFundingActivity).toBe('Research');
      expect(grant.rawContent.categoryExplanation).toBe('Basic research');
      expect(grant.rawContent.version).toBe('3');
      expect(grant.rawContent.lastUpdatedDate).toBe('2024-01-15');
    });

    it('should generate consistent scrapedAt timestamps', async () => {
      const mockResponse = {
        data: {
          oppHits: [
            { oppId: '1', oppTitle: 'Grant 1', agencyName: 'Agency 1' },
            { oppId: '2', oppTitle: 'Grant 2', agencyName: 'Agency 2' }
          ],
          hitCount: 2,
          totalHits: 2
        },
        status: 200
      };

      const mockHttpClient = {
        get: vi.fn().mockResolvedValue(mockResponse)
      };

      (scraper as any).httpClient = mockHttpClient;

      const results = await scraper.scrape();

      expect(results).toHaveLength(2);
      
      // All grants should have scrapedAt timestamps
      results.forEach(grant => {
        expect(grant.scrapedAt).toBeInstanceOf(Date);
        expect(grant.scrapedAt.getTime()).toBeCloseTo(Date.now(), -3); // Within 1 second
      });
    });
  });
});