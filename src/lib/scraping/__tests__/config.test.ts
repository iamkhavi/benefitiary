/**
 * Tests for scraping configuration management
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadScrapingConfig, validateScrapingConfig } from '../config';

describe('Scraping Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment variables
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('loadScrapingConfig', () => {
    it('should load default configuration when no environment variables are set', () => {
      const config = loadScrapingConfig();

      expect(config.scheduler.maxConcurrentJobs).toBe(5);
      expect(config.scheduler.retryAttempts).toBe(3);
      expect(config.rateLimit.requestsPerMinute).toBe(10);
      expect(config.rateLimit.delayBetweenRequests).toBe(2000);
      expect(config.browser.headless).toBe(true);
      expect(config.staticParser.followRedirects).toBe(true);
      expect(config.proxy.enabled).toBe(false);
    });

    it('should load configuration from environment variables', () => {
      process.env.SCRAPING_MAX_CONCURRENT_JOBS = '10';
      process.env.SCRAPING_RETRY_ATTEMPTS = '5';
      process.env.SCRAPING_DEFAULT_RATE_LIMIT = '20';
      process.env.SCRAPING_DEFAULT_DELAY = '3000';
      process.env.SCRAPING_TIMEOUT = '45000';
      process.env.PROXY_ENABLED = 'true';
      process.env.PROXY_HOST = 'proxy.example.com';
      process.env.PROXY_PORT = '8080';

      const config = loadScrapingConfig();

      expect(config.scheduler.maxConcurrentJobs).toBe(10);
      expect(config.scheduler.retryAttempts).toBe(5);
      expect(config.rateLimit.requestsPerMinute).toBe(20);
      expect(config.rateLimit.delayBetweenRequests).toBe(3000);
      expect(config.browser.timeout).toBe(45000);
      expect(config.staticParser.timeout).toBe(45000);
      expect(config.proxy.enabled).toBe(true);
      expect(config.proxy.host).toBe('proxy.example.com');
      expect(config.proxy.port).toBe(8080);
    });

    it('should handle API keys configuration', () => {
      process.env.GRANTS_GOV_API_KEY = 'test-grants-gov-key';
      process.env.FOUNDATION_CENTER_API_KEY = 'test-foundation-key';

      const config = loadScrapingConfig();

      expect(config.apiKeys.grantsGov).toBe('test-grants-gov-key');
      expect(config.apiKeys.foundationCenter).toBe('test-foundation-key');
    });
  });

  describe('validateScrapingConfig', () => {
    it('should validate a correct configuration', () => {
      const config = loadScrapingConfig();
      config.redis.url = 'redis://localhost:6379';

      const result = validateScrapingConfig(config);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing Redis URL', () => {
      const config = loadScrapingConfig();
      config.redis.url = '';

      const result = validateScrapingConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Redis URL is required for caching and job queue');
    });

    it('should detect invalid rate limiting configuration', () => {
      const config = loadScrapingConfig();
      config.redis.url = 'redis://localhost:6379';
      config.rateLimit.requestsPerMinute = 0;
      config.rateLimit.delayBetweenRequests = -1000;

      const result = validateScrapingConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Rate limit must be greater than 0');
      expect(result.errors).toContain('Delay between requests cannot be negative');
    });

    it('should detect invalid scheduler configuration', () => {
      const config = loadScrapingConfig();
      config.redis.url = 'redis://localhost:6379';
      config.scheduler.maxConcurrentJobs = 0;
      config.scheduler.retryAttempts = -1;

      const result = validateScrapingConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Max concurrent jobs must be greater than 0');
      expect(result.errors).toContain('Retry attempts cannot be negative');
    });

    it('should detect invalid browser configuration', () => {
      const config = loadScrapingConfig();
      config.redis.url = 'redis://localhost:6379';
      config.browser.timeout = 0;

      const result = validateScrapingConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Browser timeout must be greater than 0');
    });

    it('should detect invalid static parser configuration', () => {
      const config = loadScrapingConfig();
      config.redis.url = 'redis://localhost:6379';
      config.staticParser.timeout = 0;
      config.staticParser.userAgent = '';

      const result = validateScrapingConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Static parser timeout must be greater than 0');
      expect(result.errors).toContain('User agent is required for static parser');
    });

    it('should detect invalid proxy configuration when enabled', () => {
      const config = loadScrapingConfig();
      config.redis.url = 'redis://localhost:6379';
      config.proxy.enabled = true;
      config.proxy.host = '';
      config.proxy.port = undefined;

      const result = validateScrapingConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Proxy host is required when proxy is enabled');
      expect(result.errors).toContain('Proxy port is required when proxy is enabled');
    });
  });
});