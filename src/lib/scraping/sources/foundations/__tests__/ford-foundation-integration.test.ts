/**
 * Ford Foundation Scraper Integration Tests
 * End-to-end integration tests for Ford Foundation scraping functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FordFoundationScraper } from '../ford-foundation';
import { GrantCategory, ScrapedSourceType } from '../../../types';

describe('FordFoundationScraper Integration Tests', () => {
  let scraper: FordFoundationScraper;

  beforeEach(() => {
    scraper = new FordFoundationScraper();
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
        expect(grant.funderName).toBe('Ford Foundation');
        expect(grant.sourceUrl).toContain('fordfoundation.org');
        expect(grant.scrapedAt).toBeInstanceOf(Date);
        expect(grant.rawContent).toBeDefined();
      });
    });

    it('should process grants with Ford Foundation specific enhancements', async () => {
      const result = await scraper.scrape();

      expect(result.length).toBeGreaterThan(0);

      // Check for Ford Foundation specific processing
      result.forEach(grant => {
        expect(grant.rawContent.inferredCategory).toBeDefined();
        expect(grant.rawContent.fordFoundationProgram).toBeDefined();
        expect(grant.rawContent.socialJusticeFocus).toBeDefined();
        expect(grant.rawContent.targetCommunities).toBeDefined();
        expect(grant.rawContent.geographicScope).toBeDefined();
        expect(grant.rawContent.advocacyType).toBeDefined();
      });
    });

    it('should generate grants with appropriate Ford Foundation categories', async () => {
      const result = await scraper.scrape();
      const categories = result.map(grant => grant.rawContent.inferredCategory);

      // Ford Foundation typically focuses on social justice categories
      const expectedCategories = [
        GrantCategory.SOCIAL_SERVICES,
        GrantCategory.COMMUNITY_DEVELOPMENT,
        GrantCategory.EDUCATION_TRAINING,
        GrantCategory.ARTS_CULTURE,
        GrantCategory.TECHNOLOGY_INNOVATION
      ];

      categories.forEach(category => {
        expect(expectedCategories).toContain(category);
      });
    });

    it('should include diverse Ford Foundation program areas', async () => {
      const result = await scraper.scrape();
      const programs = result.map(grant => grant.rawContent.fordFoundationProgram);

      // Should include various Ford Foundation programs
      const expectedPrograms = [
        'BUILD Program',
        'Civic Engagement and Government',
        'Economic Justice',
        'Gender, Racial and Ethnic Justice',
        'Technology and Society'
      ];

      // At least some of these programs should be represented
      const hasExpectedPrograms = expectedPrograms.some(program => 
        programs.includes(program)
      );
      expect(hasExpectedPrograms).toBe(true);
    });

    it('should identify appropriate social justice focus areas', async () => {
      const result = await scraper.scrape();
      
      // Check that social justice focuses are identified
      const allFocuses = result.flatMap(grant => grant.rawContent.socialJusticeFocus || []);
      
      expect(allFocuses.length).toBeGreaterThan(0);
      
      // Should include typical Ford Foundation focus areas
      const expectedFocuses = [
        'Racial Justice',
        'Gender Justice',
        'Economic Justice',
        'Civil Rights',
        'Human Rights',
        'Voting Rights'
      ];

      const hasExpectedFocuses = expectedFocuses.some(focus => 
        allFocuses.includes(focus)
      );
      expect(hasExpectedFocuses).toBe(true);
    });

    it('should identify target communities served by Ford Foundation', async () => {
      const result = await scraper.scrape();
      
      // Check that target communities are identified
      const allCommunities = result.flatMap(grant => grant.rawContent.targetCommunities || []);
      
      expect(allCommunities.length).toBeGreaterThan(0);
      
      // Should include communities typically served by Ford Foundation
      const expectedCommunities = [
        'People of Color',
        'Communities of Color',
        'Women',
        'LGBTQ+ Communities',
        'Immigrant Communities',
        'Low-Income Communities'
      ];

      const hasExpectedCommunities = expectedCommunities.some(community => 
        allCommunities.includes(community)
      );
      expect(hasExpectedCommunities).toBe(true);
    });

    it('should have properly formatted application URLs', async () => {
      const result = await scraper.scrape();

      result.forEach(grant => {
        if (grant.applicationUrl) {
          expect(grant.applicationUrl).toMatch(/^https?:\/\//);
          expect(grant.applicationUrl).toContain('fordfoundation.org');
        }
      });
    });

    it('should include realistic funding amounts', async () => {
      const result = await scraper.scrape();

      result.forEach(grant => {
        if (grant.fundingAmount) {
          // Should match typical funding amount patterns
          expect(grant.fundingAmount).toMatch(/\$[\d,]+(,\d{3})*(\s*-\s*\$[\d,]+(,\d{3})*)?/);
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
          expect(grant.eligibility.length).toBeGreaterThan(20);
          
          // Should mention organization types
          const eligibilityLower = grant.eligibility.toLowerCase();
          const hasOrgTypes = [
            'organization',
            'non-profit',
            'nonprofit',
            'institution',
            'community'
          ].some(type => eligibilityLower.includes(type));
          
          expect(hasOrgTypes).toBe(true);
        }
      });
    });

    it('should have detailed descriptions', async () => {
      const result = await scraper.scrape();

      result.forEach(grant => {
        expect(grant.description).toBeDefined();
        expect(grant.description!.length).toBeGreaterThan(50);
        
        // Should contain Ford Foundation focus area keywords
        const descriptionLower = grant.description!.toLowerCase();
        const hasRelevantKeywords = [
          'justice',
          'equity',
          'community',
          'social',
          'rights',
          'development',
          'empowerment'
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
        expect(grant.funderName).toBe('Ford Foundation');
        expect(grant.sourceUrl).toContain('fordfoundation.org');
      });
    });

    it('should have valid raw content metadata', async () => {
      const result = await scraper.scrape();

      result.forEach(grant => {
        expect(grant.rawContent).toBeDefined();
        expect(typeof grant.rawContent).toBe('object');
        
        // Should have Ford Foundation specific metadata
        expect(grant.rawContent.inferredCategory).toBeDefined();
        expect(grant.rawContent.fordFoundationProgram).toBeDefined();
      });
    });
  });

  describe('Error Resilience', () => {
    it('should handle configuration errors gracefully', () => {
      const config = scraper.getSourceConfig();
      
      expect(config).toBeDefined();
      expect(config.id).toBe('ford-foundation');
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
      expect(result.length).toBeGreaterThanOrEqual(3);
      expect(result.length).toBeLessThanOrEqual(10);
    });
  });

  describe('Foundation-Specific Features', () => {
    it('should reflect Ford Foundation mission and values', async () => {
      const result = await scraper.scrape();
      
      // Check that grants reflect Ford Foundation's focus on social justice
      const allDescriptions = result.map(grant => grant.description?.toLowerCase() || '').join(' ');
      
      const missionKeywords = [
        'justice',
        'equity',
        'inequality',
        'social change',
        'community',
        'marginalized',
        'empowerment'
      ];

      const hasMissionAlignment = missionKeywords.some(keyword => 
        allDescriptions.includes(keyword)
      );
      
      expect(hasMissionAlignment).toBe(true);
    });

    it('should include appropriate geographic focus', async () => {
      const result = await scraper.scrape();
      
      const allGeographicScopes = result.flatMap(grant => 
        grant.rawContent.geographicScope || []
      );
      
      // Ford Foundation works both domestically and internationally
      const expectedScopes = ['United States', 'Global', 'International'];
      const hasExpectedScopes = expectedScopes.some(scope => 
        allGeographicScopes.includes(scope)
      );
      
      expect(hasExpectedScopes).toBe(true);
    });

    it('should identify appropriate advocacy types', async () => {
      const result = await scraper.scrape();
      
      const allAdvocacyTypes = result.flatMap(grant => 
        grant.rawContent.advocacyType || []
      );
      
      expect(allAdvocacyTypes.length).toBeGreaterThan(0);
      
      // Should include typical Ford Foundation advocacy approaches
      const expectedTypes = [
        'Policy Advocacy',
        'Grassroots Organizing',
        'Community Organizing',
        'Capacity Building',
        'Leadership Development'
      ];

      const hasExpectedTypes = expectedTypes.some(type => 
        allAdvocacyTypes.includes(type)
      );
      expect(hasExpectedTypes).toBe(true);
    });
  });
});