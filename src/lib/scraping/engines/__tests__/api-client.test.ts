/**
 * Unit tests for API Client Engine
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { APIClientEngine } from '../api-client';
import { HTTPClient } from '../../utils/http-client';
import { 
  APIClientConfig, 
  SourceConfiguration, 
  ScrapedSourceType,
  AuthConfig,
  PaginationConfig 
} from '../../types';

// Mock the HTTPClient
vi.mock('../../utils/http-client', () => ({
  HTTPClient: vi.fn(),
  createDefaultHTTPClientConfig: vi.fn(() => ({
    timeout: 30000,
    retries: 3,
    userAgents: ['test-agent'],
    proxies: [],
    rateLimit: {
      requestsPerMinute: 30,
      delayBetweenRequests: 2000,
      respectRobotsTxt: true
    },
    headers: {}
  }))
}));

describe('APIClientEngine', () => {
  let engine: APIClientEngine;
  let mockHttpClient: {
    get: Mock;
    post: Mock;
  };
  let mockConfig: APIClientConfig;
  let mockSource: SourceConfiguration;

  beforeEach(() => {
    mockHttpClient = {
      get: vi.fn(),
      post: vi.fn()
    };
    
    (HTTPClient as any).mockImplementation(() => mockHttpClient);

    mockConfig = {
      baseUrl: 'https://api.example.com',
      authentication: {
        type: 'apikey',
        credentials: { apiKey: 'test-key' }
      },
      rateLimit: {
        requestsPerMinute: 60,
        delayBetweenRequests: 1000,
        respectRobotsTxt: true
      },
      responseFormat: 'json',
      pagination: {
        type: 'offset',
        pageSize: 100,
        maxPages: 5
      }
    };

    mockSource = {
      id: 'test-api-source',
      url: 'https://api.example.com/grants',
      type: ScrapedSourceType.GOV,
      engine: 'api',
      selectors: {
        grantContainer: '',
        title: '',
        description: '',
        deadline: '',
        fundingAmount: '',
        eligibility: '',
        applicationUrl: '',
        funderInfo: ''
      },
      rateLimit: mockConfig.rateLimit,
      headers: {},
      authentication: mockConfig.authentication
    };

    engine = new APIClientEngine(mockConfig);
  });

  describe('constructor', () => {
    it('should initialize with provided configuration', () => {
      const config = engine.getConfiguration();
      
      expect(config.baseUrl).toBe('https://api.example.com');
      expect(config.responseFormat).toBe('json');
      expect(config.pagination.type).toBe('offset');
      expect(config.pagination.pageSize).toBe(100);
    });

    it('should set correct accept headers for different response formats', () => {
      const xmlConfig = { ...mockConfig, responseFormat: 'xml' as const };
      const xmlEngine = new APIClientEngine(xmlConfig);
      
      const csvConfig = { ...mockConfig, responseFormat: 'csv' as const };
      const csvEngine = new APIClientEngine(csvConfig);
      
      // We can't directly test headers, but we can test the configuration
      expect(xmlEngine.getConfiguration().responseFormat).toBe('xml');
      expect(csvEngine.getConfiguration().responseFormat).toBe('csv');
    });
  });

  describe('scrape', () => {
    it('should successfully scrape data from API', async () => {
      const mockApiResponse = {
        data: {
          data: [
            {
              title: 'Test Grant 1',
              description: 'First test grant',
              deadline: '2024-12-31',
              amount: '100000',
              funder: 'Test Agency'
            },
            {
              title: 'Test Grant 2',
              description: 'Second test grant',
              deadline: '2024-11-30',
              amount: '50000',
              funder: 'Another Agency'
            }
          ],
          hasMore: false
        },
        status: 200
      };

      mockHttpClient.get.mockResolvedValue(mockApiResponse);

      const results = await engine.scrape(mockSource);

      expect(results).toHaveLength(2);
      expect(results[0].title).toBe('Test Grant 1');
      expect(results[0].description).toBe('First test grant');
      expect(results[0].deadline).toBe('2024-12-31');
      expect(results[0].fundingAmount).toBe('100000');
      expect(results[0].funderName).toBe('Test Agency');
      expect(results[0].sourceUrl).toBe(mockSource.url);
      expect(results[0].scrapedAt).toBeInstanceOf(Date);
    });

    it('should handle pagination correctly', async () => {
      const page1Response = {
        data: {
          data: [
            { title: 'Grant 1', funder: 'Agency 1' }
          ],
          hasMore: true
        },
        status: 200
      };

      const page2Response = {
        data: {
          data: [
            { title: 'Grant 2', funder: 'Agency 2' }
          ],
          hasMore: false
        },
        status: 200
      };

      mockHttpClient.get
        .mockResolvedValueOnce(page1Response)
        .mockResolvedValueOnce(page2Response);

      const results = await engine.scrape(mockSource);

      expect(results).toHaveLength(2);
      expect(results[0].title).toBe('Grant 1');
      expect(results[1].title).toBe('Grant 2');
      expect(mockHttpClient.get).toHaveBeenCalledTimes(2);
    });

    it('should handle empty API response', async () => {
      const mockApiResponse = {
        data: {
          data: []
        },
        status: 200
      };

      mockHttpClient.get.mockResolvedValue(mockApiResponse);

      const results = await engine.scrape(mockSource);

      expect(results).toHaveLength(0);
    });

    it('should handle API errors', async () => {
      mockHttpClient.get.mockRejectedValue(new Error('API Error'));

      await expect(engine.scrape(mockSource)).rejects.toThrow('API scraping failed for test-api-source: API Error');
    });

    it('should handle HTTP error status codes', async () => {
      mockHttpClient.get.mockResolvedValue({
        status: 500,
        statusText: 'Internal Server Error'
      });

      await expect(engine.scrape(mockSource)).rejects.toThrow('API returned status 500: Internal Server Error');
    });
  });

  describe('authentication', () => {
    it('should handle API key authentication', async () => {
      const mockResponse = {
        data: { data: [] },
        status: 200
      };

      mockHttpClient.get.mockResolvedValue(mockResponse);

      await engine.scrape(mockSource);

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        mockSource.url,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'test-key'
          })
        })
      );
    });

    it('should handle bearer token authentication', async () => {
      const bearerSource = {
        ...mockSource,
        authentication: {
          type: 'bearer' as const,
          credentials: { token: 'bearer-token-123' }
        }
      };

      const mockResponse = {
        data: { data: [] },
        status: 200
      };

      mockHttpClient.get.mockResolvedValue(mockResponse);

      await engine.scrape(bearerSource);

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        bearerSource.url,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer bearer-token-123'
          })
        })
      );
    });

    it('should handle basic authentication', async () => {
      const basicSource = {
        ...mockSource,
        authentication: {
          type: 'basic' as const,
          credentials: { username: 'user', password: 'pass' }
        }
      };

      const mockResponse = {
        data: { data: [] },
        status: 200
      };

      mockHttpClient.get.mockResolvedValue(mockResponse);

      await engine.scrape(basicSource);

      const expectedAuth = Buffer.from('user:pass').toString('base64');
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        basicSource.url,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': `Basic ${expectedAuth}`
          })
        })
      );
    });

    it('should handle OAuth2 authentication', async () => {
      const oauthSource = {
        ...mockSource,
        authentication: {
          type: 'oauth2' as const,
          credentials: {
            tokenEndpoint: 'https://api.example.com/oauth/token',
            clientId: 'client123',
            clientSecret: 'secret456'
          }
        }
      };

      // Mock OAuth2 token response
      const tokenResponse = {
        data: { access_token: 'oauth-token-789' },
        status: 200
      };

      const dataResponse = {
        data: { data: [] },
        status: 200
      };

      mockHttpClient.post.mockResolvedValue(tokenResponse);
      mockHttpClient.get.mockResolvedValue(dataResponse);

      await engine.scrape(oauthSource);

      // Verify OAuth2 token request
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        'https://api.example.com/oauth/token',
        {
          grant_type: 'client_credentials',
          client_id: 'client123',
          client_secret: 'secret456'
        },
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        })
      );

      // Verify data request with OAuth token
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        oauthSource.url,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer oauth-token-789'
          })
        })
      );
    });

    it('should handle missing authentication gracefully', async () => {
      const noAuthSource = {
        ...mockSource,
        authentication: undefined
      };

      const mockResponse = {
        data: { data: [] },
        status: 200
      };

      mockHttpClient.get.mockResolvedValue(mockResponse);

      await engine.scrape(noAuthSource);

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        noAuthSource.url,
        expect.objectContaining({
          headers: expect.not.objectContaining({
            'Authorization': expect.anything()
          })
        })
      );
    });
  });

  describe('pagination', () => {
    it('should handle offset pagination', async () => {
      const offsetConfig = {
        ...mockConfig,
        pagination: {
          type: 'offset' as const,
          pageSize: 10,
          maxPages: 2
        }
      };

      const offsetEngine = new APIClientEngine(offsetConfig);

      const page1Response = {
        data: { data: [{ title: 'Grant 1' }], hasMore: true },
        status: 200
      };

      const page2Response = {
        data: { data: [{ title: 'Grant 2' }], hasMore: false },
        status: 200
      };

      mockHttpClient.get
        .mockResolvedValueOnce(page1Response)
        .mockResolvedValueOnce(page2Response);

      await offsetEngine.scrape(mockSource);

      expect(mockHttpClient.get).toHaveBeenNthCalledWith(1,
        mockSource.url,
        expect.objectContaining({
          params: expect.objectContaining({
            limit: '10',
            offset: '0'
          })
        })
      );

      expect(mockHttpClient.get).toHaveBeenNthCalledWith(2,
        mockSource.url,
        expect.objectContaining({
          params: expect.objectContaining({
            limit: '10',
            offset: '10'
          })
        })
      );
    });

    it('should handle page-based pagination', async () => {
      const pageConfig = {
        ...mockConfig,
        pagination: {
          type: 'page' as const,
          pageSize: 20,
          maxPages: 2
        }
      };

      const pageEngine = new APIClientEngine(pageConfig);

      const page1Response = {
        data: { data: [{ title: 'Grant 1' }], hasMore: true },
        status: 200
      };

      const page2Response = {
        data: { data: [{ title: 'Grant 2' }], hasMore: false },
        status: 200
      };

      mockHttpClient.get
        .mockResolvedValueOnce(page1Response)
        .mockResolvedValueOnce(page2Response);

      await pageEngine.scrape(mockSource);

      expect(mockHttpClient.get).toHaveBeenNthCalledWith(1,
        mockSource.url,
        expect.objectContaining({
          params: expect.objectContaining({
            page: '1',
            per_page: '20'
          })
        })
      );

      expect(mockHttpClient.get).toHaveBeenNthCalledWith(2,
        mockSource.url,
        expect.objectContaining({
          params: expect.objectContaining({
            page: '2',
            per_page: '20'
          })
        })
      );
    });

    it('should handle cursor-based pagination', async () => {
      const cursorConfig = {
        ...mockConfig,
        pagination: {
          type: 'cursor' as const,
          pageSize: 15,
          maxPages: 2
        }
      };

      const cursorEngine = new APIClientEngine(cursorConfig);

      const page1Response = {
        data: { data: [{ title: 'Grant 1' }], hasMore: true },
        status: 200
      };

      const page2Response = {
        data: { data: [{ title: 'Grant 2' }], hasMore: false },
        status: 200
      };

      mockHttpClient.get
        .mockResolvedValueOnce(page1Response)
        .mockResolvedValueOnce(page2Response);

      await cursorEngine.scrape(mockSource);

      expect(mockHttpClient.get).toHaveBeenNthCalledWith(1,
        mockSource.url,
        expect.objectContaining({
          params: expect.objectContaining({
            limit: '15'
          })
        })
      );

      expect(mockHttpClient.get).toHaveBeenNthCalledWith(2,
        mockSource.url,
        expect.objectContaining({
          params: expect.objectContaining({
            limit: '15',
            cursor: 'page_1'
          })
        })
      );
    });

    it('should respect maxPages limit', async () => {
      const limitedConfig = {
        ...mockConfig,
        pagination: {
          type: 'offset' as const,
          pageSize: 10,
          maxPages: 1
        }
      };

      const limitedEngine = new APIClientEngine(limitedConfig);

      const response = {
        data: { data: [{ title: 'Grant 1' }], hasMore: true },
        status: 200
      };

      mockHttpClient.get.mockResolvedValue(response);

      await limitedEngine.scrape(mockSource);

      expect(mockHttpClient.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('data transformation', () => {
    it('should handle different field name variations', async () => {
      const mockResponse = {
        data: {
          data: [
            {
              name: 'Grant with name field',
              summary: 'Grant with summary field',
              dueDate: '2024-12-31',
              budget: '75000',
              requirements: 'Grant with requirements field',
              applyUrl: 'https://apply.example.com',
              sponsor: 'Grant with sponsor field'
            }
          ]
        },
        status: 200
      };

      mockHttpClient.get.mockResolvedValue(mockResponse);

      const results = await engine.scrape(mockSource);

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Grant with name field');
      expect(results[0].description).toBe('Grant with summary field');
      expect(results[0].deadline).toBe('2024-12-31');
      expect(results[0].fundingAmount).toBe('75000');
      expect(results[0].eligibility).toBe('Grant with requirements field');
      expect(results[0].applicationUrl).toBe('https://apply.example.com');
      expect(results[0].funderName).toBe('Grant with sponsor field');
    });

    it('should handle missing fields gracefully', async () => {
      const mockResponse = {
        data: {
          data: [
            {
              title: 'Minimal Grant'
              // Missing most fields
            }
          ]
        },
        status: 200
      };

      mockHttpClient.get.mockResolvedValue(mockResponse);

      const results = await engine.scrape(mockSource);

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Minimal Grant');
      expect(results[0].description).toBeUndefined();
      expect(results[0].deadline).toBeUndefined();
      expect(results[0].fundingAmount).toBeUndefined();
      expect(results[0].eligibility).toBeUndefined();
      expect(results[0].applicationUrl).toBeUndefined();
      expect(results[0].funderName).toBe('Unknown Funder');
    });

    it('should preserve raw content', async () => {
      const mockResponse = {
        data: {
          data: [
            {
              title: 'Test Grant',
              customField: 'custom value',
              metadata: {
                id: 123,
                category: 'research'
              }
            }
          ]
        },
        status: 200
      };

      mockHttpClient.get.mockResolvedValue(mockResponse);

      const results = await engine.scrape(mockSource);

      expect(results[0].rawContent).toEqual({
        title: 'Test Grant',
        customField: 'custom value',
        metadata: {
          id: 123,
          category: 'research'
        }
      });
    });
  });

  describe('testConnection', () => {
    it('should return true for successful connection', async () => {
      mockHttpClient.get.mockResolvedValue({
        status: 200,
        data: { data: [] }
      });

      const result = await engine.testConnection('https://api.example.com/test');

      expect(result).toBe(true);
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        'https://api.example.com/test',
        expect.objectContaining({
          timeout: 10000,
          params: { limit: '1' }
        })
      );
    });

    it('should return false for failed connection', async () => {
      mockHttpClient.get.mockRejectedValue(new Error('Connection failed'));

      const result = await engine.testConnection('https://api.example.com/test');

      expect(result).toBe(false);
    });

    it('should include authentication in connection test', async () => {
      const authConfig: AuthConfig = {
        type: 'bearer',
        credentials: { token: 'test-token' }
      };

      mockHttpClient.get.mockResolvedValue({
        status: 200,
        data: { data: [] }
      });

      const result = await engine.testConnection('https://api.example.com/test', authConfig);

      expect(result).toBe(true);
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        'https://api.example.com/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token'
          })
        })
      );
    });
  });

  describe('error handling', () => {
    it('should continue after individual page errors', async () => {
      const successResponse = {
        data: { data: [{ title: 'Success Grant' }], hasMore: true },
        status: 200
      };

      mockHttpClient.get
        .mockRejectedValueOnce(new Error('Page 1 error'))
        .mockResolvedValueOnce(successResponse)
        .mockRejectedValueOnce(new Error('Page 3 error'));

      const results = await engine.scrape(mockSource);

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Success Grant');
    });

    it('should stop after multiple consecutive errors', async () => {
      mockHttpClient.get
        .mockRejectedValueOnce(new Error('Error 1'))
        .mockRejectedValueOnce(new Error('Error 2'))
        .mockRejectedValueOnce(new Error('Error 3'));

      await expect(engine.scrape(mockSource)).rejects.toThrow('API scraping failed for test-api-source: Error 3');
      expect(mockHttpClient.get).toHaveBeenCalledTimes(3);
    });

    it('should handle authentication errors', async () => {
      const oauthSource = {
        ...mockSource,
        authentication: {
          type: 'oauth2' as const,
          credentials: {
            tokenEndpoint: 'https://api.example.com/oauth/token',
            clientId: 'client123',
            clientSecret: 'secret456'
          }
        }
      };

      mockHttpClient.post.mockRejectedValue(new Error('OAuth failed'));

      await expect(engine.scrape(oauthSource)).rejects.toThrow('Authentication failed: OAuth2 authentication failed: OAuth failed');
    });
  });
});