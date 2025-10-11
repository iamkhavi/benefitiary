/**
 * Headless Browser Engine using Playwright
 * Handles JavaScript-heavy websites requiring rendering with stealth capabilities
 */

import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { ScrapingEngine, SourceConfiguration, RawGrantData, BrowserEngineConfig, ScrapingError } from '../types';

export class BrowserEngine implements ScrapingEngine {
  private config: BrowserEngineConfig;
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;

  constructor(config: BrowserEngineConfig) {
    this.config = config;
  }

  async scrape(source: SourceConfiguration): Promise<RawGrantData[]> {
    let page: Page | null = null;
    
    try {
      await this.initializeBrowser();
      page = await this.createStealthPage();
      
      // Navigate to the source URL
      await this.navigateToPage(page, source.url);
      
      // Wait for content to load
      await this.waitForContent(page, source.selectors.grantContainer);
      
      // Handle JavaScript rendering if needed
      await this.handleJavaScriptRendering(page);
      
      // Extract grants from the page
      const grants = await this.extractGrantsFromPage(page, source.selectors);
      
      // Take screenshot for debugging if needed
      if (process.env.NODE_ENV === 'development') {
        await this.takeDebugScreenshot(page, source.id);
      }
      
      return grants.map(grant => ({
        ...grant,
        sourceUrl: source.url,
        scrapedAt: new Date()
      }));
      
    } catch (error) {
      const scrapingError: ScrapingError = {
        type: 'PARSING',
        message: `Browser scraping failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        url: source.url,
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date()
      };
      
      // Take error screenshot for debugging
      if (page) {
        await this.takeErrorScreenshot(page, source.id, scrapingError);
      }
      
      throw scrapingError;
    } finally {
      if (page) {
        await page.close();
      }
    }
  }

  private async initializeBrowser(): Promise<void> {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: this.config.headless,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding'
        ]
      });

      this.context = await this.browser.newContext({
        viewport: this.config.viewport,
        userAgent: this.getRandomUserAgent(),
        locale: 'en-US',
        timezoneId: 'America/New_York',
        permissions: [],
        extraHTTPHeaders: {
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Upgrade-Insecure-Requests': '1'
        }
      });
    }
  }

  private async createStealthPage(): Promise<Page> {
    if (!this.context) {
      throw new Error('Browser context not initialized');
    }

    const page = await this.context.newPage();

    // Apply stealth techniques
    if (this.config.stealthMode) {
      await this.applyStealthTechniques(page);
    }

    // Set up request interception for resource blocking
    await page.route('**/*', (route) => {
      const resourceType = route.request().resourceType();
      
      if (this.config.blockResources.includes(resourceType)) {
        route.abort();
      } else {
        route.continue();
      }
    });

    // Set up response handling
    page.on('response', (response) => {
      if (response.status() >= 400) {
        console.warn(`HTTP ${response.status()} for ${response.url()}`);
      }
    });

    // Set up console logging for debugging
    if (process.env.NODE_ENV === 'development') {
      page.on('console', (msg) => {
        console.log(`Browser console [${msg.type()}]: ${msg.text()}`);
      });
    }

    return page;
  }

  private async applyStealthTechniques(page: Page): Promise<void> {
    // Remove webdriver traces
    await page.addInitScript(() => {
      // Remove webdriver property
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });

      // Mock plugins
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });

      // Mock languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
      });

      // Mock permissions
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters: any) => (
        parameters.name === 'notifications' ?
          Promise.resolve({ 
            state: Notification.permission,
            name: 'notifications',
            onchange: null,
            addEventListener: () => {},
            removeEventListener: () => {},
            dispatchEvent: () => false
          } as PermissionStatus) :
          originalQuery(parameters)
      );

      // Mock chrome runtime
      if (!(window as any).chrome) {
        (window as any).chrome = {};
      }
      if (!(window as any).chrome.runtime) {
        (window as any).chrome.runtime = {};
      }
    });

    // Add random mouse movements to appear more human-like
    await page.mouse.move(
      Math.random() * this.config.viewport.width,
      Math.random() * this.config.viewport.height
    );
  }

  private async navigateToPage(page: Page, url: string): Promise<void> {
    try {
      const response = await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: this.config.timeout
      });

      if (!response || response.status() >= 400) {
        throw new Error(`Failed to load page: HTTP ${response?.status()}`);
      }

      // Add random delay to appear more human-like
      await this.randomDelay(1000, 3000);
      
    } catch (error) {
      throw new Error(`Navigation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async waitForContent(page: Page, selector: string): Promise<void> {
    try {
      await page.waitForSelector(selector, {
        timeout: this.config.timeout,
        state: 'visible'
      });

      // Wait for any additional dynamic content
      await page.waitForLoadState('networkidle', { timeout: 10000 });
      
    } catch (error) {
      console.warn(`Selector ${selector} not found, continuing with available content`);
    }
  }

  private async handleJavaScriptRendering(page: Page): Promise<void> {
    // Wait for common JavaScript frameworks to finish rendering
    await page.evaluate(() => {
      return new Promise<void>((resolve) => {
        // Wait for React/Vue/Angular to finish rendering
        const checkFrameworks = () => {
          // Check if React is done rendering
          if (window.React && window.React.version) {
            setTimeout(resolve, 500);
            return;
          }

          // Check if Vue is done rendering
          if ((window as any).Vue) {
            setTimeout(resolve, 500);
            return;
          }

          // Check if Angular is done rendering
          if ((window as any).ng) {
            setTimeout(resolve, 500);
            return;
          }

          // Default wait for any pending operations
          setTimeout(resolve, 1000);
        };

        // Wait for DOM to be ready
        if (document.readyState === 'complete') {
          checkFrameworks();
        } else {
          document.addEventListener('DOMContentLoaded', checkFrameworks);
        }
      });
    });

    // Scroll to trigger lazy loading
    await this.scrollToTriggerLazyLoading(page);
  }

  private async scrollToTriggerLazyLoading(page: Page): Promise<void> {
    await page.evaluate(() => {
      return new Promise<void>((resolve) => {
        let totalHeight = 0;
        const distance = 100;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;

          if (totalHeight >= scrollHeight) {
            clearInterval(timer);
            // Scroll back to top
            window.scrollTo(0, 0);
            setTimeout(resolve, 1000);
          }
        }, 100);
      });
    });
  }

  private async extractGrantsFromPage(page: Page, selectors: any): Promise<RawGrantData[]> {
    return await page.evaluate((sel) => {
      const grants: any[] = [];
      const grantElements = document.querySelectorAll(sel.grantContainer);

      grantElements.forEach((element) => {
        try {
          const grant: any = {
            rawContent: {}
          };

          // Extract title
          const titleElement = element.querySelector(sel.title);
          grant.title = titleElement?.textContent?.trim() || '';

          // Extract description
          const descElement = element.querySelector(sel.description);
          grant.description = descElement?.textContent?.trim() || '';

          // Extract deadline
          const deadlineElement = element.querySelector(sel.deadline);
          grant.deadline = deadlineElement?.textContent?.trim() || '';

          // Extract funding amount
          const fundingElement = element.querySelector(sel.fundingAmount);
          grant.fundingAmount = fundingElement?.textContent?.trim() || '';

          // Extract eligibility
          const eligibilityElement = element.querySelector(sel.eligibility);
          grant.eligibility = eligibilityElement?.textContent?.trim() || '';

          // Extract application URL
          const appUrlElement = element.querySelector(sel.applicationUrl);
          grant.applicationUrl = appUrlElement?.getAttribute('href') || 
                                appUrlElement?.textContent?.trim() || '';

          // Extract funder info
          const funderElement = element.querySelector(sel.funderInfo);
          grant.funderName = funderElement?.textContent?.trim() || '';

          // Store raw HTML for debugging
          grant.rawContent.html = element.outerHTML;
          grant.rawContent.selectors = sel;

          // Only add grants with at least a title
          if (grant.title) {
            grants.push(grant);
          }
        } catch (error) {
          console.warn('Error extracting grant data:', error);
        }
      });

      return grants;
    }, selectors);
  }

  private async takeDebugScreenshot(page: Page, sourceId: string): Promise<void> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `debug-${sourceId}-${timestamp}.png`;
      await page.screenshot({
        path: `./debug-screenshots/${filename}`,
        fullPage: true
      });
    } catch (error) {
      console.warn('Failed to take debug screenshot:', error);
    }
  }

  private async takeErrorScreenshot(page: Page, sourceId: string, error: ScrapingError): Promise<void> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `error-${sourceId}-${timestamp}.png`;
      await page.screenshot({
        path: `./error-screenshots/${filename}`,
        fullPage: true
      });
      
      // Add screenshot path to error metadata
      error.stack = `${error.stack}\nScreenshot: ${filename}`;
    } catch (screenshotError) {
      console.warn('Failed to take error screenshot:', screenshotError);
    }
  }

  private getRandomUserAgent(): string {
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
    ];
    return userAgents[Math.floor(Math.random() * userAgents.length)];
  }

  private async randomDelay(min: number, max: number): Promise<void> {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  async close(): Promise<void> {
    try {
      if (this.context) {
        await this.context.close();
        this.context = null;
      }
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
    } catch (error) {
      console.warn('Error closing browser:', error);
    }
  }

  // Additional utility methods for advanced scenarios
  async handleCaptcha(page: Page): Promise<boolean> {
    // Check for common CAPTCHA indicators
    const captchaSelectors = [
      '[data-sitekey]', // reCAPTCHA
      '.g-recaptcha', // reCAPTCHA
      '#captcha', // Generic CAPTCHA
      '.captcha', // Generic CAPTCHA
      'iframe[src*="recaptcha"]' // reCAPTCHA iframe
    ];

    for (const selector of captchaSelectors) {
      const captchaElement = await page.$(selector);
      if (captchaElement) {
        console.warn('CAPTCHA detected, manual intervention required');
        return false;
      }
    }

    return true;
  }

  async handleCookieConsent(page: Page): Promise<void> {
    const cookieSelectors = [
      'button[id*="accept"]',
      'button[class*="accept"]',
      'button[id*="cookie"]',
      'button[class*="cookie"]',
      '[data-testid*="accept"]',
      '.cookie-accept',
      '#cookie-accept'
    ];

    for (const selector of cookieSelectors) {
      try {
        const button = await page.$(selector);
        if (button) {
          await button.click();
          await this.randomDelay(500, 1500);
          break;
        }
      } catch (error) {
        // Continue to next selector if this one fails
        continue;
      }
    }
  }

  async waitForAjaxRequests(page: Page, timeout: number = 10000): Promise<void> {
    await page.evaluate((timeoutMs) => {
      return new Promise<void>((resolve) => {
        let requestCount = 0;
        const startTime = Date.now();

        // Override XMLHttpRequest
        const originalOpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function(method: string, url: string | URL, async?: boolean, username?: string | null, password?: string | null) {
          requestCount++;
          this.addEventListener('loadend', () => {
            requestCount--;
            if (requestCount === 0) {
              setTimeout(resolve, 100);
            }
          });
          return originalOpen.call(this, method, url, async ?? true, username, password);
        };

        // Override fetch
        const originalFetch = window.fetch;
        window.fetch = function(...args) {
          requestCount++;
          return originalFetch.apply(this, args).finally(() => {
            requestCount--;
            if (requestCount === 0) {
              setTimeout(resolve, 100);
            }
          });
        };

        // Timeout fallback
        setTimeout(() => {
          if (Date.now() - startTime >= timeoutMs) {
            resolve();
          }
        }, timeoutMs);

        // If no requests are pending, resolve immediately
        if (requestCount === 0) {
          setTimeout(resolve, 100);
        }
      });
    }, timeout);
  }
}