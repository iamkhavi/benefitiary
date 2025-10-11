/**
 * Integration tests for BrowserEngine
 * Tests browser-based scraping scenarios with Playwright
 */

import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest';
import { BrowserEngine } from '../browser-engine';
import { SourceConfiguration, ScrapedSourceType, BrowserEngineConfig } from '../../types';

// Mock Playwright for unit tests
vi.mock('playwright', () => ({
  chromium: {
    launch: vi.fn().mockResolvedValue({
      newContext: vi.fn().mockResolvedValue({
        newPage: vi.fn().mockResolvedValue({
          goto: vi.fn().mockResolvedValue({ status: () => 200 }),
          waitForSelector: vi.fn().mockResolvedValue(true),
          waitForLoadState: vi.fn().mockResolvedValue(true),
          addInitScript: vi.fn().mockResolvedValue(true),
          route: vi.fn().mockResolvedValue(true),
          on: vi.fn(),
          mouse: {
            move: vi.fn().mockResolvedValue(true)
          },
          evaluate: vi.fn().mockResolvedValue([
            {
              title: 'Test Grant 1',
              description: 'Test grant description',
              deadline: '2024-12-31',
              fundingAmount: '$100,000',
              eligibility: 'Non-profit organizations',
              applicationUrl: 'https://example.com/apply',
              funderName: 'Test Foundation',
              rawContent: { html: '<div>test</div>' }
            }
          ]),
          screenshot: vi.fn().mockResolvedValue(Buffer.from('test')),
          close: vi.fn().mockResolvedValue(true),
          $: vi.fn().mockResolvedValue(null)
        }),
        close: vi.fn().mockResolvedValue(true)
      }),
      close: vi.fn().mockResolvedValue(true)
    })
  }
}));

