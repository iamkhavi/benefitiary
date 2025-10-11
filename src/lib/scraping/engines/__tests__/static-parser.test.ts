/**
 * Unit tests for StaticParserEngine
 * Tests HTML parsing and data extraction functionality
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { StaticParserEngine } from '../static-parser';
import { SourceConfiguration, ScrapedSourceType, StaticParserConfig, SourceSelectors } from '../../types';
import { HTTPClient } from '../../utils/http-client';

// Mock the HTTPClient
vi.mock('../../utils/http-client', () => ({
  HTTPClient: vi.fn().mockImplementation(() => ({
    get: vi.fn(),
    getRequestStats: vi.fn(() => ({ requestCount: 0, lastRequestTime: 0 })),
    resetStats: vi.fn(),
  })),
  createDefaultHTTPClientConfig: vi.fn(() => ({
    timeout: 30000,
    retries: 3,
    userAgents: ['test-user-agent'],
    proxies: [],
    rateLimit: {
      requestsPerMinute: 30,
      delayBetweenRequests: 2000,
      respectRobotsTxt: true
    },
    headers: {}
  }))
}));

describe('StaticParserEngine', () => {
  let engine: StaticParserEngine;
  let mockHttpClient: any;
  let config: StaticParserConfig;
  let sourceConfig: SourceConfiguration;

  beforeEach(() => {
    config = {
      timeout: 30000,
      retries: 3,
      userAgent: 'test-user-agent',
      followRedirects: true
    };

    sourceConfig = {
      id: 'test-source',
      url: 'https://example.com/grants',
      type: ScrapedSourceType.FOUNDATION,
      engine: 'static',
      selectors: {
        grantContainer: '.grant-item',
        title: '.grant-title',
        description: '.grant-description',
        deadline: '.deadline',
        fundingAmount: '.funding-amount',
        eligibility: '.eligibility',
        applicationUrl: '.apply-link',
        funderInfo: '.funder-name'
      },
      rateLimit: {
        requestsPerMinute: 30,
        delayBetweenRequests: 2000,
        respectRobotsTxt: true
      },
      headers: {}
    };

    engine = new StaticParserEngine(config);
    mockHttpClient = (engine as any).httpClient;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with provided configuration', () => {
      expect(engine).toBeInstanceOf(StaticParserEngine);
      expect(HTTPClient).toHaveBeenCalledWith(
        expect.objectContaining({
          timeout: config.timeout,
          userAgents: [config.userAgent]
        })
      );
    });
  });

  describe('scrape', () => {
    it('should successfully scrape grants from HTML', async () => {
      const mockHtml = `
        <html>
          <body>
            <div class="grant-item">
              <h2 class="grant-title">Test Grant 1</h2>
              <p class="grant-description">This is a test grant description</p>
              <span class="deadline">2024-12-31</span>
              <span class="funding-amount">$100,000</span>
              <span class="eligibility">Non-profit organizations</span>
              <a class="apply-link" href="/apply/1">Apply Now</a>
              <span class="funder-name">Test Foundation</span>
            </div>
            <div class="grant-item">
              <h2 class="grant-title">Test Grant 2</h2>
              <p class="grant-description">Another test grant</p>
              <span class="deadline">2024-11-30</span>
              <span class="funding-amount">$50,000</span>
              <span class="eligibility">Educational institutions</span>
              <a class="apply-link" href="/apply/2">Apply Here</a>
              <span class="funder-name">Education Fund</span>
            </div>
          </body>
        </html>
      `;

      mockHttpClient.get.mockResolvedValue({
        status: 200,
        data: mockHtml
      });

      const results = await engine.scrape(sourceConfig);

      expect(results).toHaveLength(2);
      
      // Check first grant
      expect(results[0]).toMatchObject({
        title: 'Test Grant 1',
        description: 'This is a test grant description',
        deadline: '2024-12-31',
        fundingAmount: '$100,000',
        eligibility: 'Non-profit organizations',
        applicationUrl: 'https://example.com/apply/1',
        funderName: 'Test Foundation',
        sourceUrl: 'https://example.com/grants'
      });

      // Check second grant
      expect(results[1]).toMatchObject({
        title: 'Test Grant 2',
        description: 'Another test grant',
        deadline: '2024-11-30',
        fundingAmount: '$50,000',
        eligibility: 'Educational institutions',
        applicationUrl: 'https://example.com/apply/2',
        funderName: 'Education Fund',
        sourceUrl: 'https://example.com/grants'
      });

      // Check that both grants have required metadata
      results.forEach(grant => {
        expect(grant.scrapedAt).toBeInstanceOf(Date);
        expect(grant.rawContent).toBeDefined();
        expect(grant.rawContent.html).toBeDefined();
        expect(grant.rawContent.text).toBeDefined();
        expect(grant.rawContent.selectors).toBeDefined();
      });
    });

    it('should handle empty grant containers', async () => {
      const mockHtml = `
        <html>
          <body>
            <div class="content">No grants found</div>
          </body>
        </html>
      `;

      mockHttpClient.get.mockResolvedValue({
        status: 200,
        data: mockHtml
      });

      const results = await engine.scrape(sourceConfig);
      expect(results).toHaveLength(0);
    });

    it('should skip grants with missing titles', async () => {
      const mockHtml = `
        <html>
          <body>
            <div class="grant-item">
              <h2 class="grant-title">Valid Grant</h2>
              <p class="grant-description">Valid description</p>
            </div>
            <div class="grant-item">
              <p class="grant-description">Grant without title</p>
            </div>
            <div class="grant-item">
              <h2 class="grant-title"></h2>
              <p class="grant-description">Grant with empty title</p>
            </div>
          </body>
        </html>
      `;

      mockHttpClient.get.mockResolvedValue({
        status: 200,
        data: mockHtml
      });

      const results = await engine.scrape(sourceConfig);
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Valid Grant');
    });

    it('should handle HTTP errors', async () => {
      mockHttpClient.get.mockRejectedValue(new Error('Network error'));

      await expect(engine.scrape(sourceConfig)).rejects.toThrow('Static parsing failed for https://example.com/grants: Network error');
    });

    it('should handle non-200 HTTP status codes', async () => {
      mockHttpClient.get.mockResolvedValue({
        status: 404,
        statusText: 'Not Found'
      });

      await expect(engine.scrape(sourceConfig)).rejects.toThrow('HTTP 404: Not Found');
    });

    it('should handle invalid HTML response', async () => {
      mockHttpClient.get.mockResolvedValue({
        status: 200,
        data: null
      });

      await expect(engine.scrape(sourceConfig)).rejects.toThrow('Invalid response: expected HTML content');
    });
  });

  describe('text extraction and cleaning', () => {
    it('should clean HTML entities and normalize whitespace', async () => {
      const mockHtml = `
        <html>
          <body>
            <div class="grant-item">
              <h2 class="grant-title">Grant &amp; Research   Program</h2>
              <p class="grant-description">  This is a &quot;test&quot; description with&nbsp;extra   spaces  </p>
              <span class="funding-amount">• $100,000 - $200,000...</span>
            </div>
          </body>
        </html>
      `;

      mockHttpClient.get.mockResolvedValue({
        status: 200,
        data: mockHtml
      });

      const results = await engine.scrape(sourceConfig);
      expect(results).toHaveLength(1);
      
      expect(results[0].title).toBe('Grant & Research Program');
      expect(results[0].description).toBe('This is a "test" description with extra spaces');
      expect(results[0].fundingAmount).toBe('$100,000 - $200,000');
    });

    it('should handle missing optional fields gracefully', async () => {
      const mockHtml = `
        <html>
          <body>
            <div class="grant-item">
              <h2 class="grant-title">Minimal Grant</h2>
            </div>
          </body>
        </html>
      `;

      mockHttpClient.get.mockResolvedValue({
        status: 200,
        data: mockHtml
      });

      const results = await engine.scrape(sourceConfig);
      expect(results).toHaveLength(1);
      
      expect(results[0].title).toBe('Minimal Grant');
      expect(results[0].description).toBeUndefined();
      expect(results[0].deadline).toBeUndefined();
      expect(results[0].fundingAmount).toBeUndefined();
      expect(results[0].eligibility).toBeUndefined();
      expect(results[0].applicationUrl).toBeUndefined();
      expect(results[0].funderName).toBeUndefined();
    });
  });

  describe('URL resolution', () => {
    it('should resolve relative URLs to absolute URLs', async () => {
      const mockHtml = `
        <html>
          <body>
            <div class="grant-item">
              <h2 class="grant-title">Test Grant</h2>
              <a class="apply-link" href="/apply/123">Apply</a>
            </div>
          </body>
        </html>
      `;

      mockHttpClient.get.mockResolvedValue({
        status: 200,
        data: mockHtml
      });

      const results = await engine.scrape(sourceConfig);
      expect(results[0].applicationUrl).toBe('https://example.com/apply/123');
    });

    it('should handle absolute URLs correctly', async () => {
      const mockHtml = `
        <html>
          <body>
            <div class="grant-item">
              <h2 class="grant-title">Test Grant</h2>
              <a class="apply-link" href="https://external.com/apply">Apply</a>
            </div>
          </body>
        </html>
      `;

      mockHttpClient.get.mockResolvedValue({
        status: 200,
        data: mockHtml
      });

      const results = await engine.scrape(sourceConfig);
      expect(results[0].applicationUrl).toBe('https://external.com/apply');
    });

    it('should handle protocol-relative URLs', async () => {
      const mockHtml = `
        <html>
          <body>
            <div class="grant-item">
              <h2 class="grant-title">Test Grant</h2>
              <a class="apply-link" href="//external.com/apply">Apply</a>
            </div>
          </body>
        </html>
      `;

      mockHttpClient.get.mockResolvedValue({
        status: 200,
        data: mockHtml
      });

      const results = await engine.scrape(sourceConfig);
      expect(results[0].applicationUrl).toBe('https://external.com/apply');
    });

    it('should handle URLs in text content when no href attribute', async () => {
      const mockHtml = `
        <html>
          <body>
            <div class="grant-item">
              <h2 class="grant-title">Test Grant</h2>
              <span class="apply-link">https://example.com/apply/text</span>
            </div>
          </body>
        </html>
      `;

      mockHttpClient.get.mockResolvedValue({
        status: 200,
        data: mockHtml
      });

      const results = await engine.scrape(sourceConfig);
      expect(results[0].applicationUrl).toBe('https://example.com/apply/text');
    });
  });

  describe('error handling', () => {
    it('should continue processing other grants when one fails', async () => {
      const mockHtml = `
        <html>
          <body>
            <div class="grant-item">
              <h2 class="grant-title">Valid Grant 1</h2>
            </div>
            <div class="grant-item invalid-structure">
              <!-- This might cause parsing issues -->
            </div>
            <div class="grant-item">
              <h2 class="grant-title">Valid Grant 2</h2>
            </div>
          </body>
        </html>
      `;

      mockHttpClient.get.mockResolvedValue({
        status: 200,
        data: mockHtml
      });

      const results = await engine.scrape(sourceConfig);
      expect(results).toHaveLength(2);
      expect(results[0].title).toBe('Valid Grant 1');
      expect(results[1].title).toBe('Valid Grant 2');
    });

    it('should handle malformed HTML gracefully', async () => {
      const mockHtml = `
        <html>
          <body>
            <div class="grant-item">
              <h2 class="grant-title">Test Grant</h2>
              <p class="grant-description">Description with <unclosed tag
            </div>
          </body>
        </html>
      `;

      mockHttpClient.get.mockResolvedValue({
        status: 200,
        data: mockHtml
      });

      const results = await engine.scrape(sourceConfig);
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Test Grant');
    });
  });

  describe('selector handling', () => {
    it('should handle empty selectors gracefully', async () => {
      const configWithEmptySelectors: SourceConfiguration = {
        ...sourceConfig,
        selectors: {
          grantContainer: '.grant-item',
          title: '.grant-title',
          description: '', // Empty selector
          deadline: '.deadline',
          fundingAmount: '.funding-amount',
          eligibility: '.eligibility',
          applicationUrl: '.apply-link',
          funderInfo: '.funder-name'
        }
      };

      const mockHtml = `
        <html>
          <body>
            <div class="grant-item">
              <h2 class="grant-title">Test Grant</h2>
              <p class="some-description">This won't be found</p>
            </div>
          </body>
        </html>
      `;

      mockHttpClient.get.mockResolvedValue({
        status: 200,
        data: mockHtml
      });

      const results = await engine.scrape(configWithEmptySelectors);
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Test Grant');
      expect(results[0].description).toBeUndefined();
    });

    it('should handle invalid selectors gracefully', async () => {
      const configWithInvalidSelectors: SourceConfiguration = {
        ...sourceConfig,
        selectors: {
          grantContainer: '.grant-item',
          title: '.grant-title',
          description: '.nonexistent-selector',
          deadline: '.deadline',
          fundingAmount: '.funding-amount',
          eligibility: '.eligibility',
          applicationUrl: '.apply-link',
          funderInfo: '.funder-name'
        }
      };

      const mockHtml = `
        <html>
          <body>
            <div class="grant-item">
              <h2 class="grant-title">Test Grant</h2>
            </div>
          </body>
        </html>
      `;

      mockHttpClient.get.mockResolvedValue({
        status: 200,
        data: mockHtml
      });

      const results = await engine.scrape(configWithInvalidSelectors);
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Test Grant');
      expect(results[0].description).toBeUndefined();
    });
  });

  describe('statistics and monitoring', () => {
    it('should provide request statistics', () => {
      const stats = engine.getStats();
      expect(stats).toHaveProperty('requestCount');
      expect(stats).toHaveProperty('lastRequestTime');
    });

    it('should reset statistics', () => {
      engine.resetStats();
      expect(mockHttpClient.resetStats).toHaveBeenCalled();
    });
  });

  describe('configuration handling', () => {
    it('should respect followRedirects configuration', async () => {
      const noRedirectConfig = { ...config, followRedirects: false };
      const noRedirectEngine = new StaticParserEngine(noRedirectConfig);
      
      const mockHtml = '<html><body><div class="grant-item"><h2 class="grant-title">Test</h2></div></body></html>';
      (noRedirectEngine as any).httpClient.get.mockResolvedValue({
        status: 200,
        data: mockHtml
      });

      await noRedirectEngine.scrape(sourceConfig);

      expect((noRedirectEngine as any).httpClient.get).toHaveBeenCalledWith(
        sourceConfig.url,
        expect.objectContaining({
          maxRedirects: 0
        })
      );
    });

    it('should use custom user agent from configuration', () => {
      const customConfig = { ...config, userAgent: 'Custom-Bot/1.0' };
      const customEngine = new StaticParserEngine(customConfig);
      
      expect(HTTPClient).toHaveBeenCalledWith(
        expect.objectContaining({
          userAgents: ['Custom-Bot/1.0']
        })
      );
    });
  });
});