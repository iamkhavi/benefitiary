/**
 * Rockefeller Foundation Scraper Integration Tests
 * End-to-end integration tests for Rockefeller Foundation scraping functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RockefellerFoundationScraper } from '../rockefeller-foundation';
import { GrantCategory, ScrapedSourceType } from '../../../types';

describe('RockefellerFoundationScraper Integration Tests', () => {
  let scraper: RockefellerFoundationScraper;

  beforeEach(() => {
    scraper = new RockefellerFoundationScraper();
  });

  afterEach(async () => {
    await scraper.cleanup();
  });

  describe('End-to-End Scraping Workflow', () => {
    it('should complete full scraping workflow successfully', async () => {
      // This test will use sample data since we can't rely on live scraping in tests
      const result = await scraper.scrape();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);

      // Verify each grant has required fields
      result.forEach(grant => {
        expect(grant.title).toBeDefined();
        expect(grant.title.length).toBeGreaterThan(0);
        expect(grant.funderName).toBe('The Rockefeller Foundation');
        expect(grant.sourceUrl).toContain('rockefellerfoundation.org');
        expect(grant.scrapedAt).toBeInstanceOf(Date);
        expect(grant.rawContent).toBeDefined();
      });
    });

    it('should process grants with Rockefeller Foundation specific enhancements', async () => {
      const result = await scraper.scrape();

      expect(result.length).toBeGreaterThan(0);

      // Check for Rockefeller Foundation specific processing
      result.forEach(grant => {
        expect(grant.rawContent.inferredCategory).toBeDefined();
        expect(grant.rawContent.rockefellerInitiative).toBeDefined();
        expect(grant.rawContent.resilienceFocus).toBeDefined();
        expect(grant.rawContent.systemsApproach).toBeDefined();
        expect(grant.rawContent.equityFocus).toBeDefined();
        expect(grant.rawContent.innovationLevel).toBeDefined();
        expect(grant.rawContent.targetPopulations).toBeDefined();
      });
    });

    it('should generate grants with appropriate Rockefeller Foundation categories', async () => {
      const result = await scraper.scrape();
      const categories = result.map(grant => grant.rawContent.inferredCategory);

      // Rockefeller Foundation focuses on various categories
      const expectedCategories = [
        GrantCategory.HEALTHCARE_PUBLIC_HEALTH,
        GrantCategory.COMMUNITY_DEVELOPMENT,
        GrantCategory.ENVIRONMENT_SUSTAINABILITY,
        GrantCategory.TECHNOLOGY_INNOVATION,
        GrantCategory.SOCIAL_SERVICES,
        GrantCategory.RESEARCH_DEVELOPMENT
      ];

      categories.forEach(category => {
        expect(expectedCategories).toContain(category);
      });
    });

    it('should include diverse Rockefeller Foundation initiatives', async () => {
      const result = await scraper.scrape();
      const initiatives = result.map(grant => grant.rawContent.rockefellerInitiative);

      // Should include various Rockefeller Foundation initiatives
      const expectedInitiatives = [
        'Food Systems Transformation',
        'Health Equity',
        'Economic Opportunity',
        'Climate Resilience',
        'Digital Equity',
        'Systems Change'
      ];

      // At least some of these initiatives should be represented
      const hasExpectedInitiatives = expectedInitiatives.some(initiative => 
        initiatives.includes(initiative)
      );
      expect(hasExpectedInitiatives).toBe(true);
    });

    it('should identify appropriate resilience focus areas', async () => {
      const result = await scraper.scrape();
      
      // Check that resilience focuses are identified
      const allFocuses = result.flatMap(grant => grant.rawContent.resilienceFocus || []);
      
      expect(allFocuses.length).toBeGreaterThan(0);
      
      // Should include typical Rockefeller Foundation resilience areas
      const expectedFocuses = [
        'Climate Resilience',
        'Community Resilience',
        'Economic Resilience',
        'Health System Resilience',
        'Food System Resilience'
      ];

      const hasExpectedFocuses = expectedFocuses.some(focus => 
        allFocuses.includes(focus)
      );
      expect(hasExpectedFocuses).toBe(true);
    });

    it('should identify systems approach indicators', async () => {
      const result = await scraper.scrape();
      
      // Check that systems approaches are identified
      const allApproaches = result.flatMap(grant => grant.rawContent.systemsApproach || []);
      
      expect(allApproaches.length).toBeGreaterThan(0);
      
      // Should include systems thinking approaches
      const expectedApproaches = [
        'Systems Thinking',
        'Systems Change',
        'Collaborative Approach',
        'Multi-Sector Approach',
        'Ecosystem Approach'
      ];

      const hasExpectedApproaches = expectedApproaches.some(approach => 
        allApproaches.includes(approach)
      );
      expect(hasExpectedApproaches).toBe(true);
    });

    it('should identify equity focus areas', async () => {
      const result = await scraper.scrape();
      
      // Check that equity focuses are identified
      const allEquityFocuses = result.flatMap(grant => grant.rawContent.equityFocus || []);
      
      expect(allEquityFocuses.length).toBeGreaterThan(0);
      
      // Should include equity areas typical of Rockefeller Foundation
      const expectedEquityFocuses = [
        'Health Equity',
        'Digital Equity',
        'Economic Equity',
        'Environmental Justice',
        'Social Justice'
      ];

      const hasExpectedEquityFocuses = expectedEquityFocuses.some(focus => 
        allEquityFocuses.includes(focus)
      );
      expect(hasExpectedEquityFocuses).toBe(true);
    });

    it('should assess innovation levels appropriately', async () => {
      const result = await scraper.scrape();
      
      const innovationLevels = result.map(grant => grant.rawContent.innovationLevel);
      
      // Should have various innovation levels
      const expectedLevels = [
        'Breakthrough Innovation',
        'High Innovation',
        'Moderate Innovation',
        'Proven Approach',
        'Standard Innovation'
      ];

      const hasVariedLevels = expectedLevels.some(level => 
        innovationLevels.includes(level)
      );
      expect(hasVariedLevels).toBe(true);
    });

    it('should identify target populations served', async () => {
      const result = await scraper.scrape();
      
      // Check that target populations are identified
      const allPopulations = result.flatMap(grant => grant.rawContent.targetPopulations || []);
      
      expect(allPopulations.length).toBeGreaterThan(0);
      
      // Should include populations typically served by Rockefeller Foundation
      const expectedPopulations = [
        'Underserved Communities',
        'Vulnerable Populations',
        'Low-Income Communities',
        'Rural Communities',
        'Climate-Vulnerable Communities',
        'Smallholder Farmers'
      ];

      const hasExpectedPopulations = expectedPopulations.some(population => 
        allPopulations.includes(population)
      );
      expect(hasExpectedPopulations).toBe(true);
    });

    it('should have properly formatted application URLs', async () => {
      const result = await scraper.scrape();

      result.forEach(grant => {
        if (grant.applicationUrl) {
          expect(grant.applicationUrl).toMatch(/^https?:\/\//);
          expect(grant.applicationUrl).toContain('rockefellerfoundation.org');
        }
      });
    });

    it('should include realistic funding amounts', async () => {
      const result = await scraper.scrape();

      result.forEach(grant => {
        if (grant.fundingAmount) {
          // Should match typical funding amount patterns
          expect(grant.fundingAmount).toMatch(/\$[\d,]+(,\d{3})*(\s*-\s*\$[\d,]+(,\d{3})*)?/);
          
          // Rockefeller Foundation typically provides larger grants
          const amounts = grant.fundingAmount.match(/\$[\d,]+/g);
          if (amounts) {
            const firstAmount = parseInt(amounts[0].replace(/[$,]/g, ''));
            expect(firstAmount).toBeGreaterThanOrEqual(500000); // At least $500K
          }
        }
      });
    });

    it('should have appropriate deadlines', async () => {
      const result = await scraper.scrape();

      result.forEach(grant => {
        if (grant.deadline) {
          // Should be a valid date string
          expect(grant.deadline).toMatch(/\d{4}-\d{2}-\d{2}/);
          
          // Should be a future date (for sample grants)
          const deadlineDate = new Date(grant.deadline);
          const now = new Date();
          expect(deadlineDate.getTime()).toBeGreaterThan(now.getTime());
        }
      });
    });

    it('should include comprehensive eligibility criteria', async () => {
      const result = await scraper.scrape();

      result.forEach(grant => {
        if (grant.eligibility) {
          expect(grant.eligibility.length).toBeGreaterThan(30);
          
          // Should mention organization types or target populations
          const eligibilityLower = grant.eligibility.toLowerCase();
          const hasRelevantCriteria = [
            'organization',
            'institution',
            'community',
            'underserved',
            'vulnerable',
            'systems'
          ].some(criteria => eligibilityLower.includes(criteria));
          
          expect(hasRelevantCriteria).toBe(true);
        }
      });
    });

    it('should have detailed descriptions', async () => {
      const result = await scraper.scrape();

      result.forEach(grant => {
        expect(grant.description).toBeDefined();
        expect(grant.description!.length).toBeGreaterThan(100);
        
        // Should contain Rockefeller Foundation focus area keywords
        const descriptionLower = grant.description!.toLowerCase();
        const hasRelevantKeywords = [
          'resilience',
          'equity',
          'systems',
          'innovation',
          'community',
          'transformation',
          'sustainable'
        ].some(keyword => descriptionLower.includes(keyword));
        
        expect(hasRelevantKeywords).toBe(true);
      });
    });
  });

  describe('Data Quality and Consistency', () => {
    it('should maintain consistent data structure across all grants', async () => {
      const result = await scraper.scrape();

      expect(result.length).toBeGreaterThan(0);

      const firstGrant = result[0];
      const requiredFields = Object.keys(firstGrant);

      // All grants should have the same structure
      result.forEach(grant => {
        requiredFields.forEach(field => {
          expect(grant).toHaveProperty(field);
        });
      });
    });

    it('should have consistent funder information', async () => {
      const result = await scraper.scrape();

      result.forEach(grant => {
        expect(grant.funderName).toBe('The Rockefeller Foundation');
        expect(grant.sourceUrl).toContain('rockefellerfoundation.org');
      });
    });

    it('should have valid raw content metadata', async () => {
      const result = await scraper.scrape();

      result.forEach(grant => {
        expect(grant.rawContent).toBeDefined();
        expect(typeof grant.rawContent).toBe('object');
        
        // Should have Rockefeller Foundation specific metadata
        expect(grant.rawContent.inferredCategory).toBeDefined();
        expect(grant.rawContent.rockefellerInitiative).toBeDefined();
        expect(grant.rawContent.innovationLevel).toBeDefined();
      });
    });
  });

  describe('Error Resilience', () => {
    it('should handle configuration errors gracefully', () => {
      const config = scraper.getSourceConfig();
      
      expect(config).toBeDefined();
      expect(config.id).toBe('rockefeller-foundation');
      expect(config.url).toBeTruthy();
      expect(config.selectors).toBeDefined();
      expect(config.rateLimit).toBeDefined();
    });

    it('should cleanup resources properly', async () => {
      // Should not throw during cleanup
      await expect(scraper.cleanup()).resolves.not.toThrow();
    });
  });

  describe('Performance Characteristics', () => {
    it('should complete scraping within reasonable time', async () => {
      const startTime = Date.now();
      
      await scraper.scrape();
      
      const duration = Date.now() - startTime;
      
      // Should complete within 30 seconds (generous for integration test)
      expect(duration).toBeLessThan(30000);
    });

    it('should generate appropriate number of sample grants', async () => {
      const result = await scraper.scrape();
      
      // Should generate a reasonable number of grants for testing
      expect(result.length).toBeGreaterThanOrEqual(4);
      expect(result.length).toBeLessThanOrEqual(10);
    });
  });

  describe('Foundation-Specific Features', () => {
    it('should reflect Rockefeller Foundation mission and values', async () => {
      const result = await scraper.scrape();
      
      // Check that grants reflect Rockefeller Foundation's focus on resilience and equity
      const allDescriptions = result.map(grant => grant.description?.toLowerCase() || '').join(' ');
      
      const missionKeywords = [
        'resilience',
        'equity',
        'systems',
        'transformation',
        'innovation',
        'vulnerable',
        'sustainable',
        'community'
      ];

      const hasMissionAlignment = missionKeywords.some(keyword => 
        allDescriptions.includes(keyword)
      );
      
      expect(hasMissionAlignment).toBe(true);
    });

    it('should include appropriate global focus', async () => {
      const result = await scraper.scrape();
      
      // Check for global and international focus
      const allDescriptions = result.map(grant => grant.description?.toLowerCase() || '').join(' ');
      const allEligibility = result.map(grant => grant.eligibility?.toLowerCase() || '').join(' ');
      const combinedText = allDescriptions + ' ' + allEligibility;
      
      const globalKeywords = [
        'global',
        'international',
        'worldwide',
        'developing countries',
        'vulnerable communities',
        'smallholder farmers'
      ];

      const hasGlobalFocus = globalKeywords.some(keyword => 
        combinedText.includes(keyword)
      );
      
      expect(hasGlobalFocus).toBe(true);
    });

    it('should emphasize systems-level approaches', async () => {
      const result = await scraper.scrape();
      
      const allSystemsApproaches = result.flatMap(grant => 
        grant.rawContent.systemsApproach || []
      );
      
      expect(allSystemsApproaches.length).toBeGreaterThan(0);
      
      // Should emphasize systems thinking
      const systemsKeywords = [
        'Systems Thinking',
        'Systems Change',
        'Systemic Approach',
        'Root Cause Analysis',
        'Holistic Approach'
      ];

      const hasSystemsEmphasis = systemsKeywords.some(keyword => 
        allSystemsApproaches.includes(keyword)
      );
      expect(hasSystemsEmphasis).toBe(true);
    });

    it('should focus on resilience building', async () => {
      const result = await scraper.scrape();
      
      const allResilienceFocuses = result.flatMap(grant => 
        grant.rawContent.resilienceFocus || []
      );
      
      expect(allResilienceFocuses.length).toBeGreaterThan(0);
      
      // Should include various types of resilience
      const resilienceTypes = [
        'Climate Resilience',
        'Community Resilience',
        'Economic Resilience',
        'Health System Resilience'
      ];

      const hasResilienceFocus = resilienceTypes.some(type => 
        allResilienceFocuses.includes(type)
      );
      expect(hasResilienceFocus).toBe(true);
    });

    it('should promote innovation and transformation', async () => {
      const result = await scraper.scrape();
      
      const innovationLevels = result.map(grant => grant.rawContent.innovationLevel);
      
      // Should include high levels of innovation
      const highInnovationLevels = [
        'Breakthrough Innovation',
        'High Innovation',
        'Moderate Innovation'
      ];

      const hasHighInnovation = highInnovationLevels.some(level => 
        innovationLevels.includes(level)
      );
      expect(hasHighInnovation).toBe(true);
    });

    it('should address multiple equity dimensions', async () => {
      const result = await scraper.scrape();
      
      const allEquityFocuses = result.flatMap(grant => 
        grant.rawContent.equityFocus || []
      );
      
      expect(allEquityFocuses.length).toBeGreaterThan(0);
      
      // Should address various equity dimensions
      const equityDimensions = [
        'Health Equity',
        'Digital Equity',
        'Economic Equity',
        'Environmental Justice',
        'Social Justice'
      ];

      // Should have multiple equity dimensions represented
      const equityCount = equityDimensions.filter(dimension => 
        allEquityFocuses.includes(dimension)
      ).length;
      
      expect(equityCount).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Initiative-Specific Characteristics', () => {
    it('should include food systems transformation grants', async () => {
      const result = await scraper.scrape();
      
      const hasFoodSystems = result.some(grant => 
        grant.rawContent.rockefellerInitiative === 'Food Systems Transformation' ||
        grant.title.toLowerCase().includes('food') ||
        grant.description?.toLowerCase().includes('food')
      );
      
      expect(hasFoodSystems).toBe(true);
    });

    it('should include health equity initiatives', async () => {
      const result = await scraper.scrape();
      
      const hasHealthEquity = result.some(grant => 
        grant.rawContent.rockefellerInitiative === 'Health Equity' ||
        grant.title.toLowerCase().includes('health') ||
        grant.description?.toLowerCase().includes('health')
      );
      
      expect(hasHealthEquity).toBe(true);
    });

    it('should include climate resilience programs', async () => {
      const result = await scraper.scrape();
      
      const hasClimateResilience = result.some(grant => 
        grant.rawContent.rockefellerInitiative === 'Climate Resilience' ||
        grant.title.toLowerCase().includes('climate') ||
        grant.description?.toLowerCase().includes('climate')
      );
      
      expect(hasClimateResilience).toBe(true);
    });

    it('should include economic opportunity initiatives', async () => {
      const result = await scraper.scrape();
      
      const hasEconomicOpportunity = result.some(grant => 
        grant.rawContent.rockefellerInitiative === 'Economic Opportunity' ||
        grant.title.toLowerCase().includes('economic') ||
        grant.description?.toLowerCase().includes('economic')
      );
      
      expect(hasEconomicOpportunity).toBe(true);
    });
  });
});