import { setTimeout } from 'timers/promises';

export interface RateLimiterConfig {
  requestsPerMinute: number;
  burstLimit?: number;
  windowSizeMs?: number;
}

export interface RateLimitInfo {
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

export class RateLimiter {
  private requests: number[] = [];
  private config: Required<RateLimiterConfig>;

  constructor(config: RateLimiterConfig) {
    this.config = {
      requestsPerMinute: config.requestsPerMinute,
      burstLimit: config.burstLimit || Math.ceil(config.requestsPerMinute / 4),
      windowSizeMs: config.windowSizeMs || 60000 // 1 minute
    };
  }

  async waitForPermission(): Promise<void> {
    const now = Date.now();
    this.cleanOldRequests(now);

    // Check if we're within burst limit
    if (this.requests.length >= this.config.burstLimit) {
      const oldestRequest = this.requests[0];
      const waitTime = oldestRequest + this.config.windowSizeMs - now;
      
      if (waitTime > 0) {
        await setTimeout(waitTime);
        return this.waitForPermission(); // Recursive call after waiting
      }
    }

    // Check if we're within rate limit
    if (this.requests.length >= this.config.requestsPerMinute) {
      const oldestRequest = this.requests[0];
      const waitTime = oldestRequest + this.config.windowSizeMs - now;
      
      if (waitTime > 0) {
        await setTimeout(waitTime);
        return this.waitForPermission(); // Recursive call after waiting
      }
    }

    // Record this request
    this.requests.push(now);
  }

  getRateLimitInfo(): RateLimitInfo {
    const now = Date.now();
    this.cleanOldRequests(now);

    const remaining = Math.max(0, this.config.requestsPerMinute - this.requests.length);
    const oldestRequest = this.requests[0];
    const resetTime = oldestRequest ? oldestRequest + this.config.windowSizeMs : now;
    
    let retryAfter: number | undefined;
    if (remaining === 0 && oldestRequest) {
      retryAfter = Math.max(0, resetTime - now);
    }

    return {
      remaining,
      resetTime,
      retryAfter
    };
  }

  private cleanOldRequests(now: number): void {
    const cutoff = now - this.config.windowSizeMs;
    this.requests = this.requests.filter(timestamp => timestamp > cutoff);
  }

  reset(): void {
    this.requests = [];
  }

  getRequestCount(): number {
    const now = Date.now();
    this.cleanOldRequests(now);
    return this.requests.length;
  }
}

export class GlobalRateLimiter {
  private limiters = new Map<string, RateLimiter>();

  getLimiter(key: string, config: RateLimiterConfig): RateLimiter {
    if (!this.limiters.has(key)) {
      this.limiters.set(key, new RateLimiter(config));
    }
    return this.limiters.get(key)!;
  }

  async waitForPermission(key: string, config: RateLimiterConfig): Promise<void> {
    const limiter = this.getLimiter(key, config);
    return limiter.waitForPermission();
  }

  getRateLimitInfo(key: string): RateLimitInfo | null {
    const limiter = this.limiters.get(key);
    return limiter ? limiter.getRateLimitInfo() : null;
  }

  reset(key?: string): void {
    if (key) {
      const limiter = this.limiters.get(key);
      if (limiter) {
        limiter.reset();
      }
    } else {
      this.limiters.clear();
    }
  }
}

// Global instance for shared rate limiting across the application
export const globalRateLimiter = new GlobalRateLimiter();