import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { HTTPClient, createDefaultHTTPClientConfig, ProxyConfig, HTTPClientConfig } from '../http-client';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios);

// Mock setTimeout
vi.mock('timers/promises', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    setTimeout: vi.fn().mockResolvedValue(undefined)
  };
});

describe('HTTPClient', () => {
  let httpClient: HTTPClient;
  let mockAxiosInstance: any;
  let config: HTTPClientConfig;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Create mock axios instance
    mockAxiosInstance = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      interceptors: {
        request: {
          use: vi.fn()
        },
        response: {
          use: vi.fn()
        }
      }
    };

    mockedAxios.create.mockReturnValue(mockAxiosInstance);

    config = createDefaultHTTPClientConfig();
    httpClient = new HTTPClient(config);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create axios instance with correct config', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        timeout: config.timeout,
        headers: config.headers
      });
    });

    it('should setup request and response interceptors', () => {
      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled();
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
    });
  });

  describe('HTTP methods', () => {
    beforeEach(() => {
      mockAxiosInstance.get.mockResolvedValue({ data: 'test', status: 200 });
      mockAxiosInstance.post.mockResolvedValue({ data: 'test', status: 201 });
      mockAxiosInstance.put.mockResolvedValue({ data: 'test', status: 200 });
      mockAxiosInstance.delete.mockResolvedValue({ data: 'test', status: 204 });
    });

    it('should make GET requests', async () => {
      const response = await httpClient.get('https://example.com');
      
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('https://example.com', undefined);
      expect(response.status).toBe(200);
    });

    it('should make POST requests', async () => {
      const data = { test: 'data' };
      const response = await httpClient.post('https://example.com', data);
      
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('https://example.com', data, undefined);
      expect(response.status).toBe(201);
    });

    it('should make PUT requests', async () => {
      const data = { test: 'data' };
      const response = await httpClient.put('https://example.com', data);
      
      expect(mockAxiosInstance.put).toHaveBeenCalledWith('https://example.com', data, undefined);
      expect(response.status).toBe(200);
    });

    it('should make DELETE requests', async () => {
      const response = await httpClient.delete('https://example.com');
      
      expect(mockAxiosInstance.delete).toHaveBeenCalledWith('https://example.com', undefined);
      expect(response.status).toBe(204);
    });
  });

  describe('retry mechanism', () => {
    it('should retry on network errors', async () => {
      const networkError = new Error('Network Error');
      networkError.code = 'ECONNRESET';
      
      mockAxiosInstance.get
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce({ data: 'success', status: 200 });

      const response = await httpClient.get('https://example.com');
      
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(3);
      expect(response.status).toBe(200);
    });

    it('should retry on 429 status code', async () => {
      const rateLimitError = {
        response: { status: 429 },
        message: 'Too Many Requests'
      };
      
      mockAxiosInstance.get
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce({ data: 'success', status: 200 });

      const response = await httpClient.get('https://example.com');
      
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2);
      expect(response.status).toBe(200);
    });

    it('should retry on 502, 503, 504 status codes', async () => {
      const serverError = {
        response: { status: 502 },
        message: 'Bad Gateway'
      };
      
      mockAxiosInstance.get
        .mockRejectedValueOnce(serverError)
        .mockResolvedValueOnce({ data: 'success', status: 200 });

      const response = await httpClient.get('https://example.com');
      
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2);
      expect(response.status).toBe(200);
    });

    it('should not retry on 404 status code', async () => {
      const notFoundError = {
        response: { status: 404 },
        message: 'Not Found'
      };
      
      mockAxiosInstance.get.mockRejectedValue(notFoundError);

      await expect(httpClient.get('https://example.com')).rejects.toEqual(notFoundError);
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);
    });

    it('should stop retrying after max attempts', async () => {
      const networkError = new Error('Network Error');
      networkError.code = 'ECONNRESET';
      
      mockAxiosInstance.get.mockRejectedValue(networkError);

      await expect(httpClient.get('https://example.com')).rejects.toEqual(networkError);
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(3); // 1 initial + 2 retries (maxRetries = 3 total attempts)
    });
  });

  describe('user agent rotation', () => {
    it('should rotate user agents', () => {
      const config = createDefaultHTTPClientConfig();
      config.userAgents = ['Agent1', 'Agent2', 'Agent3'];
      
      const client = new HTTPClient(config);
      
      // Access private method through type assertion for testing
      const getNextUserAgent = (client as any).getNextUserAgent.bind(client);
      
      expect(getNextUserAgent()).toBe('Agent1');
      expect(getNextUserAgent()).toBe('Agent2');
      expect(getNextUserAgent()).toBe('Agent3');
      expect(getNextUserAgent()).toBe('Agent1'); // Should cycle back
    });
  });

  describe('proxy rotation', () => {
    it('should rotate proxies when available', () => {
      const proxies: ProxyConfig[] = [
        { host: 'proxy1.com', port: 8080, type: 'http' },
        { host: 'proxy2.com', port: 8080, type: 'http' },
        { host: 'proxy3.com', port: 8080, type: 'http' }
      ];
      
      const config = createDefaultHTTPClientConfig();
      config.proxies = proxies;
      
      const client = new HTTPClient(config);
      
      // Access private method through type assertion for testing
      const getNextProxy = (client as any).getNextProxy.bind(client);
      
      expect(getNextProxy()).toEqual(proxies[0]);
      expect(getNextProxy()).toEqual(proxies[1]);
      expect(getNextProxy()).toEqual(proxies[2]);
      expect(getNextProxy()).toEqual(proxies[0]); // Should cycle back
    });

    it('should return null when no proxies are configured', () => {
      const config = createDefaultHTTPClientConfig();
      config.proxies = [];
      
      const client = new HTTPClient(config);
      
      // Access private method through type assertion for testing
      const getNextProxy = (client as any).getNextProxy.bind(client);
      
      expect(getNextProxy()).toBeNull();
    });
  });

  describe('proxy health checking', () => {
    it('should test proxy health successfully', async () => {
      const proxy: ProxyConfig = {
        host: 'proxy.example.com',
        port: 8080,
        type: 'http'
      };

      // Mock successful health check
      const mockTestClient = {
        get: vi.fn().mockResolvedValue({ status: 200, data: { origin: '1.2.3.4' } })
      };
      mockedAxios.create.mockReturnValue(mockTestClient);

      const isHealthy = await httpClient.testProxyHealth(proxy);
      
      expect(isHealthy).toBe(true);
      expect(mockedAxios.create).toHaveBeenCalledWith({
        timeout: 5000,
        proxy: {
          host: proxy.host,
          port: proxy.port,
          auth: undefined
        }
      });
    });

    it('should handle proxy health check failure', async () => {
      const proxy: ProxyConfig = {
        host: 'proxy.example.com',
        port: 8080,
        type: 'http'
      };

      // Mock failed health check
      const mockTestClient = {
        get: vi.fn().mockRejectedValue(new Error('Connection failed'))
      };
      mockedAxios.create.mockReturnValue(mockTestClient);

      const isHealthy = await httpClient.testProxyHealth(proxy);
      
      expect(isHealthy).toBe(false);
    });

    it('should test proxy with authentication', async () => {
      const proxy: ProxyConfig = {
        host: 'proxy.example.com',
        port: 8080,
        type: 'http',
        username: 'user',
        password: 'pass'
      };

      const mockTestClient = {
        get: vi.fn().mockResolvedValue({ status: 200 })
      };
      mockedAxios.create.mockReturnValue(mockTestClient);

      await httpClient.testProxyHealth(proxy);
      
      expect(mockedAxios.create).toHaveBeenCalledWith({
        timeout: 5000,
        proxy: {
          host: proxy.host,
          port: proxy.port,
          auth: {
            username: 'user',
            password: 'pass'
          }
        }
      });
    });
  });

  describe('getHealthyProxies', () => {
    it('should return only healthy proxies', async () => {
      const proxies: ProxyConfig[] = [
        { host: 'proxy1.com', port: 8080, type: 'http' },
        { host: 'proxy2.com', port: 8080, type: 'http' },
        { host: 'proxy3.com', port: 8080, type: 'http' }
      ];
      
      const config = createDefaultHTTPClientConfig();
      config.proxies = proxies;
      
      const client = new HTTPClient(config);
      
      // Mock health checks - proxy1 and proxy3 are healthy, proxy2 is not
      vi.spyOn(client, 'testProxyHealth')
        .mockResolvedValueOnce(true)   // proxy1
        .mockResolvedValueOnce(false)  // proxy2
        .mockResolvedValueOnce(true);  // proxy3

      const healthyProxies = await client.getHealthyProxies();
      
      expect(healthyProxies).toHaveLength(2);
      expect(healthyProxies).toContain(proxies[0]);
      expect(healthyProxies).toContain(proxies[2]);
      expect(healthyProxies).not.toContain(proxies[1]);
    });

    it('should return empty array when no proxies are healthy', async () => {
      const proxies: ProxyConfig[] = [
        { host: 'proxy1.com', port: 8080, type: 'http' },
        { host: 'proxy2.com', port: 8080, type: 'http' }
      ];
      
      const config = createDefaultHTTPClientConfig();
      config.proxies = proxies;
      
      const client = new HTTPClient(config);
      
      // Mock all health checks to fail
      vi.spyOn(client, 'testProxyHealth').mockResolvedValue(false);

      const healthyProxies = await client.getHealthyProxies();
      
      expect(healthyProxies).toHaveLength(0);
    });
  });

  describe('request statistics', () => {
    it('should track request statistics', () => {
      const stats = httpClient.getRequestStats();
      
      expect(stats).toHaveProperty('requestCount');
      expect(stats).toHaveProperty('lastRequestTime');
      expect(typeof stats.requestCount).toBe('number');
      expect(typeof stats.lastRequestTime).toBe('number');
    });

    it('should reset statistics', () => {
      httpClient.resetStats();
      const stats = httpClient.getRequestStats();
      
      expect(stats.requestCount).toBe(0);
      expect(stats.lastRequestTime).toBe(0);
    });
  });

  describe('random headers generation', () => {
    it('should generate random headers', () => {
      const client = new HTTPClient(config);
      
      // Access private method through type assertion for testing
      const generateRandomHeaders = (client as any).generateRandomHeaders.bind(client);
      
      const headers1 = generateRandomHeaders();
      const headers2 = generateRandomHeaders();
      
      expect(headers1).toHaveProperty('Accept');
      expect(headers1).toHaveProperty('Accept-Language');
      expect(headers1).toHaveProperty('Accept-Encoding');
      expect(headers1).toHaveProperty('Connection');
      
      // Headers should be objects with string values
      expect(typeof headers1.Accept).toBe('string');
      expect(typeof headers1['Accept-Language']).toBe('string');
      expect(typeof headers1['Accept-Encoding']).toBe('string');
      expect(typeof headers1.Connection).toBe('string');
    });
  });

  describe('exponential backoff', () => {
    it('should calculate exponential backoff correctly', () => {
      const retryConfig = {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 10000,
        exponentialBackoff: true
      };
      
      const client = new HTTPClient(config, retryConfig);
      
      // Access private method through type assertion for testing
      const calculateBackoffDelay = (client as any).calculateBackoffDelay.bind(client);
      
      const delay1 = calculateBackoffDelay(1);
      const delay2 = calculateBackoffDelay(2);
      const delay3 = calculateBackoffDelay(3);
      
      // Should increase exponentially (with jitter, so approximate)
      expect(delay1).toBeGreaterThanOrEqual(1000);
      expect(delay1).toBeLessThan(3000);
      
      expect(delay2).toBeGreaterThanOrEqual(2000);
      expect(delay2).toBeLessThan(5000);
      
      expect(delay3).toBeGreaterThanOrEqual(4000);
      expect(delay3).toBeLessThan(9000);
    });

    it('should respect max delay', () => {
      const retryConfig = {
        maxRetries: 10,
        baseDelay: 1000,
        maxDelay: 5000,
        exponentialBackoff: true
      };
      
      const client = new HTTPClient(config, retryConfig);
      
      // Access private method through type assertion for testing
      const calculateBackoffDelay = (client as any).calculateBackoffDelay.bind(client);
      
      const delay = calculateBackoffDelay(10); // Very high attempt number
      
      expect(delay).toBeLessThanOrEqual(5000);
    });

    it('should use base delay when exponential backoff is disabled', () => {
      const retryConfig = {
        maxRetries: 3,
        baseDelay: 2000,
        maxDelay: 10000,
        exponentialBackoff: false
      };
      
      const client = new HTTPClient(config, retryConfig);
      
      // Access private method through type assertion for testing
      const calculateBackoffDelay = (client as any).calculateBackoffDelay.bind(client);
      
      expect(calculateBackoffDelay(1)).toBe(2000);
      expect(calculateBackoffDelay(2)).toBe(2000);
      expect(calculateBackoffDelay(3)).toBe(2000);
    });
  });
});

describe('createDefaultHTTPClientConfig', () => {
  it('should create valid default configuration', () => {
    const config = createDefaultHTTPClientConfig();
    
    expect(config).toHaveProperty('timeout');
    expect(config).toHaveProperty('retries');
    expect(config).toHaveProperty('userAgents');
    expect(config).toHaveProperty('proxies');
    expect(config).toHaveProperty('rateLimit');
    expect(config).toHaveProperty('headers');
    
    expect(typeof config.timeout).toBe('number');
    expect(typeof config.retries).toBe('number');
    expect(Array.isArray(config.userAgents)).toBe(true);
    expect(Array.isArray(config.proxies)).toBe(true);
    expect(typeof config.rateLimit).toBe('object');
    expect(typeof config.headers).toBe('object');
    
    expect(config.userAgents.length).toBeGreaterThan(0);
    expect(config.rateLimit).toHaveProperty('requestsPerMinute');
    expect(config.rateLimit).toHaveProperty('delayBetweenRequests');
    expect(config.rateLimit).toHaveProperty('respectRobotsTxt');
  });
});