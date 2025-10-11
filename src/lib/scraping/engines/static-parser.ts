/**
 * Static HTML Parser Engine using Cheerio
 * Implements DOM parsing logic for extracting grant information from HTML
 */

import * as cheerio from 'cheerio';
import { CheerioAPI } from 'cheerio';
import { ScrapingEngine, SourceConfiguration, RawGrantData, StaticParserConfig, SourceSelectors } from '../types';
import { HTTPClient, createDefaultHTTPClientConfig } from '../utils/http-client';
import { TextCleaner } from '../utils/text-cleaner';

export class StaticParserEngine implements ScrapingEngine {
  private config: StaticParserConfig;
  private httpClient: HTTPClient;

  constructor(config: StaticParserConfig) {
    this.config = config;
    
    // Initialize HTTP client with configuration
    const httpConfig = createDefaultHTTPClientConfig();
    httpConfig.timeout = config.timeout;
    httpConfig.userAgents = [config.userAgent];
    
    this.httpClient = new HTTPClient(httpConfig);
  }

  async scrape(source: SourceConfiguration): Promise<RawGrantData[]> {
    try {
      console.log(`Starting static HTML parsing for source: ${source.url}`);
      
      // Fetch the HTML page
      const $ = await this.fetchPage(source.url);
      
      // Extract grants using configured selectors
      const grants = await this.extractGrants($, source.selectors, source.url);
      
      console.log(`Successfully extracted ${grants.length} grants from ${source.url}`);
      return grants;
      
    } catch (error) {
      console.error(`Error scraping source ${source.url}:`, error);
      throw new Error(`Static parsing failed for ${source.url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async fetchPage(url: string): Promise<CheerioAPI> {
    try {
      console.log(`Fetching page: ${url}`);
      
      const response = await this.httpClient.get(url, {
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        maxRedirects: this.config.followRedirects ? 5 : 0,
      });

      if (response.status !== 200) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      if (!response.data || typeof response.data !== 'string') {
        throw new Error('Invalid response: expected HTML content');
      }

      // Load HTML into Cheerio
      const $ = cheerio.load(response.data);

      console.log(`Successfully loaded HTML content from ${url}`);
      return $;
      
    } catch (error) {
      console.error(`Failed to fetch page ${url}:`, error);
      throw error;
    }
  }

  private async extractGrants($: CheerioAPI, selectors: SourceSelectors, sourceUrl: string): Promise<RawGrantData[]> {
    try {
      const grants: RawGrantData[] = [];
      const grantElements = $(selectors.grantContainer);
      
      console.log(`Found ${grantElements.length} grant containers using selector: ${selectors.grantContainer}`);
      
      if (grantElements.length === 0) {
        console.warn(`No grant containers found with selector: ${selectors.grantContainer}`);
        return grants;
      }

      // Process each grant element
      for (let i = 0; i < grantElements.length; i++) {
        try {
          const $element = $(grantElements[i]);
          const grant = await this.parseGrantElement($element, selectors, sourceUrl);
          
          // Only add grants with valid titles
          if (grant.title && grant.title.trim().length > 0) {
            grants.push(grant);
          } else {
            console.warn(`Skipping grant ${i + 1}: missing or empty title`);
          }
        } catch (error) {
          console.error(`Error parsing grant element ${i + 1}:`, error);
          // Continue processing other grants even if one fails
        }
      }

      console.log(`Successfully parsed ${grants.length} valid grants`);
      return grants;
      
    } catch (error) {
      console.error('Error extracting grants from HTML:', error);
      throw error;
    }
  }

  private async parseGrantElement($element: cheerio.Cheerio<any>, selectors: SourceSelectors, sourceUrl: string): Promise<RawGrantData> {
    try {
      // Extract basic grant information using selectors
      const title = this.extractText($element, selectors.title);
      const description = this.extractText($element, selectors.description);
      const deadline = this.extractText($element, selectors.deadline);
      const fundingAmount = this.extractText($element, selectors.fundingAmount);
      const eligibility = this.extractText($element, selectors.eligibility);
      const funderName = this.extractText($element, selectors.funderInfo);
      
      // Extract application URL (could be href attribute)
      const applicationUrl = this.extractUrl($element, selectors.applicationUrl, sourceUrl);

      // Create raw grant data object
      const rawData: RawGrantData = {
        title: this.cleanText(title),
        description: description ? this.cleanText(description) : undefined,
        deadline: deadline ? this.cleanText(deadline) : undefined,
        fundingAmount: fundingAmount ? this.cleanText(fundingAmount) : undefined,
        eligibility: eligibility ? this.cleanText(eligibility) : undefined,
        applicationUrl: applicationUrl || undefined,
        funderName: funderName ? this.cleanText(funderName) : undefined,
        sourceUrl,
        scrapedAt: new Date(),
        rawContent: {
          html: $element.html() || '',
          text: $element.text() || '',
          selectors: selectors,
        },
      };

      return rawData;
      
    } catch (error) {
      console.error('Error parsing individual grant element:', error);
      throw error;
    }
  }

  /**
   * Extract text content from an element using a CSS selector
   */
  private extractText($element: cheerio.Cheerio<any>, selector: string): string {
    try {
      if (!selector || selector.trim() === '') {
        return '';
      }

      // Try to find the element using the selector
      const targetElement = $element.find(selector).first();
      
      if (targetElement.length === 0) {
        // If not found within element, try the element itself
        if ($element.is(selector)) {
          return $element.text().trim();
        }
        return '';
      }

      return targetElement.text().trim();
    } catch (error) {
      console.warn(`Error extracting text with selector "${selector}":`, error);
      return '';
    }
  }

  /**
   * Extract URL from an element, handling both href attributes and text content
   */
  private extractUrl($element: cheerio.Cheerio<any>, selector: string, baseUrl: string): string | null {
    try {
      if (!selector || selector.trim() === '') {
        return null;
      }

      const targetElement = $element.find(selector).first();
      
      if (targetElement.length === 0) {
        return null;
      }

      // Try to get href attribute first
      let url = targetElement.attr('href');
      
      // If no href, try to get text content as URL
      if (!url) {
        url = targetElement.text().trim();
      }

      if (!url) {
        return null;
      }

      // Convert relative URLs to absolute URLs
      return this.resolveUrl(url, baseUrl);
      
    } catch (error) {
      console.warn(`Error extracting URL with selector "${selector}":`, error);
      return null;
    }
  }

  /**
   * Resolve relative URLs to absolute URLs
   */
  private resolveUrl(url: string, baseUrl: string): string {
    try {
      // If already absolute URL, return as is
      if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
      }

      // Handle protocol-relative URLs
      if (url.startsWith('//')) {
        const baseProtocol = new URL(baseUrl).protocol;
        return `${baseProtocol}${url}`;
      }

      // Handle absolute paths
      if (url.startsWith('/')) {
        const baseUrlObj = new URL(baseUrl);
        return `${baseUrlObj.protocol}//${baseUrlObj.host}${url}`;
      }

      // Handle relative paths
      const baseUrlObj = new URL(baseUrl);
      const basePath = baseUrlObj.pathname.endsWith('/') 
        ? baseUrlObj.pathname 
        : baseUrlObj.pathname.substring(0, baseUrlObj.pathname.lastIndexOf('/') + 1);
      
      return `${baseUrlObj.protocol}//${baseUrlObj.host}${basePath}${url}`;
      
    } catch (error) {
      console.warn(`Error resolving URL "${url}" with base "${baseUrl}":`, error);
      return url; // Return original URL if resolution fails
    }
  }

  /**
   * Clean and normalize text content using TextCleaner utility
   */
  private cleanText(text: string): string {
    if (!text) {
      return '';
    }

    // Use the comprehensive TextCleaner utility
    return TextCleaner.cleanText(text, {
      removeHtmlEntities: true,
      normalizeWhitespace: true,
      removeBullets: true,
      removeEllipsis: true,
      trimWhitespace: true,
      removeEmptyLines: true,
      maxLength: 5000 // Reasonable limit for grant descriptions
    });
  }

  /**
   * Validate that required selectors are present
   */
  private validateSelectors(selectors: SourceSelectors): void {
    const requiredSelectors = ['grantContainer', 'title'];
    const missingSelectors = requiredSelectors.filter(selector => 
      !selectors[selector as keyof SourceSelectors] || 
      selectors[selector as keyof SourceSelectors].trim() === ''
    );

    if (missingSelectors.length > 0) {
      throw new Error(`Missing required selectors: ${missingSelectors.join(', ')}`);
    }
  }

  /**
   * Get parsing statistics for monitoring
   */
  getStats() {
    return this.httpClient.getRequestStats();
  }

  /**
   * Reset parsing statistics
   */
  resetStats() {
    this.httpClient.resetStats();
  }
}