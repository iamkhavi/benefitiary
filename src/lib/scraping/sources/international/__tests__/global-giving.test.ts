/**
 * Tests for GlobalGiving Scraper
 * Tests international grant scraping with multi-language support and currency conversion
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GlobalGivingScraper } from '../global-giving';
import { ScrapedSourceType, GrantCategory } from '../../../types';

describe('GlobalGivingScraper', () => {
  let scraper: GlobalGivingScraper;

  beforeEach(() => {
    scraper = new GlobalGivingScraper();
  });

  describe('Configuration', () => {
    it('should have correct source configuration', () => {
      const config = scraper.getConfiguration();
      
      expect(config.id).toBe('global-giving');
      expect(config.type).toBe(ScrapedSourceType.NGO);
      expect(config.url).toBe('https://www.globalgiving.org/projects/');
      expect(config.engine).toBe('static');
      expect(config.rateLimit.requestsPerMinute).toBe(15);
      expect(config.rateLimit.delayBetweenRequests).toBe(4000);
    });

    it('should have multi-language headers', () => {
      const config = scraper.getConfiguration();
      
      expect(config.headers['Accept-Language']).toContain('en-US');
      expect(config.headers['Accept-Language']).toContain('es');
      expect(config.headers['Accept-Language']).toContain('fr');
    });

    it('should have appropriate selectors for GlobalGiving', () => {
      const config = scraper.getConfiguration();
      
      expect(config.selectors.grantContainer).toContain('project-tile');
      expect(config.selectors.title).toContain('project-title');
      expect(config.selectors.description).toContain('project-description');
      expect(config.selectors.fundingAmount).toContain('funding-goal');
    });
  });

  describe('Basic Functionality', () => {
    it('should be instantiable', () => {
      expect(scraper).toBeDefined();
      expect(scraper).toBeInstanceOf(GlobalGivingScraper);
    });

    it('should have testConnection method', async () => {
      expect(typeof scraper.testConnection).toBe('function');
    });
  });

  describe('Multi-language Processing', () => {
    it('should detect Spanish language content', () => {
      const spanishText = 'Este proyecto de educación en América Latina para niños';
      const detectedLang = (scraper as any).detectLanguage(spanishText);
      
      expect(detectedLang).toBe('es');
    });

    it('should detect French language content', () => {
      const frenchText = 'Ce projet de développement en Afrique pour les communautés';
      const detectedLang = (scraper as any).detectLanguage(frenchText);
      
      expect(detectedLang).toBe('fr');
    });

    it('should detect Portuguese language content', () => {
      const portugueseText = 'Este projeto de saúde no Brasil para as comunidades rurais';
      const detectedLang = (scraper as any).detectLanguage(portugueseText);
      
      expect(detectedLang).toBe('pt');
    });

    it('should default to English for unknown content', () => {
      const unknownText = 'xyz abc def';
      const detectedLang = (scraper as any).detectLanguage(unknownText);
      
      expect(detectedLang).toBe('en');
    });

    it('should extract location information from content', () => {
      const content = 'This project is located in Kenya, serving rural communities in East Africa';
      const locations = (scraper as any).extractLocationFromContent(content, 'en');
      
      expect(locations).toContain('Kenya');
      expect(locations).toContain('East Africa');
    });
  });

  describe('Category Inference', () => {
    it('should infer healthcare category', () => {
      const content = 'This medical project provides healthcare services and vaccination programs';
      const category = (scraper as any).inferCategoryFromContent(content);
      
      expect(category).toBe(GrantCategory.HEALTHCARE_PUBLIC_HEALTH);
    });

    it('should infer education category', () => {
      const content = 'This education project supports schools and teacher training programs';
      const category = (scraper as any).inferCategoryFromContent(content);
      
      expect(category).toBe(GrantCategory.EDUCATION_TRAINING);
    });

    it('should infer environment category', () => {
      const content = 'This environmental project focuses on climate change and renewable energy';
      const category = (scraper as any).inferCategoryFromContent(content);
      
      expect(category).toBe(GrantCategory.ENVIRONMENT_SUSTAINABILITY);
    });

    it('should default to community development', () => {
      const content = 'This project helps communities with various development needs';
      const category = (scraper as any).inferCategoryFromContent(content);
      
      expect(category).toBe(GrantCategory.COMMUNITY_DEVELOPMENT);
    });
  });
});