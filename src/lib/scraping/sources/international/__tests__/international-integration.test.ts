/**
 * Integration tests for International Grant Source Scrapers
 * Tests the complete workflow of international grant scraping with multi-language support and currency conversion
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GlobalGivingScraper } from '../global-giving';
import { WorldBankScraper } from '../world-bank';
import { ScrapedSourceType, GrantCategory } from '../../../types';

describe('International Scrapers Integration', () => {
  let globalGivingScraper: GlobalGivingScraper;
  let worldBankScraper: WorldBankScraper;

  beforeEach(() => {
    globalGivingScraper = new GlobalGivingScraper();
    worldBankScraper = new WorldBankScraper();
  });

  describe('Configuration Consistency', () => {
    it('should have consistent international source type', () => {
      const globalGivingConfig = globalGivingScraper.getConfiguration();
      const worldBankConfig = worldBankScraper.getConfiguration();

      expect(globalGivingConfig.type).toBe(ScrapedSourceType.NGO);
      expect(worldBankConfig.type).toBe(ScrapedSourceType.NGO);
    });

    it('should have appropriate rate limiting for international sources', () => {
      const globalGivingConfig = globalGivingScraper.getConfiguration();
      const worldBankConfig = worldBankScraper.getConfiguration();

      expect(globalGivingConfig.rateLimit.requestsPerMinute).toBeGreaterThan(0);
      expect(globalGivingConfig.rateLimit.delayBetweenRequests).toBeGreaterThan(1000);
      
      expect(worldBankConfig.rateLimit.requestsPerMinute).toBeGreaterThan(0);
      expect(worldBankConfig.rateLimit.delayBetweenRequests).toBeGreaterThan(1000);
    });

    it('should have multi-language headers', () => {
      const globalGivingConfig = globalGivingScraper.getConfiguration();
      const worldBankConfig = worldBankScraper.getConfiguration();

      expect(globalGivingConfig.headers['Accept-Language']).toMatch(/en-US.*es.*fr/);
      expect(worldBankConfig.headers['Accept-Language']).toMatch(/en-US.*es.*fr/);
    });
  });

  describe('Multi-language Support', () => {
    it('should detect different languages consistently', () => {
      const testTexts = [
        { text: 'This is an English project description', expected: 'en' },
        { text: 'Este es un proyecto de desarrollo en español', expected: 'es' },
        { text: 'Ceci est un projet de développement en français', expected: 'fr' },
        { text: 'Este é um projeto de desenvolvimento em português', expected: 'pt' }
      ];

      testTexts.forEach(({ text, expected }) => {
        const globalGivingLang = (globalGivingScraper as any).detectLanguage(text);
        const worldBankLang = (worldBankScraper as any).detectLanguage(text);

        expect(globalGivingLang).toBe(expected);
        if (expected !== 'pt') { // World Bank doesn't have Portuguese detection
          expect(worldBankLang).toBe(expected);
        }
      });
    });

    it('should extract location information from multi-language content', () => {
      const testCases = [
        {
          content: 'This project is located in Kenya, serving communities in East Africa',
          language: 'en',
          expectedLocations: ['Kenya', 'East Africa']
        },
        {
          content: 'Este proyecto está ubicado en Guatemala, sirviendo comunidades rurales',
          language: 'es',
          expectedLocations: ['Guatemala']
        }
      ];

      testCases.forEach(({ content, language, expectedLocations }) => {
        const globalGivingLocations = (globalGivingScraper as any).extractLocationFromContent(content, language);
        
        expectedLocations.forEach(location => {
          expect(globalGivingLocations).toContain(location);
        });
      });
    });
  });

  describe('Category Inference', () => {
    it('should infer categories consistently across scrapers', () => {
      const testCases = [
        {
          content: 'Healthcare project providing medical services and vaccination programs',
          expected: GrantCategory.HEALTHCARE_PUBLIC_HEALTH
        },
        {
          content: 'Education initiative supporting schools and teacher training',
          expected: GrantCategory.EDUCATION_TRAINING
        },
        {
          content: 'Environmental project focusing on climate change and renewable energy',
          expected: GrantCategory.ENVIRONMENT_SUSTAINABILITY
        },
        {
          content: 'Community development project for poverty reduction and economic growth',
          expected: GrantCategory.COMMUNITY_DEVELOPMENT
        }
      ];

      testCases.forEach(({ content, expected }) => {
        const globalGivingCategory = (globalGivingScraper as any).inferCategoryFromContent(content);
        const worldBankCategory = (worldBankScraper as any).inferCategoryFromContent(content);

        expect(globalGivingCategory).toBe(expected);
        expect(worldBankCategory).toBe(expected);
      });
    });
  });

  describe('Tag Generation', () => {
    it('should generate appropriate international tags', () => {
      const testGrant = {
        title: 'Education Project in Sub-Saharan Africa',
        description: 'Supporting primary education in rural Kenya and Tanzania',
        funderName: 'Test Funder',
        sourceUrl: 'test',
        scrapedAt: new Date(),
        rawContent: {}
      };

      const globalGivingTags = (globalGivingScraper as any).generateInternationalTags(testGrant);
      const worldBankTags = (worldBankScraper as any).generateWorldBankTags(testGrant);

      // Common international tags
      expect(globalGivingTags).toContain('international');
      expect(globalGivingTags).toContain('development');
      expect(globalGivingTags).toContain('africa');

      expect(worldBankTags).toContain('international');
      expect(worldBankTags).toContain('development');
      expect(worldBankTags).toContain('world-bank');
    });

    it('should generate region-specific tags', () => {
      const regionTestCases = [
        {
          content: 'Project in India serving rural communities',
          expectedRegion: 'asia'
        },
        {
          content: 'Development initiative in Brazil and Peru',
          expectedRegion: 'latin-america'
        },
        {
          content: 'Healthcare project in Nigeria and Ghana',
          expectedRegion: 'africa'
        }
      ];

      regionTestCases.forEach(({ content, expectedRegion }) => {
        const testGrant = {
          title: 'Regional Project',
          description: content,
          funderName: 'Test Funder',
          sourceUrl: 'test',
          scrapedAt: new Date(),
          rawContent: {}
        };

        const globalGivingTags = (globalGivingScraper as any).generateInternationalTags(testGrant);
        
        if (expectedRegion === 'asia') {
          expect(globalGivingTags).toContain('asia');
        } else if (expectedRegion === 'latin-america') {
          expect(globalGivingTags).toContain('latin-america');
        } else if (expectedRegion === 'africa') {
          expect(globalGivingTags).toContain('africa');
        }
      });
    });
  });

  describe('Error Resilience', () => {
    it('should handle processing errors gracefully', async () => {
      const problematicGrant = {
        title: '', // Empty title
        description: null as any, // Invalid description
        fundingAmount: 'invalid amount format',
        funderName: 'Test Funder',
        sourceUrl: 'test',
        scrapedAt: new Date(),
        rawContent: {}
      };

      // Both scrapers should handle errors gracefully
      const globalGivingResult = await (globalGivingScraper as any).processInternationalGrants([problematicGrant]);
      const worldBankResult = await (worldBankScraper as any).processWorldBankGrants([problematicGrant]);

      expect(globalGivingResult).toHaveLength(1);
      expect(worldBankResult).toHaveLength(1);
      
      // Should return original grant if processing fails
      expect(globalGivingResult[0].title).toBe('');
      expect(worldBankResult[0].title).toBe('');
    });
  });
});