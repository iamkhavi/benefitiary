import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RateLimiter, GlobalRateLimiter, globalRateLimiter } from '../rate-limiter';

// Mock setTimeout
vi.mock('timers/promises', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    setTimeout: vi.fn().mockResolvedValue(undefined)
  };
});

const { setTimeout: mockSetTimeout } = await import('timers/promises');

describe('RateLimiter', () => {
  let rateLimiter: RateLimiter;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('basic rate limiting', () => {
    beforeEach(() => {
      rateLimiter = new RateLimiter({
        requestsPerMinute: 60,
        burstLimit: 15
      });
    });

    it('should allow requests within rate limit', async () => {
      // Should not wait for the first request
      await rateLimiter.waitForPermission();
      expect(mockSetTimeout).not.toHaveBeenCalled();
    });

    it('should track request count correctly', async () => {
      expect(rateLimiter.getRequestCount()).toBe(0);
      
      await rateLimiter.waitForPermission();
      expect(rateLimiter.getRequestCount()).toBe(1);
      
      await rateLimiter.waitForPermission();
      expect(rateLimiter.getRequestCount()).toBe(2);
    });

    it('should provide accurate rate limit info', async () => {
      const initialInfo = rateLimiter.getRateLimitInfo();
      expect(initialInfo.remaining).toBe(60);
      expect(initialInfo.retryAfter).toBeUndefined();

      await rateLimiter.waitForPermission();
      
      const afterRequestInfo = rateLimiter.getRateLimitInfo();
      expect(afterRequestInfo.remaining).toBe(59);
    });

    it('should reset request history', async () => {
      await rateLimiter.waitForPermission();
      await rateLimiter.waitForPermission();
      
      expect(rateLimiter.getRequestCount()).toBe(2);
      
      rateLimiter.reset();
      expect(rateLimiter.getRequestCount()).toBe(0);
    });
  });

  describe('burst limiting', () => {
    beforeEach(() => {
      rateLimiter = new RateLimiter({
        requestsPerMinute: 60,
        burstLimit: 3
      });
    });

    it('should enforce burst limit', async () => {
      // Make requests up to burst limit
      await rateLimiter.waitForPermission();
      await rateLimiter.waitForPermission();
      await rateLimiter.waitForPermission();
      
      expect(rateLimiter.getRequestCount()).toBe(3);
      
      // Check rate limit info shows we're at the limit
      const info = rateLimiter.getRateLimitInfo();
      expect(info.remaining).toBeLessThanOrEqual(57); // 60 - 3 = 57
    });
  });

  describe('time window management', () => {
    beforeEach(() => {
      rateLimiter = new RateLimiter({
        requestsPerMinute: 60,
        windowSizeMs: 10000 // 10 seconds for testing
      });
    });

    it('should clean old requests outside time window', async () => {
      const startTime = Date.now();
      vi.setSystemTime(startTime);
      
      // Make a request
      await rateLimiter.waitForPermission();
      expect(rateLimiter.getRequestCount()).toBe(1);
      
      // Move time forward beyond window
      vi.setSystemTime(startTime + 15000); // 15 seconds later
      
      // Old request should be cleaned up
      expect(rateLimiter.getRequestCount()).toBe(0);
    });

    it('should calculate correct retry after time', () => {
      const config = {
        requestsPerMinute: 2,
        windowSizeMs: 10000
      };
      
      rateLimiter = new RateLimiter(config);
      
      const startTime = Date.now();
      vi.setSystemTime(startTime);
      
      // Manually add requests to simulate rate limit being hit
      (rateLimiter as any).requests = [startTime, startTime];
      
      const info = rateLimiter.getRateLimitInfo();
      expect(info.remaining).toBe(0);
      expect(info.retryAfter).toBeGreaterThan(0);
      expect(info.retryAfter).toBeLessThanOrEqual(10000);
    });
  });

  describe('edge cases', () => {
    it('should handle zero requests per minute', () => {
      expect(() => {
        new RateLimiter({ requestsPerMinute: 0 });
      }).not.toThrow();
    });

    it('should handle very high request rates', async () => {
      rateLimiter = new RateLimiter({
        requestsPerMinute: 10000,
        burstLimit: 1000
      });
      
      // Should handle many requests without issues
      for (let i = 0; i < 100; i++) {
        await rateLimiter.waitForPermission();
      }
      
      expect(rateLimiter.getRequestCount()).toBe(100);
    });

    it('should handle custom window size', async () => {
      rateLimiter = new RateLimiter({
        requestsPerMinute: 60,
        windowSizeMs: 5000 // 5 seconds
      });
      
      const startTime = Date.now();
      vi.setSystemTime(startTime);
      
      await rateLimiter.waitForPermission();
      expect(rateLimiter.getRequestCount()).toBe(1);
      
      // Move time forward by 6 seconds (beyond window)
      vi.setSystemTime(startTime + 6000);
      
      expect(rateLimiter.getRequestCount()).toBe(0);
    });
  });
});

