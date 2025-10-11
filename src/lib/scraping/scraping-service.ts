import { PrismaClient } from '@prisma/client';
import { ScrapingOrchestrator } from './orchestrator';
import { GatesFoundationScraper } from './scrapers/gates-foundation';
import { GrantsGovScraper } from './scrapers/grants-gov';
import { FordFoundationScraper } from './scrapers/ford-foundation';

const prisma = new PrismaClient();

export class ScrapingService {
  private orchestrator: ScrapingOrchestrator;

  constructor() {
    this.orchestrator = new ScrapingOrchestrator();
    this.initializeScrapers();
  }

  private initializeScrapers() {
    // Register all available scrapers
    this.orchestrator.registerScraper('gates-foundation', new GatesFoundationScraper());
    this.orchestrator.registerScraper('grants-gov', new GrantsGovScraper());
    this.orchestrator.registerScraper('ford-foundation', new FordFoundationScraper());
  }

  async startScrapingJob(sourceId: string): Promise<string> {
    try {
      // Get source from database
      const source = await prisma.scrapedSource.findUnique({
        where: { id: sourceId }
      });

      if (!source) {
        throw new Error(`Source not found: ${sourceId}`);
      }

      // Create scrape job record
      const job = await prisma.scrapeJob.create({
        data: {
          sourceId: source.id,
          status: 'PENDING',
          startedAt: new Date()
        }
      });

      // Start scraping in background
      this.runScrapingJob(job.id, source).catch(error => {
        console.error(`Scraping job ${job.id} failed:`, error);
      });

      return job.id;
    } catch (error) {
      console.error('Failed to start scraping job:', error);
      throw error;
    }
  }

  private async runScrapingJob(jobId: string, source: any) {
    try {
      // Update job status to running
      await prisma.scrapeJob.update({
        where: { id: jobId },
        data: { status: 'RUNNING' }
      });

      // Determine scraper type based on URL
      const scraperType = this.getScraperType(source.url);
      
      // Run the scraping
      const result = await this.orchestrator.scrapeSource(scraperType, source.url);

      // Update job with results
      await prisma.scrapeJob.update({
        where: { id: jobId },
        data: {
          status: 'SUCCESS',
          finishedAt: new Date(),
          totalFound: result.totalFound,
          totalInserted: result.totalInserted,
          totalUpdated: result.totalUpdated,
          totalSkipped: result.totalSkipped,
          duration: Math.floor((Date.now() - new Date().getTime()) / 1000)
        }
      });

      // Update source last scraped time
      await prisma.scrapedSource.update({
        where: { id: source.id },
        data: { 
          lastScrapedAt: new Date(),
          failCount: 0,
          lastError: null
        }
      });

    } catch (error) {
      // Update job with error
      await prisma.scrapeJob.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          finishedAt: new Date(),
          log: error instanceof Error ? error.message : 'Unknown error'
        }
      });

      // Update source with error info
      await prisma.scrapedSource.update({
        where: { id: source.id },
        data: {
          failCount: { increment: 1 },
          lastError: error instanceof Error ? error.message : 'Unknown error'
        }
      });

      throw error;
    }
  }

  private getScraperType(url: string): string {
    if (url.includes('gatesfoundation.org')) return 'gates-foundation';
    if (url.includes('grants.gov')) return 'grants-gov';
    if (url.includes('fordfoundation.org')) return 'ford-foundation';
    throw new Error(`No scraper available for URL: ${url}`);
  }

  async getScrapingStatus() {
    const [sources, recentJobs, totalGrants] = await Promise.all([
      prisma.scrapedSource.findMany({
        orderBy: { lastScrapedAt: 'desc' }
      }),
      prisma.scrapeJob.findMany({
        include: { source: true },
        orderBy: { startedAt: 'desc' },
        take: 10
      }),
      prisma.grant.count()
    ]);

    return {
      sources,
      recentJobs,
      totalGrants,
      activeSources: sources.filter(s => s.status === 'ACTIVE').length,
      lastScrapedAt: sources[0]?.lastScrapedAt || null
    };
  }

  async triggerAllActiveSources(): Promise<string[]> {
    const activeSources = await prisma.scrapedSource.findMany({
      where: { status: 'ACTIVE' }
    });

    const jobIds = [];
    for (const source of activeSources) {
      try {
        const jobId = await this.startScrapingJob(source.id);
        jobIds.push(jobId);
      } catch (error) {
        console.error(`Failed to start job for source ${source.id}:`, error);
      }
    }

    return jobIds;
  }
}

export const scrapingService = new ScrapingService();