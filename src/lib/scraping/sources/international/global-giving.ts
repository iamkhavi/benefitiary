/**
 * GlobalGiving Scraper
 * Scrapes international development grants and projects from GlobalGiving platform
 * Supports multi-language content processing and currency conversion
 */

import { 
  SourceConfiguration, 
  RawGrantData, 
  ScrapedSourceType, 
  ScrapingEngine,
  ProcessedGrantData,
  GrantCategory 
} from '../../types';
import { StaticParserEngine } from '../../engines/static-parser';
import { APIClientEngine } from '../../engines/api-client';
import { TextCleaner } from '../../utils/text-cleaner';

export class GlobalGivingScraper {
  private staticEngine: StaticParserEngine;
  private apiEngine: APIClientEngine;
  
  protected sourceConfig: SourceConfiguration = {
    id: 'global-giving',
    url: 'https://www.globalgiving.org/projects/',
    type: ScrapedSourceType.NGO,
    engine: 'static',
    selectors: {
      grantContainer: '.project-tile, .project-card, .project-item',
      title: '.project-title, .project-name, h3 a, h2 a',
      description: '.project-description, .project-summary, .project-teaser',
      deadline: '.project-deadline, .deadline, .end-date',
      fundingAmount: '.funding-goal, .goal-amount, .target-amount, .funding-target',
      eligibility: '.project-eligibility, .eligibility, .requirements',
      applicationUrl: '.project-link, .donate-link, a[href*="project"]',
      funderInfo: '.organization-info, .organization-name, .ngo-name'
    },
    rateLimit: {
      requestsPerMinute: 15,
      delayBetweenRequests: 4000,
      respectRobotsTxt: true
    },
    headers: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9,es;q=0.8,fr;q=0.7',
      'Accept-Encoding': 'gzip, deflate, br',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Cache-Control': 'no-cache',
      'DNT': '1'
    }
  };

  // Currency conversion rates (USD base)
  private currencyRates: Record<string, number> = {
    'USD': 1.0,
    'EUR': 0.85,
    'GBP': 0.73,
    'CAD': 1.35,
    'AUD': 1.52,
    'JPY': 149.0,
    'CHF': 0.88,
    'SEK': 10.8,
    'NOK': 10.9,
    'DKK': 6.9
  };

  // Multi-language support patterns
  private languagePatterns = {
    'es': {
      deadline: ['fecha límite', 'plazo', 'vencimiento'],
      funding: ['financiación', 'fondos', 'presupuesto'],
      eligibility: ['elegibilidad', 'requisitos', 'criterios']
    },
    'fr': {
      deadline: ['date limite', 'échéance', 'délai'],
      funding: ['financement', 'fonds', 'budget'],
      eligibility: ['éligibilité', 'exigences', 'critères']
    },
    'pt': {
      deadline: ['prazo', 'data limite', 'vencimento'],
      funding: ['financiamento', 'fundos', 'orçamento'],
      eligibility: ['elegibilidade', 'requisitos', 'critérios']
    }
  };

  constructor() {
    this.staticEngine = new StaticParserEngine({
      timeout: 30000,
      retries: 3,
      userAgent: this.sourceConfig.headers['User-Agent'] || 'Mozilla/5.0 (compatible; GrantScraper/1.0)',
      followRedirects: true
    });

    this.apiEngine = new APIClientEngine({
      baseUrl: 'https://api.globalgiving.org/api/public',
      authentication: {
        type: 'apikey',
        credentials: {
          apiKey: process.env.GLOBALGIVING_API_KEY || ''
        }
      },
      rateLimit: this.sourceConfig.rateLimit,
      responseFormat: 'json',
      pagination: {
        type: 'offset',
        pageSize: 50,
        maxPages: 20
      }
    });
  }

  async scrape(): Promise<RawGrantData[]> {
    try {
      console.log('Starting GlobalGiving scraping...');
      
      // Try API first if available, fallback to web scraping
      let grants: RawGrantData[] = [];
      
      if (process.env.GLOBALGIVING_API_KEY) {
        console.log('Using GlobalGiving API...');
        grants = await this.scrapeViaAPI();
      } else {
        console.log('Using web scraping (no API key available)...');
        grants = await this.scrapeViaWeb();
      }

      // Process and enhance the scraped data
      const processedGrants = await this.processInternationalGrants(grants);
      
      console.log(`GlobalGiving scraping completed. Found ${processedGrants.length} grants.`);
      return processedGrants;
      
    } catch (error) {
      console.error('GlobalGiving scraping failed:', error);
      throw new Error(`GlobalGiving scraping failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async scrapeViaAPI(): Promise<RawGrantData[]> {
    try {
      // Use API endpoint for projects
      const apiConfig = { ...this.sourceConfig };
      apiConfig.url = 'https://api.globalgiving.org/api/public/projectservice/projects/active';
      apiConfig.engine = 'api';
      
      const rawData = await this.apiEngine.scrape(apiConfig);
      return rawData;
      
    } catch (error) {
      console.warn('API scraping failed, falling back to web scraping:', error);
      return this.scrapeViaWeb();
    }
  }

  private async scrapeViaWeb(): Promise<RawGrantData[]> {
    try {
      // Scrape multiple pages of projects
      const allGrants: RawGrantData[] = [];
      const maxPages = 5;
      
      for (let page = 1; page <= maxPages; page++) {
        const pageUrl = `${this.sourceConfig.url}?page=${page}`;
        const pageConfig = { ...this.sourceConfig, url: pageUrl };
        
        try {
          const pageGrants = await this.staticEngine.scrape(pageConfig);
          
          if (pageGrants.length === 0) {
            console.log(`No more grants found on page ${page}, stopping.`);
            break;
          }
          
          allGrants.push(...pageGrants);
          console.log(`Scraped ${pageGrants.length} grants from page ${page}`);
          
          // Respect rate limiting
          await this.delay(this.sourceConfig.rateLimit.delayBetweenRequests);
          
        } catch (error) {
          console.error(`Error scraping page ${page}:`, error);
          // Continue with other pages
        }
      }
      
      return allGrants;
      
    } catch (error) {
      console.error('Web scraping failed:', error);
      throw error;
    }
  }

  private async processInternationalGrants(grants: RawGrantData[]): Promise<RawGrantData[]> {
    return Promise.all(grants.map(async (grant) => {
      try {
        // Process multi-language content
        const processedGrant = await this.processMultiLanguageContent(grant);
        
        // Convert currency amounts
        const currencyProcessedGrant = await this.processCurrencyConversion(processedGrant);
        
        // Add international-specific metadata
        return this.addInternationalMetadata(currencyProcessedGrant);
        
      } catch (error) {
        console.error(`Error processing grant "${grant.title}":`, error);
        return grant; // Return original grant if processing fails
      }
    }));
  }

  private async processMultiLanguageContent(grant: RawGrantData): Promise<RawGrantData> {
    try {
      // Detect language from content
      const detectedLanguage = this.detectLanguage(grant.description || grant.title);
      
      // Clean and normalize text based on language
      const cleanedTitle = this.cleanMultiLanguageText(grant.title, detectedLanguage);
      const cleanedDescription = grant.description ? 
        this.cleanMultiLanguageText(grant.description, detectedLanguage) : undefined;
      
      // Extract location information from multi-language content
      const locationInfo = this.extractLocationFromContent(grant.description || '', detectedLanguage);
      
      return {
        ...grant,
        title: cleanedTitle,
        description: cleanedDescription,
        rawContent: {
          ...grant.rawContent,
          detectedLanguage,
          locationInfo,
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
    
    // Simple language detection based on common words and unique patterns
    const languageIndicators = {
      'es': ['este', 'proyecto', 'desarrollo', 'español', 'américa', 'latina', 'niños', 'comunidades'],
      'fr': ['ce', 'projet', 'développement', 'français', 'afrique', 'pour', 'communautés', 'dans'],
      'pt': ['este', 'projeto', 'saúde', 'brasil', 'comunidades', 'rurais', 'para', 'das'],
      'en': ['this', 'project', 'development', 'english', 'communities', 'for', 'with', 'from']
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
    
    // Use TextCleaner with language-specific options
    let cleaned = TextCleaner.cleanText(text, {
      removeHtmlEntities: true,
      normalizeWhitespace: true,
      removeBullets: true,
      removeEllipsis: true,
      trimWhitespace: true,
      removeEmptyLines: true,
      maxLength: 5000
    });
    
    // Language-specific cleaning
    if (language === 'es') {
      // Spanish-specific cleaning
      cleaned = cleaned.replace(/\b(más|muy|mucho|mucha)\s+/gi, '');
    } else if (language === 'fr') {
      // French-specific cleaning
      cleaned = cleaned.replace(/\b(très|beaucoup|plus)\s+/gi, '');
    } else if (language === 'pt') {
      // Portuguese-specific cleaning
      cleaned = cleaned.replace(/\b(muito|mais|bem)\s+/gi, '');
    }
    
    return cleaned;
  }

  private extractLocationFromContent(content: string, language: string): string[] {
    const locations: string[] = [];
    
    // Common location patterns for different languages
    const locationPatterns = {
      'en': /\b(?:in|from|located in|based in|serving)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g,
      'es': /\b(?:en|de|ubicado en|basado en|sirviendo)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g,
      'fr': /\b(?:en|de|situé en|basé en|servant)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g,
      'pt': /\b(?:em|de|localizado em|baseado em|servindo)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g
    };
    
    const pattern = locationPatterns[language as keyof typeof locationPatterns] || locationPatterns['en'];
    let match;
    
    while ((match = pattern.exec(content)) !== null) {
      const location = match[1].trim();
      if (location.length > 2 && !locations.includes(location)) {
        locations.push(location);
      }
    }
    
    return locations;
  }

  private async processCurrencyConversion(grant: RawGrantData): Promise<RawGrantData> {
    try {
      if (!grant.fundingAmount) return grant;
      
      // Extract currency and amount using TextCleaner
      const fundingInfo = TextCleaner.extractFundingAmount(grant.fundingAmount);
      
      if (!fundingInfo) return grant;
      
      // Convert to USD if different currency
      const currency = fundingInfo.currency?.toUpperCase() || 'USD';
      let convertedMin = fundingInfo.min;
      let convertedMax = fundingInfo.max;
      
      if (currency !== 'USD' && this.currencyRates[currency]) {
        const rate = this.currencyRates[currency];
        convertedMin = convertedMin ? Math.round(convertedMin / rate) : undefined;
        convertedMax = convertedMax ? Math.round(convertedMax / rate) : undefined;
      }
      
      // Update funding amount with USD equivalent
      let convertedFundingText = grant.fundingAmount;
      if (currency !== 'USD') {
        const usdAmount = convertedMin && convertedMax && convertedMin === convertedMax 
          ? `$${convertedMin.toLocaleString()}` 
          : convertedMin && convertedMax 
            ? `$${convertedMin.toLocaleString()} - $${convertedMax.toLocaleString()}`
            : convertedMax 
              ? `Up to $${convertedMax.toLocaleString()}`
              : grant.fundingAmount;
        
        convertedFundingText = `${grant.fundingAmount} (≈${usdAmount} USD)`;
      }
      
      return {
        ...grant,
        fundingAmount: convertedFundingText,
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

  private addInternationalMetadata(grant: RawGrantData): RawGrantData {
    return {
      ...grant,
      rawContent: {
        ...grant.rawContent,
        sourceType: 'international',
        platform: 'GlobalGiving',
        category: this.inferCategoryFromContent(grant.description || grant.title),
        tags: this.generateInternationalTags(grant),
        eligibilityScope: 'international',
        lastUpdated: new Date().toISOString()
      }
    };
  }

  private inferCategoryFromContent(content: string): GrantCategory {
    const lowerContent = content.toLowerCase();
    
    // Category keywords for international development
    const categoryKeywords = {
      [GrantCategory.HEALTHCARE_PUBLIC_HEALTH]: [
        'health', 'medical', 'healthcare', 'hospital', 'clinic', 'medicine', 'disease', 
        'vaccination', 'nutrition', 'sanitation', 'hygiene', 'maternal', 'child health'
      ],
      [GrantCategory.EDUCATION_TRAINING]: [
        'education', 'school', 'teacher', 'student', 'learning', 'literacy', 'training',
        'scholarship', 'university', 'college', 'classroom', 'curriculum'
      ],
      [GrantCategory.ENVIRONMENT_SUSTAINABILITY]: [
        'environment', 'climate', 'sustainability', 'renewable', 'conservation', 'green',
        'solar', 'water', 'forest', 'biodiversity', 'pollution', 'recycling'
      ],
      [GrantCategory.COMMUNITY_DEVELOPMENT]: [
        'community', 'development', 'poverty', 'economic', 'livelihood', 'microfinance',
        'agriculture', 'farming', 'rural', 'urban', 'infrastructure', 'housing'
      ],
      [GrantCategory.SOCIAL_SERVICES]: [
        'social', 'women', 'children', 'elderly', 'disability', 'human rights',
        'gender', 'equality', 'empowerment', 'protection', 'welfare'
      ]
    };
    
    let maxScore = 0;
    let bestCategory = GrantCategory.COMMUNITY_DEVELOPMENT; // Default for international
    
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

  private generateInternationalTags(grant: RawGrantData): string[] {
    const tags: string[] = ['international', 'development', 'global'];
    const content = `${grant.title} ${grant.description || ''}`.toLowerCase();
    
    // Add region-specific tags
    const regionKeywords = {
      'africa': ['africa', 'african', 'kenya', 'nigeria', 'ghana', 'uganda', 'tanzania'],
      'asia': ['asia', 'asian', 'india', 'bangladesh', 'nepal', 'cambodia', 'vietnam'],
      'latin-america': ['latin', 'america', 'mexico', 'guatemala', 'peru', 'bolivia', 'ecuador'],
      'middle-east': ['middle east', 'lebanon', 'jordan', 'palestine', 'syria', 'iraq']
    };
    
    for (const [region, keywords] of Object.entries(regionKeywords)) {
      if (keywords.some(keyword => content.includes(keyword))) {
        tags.push(region);
        break;
      }
    }
    
    // Add thematic tags
    const thematicKeywords = {
      'emergency-relief': ['emergency', 'disaster', 'relief', 'crisis', 'humanitarian'],
      'capacity-building': ['capacity', 'training', 'skills', 'empowerment', 'leadership'],
      'sustainable-development': ['sustainable', 'sdg', 'millennium', 'development goals'],
      'microfinance': ['microfinance', 'microcredit', 'small business', 'entrepreneurship']
    };
    
    for (const [theme, keywords] of Object.entries(thematicKeywords)) {
      if (keywords.some(keyword => content.includes(keyword))) {
        tags.push(theme);
      }
    }
    
    return tags;
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
      if (process.env.GLOBALGIVING_API_KEY) {
        return await this.apiEngine.testConnection(
          'https://api.globalgiving.org/api/public/projectservice/projects/active',
          this.sourceConfig.authentication
        );
      } else {
        // Test web scraping connectivity
        const testConfig = { ...this.sourceConfig };
        testConfig.url = 'https://www.globalgiving.org/projects/';
        const result = await this.staticEngine.scrape(testConfig);
        return true; // If no error thrown, connection is working
      }
    } catch (error) {
      console.error('GlobalGiving connection test failed:', error);
      return false;
    }
  }
}