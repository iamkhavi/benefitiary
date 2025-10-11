import { BaseScraper } from '../base-scraper';
import { GrantData } from '../types';
import axios from 'axios';

export class GrantsGovScraper extends BaseScraper {
  protected async extractGrants(url: string): Promise<GrantData[]> {
    try {
      console.log(`Scraping Grants.gov: ${url}`);
      
      // TODO: Implement Grants.gov API integration
      // API endpoint: https://www.grants.gov/grantsws/rest/opportunities/search/
      // Requires API key and proper authentication
      
      // Real Grants.gov API integration
      const apiUrl = 'https://www.grants.gov/grantsws/rest/opportunities/search/';
      
      console.log('Making real API call to Grants.gov...');
      
      const response = await axios.post(apiUrl, {
        startRecordNum: 1,
        oppStatuses: 'forecasted|posted',
        rows: 25,
        sortBy: 'openDate|desc'
      }, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 30000
      });

      console.log(`✅ Grants.gov API response: ${response.status}`);
      
      const grants: GrantData[] = [];
      
      if (response.data && response.data.oppHits) {
        const opportunities = response.data.oppHits;
        console.log(`📊 Found ${opportunities.length} real opportunities from Grants.gov`);
        
        for (const opp of opportunities.slice(0, 10)) { // Limit to 10 grants
          try {
            const grant: GrantData = {
              title: opp.oppTitle || 'Untitled Grant',
              description: opp.oppDescription || opp.synopsis || 'No description available',
              deadline: opp.closeDate ? new Date(opp.closeDate) : undefined,
              fundingAmountMin: opp.awardFloor ? parseFloat(opp.awardFloor) : undefined,
              fundingAmountMax: opp.awardCeiling ? parseFloat(opp.awardCeiling) : undefined,
              applicationUrl: `https://www.grants.gov/web/grants/view-opportunity.html?oppId=${opp.oppId}`,
              category: this.mapGrantsGovCategory(opp.categoryCode || ''),
              funderName: opp.agencyName || opp.agencyCode || 'US Government',
              eligibilityCriteria: opp.eligibilityDesc || 'See full opportunity details',
              locationEligibility: ['United States'],
              source: url,
              contentHash: this.generateContentHash({
                title: opp.oppTitle,
                funderName: opp.agencyName,
                deadline: opp.closeDate ? new Date(opp.closeDate) : undefined
              })
            };
            
            grants.push(grant);
            console.log(`✅ Real grant extracted: ${grant.title.substring(0, 50)}...`);
            
          } catch (error) {
            console.error('Error processing grant opportunity:', error);
          }
        }
      } else {
        console.log('❌ No opportunities found in API response');
      }
      
      return grants;

    } catch (error) {
      console.error('❌ Grants.gov API failed:', error);
      console.log('Returning empty result - no fallback data');
      return [];
    }
  }

  private mapGrantsGovCategory(categoryCode: string): any {
    // Map Grants.gov category codes to our enum
    const categoryMap: Record<string, any> = {
      '10': 'AGRICULTURE_FOOD_SECURITY',
      '11': 'COMMUNITY_DEVELOPMENT', 
      '12': 'EDUCATION_TRAINING',
      '13': 'HEALTHCARE_PUBLIC_HEALTH',
      '14': 'CLIMATE_ENVIRONMENT',
      '15': 'TECHNOLOGY_INNOVATION',
      '16': 'HUMAN_RIGHTS_GOVERNANCE',
      '17': 'ARTS_CULTURE'
    };
    
    return categoryMap[categoryCode] || 'COMMUNITY_DEVELOPMENT';
  }
}