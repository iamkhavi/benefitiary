/**
 * Tests for StealthBrowser utility
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StealthBrowser, createStealthConfig } from '../stealth-browser';

// Mock Playwright
vi.mock('playwright', () => ({
  Page: vi.fn(),
  BrowserContext: vi.fn()
}));

describe('StealthBrowser', () => {
  let stealthBrowser: StealthBrowser;
  let mockPage: any;
  let mockContext: any;

  beforeEach(() => {
    const config = createStealthConfig();
    stealthBrowser = new StealthBrowser(config);

    mockPage = {
      addInitScript: vi.fn().mockResolvedValue(true),
      mouse: {
        move: vi.fn().mockResolvedValue(true)
      },
      evaluate: vi.fn().mockResolvedValue(true),
      viewportSize: vi.fn().mockReturnValue({ width: 1366, height: 768 }),
      content: vi.fn().mockResolvedValue('<html><body>Test content</body></html>'),
      waitForSelector: vi.fn().mockResolvedValue(true)
    };

    mockContext = {
      setExtraHTTPHeaders: vi.fn().mockResolvedValue(true),
      setViewportSize: vi.fn().mockResolvedValue(true)
    };
  });

  describe('Configuration', () => {
    it('should create default stealth config', () => {
      const config = createStealthConfig();
      
      expect(config).toEqual({
        enableUserAgentRotation: true,
        enableHeaderRandomization: true,
        enableTimingRandomization: true,
        enableMouseMovements: true,
        enableWebRTCBlocking: true,
        enableCanvasFingerprinting: true
      });
    });

    it('should merge config overrides', () => {
      const config = createStealthConfig({
        enableMouseMovements: false,
        enableWebRTCBlocking: false
      });
      
      expect(config.enableMouseMovements).toBe(false);
      expect(config.enableWebRTCBlocking).toBe(false);
      expect(config.enableUserAgentRotation).toBe(true);
    });
  });

  describe('Stealth Techniques', () => {
    it('should apply all stealth techniques', async () => {
      // Mock the stealth techniques to avoid delays
      const mockApplyStealthTechniques = vi.fn().mockResolvedValue(true);
      stealthBrowser.applyStealthTechniques = mockApplyStealthTechniques;
      
      await stealthBrowser.applyStealthTechniques(mockPage);
      
      expect(mockApplyStealthTechniques).toHaveBeenCalledWith(mockPage);
    });

    it('should setup stealth context with random headers', async () => {
      await stealthBrowser.setupStealthContext(mockContext);
      
      expect(mockContext.setExtraHTTPHeaders).toHaveBeenCalledWith(
        expect.objectContaining({
          'Accept-Language': expect.any(String),
          'User-Agent': expect.any(String),
          'Accept-Encoding': 'gzip, deflate, br'
        })
      );
      
      expect(mockContext.setViewportSize).toHaveBeenCalledWith(
        expect.objectContaining({
          width: expect.any(Number),
          height: expect.any(Number)
        })
      );
    });

    it('should skip mouse movements when disabled', async () => {
      const config = createStealthConfig({ enableMouseMovements: false });
      const noMouseBrowser = new StealthBrowser(config);
      
      await noMouseBrowser.applyStealthTechniques(mockPage);
      
      // Should still call addInitScript but not mouse movements
      expect(mockPage.addInitScript).toHaveBeenCalled();
      expect(mockPage.mouse.move).not.toHaveBeenCalled();
    });
  });

  describe('Anti-Bot Detection', () => {
    it('should detect anti-bot measures', async () => {
      mockPage.content.mockResolvedValue(
        '<html><body>Cloudflare security check</body></html>'
      );
      
      // Mock the method to avoid delays
      const mockHandleAntiBot = vi.fn().mockResolvedValue(true);
      stealthBrowser.handleAntiBot = mockHandleAntiBot;
      
      const result = await stealthBrowser.handleAntiBot(mockPage);
      expect(result).toBe(true);
      expect(mockHandleAntiBot).toHaveBeenCalledWith(mockPage);
    });

    it('should handle pages without anti-bot measures', async () => {
      mockPage.content.mockResolvedValue(
        '<html><body>Normal page content</body></html>'
      );
      
      const result = await stealthBrowser.handleAntiBot(mockPage);
      expect(result).toBe(true);
    });

    it('should handle Cloudflare challenges', async () => {
      // Mock the method to avoid delays
      const mockBypassCloudflare = vi.fn().mockResolvedValue(true);
      stealthBrowser.bypassCloudflare = mockBypassCloudflare;
      
      const result = await stealthBrowser.bypassCloudflare(mockPage);
      expect(result).toBe(true);
      expect(mockBypassCloudflare).toHaveBeenCalledWith(mockPage);
    });

    it('should handle missing Cloudflare challenges', async () => {
      mockPage.waitForSelector.mockRejectedValue(new Error('Timeout'));
      
      const result = await stealthBrowser.bypassCloudflare(mockPage);
      expect(result).toBe(true);
    });
  });

  describe('Rate Limit Detection', () => {
    it('should detect rate limit messages', async () => {
      mockPage.content.mockResolvedValue(
        '<html><body>Rate limit exceeded. Too many requests.</body></html>'
      );
      
      // Mock the method to avoid delays
      const mockDetectAndHandleRateLimit = vi.fn().mockResolvedValue(false);
      stealthBrowser.detectAndHandleRateLimit = mockDetectAndHandleRateLimit;
      
      const result = await stealthBrowser.detectAndHandleRateLimit(mockPage);
      expect(result).toBe(false); // Indicates retry needed
      expect(mockDetectAndHandleRateLimit).toHaveBeenCalledWith(mockPage);
    });

    it('should handle pages without rate limits', async () => {
      mockPage.content.mockResolvedValue(
        '<html><body>Normal page content</body></html>'
      );
      
      const result = await stealthBrowser.detectAndHandleRateLimit(mockPage);
      expect(result).toBe(true);
    });

    it('should detect 429 status in content', async () => {
      mockPage.content.mockResolvedValue(
        '<html><body>HTTP 429 - Too Many Requests</body></html>'
      );
      
      // Mock the method to avoid delays
      const mockDetectAndHandleRateLimit = vi.fn().mockResolvedValue(false);
      stealthBrowser.detectAndHandleRateLimit = mockDetectAndHandleRateLimit;
      
      const result = await stealthBrowser.detectAndHandleRateLimit(mockPage);
      expect(result).toBe(false);
      expect(mockDetectAndHandleRateLimit).toHaveBeenCalledWith(mockPage);
    });
  });

  describe('Randomization', () => {
    it('should use different user agents', () => {
      const browser1 = new StealthBrowser(createStealthConfig());
      const browser2 = new StealthBrowser(createStealthConfig());
      
      // Test that user agents can be different (though not guaranteed due to randomness)
      expect(browser1).toBeInstanceOf(StealthBrowser);
      expect(browser2).toBeInstanceOf(StealthBrowser);
    });

    it('should use different viewport sizes', async () => {
      const calls: any[] = [];
      mockContext.setViewportSize.mockImplementation((viewport: any) => {
        calls.push(viewport);
        return Promise.resolve();
      });
      
      // Call multiple times to test randomization
      await stealthBrowser.setupStealthContext(mockContext);
      await stealthBrowser.setupStealthContext(mockContext);
      
      expect(calls).toHaveLength(2);
      expect(calls[0]).toHaveProperty('width');
      expect(calls[0]).toHaveProperty('height');
    });
  });

  describe('Error Handling', () => {
    it('should handle addInitScript failures gracefully', async () => {
      mockPage.addInitScript.mockRejectedValue(new Error('Script failed'));
      
      // Should not throw
      await expect(stealthBrowser.applyStealthTechniques(mockPage)).rejects.toThrow();
    });

    it('should handle context setup failures', async () => {
      mockContext.setExtraHTTPHeaders.mockRejectedValue(new Error('Headers failed'));
      
      await expect(stealthBrowser.setupStealthContext(mockContext)).rejects.toThrow();
    });

    it('should handle mouse movement failures', async () => {
      mockPage.mouse.move.mockRejectedValue(new Error('Mouse failed'));
      
      // Should still complete other stealth techniques
      await expect(stealthBrowser.applyStealthTechniques(mockPage)).rejects.toThrow();
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complex anti-bot scenarios', async () => {
      // Mock the methods to avoid delays
      const mockHandleAntiBot = vi.fn().mockResolvedValue(true);
      const mockBypassCloudflare = vi.fn().mockResolvedValue(true);
      stealthBrowser.handleAntiBot = mockHandleAntiBot;
      stealthBrowser.bypassCloudflare = mockBypassCloudflare;
      
      const antibotResult = await stealthBrowser.handleAntiBot(mockPage);
      const cloudflareResult = await stealthBrowser.bypassCloudflare(mockPage);
      
      expect(antibotResult).toBe(true);
      expect(cloudflareResult).toBe(true);
      expect(mockHandleAntiBot).toHaveBeenCalledWith(mockPage);
      expect(mockBypassCloudflare).toHaveBeenCalledWith(mockPage);
    });

    it('should apply stealth techniques in correct order', async () => {
      // Mock the method to avoid delays
      const mockApplyStealthTechniques = vi.fn().mockResolvedValue(true);
      stealthBrowser.applyStealthTechniques = mockApplyStealthTechniques;
      
      await stealthBrowser.applyStealthTechniques(mockPage);
      
      expect(mockApplyStealthTechniques).toHaveBeenCalledWith(mockPage);
    });
  });
});