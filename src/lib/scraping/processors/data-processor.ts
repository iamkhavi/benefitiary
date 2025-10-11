/**
 * DataProcessor class for transforming raw scraped data into structured format
 * Handles funding amount parsing, deadline parsing, and text normalization
 */

import { RawGrantData, ProcessedGrantData, FunderData, GrantCategory, ScrapedSourceType } from '../types';

export interface ProcessingOptions {
  strictValidation?: boolean;
  defaultTimezone?: string;
  currencyConversionRates?: Record<string, number>;
  textNormalizationLevel?: 'basic' | 'aggressive';
}

export interface ProcessingResult {
  data: ProcessedGrantData;
  warnings: string[];
  errors: string[];
  qualityScore: number;
}

export class DataProcessor {
  private readonly defaultOptions: ProcessingOptions = {
    strictValidation: false,
    defaultTimezone: 'UTC',
    currencyConversionRates: { USD: 1, EUR: 1.1, GBP: 1.25, CAD: 0.75 },
    textNormalizationLevel: 'basic'
  };

  constructor(private options: ProcessingOptions = {}) {
    this.options = { ...this.defaultOptions, ...options };
  }

  /**
   * Process raw grant data into structured format
   */
  async processGrant(rawData: RawGrantData): Promise<ProcessingResult> {
    const warnings: string[] = [];
    const errors: string[] = [];
    let qualityScore = 100;

    try {
      // Validate critical input data first
      if (!rawData || typeof rawData !== 'object') {
        throw new Error('Invalid raw data provided');
      }
      
      if (rawData.title === null || rawData.title === undefined) {
        throw new Error('Title cannot be null or undefined');
      }

      if (rawData.scrapedAt && !(rawData.scrapedAt instanceof Date) && typeof rawData.scrapedAt !== 'string') {
        throw new Error('Invalid scrapedAt date format');
      }

      // Process title
      const title = this.normalizeText(rawData.title);
      if (!title) {
        errors.push('Title is required');
        qualityScore -= 30;
      }

      // Process description
      const description = this.normalizeText(rawData.description || '');
      if (!description && this.options.strictValidation) {
        warnings.push('Description is missing');
        qualityScore -= 10;
      }

      // Process deadline
      const deadlineResult = this.parseDeadline(rawData.deadline);
      if (deadlineResult.error) {
        warnings.push(`Deadline parsing: ${deadlineResult.error}`);
        qualityScore -= 15;
      }

      // Process funding amount
      const fundingResult = this.parseFundingAmount(rawData.fundingAmount);
      if (fundingResult.error) {
        warnings.push(`Funding amount parsing: ${fundingResult.error}`);
        qualityScore -= 10;
      }

      // Process eligibility
      const eligibilityCriteria = this.normalizeText(rawData.eligibility || '');

      // Process application URL
      const applicationUrl = this.validateUrl(rawData.applicationUrl);
      if (rawData.applicationUrl && !applicationUrl) {
        warnings.push('Invalid application URL');
        qualityScore -= 5;
      }

      // Process funder data
      const funder = this.processFunderData(rawData);

      // Extract location eligibility
      const locationEligibility = this.extractLocationEligibility(description + ' ' + eligibilityCriteria);

      // Generate content hash
      const contentHash = this.generateContentHash(rawData);

      // Determine category (basic implementation - can be enhanced with ML)
      const category = this.inferCategory(title + ' ' + description);

      const processedData: ProcessedGrantData = {
        title,
        description,
        deadline: deadlineResult.date,
        fundingAmountMin: fundingResult.min,
        fundingAmountMax: fundingResult.max,
        eligibilityCriteria,
        applicationUrl,
        funder,
        category,
        locationEligibility,
        confidenceScore: qualityScore,
        contentHash
      };

      return {
        data: processedData,
        warnings,
        errors,
        qualityScore
      };

    } catch (error) {
      errors.push(`Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Only throw if there are critical errors that prevent processing
      if (errors.some(e => e.includes('Processing failed'))) {
        throw new Error(`Data processing failed: ${errors.join(', ')}`);
      }
      
      // For other errors, return the result with errors
      const processedData: ProcessedGrantData = {
        title: '',
        description: '',
        deadline: undefined,
        fundingAmountMin: undefined,
        fundingAmountMax: undefined,
        eligibilityCriteria: '',
        applicationUrl: undefined,
        funder: {
          name: 'Unknown Funder',
          type: ScrapedSourceType.FOUNDATION
        },
        category: GrantCategory.COMMUNITY_DEVELOPMENT,
        locationEligibility: [],
        confidenceScore: 0,
        contentHash: 'error'
      };

      return {
        data: processedData,
        warnings: [],
        errors,
        qualityScore: 0
      };
    }
  }

  /**
   * Parse funding amounts with support for various currency formats and ranges
   */
  private parseFundingAmount(fundingText?: string): { min?: number; max?: number; error?: string } {
    if (!fundingText) {
      return {};
    }

    try {
      // Clean the text but preserve "up to" and "minimum" keywords
      const originalText = fundingText.toLowerCase();
      const cleanText = fundingText.replace(/[^\d.,\-$€£¥₹\s]/gi, '').trim();
      
      // Currency symbols and their conversion rates
      const currencyPatterns = {
        '$': this.options.currencyConversionRates?.USD || 1,
        '€': this.options.currencyConversionRates?.EUR || 1.1,
        '£': this.options.currencyConversionRates?.GBP || 1.25,
        '¥': this.options.currencyConversionRates?.JPY || 0.007,
        '₹': this.options.currencyConversionRates?.INR || 0.012
      };

      // Detect currency
      let conversionRate = 1;
      for (const [symbol, rate] of Object.entries(currencyPatterns)) {
        if (cleanText.includes(symbol)) {
          conversionRate = rate;
          break;
        }
      }

      // Extract numbers that are likely currency amounts (must be preceded by currency symbol or be substantial amounts)
      const currencyNumberPattern = /(?:[$€£¥₹]\s*[\d,]+(?:\.\d{1,2})?|(?:^|\s)[\d,]{4,}(?:\.\d{1,2})?(?=\s*(?:thousand|million|billion|k|m|b|$)))/gi;
      const numberMatches = fundingText.match(currencyNumberPattern);
      if (!numberMatches) {
        return { error: 'No valid numbers found in funding amount' };
      }

      const numbers = numberMatches.map(match => {
        const cleanMatch = match.replace(/[$€£¥₹,\s]/g, '');
        const num = parseFloat(cleanMatch);
        return num * conversionRate;
      }).filter(num => !isNaN(num) && num > 0);

      if (numbers.length === 0) {
        return { error: 'No valid numbers could be parsed' };
      }

      // Handle ranges (e.g., "$10,000 - $50,000" or "up to $100,000")
      // Check for "up to" pattern first, regardless of number count
      if (originalText.includes('up to') || originalText.includes('maximum')) {
        const amount = Math.max(...numbers); // Take the highest amount mentioned
        return { min: 0, max: amount };
      } else if (originalText.includes('minimum') || originalText.includes('at least')) {
        const amount = Math.min(...numbers); // Take the lowest amount mentioned
        return { min: amount };
      } else if (numbers.length === 1) {
        const amount = numbers[0];
        return { min: amount, max: amount };
      } else if (numbers.length === 2) {
        const [min, max] = numbers.sort((a, b) => a - b);
        return { min, max };
      } else {
        // Multiple numbers - take min and max
        const min = Math.min(...numbers);
        const max = Math.max(...numbers);
        return { min, max };
      }

    } catch (error) {
      return { error: `Failed to parse funding amount: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  /**
   * Parse deadline with support for multiple date formats and time zones
   */
  private parseDeadline(deadlineText?: string): { date?: Date; error?: string } {
    if (!deadlineText) {
      return {};
    }

    try {
      // Clean the text
      const cleanText = deadlineText.trim().replace(/[^\w\s\-\/\.,:\+]/g, '');

      // Common date patterns
      const datePatterns = [
        // ISO format: 2024-12-31, 2024/12/31
        /(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/,
        // US format: 12/31/2024, 12-31-2024
        /(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/,
        // European format: 31/12/2024, 31-12-2024
        /(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/,
        // Month day year: December 31, 2024
        /([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/,
        // Day month year: 31 December 2024
        /(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/
      ];

      // Try parsing as ISO date specifically first (local time, not UTC)
      if (/^\d{4}-\d{2}-\d{2}$/.test(cleanText)) {
        const parts = cleanText.split('-');
        const parsedDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        if (!isNaN(parsedDate.getTime())) {
          return { date: parsedDate };
        }
      }

      // Try to parse with built-in Date constructor
      let parsedDate = new Date(cleanText);
      if (!isNaN(parsedDate.getTime()) && parsedDate.getFullYear() > 2020) {
        return { date: parsedDate };
      }

      // Try manual parsing with patterns
      for (const pattern of datePatterns) {
        const match = cleanText.match(pattern);
        if (match) {
          try {
            // Handle different match groups based on pattern
            if (pattern.source.includes('A-Za-z')) {
              // Month name patterns
              const monthNames = [
                'january', 'february', 'march', 'april', 'may', 'june',
                'july', 'august', 'september', 'october', 'november', 'december'
              ];
              
              if (match[1] && isNaN(Number(match[1]))) {
                // Month day year format
                const monthIndex = monthNames.findIndex(m => 
                  m.startsWith(match[1].toLowerCase().substring(0, 3))
                );
                if (monthIndex !== -1) {
                  parsedDate = new Date(Number(match[3]), monthIndex, Number(match[2]));
                }
              } else if (match[2] && isNaN(Number(match[2]))) {
                // Day month year format
                const monthIndex = monthNames.findIndex(m => 
                  m.startsWith(match[2].toLowerCase().substring(0, 3))
                );
                if (monthIndex !== -1) {
                  parsedDate = new Date(Number(match[3]), monthIndex, Number(match[1]));
                }
              }
            } else {
              // Numeric patterns
              if (match[1].length === 4) {
                // ISO format: YYYY-MM-DD
                parsedDate = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
              } else if (match[3].length === 4) {
                // Check if it's MM/DD/YYYY or DD/MM/YYYY
                // For now, assume MM/DD/YYYY for US sources
                parsedDate = new Date(Number(match[3]), Number(match[1]) - 1, Number(match[2]));
              }
            }

            if (!isNaN(parsedDate.getTime()) && parsedDate.getFullYear() > 2020) {
              return { date: parsedDate };
            }
          } catch (e) {
            continue;
          }
        }
      }

      return { error: `Could not parse deadline: ${deadlineText}` };

    } catch (error) {
      return { error: `Failed to parse deadline: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  /**
   * Normalize text content and remove HTML artifacts
   */
  private normalizeText(text: string): string {
    if (!text) return '';

    let normalized = text;

    // Remove HTML tags
    normalized = normalized.replace(/<[^>]*>/g, '');

    // Decode HTML entities
    const htmlEntities: Record<string, string> = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#39;': "'",
      '&nbsp;': ' ',
      '&mdash;': '—',
      '&ndash;': '–',
      '&hellip;': '…'
    };

    for (const [entity, char] of Object.entries(htmlEntities)) {
      normalized = normalized.replace(new RegExp(entity, 'g'), char);
    }

    // Normalize whitespace
    normalized = normalized.replace(/\s+/g, ' ').trim();

    // Remove excessive punctuation
    if (this.options.textNormalizationLevel === 'aggressive') {
      normalized = normalized.replace(/[.]{3,}/g, '…');
      normalized = normalized.replace(/[!]{2,}/g, '!');
      normalized = normalized.replace(/[?]{2,}/g, '?');
    }

    // Remove control characters
    normalized = normalized.replace(/[\x00-\x1F\x7F]/g, '');

    return normalized;
  }

  /**
   * Validate URL format
   */
  private validateUrl(url?: string): string | undefined {
    if (!url) return undefined;

    try {
      const normalizedUrl = url.trim();
      
      // Check if it looks like a valid domain/URL pattern first
      const domainPattern = /^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(\/.*)?$/;
      const urlPattern = /^https?:\/\//;
      
      if (!urlPattern.test(normalizedUrl) && !domainPattern.test(normalizedUrl)) {
        return undefined;
      }
      
      // Add protocol if missing
      let fullUrl = normalizedUrl;
      if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
        fullUrl = 'https://' + normalizedUrl;
      }

      const urlObj = new URL(fullUrl);
      return urlObj.toString();
    } catch {
      return undefined;
    }
  }

  /**
   * Process funder data
   */
  private processFunderData(rawData: RawGrantData): FunderData {
    const name = this.normalizeText(rawData.funderName || 'Unknown Funder');
    
    // Extract website from source URL
    let website: string | undefined;
    try {
      const sourceUrl = new URL(rawData.sourceUrl);
      website = `${sourceUrl.protocol}//${sourceUrl.hostname}`;
    } catch {
      website = undefined;
    }

    // Determine funder type based on URL or name
    let type: ScrapedSourceType = ScrapedSourceType.FOUNDATION;
    const lowerName = name.toLowerCase();
    const lowerUrl = rawData.sourceUrl.toLowerCase();

    if (lowerUrl.includes('.gov') || lowerName.includes('government') || lowerName.includes('federal')) {
      type = ScrapedSourceType.GOV;
    } else if (lowerName.includes('international') || lowerName.includes('world') || lowerName.includes('global')) {
      type = ScrapedSourceType.NGO;
    } else if (lowerName.includes('corp') || lowerName.includes('company') || lowerName.includes('inc')) {
      type = ScrapedSourceType.BUSINESS;
    }

    return {
      name,
      website,
      type
    };
  }

  /**
   * Extract location eligibility from text
   */
  private extractLocationEligibility(text: string): string[] {
    const locations: string[] = [];
    const lowerText = text.toLowerCase();

    // Common location patterns
    const locationPatterns = [
      // Countries and US-based patterns
      /\b(united states|usa|us|america|us-based|american)\b/g,
      /\b(canada|canadian|mexico|mexican)\b/g,
      /\b(uk|united kingdom|britain|british)\b/g,
      /\b(australia|australian|germany|german|france|french|italy|italian|spain|spanish|japan|japanese|china|chinese|india|indian|brazil|brazilian)\b/g,
      // US States
      /\b(alabama|alaska|arizona|arkansas|california|colorado|connecticut|delaware|florida|georgia|hawaii|idaho|illinois|indiana|iowa|kansas|kentucky|louisiana|maine|maryland|massachusetts|michigan|minnesota|mississippi|missouri|montana|nebraska|nevada|new hampshire|new jersey|new mexico|new york|north carolina|north dakota|ohio|oklahoma|oregon|pennsylvania|rhode island|south carolina|south dakota|tennessee|texas|utah|vermont|virginia|washington|west virginia|wisconsin|wyoming)\b/g,
      // Regions
      /\b(north america|south america|europe|asia|africa|oceania|middle east|latin america|caribbean)\b/g,
      // Cities (major ones)
      /\b(new york|los angeles|chicago|houston|philadelphia|phoenix|san antonio|san diego|dallas|san jose|austin|jacksonville|san francisco|columbus|charlotte|fort worth|detroit|el paso|memphis|seattle|denver|washington|boston|nashville|baltimore|oklahoma city|portland|las vegas|milwaukee|albuquerque|tucson|fresno|sacramento|long beach|kansas city|mesa|atlanta|colorado springs|raleigh|omaha|miami|oakland|minneapolis|tulsa|cleveland|wichita|arlington)\b/g
    ];

    for (const pattern of locationPatterns) {
      const matches = lowerText.match(pattern);
      if (matches) {
        locations.push(...matches.map(match => {
          // Handle special cases
          if (match === 'us' || match === 'usa' || match === 'america' || match === 'us-based' || match === 'american') {
            return 'United States';
          }
          if (match === 'uk' || match === 'britain' || match === 'british') {
            return 'United Kingdom';
          }
          if (match === 'canadian') {
            return 'Canada';
          }
          if (match === 'mexican') {
            return 'Mexico';
          }
          if (match === 'australian') {
            return 'Australia';
          }
          if (match === 'german') {
            return 'Germany';
          }
          if (match === 'french') {
            return 'France';
          }
          if (match === 'italian') {
            return 'Italy';
          }
          if (match === 'spanish') {
            return 'Spain';
          }
          if (match === 'japanese') {
            return 'Japan';
          }
          if (match === 'chinese') {
            return 'China';
          }
          if (match === 'indian') {
            return 'India';
          }
          if (match === 'brazilian') {
            return 'Brazil';
          }
          
          // Default capitalization
          return match.split(' ').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
          ).join(' ');
        }));
      }
    }

    // Remove duplicates and return
    return [...new Set(locations)];
  }

  /**
   * Generate content hash for change detection
   */
  private generateContentHash(rawData: RawGrantData): string {
    const content = [
      rawData.title,
      rawData.description,
      rawData.deadline,
      rawData.fundingAmount,
      rawData.eligibility
    ].filter(Boolean).join('|');

    // Simple hash function (in production, use crypto.createHash)
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Infer grant category from content (basic implementation)
   */
  private inferCategory(content: string): GrantCategory {
    const lowerContent = content.toLowerCase();

    const categoryKeywords = {
      [GrantCategory.HEALTHCARE_PUBLIC_HEALTH]: ['health', 'medical', 'healthcare', 'disease', 'wellness', 'public health', 'medicine'],
      [GrantCategory.EDUCATION_TRAINING]: ['education', 'school', 'university', 'training', 'learning', 'academic', 'student'],
      [GrantCategory.ENVIRONMENT_SUSTAINABILITY]: ['environment', 'climate', 'sustainability', 'green', 'renewable', 'conservation', 'ecology'],
      [GrantCategory.SOCIAL_SERVICES]: ['social', 'welfare', 'poverty', 'homeless', 'family', 'children', 'services'],
      [GrantCategory.ARTS_CULTURE]: ['arts', 'culture', 'music', 'theater', 'museum', 'creative', 'cultural'],
      [GrantCategory.TECHNOLOGY_INNOVATION]: ['technology', 'innovation', 'tech', 'digital', 'software'],
      [GrantCategory.RESEARCH_DEVELOPMENT]: ['research', 'development', 'science', 'scientific', 'study', 'investigation', 'ai', 'artificial intelligence', 'nsf', 'national science foundation'],
      [GrantCategory.COMMUNITY_DEVELOPMENT]: ['community', 'development', 'economic', 'infrastructure', 'housing', 'urban', 'initiatives']
    };

    let bestMatch = GrantCategory.COMMUNITY_DEVELOPMENT;
    let maxScore = 0;

    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      const score = keywords.reduce((acc, keyword) => {
        const matches = (lowerContent.match(new RegExp(keyword, 'g')) || []).length;
        return acc + matches;
      }, 0);

      if (score > maxScore) {
        maxScore = score;
        bestMatch = category as GrantCategory;
      }
    }

    return bestMatch;
  }
}