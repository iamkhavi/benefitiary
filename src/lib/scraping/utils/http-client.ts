import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { setTimeout } from 'timers/promises';

export interface ProxyConfig {
  host: string;
  port: number;
  username?: string;
  password?: string;
  type: 'http' | 'https' | 'socks5';
}

export interface RateLimitConfig {
  requestsPerMinute: number;
  delayBetweenRequests: number;
  respectRobotsTxt: boolean;
}

export interface HTTPClientConfig {
  timeout: number;
  retries: number;
  userAgents: string[];
  proxies: ProxyConfig[];
  rateLimit: RateLimitConfig;
  headers: Record<string, string>;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  exponentialBackoff: boolean;
}

export class HTTPClient {
  private axiosInstance: AxiosInstance;
  private config: HTTPClientConfig;
  private retryConfig: RetryConfig;
  private currentProxyIndex = 0;
  private requestCount = 0;
  private lastRequestTime = 0;
  private userAgentIndex = 0;

  constructor(config: HTTPClientConfig, retryConfig?: Partial<RetryConfig>) {
    this.config = config;
    this.retryConfig = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 30000,
      exponentialBackoff: true,
      ...retryConfig
    };

    this.axiosInstance = axios.create({
      timeout: config.timeout,
      headers: config.headers
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor for user agent rotation and proxy setup
    this.axiosInstance.interceptors.request.use(
      async (config) => {
        // Rotate user agent
        config.headers['User-Agent'] = this.getNextUserAgent();
        
        // Add random headers for anti-detection
        const randomHeaders = this.generateRandomHeaders();
        Object.assign(config.headers || {}, randomHeaders);

        // Set up proxy if available
        const proxy = this.getNextProxy();
        if (proxy) {
          config.proxy = {
            host: proxy.host,
            port: proxy.port,
            auth: proxy.username && proxy.password ? {
              username: proxy.username,
              password: proxy.password
            } : undefined
          };
        }

        // Apply rate limiting
        await this.applyRateLimit();

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('HTTP Client Error:', {
          url: error.config?.url,
          status: error.response?.status,
          message: error.message
        });
        return Promise.reject(error);
      }
    );
  }

  private getNextUserAgent(): string {
    const userAgent = this.config.userAgents[this.userAgentIndex];
    this.userAgentIndex = (this.userAgentIndex + 1) % this.config.userAgents.length;
    return userAgent;
  }

  private getNextProxy(): ProxyConfig | null {
    if (this.config.proxies.length === 0) {
      return null;
    }

    const proxy = this.config.proxies[this.currentProxyIndex];
    this.currentProxyIndex = (this.currentProxyIndex + 1) % this.config.proxies.length;
    return proxy;
  }

  private generateRandomHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};

    // Random accept headers
    const acceptHeaders = [
      'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8'
    ];
    headers['Accept'] = acceptHeaders[Math.floor(Math.random() * acceptHeaders.length)];

    // Random accept-language
    const languages = [
      'en-US,en;q=0.9',
      'en-GB,en;q=0.9',
      'en-US,en;q=0.8,es;q=0.6'
    ];
    headers['Accept-Language'] = languages[Math.floor(Math.random() * languages.length)];

    // Random accept-encoding
    headers['Accept-Encoding'] = 'gzip, deflate, br';

    // Random connection
    headers['Connection'] = Math.random() > 0.5 ? 'keep-alive' : 'close';

    // Random DNT header
    if (Math.random() > 0.7) {
      headers['DNT'] = '1';
    }

    return headers;
  }

  private async applyRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.config.rateLimit.delayBetweenRequests) {
      const delay = this.config.rateLimit.delayBetweenRequests - timeSinceLastRequest;
      await setTimeout(delay);
    }

    this.lastRequestTime = Date.now();
    this.requestCount++;
  }

  private calculateBackoffDelay(attempt: number): number {
    if (!this.retryConfig.exponentialBackoff) {
      return this.retryConfig.baseDelay;
    }

    const delay = this.retryConfig.baseDelay * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 1000; // Add jitter to avoid thundering herd
    return Math.min(delay + jitter, this.retryConfig.maxDelay);
  }

  private shouldRetry(error: any, attempt: number): boolean {
    if (attempt >= this.retryConfig.maxRetries) {
      return false;
    }

    // Retry on network errors
    if (error.code === 'ECONNRESET' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
      return true;
    }

    // Retry on specific HTTP status codes
    if (error.response) {
      const status = error.response.status;
      return status === 429 || status === 502 || status === 503 || status === 504;
    }

    return false;
  }

  async get(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse> {
    return this.executeWithRetry(() => this.axiosInstance.get(url, config));
  }

  async post(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse> {
    return this.executeWithRetry(() => this.axiosInstance.post(url, data, config));
  }

  async put(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse> {
    return this.executeWithRetry(() => this.axiosInstance.put(url, data, config));
  }

  async delete(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse> {
    return this.executeWithRetry(() => this.axiosInstance.delete(url, config));
  }

  private async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: any;
    
    for (let attempt = 1; attempt <= this.retryConfig.maxRetries + 1; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (attempt > this.retryConfig.maxRetries || !this.shouldRetry(error, attempt)) {
          throw error;
        }

        const delay = this.calculateBackoffDelay(attempt);
        console.warn(`Request failed (attempt ${attempt}), retrying in ${delay}ms:`, error instanceof Error ? error.message : error);
        await setTimeout(delay);
      }
    }
    
    throw lastError;
  }

  async testProxyHealth(proxy: ProxyConfig): Promise<boolean> {
    try {
      const testClient = axios.create({
        timeout: 5000,
        proxy: {
          host: proxy.host,
          port: proxy.port,
          auth: proxy.username && proxy.password ? {
            username: proxy.username,
            password: proxy.password
          } : undefined
        }
      });

      const response = await testClient.get('https://httpbin.org/ip');
      return response.status === 200;
    } catch (error) {
      console.warn(`Proxy health check failed for ${proxy.host}:${proxy.port}:`, error);
      return false;
    }
  }

  async getHealthyProxies(): Promise<ProxyConfig[]> {
    const healthChecks = this.config.proxies.map(async (proxy) => {
      const isHealthy = await this.testProxyHealth(proxy);
      return { proxy, isHealthy };
    });

    const results = await Promise.all(healthChecks);
    return results.filter(result => result.isHealthy).map(result => result.proxy);
  }

  getRequestStats(): { requestCount: number; lastRequestTime: number } {
    return {
      requestCount: this.requestCount,
      lastRequestTime: this.lastRequestTime
    };
  }

  resetStats(): void {
    this.requestCount = 0;
    this.lastRequestTime = 0;
  }
}

// Default configuration factory
export function createDefaultHTTPClientConfig(): HTTPClientConfig {
  return {
    timeout: 30000,
    retries: 3,
    userAgents: [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0'
    ],
    proxies: [], // No proxies by default
    rateLimit: {
      requestsPerMinute: 30,
      delayBetweenRequests: 2000,
      respectRobotsTxt: true
    },
    headers: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    }
  };
}