import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ScrapingOrchestrator } from '../core/orchestrator';
import { SourceManager } from '../core/source-manager';
import { StaticParserEngine } from '../engines/static-parser';
import { BrowserEngine } from '../engines/browser-engine';
import { APIClientEngine } from '../engines/api-client';
import { DataProcessor } from '../processors/data-processor';
import { ClassificationEngine } from '../processors/classifier';
import { DatabaseWriter } from '../database/database-writer';
import { 
  ScrapedSource, 
  SourceConfiguration,
  ScrapedSourceType,
  ScrapingFrequency,
  ScrapedSourceStatus,
  RawGrantData,
  GrantCategory
} from '../types';

// Mock external dependencies
vi.mock('../database/database-writer');

describe('Regression Tests for Scraping Engine Stability', () => {
  let orchestrator: ScrapingOrchestrator;
  let sourceManager: SourceManager;
  let staticParser: StaticParserEngine;
  let browserEngine: BrowserEngine;
  let apiClient: APIClientEngine;
  let dataProcessor: DataProcessor;
  let classificationEngine: ClassificationEngine;
  let mockDatabaseWriter: vi.Mocked<DatabaseWriter>;

  const mockSource: ScrapedSource = {
    id: 'regression-test-source',
    url: 'https://test-foundation.org/grants',
    type: ScrapedSourceType.FOUNDATION,
    lastScrapedAt: null,
    frequency: ScrapingFrequency.DAILY,
    status: ScrapedSourceStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockDatabaseWriter = vi.mocked(new DatabaseWriter());
    sourceManager = new SourceManager();
    staticParser = new StaticParserEngine();
    browserEngine = new BrowserEngine();
    apiClient = new APIClientEngine();
    dataProcessor = new DataProcessor();
    classificationEngine = new ClassificationEngine();
    
    // Setup default mock returns
    mockDatabaseWriter.batchInsertGrants.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Static Parser Engine Stability', () => {
    it('should handle malformed HTML gracefully', async () => {
      const malformedHtmlCases = [
        '<div><p>Unclosed paragraph<div>Nested without closing</div>',
        '<html><body><div class="grant">Grant Title</div></body>', // Missing closing html
        '<div class="grant"><h2>Title<p>Description</div>', // Mixed unclosed tags
        '<!DOCTYPE html><html><head><title>Test</title><body><div>Content</div></html>', // Missing closing tags
        '<div class="grant">Valid content</div><script>alert("xss")</script>', // Script injection attempt
        '<div class="grant">Content with &invalid; entities &amp; symbols</div>'
      ];

      const config: SourceConfiguration = {
        id: 'malformed-html-test',
        url: 'https://test.org',
        type: ScrapedSourceType.FOUNDATION,
        engine: 'static',
        selectors: {
          grantContainer: '.grant',
          title: 'h2, .title',
          description: 'p, .description',
          deadline: '.deadline',
          fundingAmount: '.amount',
          eligibility: '.eligibility',
          applicationUrl: '.apply-link',
          funderInfo: '.funder'
        },
        rateLimit: {
          requestsPerMinute: 10,
          delayBetweenRequests: 1000,
          respectRobotsTxt: true
        },
        headers: {}
      };

      for (const html of malformedHtmlCases) {
        // Mock HTTP response with malformed HTML
        vi.spyOn(staticParser as any, 'fetchPage').mockResolvedValueOnce(html);

        const result = await staticParser.scrape(config);
        
        // Should not throw errors and should return some result
        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
        // May return empty array for severely malformed HTML, but should not crash
      }
    });

    it('should handle missing selectors gracefully', async () => {
      const validHtml = `
        <html>
          <body>
            <div class="grant-item">
              <h2 class="grant-title">Test Grant</h2>
              <p class="grant-desc">Description here</p>
            </div>
          </body>
        </html>
      `;

      const configsWithMissingSelectors = [
        {
          ...mockSource,
          selectors: {
            grantContainer: '.nonexistent-container',
            title: '.grant-title',
            description: '.grant-desc',
            deadline: '.deadline',
            fundingAmount: '.amount',
            eligibility: '.eligibility',
            applicationUrl: '.apply-link',
            funderInfo: '.funder'
          }
        },
        {
          ...mockSource,
          selectors: {
            grantContainer: '.grant-item',
            title: '.nonexistent-title',
            description: '.grant-desc',
            deadline: '.deadline',
            fundingAmount: '.amount',
            eligibility: '.eligibility',
            applicationUrl: '.apply-link',
            funderInfo: '.funder'
          }
        }
      ];

      for (const config of configsWithMissingSelectors) {
        vi.spyOn(staticParser as any, 'fetchPage').mockResolvedValueOnce(validHtml);

        const result = await staticParser.scrape(config as SourceConfiguration);
        
        // Should handle missing elements gracefully
        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
      }
    });

    it('should maintain consistent performance across multiple runs', async () => {
      const html = `
        <html>
          <body>
            ${Array.from({ length: 100 }, (_, i) => `
              <div class="grant-item">
                <h2 class="grant-title">Grant ${i + 1}</h2>
                <p class="grant-desc">Description for grant ${i + 1}</p>
                <span class="deadline">2024-12-31</span>
                <span class="amount">$${(i + 1) * 1000}</span>
              </div>
            `).join('')}
          </body>
        </html>
      `;

      const config: SourceConfiguration = {
        id: 'performance-test',
        url: 'https://test.org',
        type: ScrapedSourceType.FOUNDATION,
        engine: 'static',
        selectors: {
          grantContainer: '.grant-item',
          title: '.grant-title',
          description: '.grant-desc',
          deadline: '.deadline',
          fundingAmount: '.amount',
          eligibility: '.eligibility',
          applicationUrl: '.apply-link',
          funderInfo: '.funder'
        },
        rateLimit: {
          requestsPerMinute: 10,
          delayBetweenRequests: 1000,
          respectRobotsTxt: true
        },
        headers: {}
      };

      const runTimes: number[] = [];
      const runResults: RawGrantData[][] = [];

      // Run the same scraping operation multiple times
      for (let i = 0; i < 5; i++) {
        vi.spyOn(staticParser as any, 'fetchPage').mockResolvedValueOnce(html);

        const startTime = Date.now();
        const result = await staticParser.scrape(config);
        const endTime = Date.now();

        runTimes.push(endTime - startTime);
        runResults.push(result);
      }

      // Performance should be consistent (within 50% variance)
      const avgTime = runTimes.reduce((a, b) => a + b, 0) / runTimes.length;
      const maxVariance = avgTime * 0.5;

      runTimes.forEach(time => {
        expect(Math.abs(time - avgTime)).toBeLessThan(maxVariance);
      });

      // Results should be consistent
      runResults.forEach(result => {
        expect(result).toHaveLength(100);
        expect(result[0].title).toBe('Grant 1');
        expect(result[99].title).toBe('Grant 100');
      });
    });
  });

  describe('Browser Engine Stability', () => {
    it('should handle JavaScript errors gracefully', async () => {
      const config: SourceConfiguration = {
        id: 'js-error-test',
        url: 'https://test.org',
        type: ScrapedSourceType.FOUNDATION,
        engine: 'browser',
        selectors: {
          grantContainer: '.grant',
          title: '.title',
          description: '.description',
          deadline: '.deadline',
          fundingAmount: '.amount',
          eligibility: '.eligibility',
          applicationUrl: '.apply-link',
          funderInfo: '.funder'
        },
        rateLimit: {
          requestsPerMinute: 10,
          delayBetweenRequests: 1000,
          respectRobotsTxt: true
        },
        headers: {}
      };

      // Mock browser page with JavaScript errors
      const mockPage = {
        goto: vi.fn().mockResolvedValue(undefined),
        waitForSelector: vi.fn().mockResolvedValue(undefined),
        evaluate: vi.fn().mockRejectedValue(new Error('JavaScript execution failed')),
        $$eval: vi.fn().mockResolvedValue([]),
        close: vi.fn().mockResolvedValue(undefined)
      };

      vi.spyOn(browserEngine as any, 'createStealthPage').mockResolvedValue(mockPage);

      const result = await browserEngine.scrape(config);
      
      // Should handle JS errors gracefully and not crash
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(mockPage.close).toHaveBeenCalled();
    });

    it('should handle network timeouts and retries', async () => {
      const config: SourceConfiguration = {
        id: 'timeout-test',
        url: 'https://slow-site.org',
        type: ScrapedSourceType.FOUNDATION,
        engine: 'browser',
        selectors: {
          grantContainer: '.grant',
          title: '.title',
          description: '.description',
          deadline: '.deadline',
          fundingAmount: '.amount',
          eligibility: '.eligibility',
          applicationUrl: '.apply-link',
          funderInfo: '.funder'
        },
        rateLimit: {
          requestsPerMinute: 10,
          delayBetweenRequests: 1000,
          respectRobotsTxt: true
        },
        headers: {}
      };

      let attemptCount = 0;
      const mockPage = {
        goto: vi.fn().mockImplementation(() => {
          attemptCount++;
          if (attemptCount <= 2) {
            throw new Error('Navigation timeout');
          }
          return Promise.resolve();
        }),
        waitForSelector: vi.fn().mockResolvedValue(undefined),
        $$eval: vi.fn().mockResolvedValue([]),
        close: vi.fn().mockResolvedValue(undefined)
      };

      vi.spyOn(browserEngine as any, 'createStealthPage').mockResolvedValue(mockPage);

      const result = await browserEngine.scrape(config);
      
      // Should retry and eventually succeed or fail gracefully
      expect(attemptCount).toBeGreaterThan(1); // Should have retried
      expect(result).toBeDefined();
      expect(mockPage.close).toHaveBeenCalled();
    });
  });

  describe('API Client Engine Stability', () => {
    it('should handle API rate limiting correctly', async () => {
      const config: SourceConfiguration = {
        id: 'api-rate-limit-test',
        url: 'https://api.test.org/grants',
        type: ScrapedSourceType.GOV,
        engine: 'api',
        selectors: {
          grantContainer: '',
          title: '',
          description: '',
          deadline: '',
          fundingAmount: '',
          eligibility: '',
          applicationUrl: '',
          funderInfo: ''
        },
        rateLimit: {
          requestsPerMinute: 5,
          delayBetweenRequests: 12000,
          respectRobotsTxt: true
        },
        headers: {
          'Authorization': 'Bearer test-token'
        }
      };

      let requestCount = 0;
      vi.spyOn(apiClient as any, 'makeRequest').mockImplementation(() => {
        requestCount++;
        if (requestCount <= 2) {
          throw new Error('Rate limit exceeded');
        }
        return Promise.resolve({
          data: [
            {
              title: 'API Grant',
              description: 'Grant from API',
              deadline: '2024-12-31'
            }
          ]
        });
      });

      const result = await apiClient.scrape(config);
      
      // Should handle rate limiting and retry
      expect(requestCount).toBeGreaterThan(1);
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle malformed API responses', async () => {
      const config: SourceConfiguration = {
        id: 'malformed-api-test',
        url: 'https://api.test.org/grants',
        type: ScrapedSourceType.GOV,
        engine: 'api',
        selectors: {
          grantContainer: '',
          title: '',
          description: '',
          deadline: '',
          fundingAmount: '',
          eligibility: '',
          applicationUrl: '',
          funderInfo: ''
        },
        rateLimit: {
          requestsPerMinute: 10,
          delayBetweenRequests: 1000,
          respectRobotsTxt: true
        },
        headers: {}
      };

      const malformedResponses = [
        null,
        undefined,
        '',
        '{"invalid": json}',
        '{"data": "not an array"}',
        '{"data": [{"incomplete": "grant"}]}',
        '{"error": "Internal server error"}'
      ];

      for (const response of malformedResponses) {
        vi.spyOn(apiClient as any, 'makeRequest').mockResolvedValueOnce(response);

        const result = await apiClient.scrape(config);
        
        // Should handle malformed responses gracefully
        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
      }
    });
  });

  describe('Data Processing Stability', () => {
    it('should handle edge cases in data processing', async () => {
      const edgeCaseGrants: RawGrantData[] = [
        {
          title: null as any, // Null title
          description: undefined as any, // Undefined description
          deadline: 'invalid-date',
          fundingAmount: 'NaN',
          eligibility: '',
          applicationUrl: 'not-a-url',
          funderName: '   ', // Whitespace only
          sourceUrl: 'https://test.org',
          scrapedAt: new Date(),
          rawContent: {}
        },
        {
          title: 'A'.repeat(1000), // Very long title
          description: 'B'.repeat(10000), // Very long description
          deadline: '9999-12-31', // Far future date
          fundingAmount: '$999,999,999,999', // Very large amount
          eligibility: 'C'.repeat(5000), // Very long eligibility
          applicationUrl: 'https://example.org/apply',
          funderName: 'Test Foundation',
          sourceUrl: 'https://test.org',
          scrapedAt: new Date(),
          rawContent: {}
        },
        {
          title: '🎓 Education Grant 💰', // Unicode characters
          description: 'Grant with émojis and spëcial characters',
          deadline: '2024-12-31',
          fundingAmount: '€50.000,00', // European number format
          eligibility: 'Organisations européennes',
          applicationUrl: 'https://example.org/apply',
          funderName: 'Fondation Européenne',
          sourceUrl: 'https://test.org',
          scrapedAt: new Date(),
          rawContent: {}
        }
      ];

      const result = await dataProcessor.processRawData(edgeCaseGrants);
      
      // Should process all grants without throwing errors
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeLessThanOrEqual(edgeCaseGrants.length);
      
      // Should handle null/undefined values
      result.forEach(grant => {
        expect(grant.title).toBeDefined();
        expect(grant.description).toBeDefined();
        expect(typeof grant.title).toBe('string');
        expect(typeof grant.description).toBe('string');
      });
    });

    it('should maintain classification consistency', async () => {
      const testGrant = {
        title: 'Medical Research Grant',
        description: 'Funding for cancer research and treatment development',
        deadline: new Date('2024-12-31'),
        fundingAmountMin: 50000,
        fundingAmountMax: 100000,
        eligibilityCriteria: 'Non-profit organizations',
        applicationUrl: 'https://example.org/apply',
        funder: {
          name: 'Health Foundation',
          website: 'https://health.org',
          contactEmail: 'grants@health.org'
        },
        category: GrantCategory.OTHER,
        locationEligibility: ['United States'],
        confidenceScore: 0.8,
        contentHash: 'test-hash'
      };

      const classifications = [];
      
      // Run classification multiple times
      for (let i = 0; i < 10; i++) {
        const result = await classificationEngine.classifyGrant(testGrant);
        classifications.push(result);
      }

      // Results should be consistent
      const firstCategory = classifications[0].category;
      const firstTags = classifications[0].tags.sort();
      
      classifications.forEach(classification => {
        expect(classification.category).toBe(firstCategory);
        expect(classification.tags.sort()).toEqual(firstTags);
        expect(classification.confidence).toBeCloseTo(classifications[0].confidence, 1);
      });
    });
  });

  describe('End-to-End Stability', () => {
    it('should handle complete workflow failures gracefully', async () => {
      const faultySource: ScrapedSource = {
        ...mockSource,
        url: 'https://nonexistent-site.invalid'
      };

      vi.spyOn(sourceManager, 'getActiveSource').mockRejectedValue(
        new Error('Source configuration not found')
      );

      // Should not throw unhandled errors
      await expect(orchestrator.processSource(faultySource)).rejects.toThrow();
      
      // But the system should remain stable for subsequent operations
      const workingSource: ScrapedSource = {
        ...mockSource,
        id: 'working-source'
      };

      const workingConfig: SourceConfiguration = {
        id: 'working-source',
        url: 'https://working-site.org',
        type: ScrapedSourceType.FOUNDATION,
        engine: 'static',
        selectors: {
          grantContainer: '.grant',
          title: '.title',
          description: '.description',
          deadline: '.deadline',
          fundingAmount: '.amount',
          eligibility: '.eligibility',
          applicationUrl: '.apply-link',
          funderInfo: '.funder'
        },
        rateLimit: {
          requestsPerMinute: 10,
          delayBetweenRequests: 1000,
          respectRobotsTxt: true
        },
        headers: {}
      };

      vi.spyOn(sourceManager, 'getActiveSource').mockResolvedValue(workingConfig);
      
      const mockEngine = {
        scrape: vi.fn().mockResolvedValue([
          {
            title: 'Recovery Test Grant',
            description: 'Testing system recovery',
            deadline: '2024-12-31',
            fundingAmount: '$50,000',
            eligibility: 'Non-profits',
            applicationUrl: 'https://example.org/apply',
            funderName: 'Test Foundation',
            sourceUrl: 'https://working-site.org',
            scrapedAt: new Date(),
            rawContent: {}
          }
        ])
      };
      
      vi.doMock('../engines', () => ({
        createScrapingEngine: vi.fn().mockReturnValue(mockEngine)
      }));

      const result = await orchestrator.processSource(workingSource);
      
      // System should recover and work normally
      expect(result).toBeDefined();
      expect(result.totalFound).toBe(1);
    });

    it('should maintain data integrity under concurrent load', async () => {
      const sources = Array.from({ length: 20 }, (_, i) => ({
        ...mockSource,
        id: `concurrent-source-${i}`,
        url: `https://source-${i}.org`
      }));

      // Mock successful configurations for all sources
      sources.forEach(source => {
        vi.spyOn(sourceManager, 'getActiveSource').mockResolvedValueOnce({
          id: source.id,
          url: source.url,
          type: ScrapedSourceType.FOUNDATION,
          engine: 'static',
          selectors: {
            grantContainer: '.grant',
            title: '.title',
            description: '.description',
            deadline: '.deadline',
            fundingAmount: '.amount',
            eligibility: '.eligibility',
            applicationUrl: '.apply-link',
            funderInfo: '.funder'
          },
          rateLimit: {
            requestsPerMinute: 10,
            delayBetweenRequests: 1000,
            respectRobotsTxt: true
          },
          headers: {}
        });
      });

      const mockEngine = {
        scrape: vi.fn().mockImplementation((config: SourceConfiguration) => 
          Promise.resolve([
            {
              title: `Grant from ${config.id}`,
              description: 'Test grant description',
              deadline: '2024-12-31',
              fundingAmount: '$50,000',
              eligibility: 'Non-profits',
              applicationUrl: 'https://example.org/apply',
              funderName: 'Test Foundation',
              sourceUrl: config.url,
              scrapedAt: new Date(),
              rawContent: { sourceId: config.id }
            }
          ])
        )
      };
      
      vi.doMock('../engines', () => ({
        createScrapingEngine: vi.fn().mockReturnValue(mockEngine)
      }));

      const results = await Promise.allSettled(
        sources.map(source => orchestrator.processSource(source))
      );

      // All operations should complete successfully
      const successfulResults = results.filter(r => r.status === 'fulfilled');
      expect(successfulResults.length).toBe(sources.length);

      // Data integrity should be maintained
      successfulResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          expect(result.value.sourceId).toBe(sources[index].id);
          expect(result.value.totalFound).toBe(1);
          expect(result.value.errors).toHaveLength(0);
        }
      });
    });
  });
});