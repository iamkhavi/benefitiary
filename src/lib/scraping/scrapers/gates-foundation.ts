import { BaseScraper } from '../base-scraper';
import { GrantData } from '../types';
import axios from 'axios';
import * as cheerio from 'cheerio';

export class GatesFoundationScraper extends BaseScraper {
  protected async extractGrants(url: string): Promise<GrantData[]> {
    try {
      console.log(`Scraping Gates Foundation: ${url}`);
      
      // Fetch the page
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 30000
      });

      const $ = cheerio.load(response.data);
      const grants: GrantData[] = [];

      // Gates Foundation actual selectors - need to inspect the real website
      // For now, let's try more generic selectors that might work
      $('article, .card, .item, [class*="grant"], [class*="commitment"]').each((index, element) => {
        try {
          const $el = $(element);
          
          const title = $el.find('h3, h2, .title').first().text().trim();
          const description = $el.find('.description, .summary, p').first().text().trim();
          const amountText = $el.find('.amount, .funding').text().trim();
          
          if (!title) return; // Skip if no title found

          // Parse funding amount
          const fundingAmount = this.parseFundingAmount(amountText);
          
          // Generate content hash
          const contentHash = this.generateContentHash({
            title,
            funderName: 'Bill & Melinda Gates Foundation',
            deadline: undefined // Gates Foundation doesn't typically show deadlines for committed grants
          });

          const grant: GrantData = {
            title,
            description: description || undefined,
            deadline: undefined, // Committed grants don't have application deadlines
            fundingAmountMin: fundingAmount.min,
            fundingAmountMax: fundingAmount.max,
            applicationUrl: undefined, // Committed grants are not open for application
            category: this.inferCategory(title + ' ' + description),
            funderName: 'Bill & Melinda Gates Foundation',
            eligibilityCriteria: 'Varies by program focus area',
            locationEligibility: ['Global'], // Gates Foundation operates globally
            source: url,
            contentHash
          };

          grants.push(grant);
        } catch (error) {
          console.error('Error processing grant element:', error);
        }
      });

      // If no grants found, return empty array - DO NOT CREATE FAKE DATA
      if (grants.length === 0) {
        console.log('No grants found with current selectors. Website structure may have changed.');
        console.log('Returning empty result - no placeholder data will be stored.');
      }

      console.log(`Found ${grants.length} grants from Gates Foundation`);
      return grants;

    } catch (error) {
      console.error('Gates Foundation scraping failed:', error);
      throw new Error(`Failed to scrape Gates Foundation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private parseFundingAmount(amountText: string): { min?: number; max?: number } {
    if (!amountText) return {};

    // Remove currency symbols and clean text
    const cleanText = amountText.replace(/[$,]/g, '').toLowerCase();
    
    // Look for patterns like "$1.5 million", "$500,000", etc.
    const millionMatch = cleanText.match(/(\d+\.?\d*)\s*million/);
    if (millionMatch) {
      const amount = parseFloat(millionMatch[1]) * 1000000;
      return { min: amount, max: amount };
    }

    const thousandMatch = cleanText.match(/(\d+\.?\d*)\s*thousand/);
    if (thousandMatch) {
      const amount = parseFloat(thousandMatch[1]) * 1000;
      return { min: amount, max: amount };
    }

    const numberMatch = cleanText.match(/(\d+\.?\d*)/);
    if (numberMatch) {
      const amount = parseFloat(numberMatch[1]);
      return { min: amount, max: amount };
    }

    return {};
  }

  private inferCategory(text: string): string {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('health') || lowerText.includes('medical') || lowerText.includes('vaccine')) {
      return 'healthcare';
    }
    if (lowerText.includes('education') || lowerText.includes('learning') || lowerText.includes('school')) {
      return 'education';
    }
    if (lowerText.includes('agriculture') || lowerText.includes('food') || lowerText.includes('farming')) {
      return 'agriculture';
    }
    if (lowerText.includes('climate') || lowerText.includes('environment') || lowerText.includes('energy')) {
      return 'environment';
    }
    if (lowerText.includes('women') || lowerText.includes('gender') || lowerText.includes('equality')) {
      return 'women';
    }
    
    return 'community';
  }


}