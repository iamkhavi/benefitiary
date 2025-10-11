/**
 * World Bank Scraper
 * Scrapes funding opportunities from World Bank projects and procurement
 * Supports multi-language content and international currency conversion
 */

import { 
  SourceConfiguration, 
  RawGrantData, 
  ScrapedSourceType, 
  ScrapingEngine,
  GrantCategory 
} from '../../types';
import { StaticParserEngine } from '../../engines/static-parser';
import { APIClientEngine } from '../../engines/api-client';
import { BrowserEngine } from '../../engines/browser-engine';
import { TextCleaner } from '../../utils/text-cleaner';

export class WorldBankScraper {
  private staticEngine: StaticParserEngine;
  private apiEngine: APIClientEngine;
  private browserEngine: BrowserEngine;
  
  protected sourceConfig: SourceConfiguration = {
    id: 'world-bank',
    url: 'https://www.worldbank.org/en/projects-operations/procurement/opportunities',
    type: ScrapedSourceType.NGO,
    engine: 'browser', // World Bank uses dynamic content
    selectors: {
      grantContainer: '.opportunity-item, .project-item, .procurement-item, .funding-opportunity',
      title: '.opportunity-title, .project-title, h3 a, h2 a, .title',
      description: '.opportunity-description, .project-description, .summary, .description',
      deadline: '.deadline, .closing-date, .due-date, .application-deadline',
      fundingAmount: '.amount, .funding-amount, .project-cost, .budget, .value',
      eligibility: '.eligibility, .requirements, .criteria, .eligible-countries',
      applicationUrl: '.apply-link, .opportunity-link, a[href*="opportunity"], a[href*="procurement"]',
      funderInfo: '.funder, .implementing-agency, .borrower, .client'
    },
    rateLimit: {
      requestsPerMinute: 20,
      delayBetweenRequests: 3000,
      respectRobotsTxt: true
    },
    headers: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9,es;q=0.8,fr;q=0.7,ar;q=0.6',
      'Accept-Encoding': 'gzip, deflate, br',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Cache-Control': 'no-cache',
      'DNT': '1'
    }
  };

  // World Bank API endpoints
  private apiEndpoints = {
    projects: 'https://search.worldbank.org/api/v2/wds',
    procurement: 'https://www.worldbank.org/content/dam/wbg/procurement/json/major-contract-opportunities.json',
    opportunities: 'https://finances.worldbank.org/api/views/tdwh-3krx/rows.json'
  };

  // Currency conversion rates (USD base - World Bank primarily uses USD)
  private currencyRates: Record<string, number> = {
    'USD': 1.0,
    'EUR': 0.85,
    'GBP': 0.73,
    'JPY': 149.0,
    'CNY': 7.2,
    'INR': 83.0,
    'BRL': 5.0,
    'RUB': 92.0,
    'ZAR': 18.5,
    'SDR': 0.75 // Special Drawing Rights
  };

  // Multi-language patterns for World Bank content
  private languagePatterns = {
    'es': {
      project: 'proyecto',
      funding: 'financiamiento',
      deadline: 'fecha límite',
      eligibility: 'elegibilidad'
    },
    'fr': {
      project: 'projet',
      funding: 'financement',
      deadline: 'date limite',
      eligibility: 'éligibilité'
    },
    'ar': {
      project: 'مشروع',
      funding: 'تمويل',
      deadline: 'الموعد النهائي',
      eligibility: 'الأهلية'
    },
    'zh': {
      project: '项目',
      funding: '资金',
      deadline: '截止日期',
      eligibility: '资格'
    }
  };

  constructor() {
    this.staticEngine = new StaticParserEngine({
      timeout: 45000,
      retries: 3,
      userAgent: this.sourceConfig.headers['User-Agent'] || 'Mozilla/5.0 (compatible; GrantScraper/1.0)',
      followRedirects: true
    });

    this.browserEngine = new BrowserEngine({
      headless: true,
      viewport: { width: 1366, height: 768 },
      timeout: 45000,
      waitForSelector: '.opportunity-item, .project-item',
      blockResources: ['image', 'font', 'media'],
      stealthMode: true
    });

    this.apiEngine = new APIClientEngine({
      baseUrl: 'https://search.worldbank.org/api/v2',
      authentication: {
        type: 'apikey',
        credentials: {
          apiKey: process.env.WORLDBANK_API_KEY || ''
        }
      },
      rateLimit: this.sourceConfig.rateLimit,
      responseFormat: 'json',
      pagination: {
        type: 'offset',
        pageSize: 100,
        maxPages: 10
      }
    });
  }

  async scrape(): Promise<RawGrantData[]> {
    try {
      console.log('Starting World Bank scraping...');
      
      const allGrants: RawGrantData[] = [];
      
      // Try multiple approaches to get comprehensive data
      try {
        console.log('Scraping World Bank projects API...');
        const projectGrants = await this.scrapeProjectsAPI();
        allGrants.push(...projectGrants);
      } catch (error) {
        console.warn('Projects API scraping failed:', error);
      }

      try {
        console.log('Scraping World Bank procurement opportunities...');
        const procurementGrants = await this.scrapeProcurementOpportunities();
        allGrants.push(...procurementGrants);
      } catch (error) {
        console.warn('Procurement scraping failed:', error);
      }

      try {
        console.log('Scraping World Bank web pages...');
        const webGrants = await this.scrapeWebPages();
        allGrants.push(...webGrants);
      } catch (error) {
        console.warn('Web scraping failed:', error);
      }

      // Process and enhance the scraped data
      const processedGrants = await this.processWorldBankGrants(allGrants);
      
      // Remove duplicates
      const uniqueGrants = this.removeDuplicates(processedGrants);
      
      console.log(`World Bank scraping completed. Found ${uniqueGrants.length} unique grants.`);
      return uniqueGrants;
      
    } catch (error) {
      console.error('World Bank scraping failed:', error);
      throw new Error(`World Bank scraping failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async scrapeProjectsAPI(): Promise<RawGrantData[]> {
    try {
      // Use World Bank Open Data API for projects
      const apiConfig = { ...this.sourceConfig };
      apiConfig.url = this.apiEndpoints.projects;
      apiConfig.engine = 'api';
      
      const response = await this.apiEngine.scrape(apiConfig);
      
      return response.map(item => this.transformProjectAPIResponse(item));
      
    } catch (error) {
      console.error('Projects API scraping failed:', error);
      return [];
    }
  }

  private async scrapeProcurementOpportunities(): Promise<RawGrantData[]> {
    try {
      // Scrape procurement opportunities page
      const procurementConfig = { ...this.sourceConfig };
      procurementConfig.url = 'https://www.worldbank.org/en/projects-operations/procurement/opportunities';
      procurementConfig.selectors = {
        ...procurementConfig.selectors,
        grantContainer: '.procurement-opportunity, .major-contract, .opportunity-card',
        title: '.opportunity-title, .contract-title, h3',
        description: '.opportunity-summary, .contract-description',
        deadline: '.closing-date, .submission-deadline',
        fundingAmount: '.contract-value, .estimated-cost',
        eligibility: '.eligible-firms, .participation-requirements',
        applicationUrl: '.opportunity-link, .tender-link',
        funderInfo: '.implementing-agency, .borrower-country'
      };
      
      return await this.browserEngine.scrape(procurementConfig);
      
    } catch (error) {
      console.error('Procurement opportunities scraping failed:', error);
      return [];
    }
  }

  private async scrapeWebPages(): Promise<RawGrantData[]> {
    try {
      const allGrants: RawGrantData[] = [];
      
      // Scrape multiple World Bank funding pages
      const urls = [
        'https://www.worldbank.org/en/projects-operations/procurement/opportunities',
        'https://www.worldbank.org/en/about/careers/programs-and-internships',
        'https://www.worldbank.org/en/programs/grants-and-economic-development'
      ];
      
      for (const url of urls) {
        try {
          const pageConfig = { ...this.sourceConfig, url };
          const pageGrants = await this.browserEngine.scrape(pageConfig);
          allGrants.push(...pageGrants);
          
          // Respect rate limiting
          await this.delay(this.sourceConfig.rateLimit.delayBetweenRequests);
          
        } catch (error) {
          console.error(`Error scraping ${url}:`, error);
        }
      }
      
      return allGrants;
      
    } catch (error) {
      console.error('Web pages scraping failed:', error);
      return [];
    }
  }

  private transformProjectAPIResponse(item: any): RawGrantData {
    return {
      title: item.title || item.project_name || 'Untitled World Bank Project',
      description: item.abstract || item.description || item.summary,
      deadline: item.closing_date || item.board_approval_date,
      fundingAmount: item.total_commitment || item.ibrd_commitment || item.ida_commitment,
      eligibility: item.country || item.region,
      applicationUrl: item.url || item.project_url,
      funderName: 'World Bank',
      sourceUrl: this.apiEndpoints.projects,
      scrapedAt: new Date(),
      rawContent: {
        apiData: item,
        sourceType: 'api',
        projectId: item.project_id || item.id
      }
    };
  }

  private async processWorldBankGrants(grants: RawGrantData[]): Promise<RawGrantData[]> {
    return Promise.all(grants.map(async (grant) => {
      try {
        // Process multi-language content
        const languageProcessedGrant = await this.processMultiLanguageContent(grant);
        
        // Convert currency amounts
        const currencyProcessedGrant = await this.processCurrencyConversion(languageProcessedGrant);
        
        // Add World Bank specific metadata
        return this.addWorldBankMetadata(currencyProcessedGrant);
        
      } catch (error) {
        console.error(`Error processing grant "${grant.title}":`, error);
        return grant;
      }
    }));
  }

  private async processMultiLanguageContent(grant: RawGrantData): Promise<RawGrantData> {
    try {
      // Detect language
      const detectedLanguage = this.detectLanguage(grant.description || grant.title);
      
      // Extract country/region information
      const regionInfo = this.extractRegionFromContent(grant.description || '', grant.eligibility || '');
      
      // Clean text based on language
      const cleanedTitle = this.cleanMultiLanguageText(grant.title, detectedLanguage);
      const cleanedDescription = grant.description ? 
        this.cleanMultiLanguageText(grant.description, detectedLanguage) : undefined;
      
      return {
        ...grant,
        title: cleanedTitle,
        description: cleanedDescription,
        rawContent: {
          ...grant.rawContent,
          detectedLanguage,
          regionInfo,
          originalTitle: grant.title,
          originalDescription: grant.description
        }
      };
      
    } catch (error) {
      console.error('Multi-language processing failed:', error);
      return grant;
    }
  }

  private detectLanguage(text: string): string {
    if (!text) return 'en';
    
    const lowerText = text.toLowerCase();
    
    // World Bank specific language detection
    const languageIndicators = {
      'es': ['proyecto', 'desarrollo', 'financiamiento', 'banco mundial', 'américa'],
      'fr': ['projet', 'développement', 'financement', 'banque mondiale', 'afrique'],
      'ar': ['مشروع', 'تنمية', 'تمويل', 'البنك الدولي'],
      'zh': ['项目', '发展', '资金', '世界银行'],
      'en': ['project', 'development', 'funding', 'world bank', 'opportunity']
    };
    
    let maxScore = 0;
    let detectedLang = 'en';
    
    for (const [lang, indicators] of Object.entries(languageIndicators)) {
      const score = indicators.reduce((count, word) => {
        return count + (lowerText.includes(word) ? 1 : 0);
      }, 0);
      
      if (score > maxScore) {
        maxScore = score;
        detectedLang = lang;
      }
    }
    
    return detectedLang;
  }

  private cleanMultiLanguageText(text: string, language: string): string {
    if (!text) return '';
    
    let cleaned = TextCleaner.cleanText(text, {
      removeHtmlEntities: true,
      normalizeWhitespace: true,
      removeBullets: true,
      removeEllipsis: true,
      trimWhitespace: true,
      removeEmptyLines: true,
      maxLength: 8000 // World Bank descriptions can be longer
    });
    
    // Language-specific cleaning for World Bank content
    if (language === 'es') {
      cleaned = cleaned.replace(/\b(Banco Mundial|BM)\b/gi, 'World Bank');
    } else if (language === 'fr') {
      cleaned = cleaned.replace(/\b(Banque Mondiale|BM)\b/gi, 'World Bank');
    }
    
    return cleaned;
  }

  private extractRegionFromContent(description: string, eligibility: string): string[] {
    const regions: string[] = [];
    const content = `${description} ${eligibility}`.toLowerCase();
    
    // World Bank regions and countries
    const regionPatterns = {
      'sub-saharan-africa': ['africa', 'african', 'nigeria', 'kenya', 'ghana', 'ethiopia', 'tanzania'],
      'east-asia-pacific': ['china', 'indonesia', 'philippines', 'vietnam', 'thailand', 'malaysia'],
      'south-asia': ['india', 'pakistan', 'bangladesh', 'sri lanka', 'nepal', 'afghanistan'],
      'latin-america-caribbean': ['brazil', 'mexico', 'argentina', 'colombia', 'peru', 'chile'],
      'middle-east-north-africa': ['egypt', 'morocco', 'tunisia', 'jordan', 'lebanon', 'iraq'],
      'europe-central-asia': ['russia', 'turkey', 'ukraine', 'poland', 'romania', 'kazakhstan']
    };
    
    for (const [region, countries] of Object.entries(regionPatterns)) {
      if (countries.some(country => content.includes(country))) {
        regions.push(region);
      }
    }
    
    return regions;
  }

  private async processCurrencyConversion(grant: RawGrantData): Promise<RawGrantData> {
    try {
      if (!grant.fundingAmount) return grant;
      
      // World Bank amounts are often in millions
      const fundingInfo = TextCleaner.extractFundingAmount(grant.fundingAmount);
      
      if (!fundingInfo) return grant;
      
      // Handle World Bank specific formats (millions, SDR, etc.)
      let convertedMin = fundingInfo.min;
      let convertedMax = fundingInfo.max;
      const currency = fundingInfo.currency?.toUpperCase() || 'USD';
      
      // Check for million indicators
      if (grant.fundingAmount.toLowerCase().includes('million')) {
        convertedMin = convertedMin ? convertedMin * 1000000 : undefined;
        convertedMax = convertedMax ? convertedMax * 1000000 : undefined;
      }
      
      // Convert to USD if different currency
      if (currency !== 'USD' && this.currencyRates[currency]) {
        const rate = this.currencyRates[currency];
        convertedMin = convertedMin ? Math.round(convertedMin / rate) : undefined;
        convertedMax = convertedMax ? Math.round(convertedMax / rate) : undefined;
      }
      
      return {
        ...grant,
        rawContent: {
          ...grant.rawContent,
          originalCurrency: currency,
          originalAmount: fundingInfo,
          convertedAmountUSD: {
            min: convertedMin,
            max: convertedMax
          },
          conversionRate: this.currencyRates[currency] || 1
        }
      };
      
    } catch (error) {
      console.error('Currency conversion failed:', error);
      return grant;
    }
  }

  private addWorldBankMetadata(grant: RawGrantData): RawGrantData {
    return {
      ...grant,
      funderName: 'World Bank',
      rawContent: {
        ...grant.rawContent,
        sourceType: 'international',
        platform: 'World Bank',
        category: this.inferCategoryFromContent(grant.description || grant.title),
        tags: this.generateWorldBankTags(grant),
        eligibilityScope: 'international',
        fundingType: this.determineFundingType(grant),
        lastUpdated: new Date().toISOString()
      }
    };
  }

  private inferCategoryFromContent(content: string): GrantCategory {
    const lowerContent = content.toLowerCase();
    
    // World Bank specific category keywords
    const categoryKeywords = {
      [GrantCategory.COMMUNITY_DEVELOPMENT]: [
        'development', 'poverty', 'economic', 'infrastructure', 'urban', 'rural',
        'governance', 'institutional', 'capacity building', 'social protection'
      ],
      [GrantCategory.ENVIRONMENT_SUSTAINABILITY]: [
        'environment', 'climate', 'sustainability', 'renewable energy', 'carbon',
        'green', 'biodiversity', 'forest', 'water management', 'pollution'
      ],
      [GrantCategory.HEALTHCARE_PUBLIC_HEALTH]: [
        'health', 'medical', 'healthcare', 'hospital', 'nutrition', 'pandemic',
        'disease', 'maternal', 'child health', 'immunization'
      ],
      [GrantCategory.EDUCATION_TRAINING]: [
        'education', 'school', 'university', 'training', 'skills', 'learning',
        'teacher', 'student', 'literacy', 'vocational'
      ],
      [GrantCategory.TECHNOLOGY_INNOVATION]: [
        'technology', 'digital', 'innovation', 'fintech', 'broadband',
        'connectivity', 'e-government', 'digital transformation'
      ]
    };
    
    let maxScore = 0;
    let bestCategory = GrantCategory.COMMUNITY_DEVELOPMENT; // Default for World Bank
    
    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      const score = keywords.reduce((count, keyword) => {
        return count + (lowerContent.includes(keyword) ? 1 : 0);
      }, 0);
      
      if (score > maxScore) {
        maxScore = score;
        bestCategory = category as GrantCategory;
      }
    }
    
    return bestCategory;
  }

  private generateWorldBankTags(grant: RawGrantData): string[] {
    const tags: string[] = ['world-bank', 'international', 'development', 'multilateral'];
    const content = `${grant.title} ${grant.description || ''}`.toLowerCase();
    
    // Add World Bank specific tags
    const wbKeywords = {
      'ibrd': ['ibrd', 'international bank'],
      'ida': ['ida', 'international development association'],
      'ifc': ['ifc', 'international finance corporation'],
      'procurement': ['procurement', 'contract', 'tender', 'bidding'],
      'policy-lending': ['policy', 'development policy', 'budget support'],
      'investment-lending': ['investment', 'project financing', 'infrastructure']
    };
    
    for (const [tag, keywords] of Object.entries(wbKeywords)) {
      if (keywords.some(keyword => content.includes(keyword))) {
        tags.push(tag);
      }
    }
    
    return tags;
  }

  private determineFundingType(grant: RawGrantData): string {
    const content = `${grant.title} ${grant.description || ''}`.toLowerCase();
    
    if (content.includes('procurement') || content.includes('contract')) {
      return 'procurement';
    } else if (content.includes('loan') || content.includes('credit')) {
      return 'loan';
    } else if (content.includes('grant') || content.includes('trust fund')) {
      return 'grant';
    } else if (content.includes('technical assistance')) {
      return 'technical-assistance';
    }
    
    return 'development-financing';
  }

  private removeDuplicates(grants: RawGrantData[]): RawGrantData[] {
    const seen = new Set<string>();
    return grants.filter(grant => {
      const key = `${grant.title.toLowerCase()}-${grant.funderName}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Public method to get scraper configuration
  getConfiguration(): SourceConfiguration {
    return { ...this.sourceConfig };
  }

  // Public method to test connectivity
  async testConnection(): Promise<boolean> {
    try {
      // Test API connectivity
      const testResult = await this.apiEngine.testConnection(
        this.apiEndpoints.projects,
        this.sourceConfig.authentication
      );
      
      if (testResult) {
        return true;
      }
      
      // Fallback to web scraping test
      const testConfig = { ...this.sourceConfig };
      testConfig.url = 'https://www.worldbank.org/en/projects-operations/procurement/opportunities';
      await this.staticEngine.scrape(testConfig);
      return true;
      
    } catch (error) {
      console.error('World Bank connection test failed:', error);
      return false;
    }
  }
}