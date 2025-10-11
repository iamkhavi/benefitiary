/**
 * Grants.gov API Scraper
 * Implements structured data access to Grants.gov opportunities using their REST API
 */

import { 
  SourceConfiguration, 
  RawGrantData, 
  ScrapedSourceType, 
  ScrapingEngine,
  AuthConfig,
  PaginationConfig,
  ScrapingError
} from '../../types';
import { HTTPClient, createDefaultHTTPClientConfig } from '../../utils/http-client';

interface GrantsGovAPIResponse {
  oppHits: GrantsGovOpportunity[];
  hitCount: number;
  totalHits: number;
}

interface GrantsGovOpportunity {
  oppId: string;
  oppNumber: string;
  oppTitle: string;
  oppDescription?: string;
  agencyName: string;
  agencyCode: string;
  cfda?: string;
  cfdaDescription?: string;
  openDate: string;
  closeDate: string;
  awardCeiling?: string;
  awardFloor?: string;
  estimatedTotalProgramFunding?: string;
  expectedNumberOfAwards?: string;
  eligibilityCriteria?: string;
  applicantTypes?: string[];
  fundingInstrumentTypes?: string[];
  categoryOfFundingActivity?: string;
  categoryExplanation?: string;
  version?: string;
  lastUpdatedDate?: string;
  grantsGovLink?: string;
}

interface GrantsGovAPIConfig {
  apiKey?: string;
  baseUrl: string;
  version: string;
  maxResultsPerPage: number;
  maxPages: number;
  timeout: number;
}

export class GrantsGovScraper implements ScrapingEngine {
  private httpClient: HTTPClient;
  private apiConfig: GrantsGovAPIConfig;
  
  protected sourceConfig: SourceConfiguration = {
    id: 'grants-gov',
    url: 'https://www.grants.gov/grantsws/rest/opportunities/search/',
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
    rateLimit: {
      requestsPerMinute: 30,
      delayBetweenRequests: 2000,
      respectRobotsTxt: true
    },
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    authentication: {
      type: 'apikey',
      credentials: {
        // API key would be loaded from environment variables
        apiKey: process.env.GRANTS_GOV_API_KEY || ''
      }
    }
  };

  constructor(config?: Partial<GrantsGovAPIConfig>) {
    this.apiConfig = {
      baseUrl: 'https://www.grants.gov/grantsws/rest/opportunities/search/',
      version: 'v1',
      maxResultsPerPage: 1000,
      maxPages: 10,
      timeout: 30000,
      ...config
    };

    // Initialize HTTP client with Grants.gov specific configuration
    const httpConfig = createDefaultHTTPClientConfig();
    httpConfig.timeout = this.apiConfig.timeout;
    httpConfig.rateLimit = this.sourceConfig.rateLimit;
    httpConfig.headers = {
      ...httpConfig.headers,
      ...this.sourceConfig.headers
    };

    this.httpClient = new HTTPClient(httpConfig);
  }

