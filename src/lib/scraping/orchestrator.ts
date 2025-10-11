import { BaseScraper } from './base-scraper';
import { ScrapingResult } from './types';

export class ScrapingOrchestrator {
  private scrapers: Map<string, BaseScraper> = new Map();

  registerScraper(name: string, scraper: BaseScraper) {
    this.scrapers.set(name, scraper);
  }

  async scrapeSource(scraperName: string, url: string): Promise<ScrapingResult> {
    const scraper = this.scrapers.get(scraperName);

    if (!scraper) {
      throw new Error(`Scraper not found: ${scraperName}`);
    }

    console.log(`Starting scraping with ${scraperName} for ${url}`);

    try {
      const result = await scraper.scrape(url);
      console.log(`Scraping completed: ${result.totalFound} grants found`);
      return result;
    } catch (error) {
      console.error(`Scraping failed for ${scraperName}:`, error);
      throw error;
    }
  }

  getAvailableScrapers(): string[] {
    return Array.from(this.scrapers.keys());
  }
}