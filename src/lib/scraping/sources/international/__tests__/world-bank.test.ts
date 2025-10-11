/**
 * Tests for World Bank Scraper
 * Tests international development funding scraping with multi-language support and currency conversion
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { WorldBankScraper } from '../world-bank';
import { ScrapedSourceType, GrantCategory } from '../../../types';

describe('WorldBankScraper', () => {
  let scraper: WorldBankScraper;

  beforeEach(() => {
    scraper = new WorldBankScraper();
  });

  describe('Configuration', () => {
    it('should have correct source configuration', () => {
      const config = scraper.getConfiguration();
      
      expect(config.id).toBe('world-bank');
      expect(config.type).toBe(ScrapedSourceType.NGO);
      expect(config.url).toBe('https://www.worldbank.org/en/projects-operations/procurement/opportunities');
      expect(config.engine).toBe('browser');
      expect(config.rateLimit.requestsPerMinute).toBe(20);
      expect(config.rateLimit.delayBetweenRequests).toBe(3000);
    });

    it('should have multi-language headers', () => {
      const config = scraper.getConfiguration();
      
      expect(config.headers['Accept-Language']).toContain('en-US');
      expect(config.headers['Accept-Language']).toContain('es');
      expect(config.headers['Accept-Language']).toContain('fr');
      expect(config.headers['Accept-Language']).toContain('ar');
    });

    it('should have appropriate selectors for World Bank', () => {
      const config = scraper.getConfiguration();
      
      expect(config.selectors.grantContainer).toContain('opportunity-item');
      expect(config.selectors.title).toContain('opportunity-title');
      expect(config.selectors.deadline).toContain('deadline');
      expect(config.selectors.fundingAmount).toContain('amount');
    });
  });

  describe('Basic Functionality', () => {
    it('should be instantiable', () => {
      expect(scraper).toBeDefined();
      expect(scraper).toBeInstanceOf(WorldBankScraper);
    });

    it('should have testConnection method', async () => {
      expect(typeof scraper.testConnection).toBe('function');
    });
  });

  describe('Multi-language Processing', () => {
    it('should detect Spanish language content', () => {
      const spanishText = 'Este proyecto de desarrollo del Banco Mundial en América Latina';
      const detectedLang = (scraper as any).detectLanguage(spanishText);
      
      expect(detectedLang).toBe('es');
    });

    it('should detect French language content', () => {
      const frenchText = 'Ce projet de développement de la Banque Mondiale en Afrique';
      const detectedLang = (scraper as any).detectLanguage(frenchText);
      
      expect(detectedLang).toBe('fr');
    });

    it('should detect Arabic language content', () => {
      const arabicText = 'مشروع تنمية البنك الدولي في الشرق الأوسط';
      const detectedLang = (scraper as any).detectLanguage(arabicText);
      
      expect(detectedLang).toBe('ar');
    });

    it('should detect Chinese language content', () => {
      const chineseText = '世界银行在中国的发展项目';
      const detectedLang = (scraper as any).detectLanguage(chineseText);
      
      expect(detectedLang).toBe('zh');
    });

    it('should extract region information from content', () => {
      const description = 'Infrastructure development project in Nigeria, West Africa';
      const eligibility = 'Countries in Sub-Saharan Africa region';
      const regions = (scraper as any).extractRegionFromContent(description, eligibility);
      
      expect(regions).toContain('sub-saharan-africa');
    });
  });

  describe('Category Inference', () => {
    it('should infer community development category', () => {
      const content = 'Infrastructure development project for poverty reduction and economic growth';
      const category = (scraper as any).inferCategoryFromContent(content);
      
      expect(category).toBe(GrantCategory.COMMUNITY_DEVELOPMENT);
    });

    it('should infer environment category', () => {
      const content = 'Climate change adaptation and renewable energy project for sustainability';
      const category = (scraper as any).inferCategoryFromContent(content);
      
      expect(category).toBe(GrantCategory.ENVIRONMENT_SUSTAINABILITY);
    });

    it('should infer healthcare category', () => {
      const content = 'Health systems strengthening and pandemic preparedness project';
      const category = (scraper as any).inferCategoryFromContent(content);
      
      expect(category).toBe(GrantCategory.HEALTHCARE_PUBLIC_HEALTH);
    });

    it('should infer education category', () => {
      const content = 'Education sector development and teacher training program';
      const category = (scraper as any).inferCategoryFromContent(content);
      
      expect(category).toBe(GrantCategory.EDUCATION_TRAINING);
    });

    it('should infer technology category', () => {
      const content = 'Digital transformation and fintech innovation project';
      const category = (scraper as any).inferCategoryFromContent(content);
      
      expect(category).toBe(GrantCategory.TECHNOLOGY_INNOVATION);
    });
  });

  describe('Funding Type Determination', () => {
    it('should identify procurement funding type', () => {
      const grant = {
        title: 'Procurement Contract for Infrastructure',
        description: 'Major contract opportunity for infrastructure development',
        funderName: 'World Bank',
        sourceUrl: 'test',
        scrapedAt: new Date(),
        rawContent: {}
      };

      const fundingType = (scraper as any).determineFundingType(grant);

      expect(fundingType).toBe('procurement');
    });

    it('should identify loan funding type', () => {
      const grant = {
        title: 'Development Policy Loan',
        description: 'Policy-based lending for economic reforms',
        funderName: 'World Bank',
        sourceUrl: 'test',
        scrapedAt: new Date(),
        rawContent: {}
      };

      const fundingType = (scraper as any).determineFundingType(grant);

      expect(fundingType).toBe('loan');
    });

    it('should identify grant funding type', () => {
      const grant = {
        title: 'Trust Fund Grant for Education',
        description: 'Grant funding from trust fund for education sector',
        funderName: 'World Bank',
        sourceUrl: 'test',
        scrapedAt: new Date(),
        rawContent: {}
      };

      const fundingType = (scraper as any).determineFundingType(grant);

      expect(fundingType).toBe('grant');
    });

    it('should default to development financing', () => {
      const grant = {
        title: 'Development Project',
        description: 'General development project',
        funderName: 'World Bank',
        sourceUrl: 'test',
        scrapedAt: new Date(),
        rawContent: {}
      };

      const fundingType = (scraper as any).determineFundingType(grant);

      expect(fundingType).toBe('development-financing');
    });
  });
});