  async scrape(source?: SourceConfiguration): Promise<RawGrantData[]> {
    const config = source || this.sourceConfig;
    const allGrants: RawGrantData[] = [];
    const errors: ScrapingError[] = [];

    try {
      console.log('Starting Grants.gov API scraping...');
      
      // Fetch opportunities with pagination
      let currentPage = 0;
      let hasMorePages = true;
      let consecutiveErrors = 0;
      
      while (hasMorePages && currentPage < this.apiConfig.maxPages) {
        try {
          const pageData = await this.fetchOpportunitiesPage(currentPage);
          
          if (pageData.oppHits && pageData.oppHits.length > 0) {
            const transformedGrants = this.transformGrantsGovResponse(pageData.oppHits);
            allGrants.push(...transformedGrants);
            
            console.log(`Fetched page ${currentPage + 1}: ${pageData.oppHits.length} opportunities`);
            
            // Check if we have more pages
            const totalFetched = (currentPage + 1) * this.apiConfig.maxResultsPerPage;
            hasMorePages = totalFetched < pageData.totalHits;
            consecutiveErrors = 0; // Reset consecutive error count on success
          } else {
            hasMorePages = false;
          }
          currentPage++;
        } catch (error) {
          const scrapingError: ScrapingError = {
            type: 'NETWORK',
            message: `Failed to fetch page ${currentPage}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            url: config.url,
            timestamp: new Date()
          };
          errors.push(scrapingError);
          
          console.error(`Error fetching page ${currentPage}:`, error);
          
          consecutiveErrors++;
          currentPage++;
          
          // If we have too many consecutive errors and no successful pages, throw error
          if (consecutiveErrors >= 3 && allGrants.length === 0) {
            throw new Error(`Grants.gov API scraping failed after ${consecutiveErrors} consecutive errors`);
          }
          
          // Stop after 3 consecutive errors
          if (consecutiveErrors >= 3) {
            break;
          }
        }
      }

      console.log(`Grants.gov scraping completed. Total grants found: ${allGrants.length}`);
      
      if (errors.length > 0) {
        console.warn(`Scraping completed with ${errors.length} errors`);
      }

      return allGrants;
      
    } catch (error) {
      const scrapingError: ScrapingError = {
        type: 'NETWORK',
        message: `Grants.gov API scraping failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        url: config.url,
        timestamp: new Date()
      };
      
      console.error('Grants.gov scraping failed:', error);
      throw scrapingError;
    }
  }

  private async fetchOpportunitiesPage(page: number): Promise<GrantsGovAPIResponse> {
    const params = {
      format: 'json',
      rows: this.apiConfig.maxResultsPerPage.toString(),
      start: (page * this.apiConfig.maxResultsPerPage).toString(),
      oppStatus: 'forecasted|posted', // Only active opportunities
      sortBy: 'openDate|desc' // Sort by most recent first
    };

    // Add API key if available
    if (this.sourceConfig.authentication?.credentials.apiKey) {
      (params as any).api_key = this.sourceConfig.authentication.credentials.apiKey;
    }

    const response = await this.httpClient.get(this.apiConfig.baseUrl, {
      params,
      timeout: this.apiConfig.timeout
    });

    if (response.status !== 200) {
      throw new Error(`Grants.gov API returned status ${response.status}: ${response.statusText}`);
    }

    return response.data;
  }

  private transformGrantsGovResponse(opportunities: GrantsGovOpportunity[]): RawGrantData[] {
    return opportunities.map((opportunity) => {
      // Parse funding amounts
      const fundingAmount = this.parseFundingAmount(opportunity);
      
      // Build application URL
      const applicationUrl = opportunity.grantsGovLink || 
        `https://www.grants.gov/web/grants/view-opportunity.html?oppId=${opportunity.oppId}`;

      // Extract eligibility information
      const eligibility = this.buildEligibilityString(opportunity);

      // Build comprehensive description
      const description = this.buildDescription(opportunity);

      const rawGrant: RawGrantData = {
        title: opportunity.oppTitle || 'Untitled Grant',
        description,
        deadline: opportunity.closeDate,
        fundingAmount,
        eligibility,
        applicationUrl,
        funderName: opportunity.agencyName || 'Unknown Agency',
        sourceUrl: applicationUrl,
        scrapedAt: new Date(),
        rawContent: {
          oppId: opportunity.oppId,
          oppNumber: opportunity.oppNumber,
          agencyCode: opportunity.agencyCode,
          cfda: opportunity.cfda,
          cfdaDescription: opportunity.cfdaDescription,
          openDate: opportunity.openDate,
          awardCeiling: opportunity.awardCeiling,
          awardFloor: opportunity.awardFloor,
          estimatedTotalProgramFunding: opportunity.estimatedTotalProgramFunding,
          expectedNumberOfAwards: opportunity.expectedNumberOfAwards,
          applicantTypes: opportunity.applicantTypes,
          fundingInstrumentTypes: opportunity.fundingInstrumentTypes,
          categoryOfFundingActivity: opportunity.categoryOfFundingActivity,
          categoryExplanation: opportunity.categoryExplanation,
          version: opportunity.version,
          lastUpdatedDate: opportunity.lastUpdatedDate
        }
      };

      return rawGrant;
    });
  }

  private parseFundingAmount(opportunity: GrantsGovOpportunity): string {
    const parts: string[] = [];

    if (opportunity.awardFloor && opportunity.awardCeiling) {
      parts.push(`$${opportunity.awardFloor} - $${opportunity.awardCeiling}`);
    } else if (opportunity.awardCeiling) {
      parts.push(`Up to $${opportunity.awardCeiling}`);
    } else if (opportunity.awardFloor) {
      parts.push(`From $${opportunity.awardFloor}`);
    }

    if (opportunity.estimatedTotalProgramFunding) {
      parts.push(`Total Program: $${opportunity.estimatedTotalProgramFunding}`);
    }

    if (opportunity.expectedNumberOfAwards) {
      parts.push(`Expected Awards: ${opportunity.expectedNumberOfAwards}`);
    }

    return parts.length > 0 ? parts.join(' | ') : '';
  }

  private buildEligibilityString(opportunity: GrantsGovOpportunity): string {
    const eligibilityParts: string[] = [];

    if (opportunity.eligibilityCriteria) {
      eligibilityParts.push(opportunity.eligibilityCriteria);
    }

    if (opportunity.applicantTypes && opportunity.applicantTypes.length > 0) {
      eligibilityParts.push(`Eligible Applicants: ${opportunity.applicantTypes.join(', ')}`);
    }

    if (opportunity.fundingInstrumentTypes && opportunity.fundingInstrumentTypes.length > 0) {
      eligibilityParts.push(`Funding Types: ${opportunity.fundingInstrumentTypes.join(', ')}`);
    }

    return eligibilityParts.join(' | ');
  }

  private buildDescription(opportunity: GrantsGovOpportunity): string {
    const descriptionParts: string[] = [];

    if (opportunity.oppDescription) {
      descriptionParts.push(opportunity.oppDescription);
    }

    if (opportunity.cfdaDescription) {
      descriptionParts.push(`CFDA Program: ${opportunity.cfdaDescription}`);
    }

    if (opportunity.categoryExplanation) {
      descriptionParts.push(`Category: ${opportunity.categoryExplanation}`);
    }

    if (opportunity.cfda) {
      descriptionParts.push(`CFDA Number: ${opportunity.cfda}`);
    }

    return descriptionParts.join('\n\n');
  }

  // Public method for testing API connectivity
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.httpClient.get(this.apiConfig.baseUrl, {
        params: {
          format: 'json',
          rows: '1',
          start: '0'
        },
        timeout: 10000
      });

      return response.status === 200;
    } catch (error) {
      console.error('Grants.gov API connection test failed:', error);
      return false;
    }
  }

  // Get API configuration for debugging
  getConfiguration(): GrantsGovAPIConfig & { sourceConfig: SourceConfiguration } {
    return {
      ...this.apiConfig,
      sourceConfig: this.sourceConfig
    };
  }
}