describe('GlobalRateLimiter', () => {
  let globalLimiter: GlobalRateLimiter;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    globalLimiter = new GlobalRateLimiter();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should create separate limiters for different keys', () => {
    const limiter1 = globalLimiter.getLimiter('key1', { requestsPerMinute: 60 });
    const limiter2 = globalLimiter.getLimiter('key2', { requestsPerMinute: 30 });
    
    expect(limiter1).not.toBe(limiter2);
    expect(limiter1).toBeInstanceOf(RateLimiter);
    expect(limiter2).toBeInstanceOf(RateLimiter);
  });

  it('should reuse limiters for same key', () => {
    const limiter1 = globalLimiter.getLimiter('key1', { requestsPerMinute: 60 });
    const limiter2 = globalLimiter.getLimiter('key1', { requestsPerMinute: 30 });
    
    expect(limiter1).toBe(limiter2);
  });

  it('should wait for permission using key-specific limiter', async () => {
    await globalLimiter.waitForPermission('test-key', { requestsPerMinute: 60 });
    
    const info = globalLimiter.getRateLimitInfo('test-key');
    expect(info).not.toBeNull();
    expect(info!.remaining).toBe(59);
  });

  it('should return null for non-existent key', () => {
    const info = globalLimiter.getRateLimitInfo('non-existent');
    expect(info).toBeNull();
  });

  it('should reset specific limiter', async () => {
    await globalLimiter.waitForPermission('key1', { requestsPerMinute: 60 });
    await globalLimiter.waitForPermission('key2', { requestsPerMinute: 60 });
    
    expect(globalLimiter.getRateLimitInfo('key1')!.remaining).toBe(59);
    expect(globalLimiter.getRateLimitInfo('key2')!.remaining).toBe(59);
    
    globalLimiter.reset('key1');
    
    expect(globalLimiter.getRateLimitInfo('key1')!.remaining).toBe(60);
    expect(globalLimiter.getRateLimitInfo('key2')!.remaining).toBe(59);
  });

  it('should reset all limiters', async () => {
    await globalLimiter.waitForPermission('key1', { requestsPerMinute: 60 });
    await globalLimiter.waitForPermission('key2', { requestsPerMinute: 60 });
    
    globalLimiter.reset();
    
    expect(globalLimiter.getRateLimitInfo('key1')).toBeNull();
    expect(globalLimiter.getRateLimitInfo('key2')).toBeNull();
  });
});

describe('globalRateLimiter singleton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    globalRateLimiter.reset(); // Clean state
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should be a GlobalRateLimiter instance', () => {
    expect(globalRateLimiter).toBeInstanceOf(GlobalRateLimiter);
  });

  it('should maintain state across calls', async () => {
    await globalRateLimiter.waitForPermission('test', { requestsPerMinute: 60 });
    
    const info = globalRateLimiter.getRateLimitInfo('test');
    expect(info).not.toBeNull();
    expect(info!.remaining).toBe(59);
  });
});