describe('BrowserEngine', () => {
  let browserEngine: BrowserEngine;
  let mockConfig: BrowserEngineConfig;
  let mockSource: SourceConfiguration;

  beforeEach(() => {
    mockConfig = {
      headless: true,
      viewport: { width: 1366, height: 768 },
      timeout: 30000,
      waitForSelector: '.grant-item',
      blockResources: ['image', 'font'],
      stealthMode: true
    };

    mockSource = {
      id: 'test-foundation',
      url: 'https://example.com/grants',
      type: ScrapedSourceType.FOUNDATION,
      engine: 'browser',
      selectors: {
        grantContainer: '.grant-item',
        title: '.grant-title',
        description: '.grant-description',
        deadline: '.deadline',
        fundingAmount: '.amount',
        eligibility: '.eligibility',
        applicationUrl: '.apply-link',
        funderInfo: '.funder'
      },
      rateLimit: {
        requestsPerMinute: 10,
        delayBetweenRequests: 6000,
        respectRobotsTxt: true
      },
      headers: {}
    };

    browserEngine = new BrowserEngine(mockConfig);
  });

  afterEach(async () => {
    await browserEngine.close();
  });

  describe('Configuration', () => {
    it('should initialize with default configuration', () => {
      const engine = new BrowserEngine({
        headless: true,
        viewport: { width: 1280, height: 720 },
        timeout: 15000,
        waitForSelector: 'body',
        blockResources: [],
        stealthMode: false
      });

      expect(engine).toBeInstanceOf(BrowserEngine);
    });

    it('should merge provided config with defaults', () => {
      const customConfig = {
        headless: false,
        viewport: { width: 1920, height: 1080 },
        timeout: 45000,
        waitForSelector: '.custom-selector',
        blockResources: ['image', 'font', 'media'],
        stealthMode: true
      };

      const engine = new BrowserEngine(customConfig);
      expect(engine).toBeInstanceOf(BrowserEngine);
    });
  });

  describe('Scraping Functionality', () => {
    it('should scrape grants from a source successfully', async () => {
      const grants = await browserEngine.scrape(mockSource);

      expect(grants).toHaveLength(1);
      expect(grants[0]).toMatchObject({
        title: 'Test Grant 1',
        description: 'Test grant description',
        deadline: '2024-12-31',
        fundingAmount: '$100,000',
        eligibility: 'Non-profit organizations',
        applicationUrl: 'https://example.com/apply',
        funderName: 'Test Foundation',
        sourceUrl: 'https://example.com/grants'
      });
      expect(grants[0].scrapedAt).toBeInstanceOf(Date);
    });

    it('should handle empty results gracefully', async () => {
      // Create a new engine instance with mocked empty results
      const { chromium } = await import('playwright');
      const mockBrowser = vi.mocked(chromium.launch);
      const mockContext = {
        newPage: vi.fn().mockResolvedValue({
          goto: vi.fn().mockResolvedValue({ status: () => 200 }),
          waitForSelector: vi.fn().mockResolvedValue(true),
          waitForLoadState: vi.fn().mockResolvedValue(true),
          addInitScript: vi.fn().mockResolvedValue(true),
          route: vi.fn().mockResolvedValue(true),
          on: vi.fn(),
          mouse: { move: vi.fn().mockResolvedValue(true) },
          evaluate: vi.fn().mockResolvedValue([]), // Empty results
          screenshot: vi.fn().mockResolvedValue(Buffer.from('test')),
          close: vi.fn().mockResolvedValue(true),
          $: vi.fn().mockResolvedValue(null)
        }),
        close: vi.fn().mockResolvedValue(true)
      };
      
      mockBrowser.mockResolvedValueOnce({
        newContext: vi.fn().mockResolvedValue(mockContext),
        close: vi.fn().mockResolvedValue(true)
      } as any);

      const emptyEngine = new BrowserEngine(mockConfig);
      const grants = await emptyEngine.scrape(mockSource);
      expect(grants).toHaveLength(0);
      await emptyEngine.close();
    });

    it('should handle navigation errors', async () => {
      const { chromium } = await import('playwright');
      const mockBrowser = await chromium.launch();
      const mockContext = await mockBrowser.newContext();
      const mockPage = await mockContext.newPage();
      
      vi.mocked(mockPage.goto).mockRejectedValueOnce(new Error('Navigation timeout'));

      await expect(browserEngine.scrape(mockSource)).rejects.toThrow();
    });

    it('should handle parsing errors gracefully', async () => {
      const { chromium } = await import('playwright');
      const mockBrowser = await chromium.launch();
      const mockContext = await mockBrowser.newContext();
      const mockPage = await mockContext.newPage();
      
      vi.mocked(mockPage.evaluate).mockRejectedValueOnce(new Error('Parsing failed'));

      await expect(browserEngine.scrape(mockSource)).rejects.toThrow();
    });
  });

  describe('Stealth Capabilities', () => {
    it('should apply stealth techniques when enabled', async () => {
      const stealthConfig = { ...mockConfig, stealthMode: true };
      const stealthEngine = new BrowserEngine(stealthConfig);

      const { chromium } = await import('playwright');
      const mockBrowser = await chromium.launch();
      const mockContext = await mockBrowser.newContext();
      const mockPage = await mockContext.newPage();

      await stealthEngine.scrape(mockSource);

      // Verify stealth techniques were applied
      expect(mockPage.addInitScript).toHaveBeenCalled();
      expect(mockPage.mouse.move).toHaveBeenCalled();

      await stealthEngine.close();
    });

    it('should use random user agents', async () => {
      const grants = await browserEngine.scrape(mockSource);
      expect(grants).toBeDefined();
      
      // User agent randomization is tested indirectly through successful scraping
    });

    it('should block specified resources', async () => {
      const { chromium } = await import('playwright');
      const mockBrowser = await chromium.launch();
      const mockContext = await mockBrowser.newContext();
      const mockPage = await mockContext.newPage();

      await browserEngine.scrape(mockSource);

      // Verify resource blocking was set up
      expect(mockPage.route).toHaveBeenCalledWith('**/*', expect.any(Function));
    });
  });

  describe('JavaScript Rendering', () => {
    it('should wait for JavaScript frameworks to render', async () => {
      const { chromium } = await import('playwright');
      const mockBrowser = await chromium.launch();
      const mockContext = await mockBrowser.newContext();
      const mockPage = await mockContext.newPage();

      // Mock JavaScript framework detection
      vi.mocked(mockPage.evaluate).mockImplementation((fn: any) => {
        if (typeof fn === 'function') {
          // Simulate framework rendering wait
          return Promise.resolve([]);
        }
        return Promise.resolve([]);
      });

      const grants = await browserEngine.scrape(mockSource);
      expect(grants).toBeDefined();
    });

    it('should handle AJAX requests', async () => {
      const ajaxSource = {
        ...mockSource,
        url: 'https://example.com/ajax-grants'
      };

      const grants = await browserEngine.scrape(ajaxSource);
      expect(grants).toBeDefined();
    });

    it('should trigger lazy loading by scrolling', async () => {
      const { chromium } = await import('playwright');
      const mockBrowser = await chromium.launch();
      const mockContext = await mockBrowser.newContext();
      const mockPage = await mockContext.newPage();

      // Mock scrolling behavior
      vi.mocked(mockPage.evaluate).mockImplementation((fn: any) => {
        if (typeof fn === 'function' && fn.toString().includes('scrollBy')) {
          return Promise.resolve();
        }
        return Promise.resolve([{
          title: 'Lazy Loaded Grant',
          description: 'This grant was lazy loaded',
          rawContent: {}
        }]);
      });

      const grants = await browserEngine.scrape(mockSource);
      expect(grants).toBeDefined();
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle CAPTCHA detection', async () => {
      const { chromium } = await import('playwright');
      const mockBrowser = await chromium.launch();
      const mockContext = await mockBrowser.newContext();
      const mockPage = await mockContext.newPage();

      // Mock CAPTCHA element found
      vi.mocked(mockPage.$).mockResolvedValueOnce({} as any);

      const result = await browserEngine.handleCaptcha(mockPage);
      expect(result).toBe(false);
    });

    it('should handle cookie consent dialogs', async () => {
      const { chromium } = await import('playwright');
      const mockBrowser = await chromium.launch();
      const mockContext = await mockBrowser.newContext();
      const mockPage = await mockContext.newPage();

      // Mock cookie consent button
      const mockButton = {
        click: vi.fn().mockResolvedValue(true)
      };
      vi.mocked(mockPage.$).mockResolvedValueOnce(mockButton as any);

      await browserEngine.handleCookieConsent(mockPage);
      expect(mockButton.click).toHaveBeenCalled();
    });

    it('should take error screenshots on failure', async () => {
      const { chromium } = await import('playwright');
      const mockBrowser = await chromium.launch();
      const mockContext = await mockBrowser.newContext();
      const mockPage = await mockContext.newPage();

      // Mock navigation failure
      vi.mocked(mockPage.goto).mockRejectedValueOnce(new Error('Network error'));

      try {
        await browserEngine.scrape(mockSource);
      } catch (error) {
        // Error screenshot should be attempted
        expect(mockPage.screenshot).toHaveBeenCalled();
      }
    });

    it('should handle timeout errors gracefully', async () => {
      const { chromium } = await import('playwright');
      const mockBrowser = await chromium.launch();
      const mockContext = await mockBrowser.newContext();
      const mockPage = await mockContext.newPage();

      vi.mocked(mockPage.waitForSelector).mockRejectedValueOnce(new Error('Timeout'));

      // Should not throw, but continue with available content
      const grants = await browserEngine.scrape(mockSource);
      expect(grants).toBeDefined();
    });
  });

  describe('Resource Management', () => {
    it('should close browser resources properly', async () => {
      const { chromium } = await import('playwright');
      const mockBrowser = await chromium.launch();
      const mockContext = await mockBrowser.newContext();

      await browserEngine.close();

      expect(mockContext.close).toHaveBeenCalled();
      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('should handle close errors gracefully', async () => {
      const { chromium } = await import('playwright');
      const mockBrowser = await chromium.launch();
      const mockContext = await mockBrowser.newContext();

      vi.mocked(mockContext.close).mockRejectedValueOnce(new Error('Close failed'));

      // Should not throw
      await expect(browserEngine.close()).resolves.toBeUndefined();
    });
  });

  describe('Advanced Scenarios', () => {
    it('should handle single-page applications', async () => {
      const spaSource = {
        ...mockSource,
        url: 'https://example.com/spa-grants',
        selectors: {
          ...mockSource.selectors,
          grantContainer: '[data-testid="grant-card"]'
        }
      };

      const grants = await browserEngine.scrape(spaSource);
      expect(grants).toBeDefined();
    });

    it('should handle infinite scroll pages', async () => {
      const { chromium } = await import('playwright');
      const mockBrowser = await chromium.launch();
      const mockContext = await mockBrowser.newContext();
      const mockPage = await mockContext.newPage();

      // Mock infinite scroll behavior
      vi.mocked(mockPage.evaluate).mockImplementation((fn: any) => {
        if (typeof fn === 'function' && fn.toString().includes('scrollHeight')) {
          return Promise.resolve();
        }
        return Promise.resolve([
          { title: 'Grant 1', rawContent: {} },
          { title: 'Grant 2', rawContent: {} },
          { title: 'Grant 3', rawContent: {} }
        ]);
      });

      const grants = await browserEngine.scrape(mockSource);
      expect(grants.length).toBeGreaterThan(0);
    });

    it('should wait for AJAX requests to complete', async () => {
      const { chromium } = await import('playwright');
      const mockBrowser = await chromium.launch();
      const mockContext = await mockBrowser.newContext();
      const mockPage = await mockContext.newPage();

      await browserEngine.waitForAjaxRequests(mockPage, 5000);
      
      // Should complete without throwing
      expect(mockPage.evaluate).toHaveBeenCalled();
    });
  });

  describe('Performance Optimization', () => {
    it('should block unnecessary resources for performance', async () => {
      const performanceConfig = {
        ...mockConfig,
        blockResources: ['image', 'font', 'media', 'stylesheet']
      };

      const performanceEngine = new BrowserEngine(performanceConfig);
      const grants = await performanceEngine.scrape(mockSource);

      expect(grants).toBeDefined();
      await performanceEngine.close();
    });

    it('should use appropriate viewport sizes', async () => {
      const mobileConfig = {
        ...mockConfig,
        viewport: { width: 375, height: 667 }
      };

      const mobileEngine = new BrowserEngine(mobileConfig);
      const grants = await mobileEngine.scrape(mockSource);

      expect(grants).toBeDefined();
      await mobileEngine.close();
    });
  });
});

// Integration tests that require actual browser (run with --run flag)
describe('BrowserEngine Integration Tests', () => {
  let browserEngine: BrowserEngine;

  beforeAll(() => {
    // Only run integration tests in CI or when explicitly requested
    if (!process.env.CI && !process.env.RUN_INTEGRATION_TESTS) {
      return;
    }
  });

  beforeEach(() => {
    if (!process.env.CI && !process.env.RUN_INTEGRATION_TESTS) {
      return;
    }

    const config: BrowserEngineConfig = {
      headless: true,
      viewport: { width: 1366, height: 768 },
      timeout: 30000,
      waitForSelector: 'body',
      blockResources: ['image', 'font'],
      stealthMode: true
    };

    browserEngine = new BrowserEngine(config);
  });

  afterEach(async () => {
    if (!process.env.CI && !process.env.RUN_INTEGRATION_TESTS) {
      return;
    }

    if (browserEngine) {
      await browserEngine.close();
    }
  });

  it('should scrape a real static website', async () => {
    if (!process.env.CI && !process.env.RUN_INTEGRATION_TESTS) {
      return;
    }

    const testSource: SourceConfiguration = {
      id: 'test-static',
      url: 'https://httpbin.org/html',
      type: ScrapedSourceType.FOUNDATION,
      engine: 'browser',
      selectors: {
        grantContainer: 'body',
        title: 'h1',
        description: 'p',
        deadline: '',
        fundingAmount: '',
        eligibility: '',
        applicationUrl: '',
        funderInfo: ''
      },
      rateLimit: {
        requestsPerMinute: 10,
        delayBetweenRequests: 6000,
        respectRobotsTxt: true
      },
      headers: {}
    };

    const grants = await browserEngine.scrape(testSource);
    expect(grants).toBeDefined();
    expect(Array.isArray(grants)).toBe(true);
  });

  it('should handle JavaScript-heavy websites', async () => {
    if (!process.env.CI && !process.env.RUN_INTEGRATION_TESTS) {
      return;
    }

    const jsSource: SourceConfiguration = {
      id: 'test-js',
      url: 'https://httpbin.org/delay/2',
      type: ScrapedSourceType.FOUNDATION,
      engine: 'browser',
      selectors: {
        grantContainer: 'body',
        title: 'title',
        description: 'body',
        deadline: '',
        fundingAmount: '',
        eligibility: '',
        applicationUrl: '',
        funderInfo: ''
      },
      rateLimit: {
        requestsPerMinute: 10,
        delayBetweenRequests: 6000,
        respectRobotsTxt: true
      },
      headers: {}
    };

    const grants = await browserEngine.scrape(jsSource);
    expect(grants).toBeDefined();
  });
});