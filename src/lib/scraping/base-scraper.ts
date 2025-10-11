import { PrismaClient } from '@prisma/client';
import { ScrapingResult } from './orchestrator';

const prisma = new PrismaClient();

export interface GrantData {
  title: string;
  description?: string;
  deadline?: Date;
  fundingAmountMin?: number;
  fundingAmountMax?: number;
  applicationUrl?: string;
  category: string;
  funderName: string;
  eligibilityCriteria?: string;
  locationEligibility?: string[];
  source: string;
  contentHash: string;
}

export abstract class BaseScraper {
  protected abstract extractGrants(url: string): Promise<GrantData[]>;

  async scrape(url: string): Promise<ScrapingResult> {
    try {
      // Extract grants from the source
      const extractedGrants = await this.extractGrants(url);
      
      let totalInserted = 0;
      let totalUpdated = 0;
      let totalSkipped = 0;

      // Process each grant
      for (const grantData of extractedGrants) {
        try {
          const result = await this.processGrant(grantData);
          
          if (result === 'inserted') totalInserted++;
          else if (result === 'updated') totalUpdated++;
          else totalSkipped++;
          
        } catch (error) {
          console.error(`Failed to process grant: ${grantData.title}`, error);
          totalSkipped++;
        }
      }

      return {
        totalFound: extractedGrants.length,
        totalInserted,
        totalUpdated,
        totalSkipped,
        grants: extractedGrants
      };
    } catch (error) {
      console.error('Scraping failed:', error);
      throw error;
    }
  }

  private async processGrant(grantData: GrantData): Promise<'inserted' | 'updated' | 'skipped'> {
    // Check if grant already exists by content hash
    const existingGrant = await prisma.grant.findFirst({
      where: { contentHash: grantData.contentHash }
    });

    // Get or create funder
    let funder = await prisma.funder.findFirst({
      where: { name: grantData.funderName }
    });

    if (!funder) {
      funder = await prisma.funder.create({
        data: {
          name: grantData.funderName,
          type: 'PRIVATE_FOUNDATION' // Default, can be improved
        }
      });
    }

    const grantPayload = {
      title: grantData.title,
      description: grantData.description,
      deadline: grantData.deadline,
      fundingAmountMin: grantData.fundingAmountMin || null,
      fundingAmountMax: grantData.fundingAmountMax || null,
      applicationUrl: grantData.applicationUrl,
      category: this.mapCategory(grantData.category),
      eligibilityCriteria: grantData.eligibilityCriteria,
      locationEligibility: grantData.locationEligibility,
      source: grantData.source,
      contentHash: grantData.contentHash,
      funderId: funder.id,
      scrapedFrom: grantData.source,
      sourceUpdatedAt: new Date(),
      status: 'ACTIVE'
    };

    if (existingGrant) {
      // Update existing grant
      await prisma.grant.update({
        where: { id: existingGrant.id },
        data: grantPayload
      });
      return 'updated';
    } else {
      // Create new grant
      await prisma.grant.create({
        data: grantPayload
      });
      return 'inserted';
    }
  }

  private mapCategory(category: string): any {
    // Map scraped categories to our enum values
    const categoryMap: Record<string, any> = {
      'health': 'HEALTHCARE_PUBLIC_HEALTH',
      'healthcare': 'HEALTHCARE_PUBLIC_HEALTH',
      'education': 'EDUCATION_TRAINING',
      'environment': 'CLIMATE_ENVIRONMENT',
      'climate': 'CLIMATE_ENVIRONMENT',
      'technology': 'TECHNOLOGY_INNOVATION',
      'agriculture': 'AGRICULTURE_FOOD_SECURITY',
      'community': 'COMMUNITY_DEVELOPMENT',
      'human rights': 'HUMAN_RIGHTS_GOVERNANCE',
      'arts': 'ARTS_CULTURE',
      'women': 'WOMEN_YOUTH_EMPOWERMENT',
      'youth': 'WOMEN_YOUTH_EMPOWERMENT'
    };

    const lowerCategory = category.toLowerCase();
    return categoryMap[lowerCategory] || 'COMMUNITY_DEVELOPMENT';
  }

  protected generateContentHash(grant: Partial<GrantData>): string {
    const content = `${grant.title}-${grant.funderName}-${grant.deadline?.toISOString()}`;
    return Buffer.from(content).toString('base64');
  }
}