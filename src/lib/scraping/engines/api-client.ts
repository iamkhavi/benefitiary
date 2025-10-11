/**
 * API Client Engine for structured data access
 * Generic engine for REST API and GraphQL endpoint scraping
 */

import { 
  ScrapingEngine, 
  SourceConfiguration, 
  RawGrantData, 
  APIClientConfig,
  AuthConfig,
  PaginationConfig,
  ScrapingError
} from '../types';
import { HTTPClient, createDefaultHTTPClientConfig } from '../utils/http-client';

export class APIClientEngine implements ScrapingEngine {
  private httpClient: HTTPClient;
  private config: APIClientConfig;

  constructor(config: APIClientConfig) {
    this.config = config;
    
    // Initialize HTTP client with API-specific configuration
    const httpConfig = createDefaultHTTPClientConfig();
    httpConfig.timeout = 30000;
    httpConfig.rateLimit = config.rateLimit;
    httpConfig.headers = {
      ...httpConfig.headers,
      'Accept': this.getAcceptHeader(),
      'Content-Type': 'application/json'
    };

    this.httpClient = new HTTPClient(httpConfig);
  }

  async scrape(source: SourceConfiguration): Promise<RawGrantData[]> {
    try {
      console.log(`Starting API scraping for source: ${source.id}`);
      
      // Authenticate if required
      const authToken = await this.authenticateRequest(source.authentication);
      
      // Fetch paginated data
      const allData = await this.fetchPaginatedData(source.url, authToken);
      
      // Transform API response to RawGrantData format
      const transformedData = await this.transformAPIResponse(allData, source);
      
      console.log(`API scraping completed for ${source.id}. Found ${transformedData.length} grants.`);
      return transformedData;
      
    } catch (error) {
      const scrapingError: ScrapingError = {
        type: 'NETWORK',
        message: `API scraping failed for ${source.id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        url: source.url,
        timestamp: new Date()
      };
      
      console.error('API scraping error:', scrapingError);
      throw scrapingError;
    }
  }

  private async authenticateRequest(authConfig?: AuthConfig): Promise<string> {
    if (!authConfig) {
      return '';
    }

    try {
      switch (authConfig.type) {
        case 'bearer':
          return `Bearer ${authConfig.credentials.token}`;
          
        case 'basic':
          const credentials = Buffer.from(
            `${authConfig.credentials.username}:${authConfig.credentials.password}`
          ).toString('base64');
          return `Basic ${credentials}`;
          
        case 'apikey':
          // API key can be used in headers or query params
          return authConfig.credentials.apiKey || '';
          
        case 'oauth2':
          // OAuth2 implementation would require token exchange
          return await this.performOAuth2Flow(authConfig);
          
        default:
          console.warn(`Unsupported authentication type: ${authConfig.type}`);
          return '';
      }
    } catch (error) {
      console.error('Authentication failed:', error);
      throw new Error(`Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async performOAuth2Flow(authConfig: AuthConfig): Promise<string> {
    // Simplified OAuth2 client credentials flow
    try {
      const tokenEndpoint = authConfig.credentials.tokenEndpoint;
      const clientId = authConfig.credentials.clientId;
      const clientSecret = authConfig.credentials.clientSecret;
      
      if (!tokenEndpoint || !clientId || !clientSecret) {
        throw new Error('Missing OAuth2 configuration');
      }

      const response = await this.httpClient.post(tokenEndpoint, {
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret
      }, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      const tokenData = response.data;
      return `Bearer ${tokenData.access_token}`;
      
    } catch (error) {
      throw new Error(`OAuth2 authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async fetchPaginatedData(endpoint: string, authToken?: string): Promise<any[]> {
    const allData: any[] = [];
    let currentPage = 0;
    let hasMorePages = true;
    let consecutiveErrors = 0;

    const headers: Record<string, string> = {};
    if (authToken) {
      headers['Authorization'] = authToken;
    }

    while (hasMorePages && currentPage < this.config.pagination.maxPages) {
      try {
        const pageData = await this.fetchPage(endpoint, currentPage, headers);
        
        if (pageData && Array.isArray(pageData.data) && pageData.data.length > 0) {
          allData.push(...pageData.data);
          
          // Check pagination based on configuration
          hasMorePages = this.hasMorePages(pageData, currentPage);
          consecutiveErrors = 0; // Reset consecutive error count on success
          
          console.log(`Fetched page ${currentPage + 1}: ${pageData.data.length} items`);
        } else {
          hasMorePages = false;
        }
        
        currentPage++;
        
      } catch (error) {
        console.error(`Error fetching page ${currentPage}:`, error);
        
        consecutiveErrors++;
        currentPage++;
        
        // If we have too many consecutive errors and no successful pages, throw error
        if (consecutiveErrors >= 3 && allData.length === 0) {
          throw error;
        }
        
        // Stop after 3 consecutive errors
        if (consecutiveErrors >= 3) {
          break;
        }
      }
    }

    return allData;
  }

  private async fetchPage(endpoint: string, page: number, headers: Record<string, string>): Promise<any> {
    const params = this.buildPaginationParams(page);
    
    const response = await this.httpClient.get(endpoint, {
      params,
      headers,
      timeout: 30000
    });

    if (response.status !== 200) {
      throw new Error(`API returned status ${response.status}: ${response.statusText}`);
    }

    return response.data;
  }

  private buildPaginationParams(page: number): Record<string, string> {
    const params: Record<string, string> = {};

    switch (this.config.pagination.type) {
      case 'offset':
        params.limit = this.config.pagination.pageSize.toString();
        params.offset = (page * this.config.pagination.pageSize).toString();
        break;
        
      case 'page':
        params.page = (page + 1).toString(); // Most APIs use 1-based page numbers
        params.per_page = this.config.pagination.pageSize.toString();
        break;
        
      case 'cursor':
        // Cursor pagination would require storing the cursor from previous response
        // This is a simplified implementation
        params.limit = this.config.pagination.pageSize.toString();
        if (page > 0) {
          params.cursor = `page_${page}`;
        }
        break;
    }

    return params;
  }

  private hasMorePages(pageData: any, currentPage: number): boolean {
    // Check if there are more pages based on response structure
    if (pageData.hasMore !== undefined) {
      return pageData.hasMore;
    }
    
    if (pageData.totalPages !== undefined) {
      return currentPage + 1 < pageData.totalPages;
    }
    
    if (pageData.data && Array.isArray(pageData.data)) {
      return pageData.data.length === this.config.pagination.pageSize;
    }
    
    return false;
  }

  private async transformAPIResponse(data: any[], source: SourceConfiguration): Promise<RawGrantData[]> {
    return data.map((item) => {
      // Generic transformation - specific implementations should override this
      const rawGrant: RawGrantData = {
        title: this.extractField(item, ['title', 'name', 'oppTitle', 'grantTitle']) || 'Untitled Grant',
        description: this.extractField(item, ['description', 'summary', 'oppDescription', 'abstract']),
        deadline: this.extractField(item, ['deadline', 'closeDate', 'dueDate', 'applicationDeadline']),
        fundingAmount: this.extractField(item, ['amount', 'funding', 'awardAmount', 'budget']),
        eligibility: this.extractField(item, ['eligibility', 'eligibilityCriteria', 'requirements']),
        applicationUrl: this.extractField(item, ['url', 'link', 'applicationUrl', 'applyUrl']),
        funderName: this.extractField(item, ['funder', 'organization', 'agency', 'sponsor']) || 'Unknown Funder',
        sourceUrl: source.url,
        scrapedAt: new Date(),
        rawContent: item
      };

      return rawGrant;
    });
  }

  private extractField(item: any, fieldNames: string[]): string | undefined {
    for (const fieldName of fieldNames) {
      if (item[fieldName] !== undefined && item[fieldName] !== null) {
        return String(item[fieldName]);
      }
    }
    return undefined;
  }

  private getAcceptHeader(): string {
    switch (this.config.responseFormat) {
      case 'xml':
        return 'application/xml, text/xml';
      case 'csv':
        return 'text/csv';
      case 'json':
      default:
        return 'application/json';
    }
  }

  // Public method for testing API connectivity
  async testConnection(endpoint: string, authConfig?: AuthConfig): Promise<boolean> {
    try {
      const authToken = await this.authenticateRequest(authConfig);
      const headers: Record<string, string> = {};
      
      if (authToken) {
        headers['Authorization'] = authToken;
      }

      const response = await this.httpClient.get(endpoint, {
        headers,
        timeout: 10000,
        params: { limit: '1' } // Minimal request for testing
      });

      return response.status === 200;
    } catch (error) {
      console.error('API connection test failed:', error);
      return false;
    }
  }

  // Get current configuration
  getConfiguration(): APIClientConfig {
    return { ...this.config };
  }
}