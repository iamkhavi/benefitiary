/**
 * Stealth Browser Utilities
 * Advanced anti-detection techniques for web scraping
 */

import { Page, BrowserContext } from 'playwright';

export interface StealthConfig {
  enableUserAgentRotation: boolean;
  enableHeaderRandomization: boolean;
  enableTimingRandomization: boolean;
  enableMouseMovements: boolean;
  enableWebRTCBlocking: boolean;
  enableCanvasFingerprinting: boolean;
}

export class StealthBrowser {
  private static readonly USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/121.0'
  ];

  private static readonly ACCEPT_LANGUAGES = [
    'en-US,en;q=0.9',
    'en-GB,en;q=0.9',
    'en-US,en;q=0.8,es;q=0.7',
    'en-US,en;q=0.9,fr;q=0.8',
    'en-US,en;q=0.9,de;q=0.8'
  ];

  private static readonly SCREEN_RESOLUTIONS = [
    { width: 1920, height: 1080 },
    { width: 1366, height: 768 },
    { width: 1536, height: 864 },
    { width: 1440, height: 900 },
    { width: 1280, height: 720 }
  ];

  constructor(private config: StealthConfig) {}

  async applyStealthTechniques(page: Page): Promise<void> {
    await Promise.all([
      this.removeWebDriverTraces(page),
      this.mockPlugins(page),
      this.mockPermissions(page),
      this.mockWebRTC(page),
      this.mockCanvas(page),
      this.mockTimezone(page),
      this.mockLanguages(page)
    ]);

    if (this.config.enableMouseMovements) {
      await this.simulateHumanBehavior(page);
    }
  }

  async setupStealthContext(context: BrowserContext): Promise<void> {
    const userAgent = this.getRandomUserAgent();
    const acceptLanguage = this.getRandomAcceptLanguage();
    const viewport = this.getRandomViewport();

    await context.setExtraHTTPHeaders({
      'Accept-Language': acceptLanguage,
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
      'User-Agent': userAgent
    });

    // Set viewport size on pages created from this context
    // await context.setViewportSize(viewport); // This method doesn't exist
    // Viewport will be set when creating pages
  }

  private async removeWebDriverTraces(page: Page): Promise<void> {
    await page.addInitScript(() => {
      // Remove webdriver property
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });

      // Remove automation indicators
      delete (window as any).cdc_adoQpoasnfa76pfcZLmcfl_Array;
      delete (window as any).cdc_adoQpoasnfa76pfcZLmcfl_Promise;
      delete (window as any).cdc_adoQpoasnfa76pfcZLmcfl_Symbol;

      // Override the isConnected property for all nodes
      const originalIsConnected = Object.getOwnPropertyDescriptor(Node.prototype, 'isConnected');
      if (originalIsConnected) {
        Object.defineProperty(Node.prototype, 'isConnected', {
          ...originalIsConnected,
          get: function() {
            return originalIsConnected.get?.call(this) ?? true;
          }
        });
      }
    });
  }

  private async mockPlugins(page: Page): Promise<void> {
    await page.addInitScript(() => {
      // Mock plugins array
      Object.defineProperty(navigator, 'plugins', {
        get: () => [
          {
            0: {
              type: "application/x-google-chrome-pdf",
              suffixes: "pdf",
              description: "Portable Document Format",
              enabledPlugin: null
            },
            description: "Portable Document Format",
            filename: "internal-pdf-viewer",
            length: 1,
            name: "Chrome PDF Plugin"
          },
          {
            0: {
              type: "application/pdf",
              suffixes: "pdf",
              description: "",
              enabledPlugin: null
            },
            description: "",
            filename: "mhjfbmdgcfjbbpaeojofohoefgiehjai",
            length: 1,
            name: "Chrome PDF Viewer"
          }
        ],
      });

      // Mock mimeTypes
      Object.defineProperty(navigator, 'mimeTypes', {
        get: () => [
          {
            type: "application/pdf",
            suffixes: "pdf",
            description: "",
            enabledPlugin: {
              name: "Chrome PDF Viewer",
              filename: "mhjfbmdgcfjbbpaeojofohoefgiehjai"
            }
          }
        ],
      });
    });
  }

  private async mockPermissions(page: Page): Promise<void> {
    await page.addInitScript(() => {
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters: any) => {
        if (parameters.name === 'notifications') {
          return Promise.resolve({ 
            state: 'denied' as PermissionState,
            name: parameters.name,
            onchange: null,
            addEventListener: () => {},
            removeEventListener: () => {},
            dispatchEvent: () => false
          } as unknown as PermissionStatus);
        }
        return originalQuery.call(window.navigator.permissions, parameters);
      };
    });
  }

  private async mockWebRTC(page: Page): Promise<void> {
    if (!this.config.enableWebRTCBlocking) return;

    await page.addInitScript(() => {
      // Block WebRTC
      const getOrig = RTCPeerConnection.prototype.createDataChannel;
      RTCPeerConnection.prototype.createDataChannel = function(...args) {
        return getOrig.apply(this, args);
      };

      // Mock getUserMedia
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia = () => {
          return Promise.reject(new Error('Permission denied'));
        };
      }
    });
  }

  private async mockCanvas(page: Page): Promise<void> {
    if (!this.config.enableCanvasFingerprinting) return;

    await page.addInitScript(() => {
      const getImageData = HTMLCanvasElement.prototype.toDataURL;
      HTMLCanvasElement.prototype.toDataURL = function(type?: string, ...args: any[]) {
        if (type === 'image/png') {
          // Add slight noise to canvas fingerprinting
          const context = this.getContext('2d');
          if (context) {
            const imageData = context.getImageData(0, 0, this.width, this.height);
            for (let i = 0; i < imageData.data.length; i += 4) {
              imageData.data[i] += Math.floor(Math.random() * 3) - 1;
              imageData.data[i + 1] += Math.floor(Math.random() * 3) - 1;
              imageData.data[i + 2] += Math.floor(Math.random() * 3) - 1;
            }
            context.putImageData(imageData, 0, 0);
          }
        }
        return getImageData.apply(this, [type, args[0]] as [string | undefined, number | undefined]);
      };
    });
  }

  private async mockTimezone(page: Page): Promise<void> {
    await page.addInitScript(() => {
      // Mock timezone
      const timezones = [
        'America/New_York',
        'America/Los_Angeles',
        'Europe/London',
        'Europe/Berlin',
        'Asia/Tokyo'
      ];
      const randomTimezone = timezones[Math.floor(Math.random() * timezones.length)];
      
      Object.defineProperty(Intl.DateTimeFormat.prototype, 'resolvedOptions', {
        value: function() {
          return {
            ...Intl.DateTimeFormat.prototype.resolvedOptions.call(this),
            timeZone: randomTimezone
          };
        }
      });
    });
  }

  private async mockLanguages(page: Page): Promise<void> {
    await page.addInitScript(() => {
      const languages = [
        ['en-US', 'en'],
        ['en-GB', 'en'],
        ['en-US', 'en', 'es'],
        ['en-US', 'en', 'fr'],
        ['en-US', 'en', 'de']
      ];
      const randomLanguages = languages[Math.floor(Math.random() * languages.length)];

      Object.defineProperty(navigator, 'languages', {
        get: () => randomLanguages,
      });

      Object.defineProperty(navigator, 'language', {
        get: () => randomLanguages[0],
      });
    });
  }

  private async simulateHumanBehavior(page: Page): Promise<void> {
    // Random mouse movements
    const viewport = page.viewportSize();
    if (viewport) {
      await page.mouse.move(
        Math.random() * viewport.width,
        Math.random() * viewport.height,
        { steps: Math.floor(Math.random() * 10) + 5 }
      );
    }

    // Random scroll
    await page.evaluate(() => {
      window.scrollBy(0, Math.random() * 100);
    });

    // Random delay
    await this.randomDelay(500, 2000);
  }

  private async randomDelay(min: number, max: number): Promise<void> {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  private getRandomUserAgent(): string {
    return StealthBrowser.USER_AGENTS[Math.floor(Math.random() * StealthBrowser.USER_AGENTS.length)];
  }

  private getRandomAcceptLanguage(): string {
    return StealthBrowser.ACCEPT_LANGUAGES[Math.floor(Math.random() * StealthBrowser.ACCEPT_LANGUAGES.length)];
  }

  private getRandomViewport(): { width: number; height: number } {
    return StealthBrowser.SCREEN_RESOLUTIONS[Math.floor(Math.random() * StealthBrowser.SCREEN_RESOLUTIONS.length)];
  }

  async handleAntiBot(page: Page): Promise<boolean> {
    // Check for common anti-bot measures
    const antibotIndicators = [
      'cloudflare',
      'captcha',
      'bot-detection',
      'access-denied',
      'blocked'
    ];

    const pageContent = await page.content();
    const hasAntiBot = antibotIndicators.some(indicator => 
      pageContent.toLowerCase().includes(indicator)
    );

    if (hasAntiBot) {
      console.warn('Anti-bot measures detected');
      
      // Try to wait for challenge to complete
      try {
        await page.waitForSelector('body', { timeout: 10000 });
        await this.randomDelay(3000, 7000);
        return true;
      } catch (error) {
        return false;
      }
    }

    return true;
  }

  async bypassCloudflare(page: Page): Promise<boolean> {
    try {
      // Wait for Cloudflare challenge
      await page.waitForSelector('#cf-challenge-running', { timeout: 5000 });
      console.log('Cloudflare challenge detected, waiting...');
      
      // Wait for challenge to complete
      await page.waitForSelector('#cf-challenge-running', { 
        state: 'detached', 
        timeout: 30000 
      });
      
      // Additional wait for page to fully load
      await this.randomDelay(2000, 5000);
      return true;
    } catch (error) {
      // No Cloudflare challenge or timeout
      return true;
    }
  }

  async detectAndHandleRateLimit(page: Page): Promise<boolean> {
    const rateLimitIndicators = [
      'rate limit',
      'too many requests',
      '429',
      'slow down',
      'try again later'
    ];

    const pageContent = await page.content();
    const hasRateLimit = rateLimitIndicators.some(indicator => 
      pageContent.toLowerCase().includes(indicator)
    );

    if (hasRateLimit) {
      console.warn('Rate limit detected, implementing backoff');
      const backoffTime = Math.floor(Math.random() * 30000) + 30000; // 30-60 seconds
      await new Promise(resolve => setTimeout(resolve, backoffTime));
      return false; // Indicate retry needed
    }

    return true;
  }
}

export const createStealthConfig = (overrides: Partial<StealthConfig> = {}): StealthConfig => ({
  enableUserAgentRotation: true,
  enableHeaderRandomization: true,
  enableTimingRandomization: true,
  enableMouseMovements: true,
  enableWebRTCBlocking: true,
  enableCanvasFingerprinting: true,
  ...overrides
});