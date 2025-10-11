/**
 * Tests for scraping system types and interfaces
 */

import { describe, it, expect } from 'vitest';
import {
  ScrapedSourceType,
  ScrapingFrequency,
  ScrapedSourceStatus,
  ScrapeJobStatus,
  GrantCategory,
  type SourceConfiguration,
  type RawGrantData,
  type ProcessedGrantData,
  type ValidationResult,
  type ScrapingResult,
} from '../types';

describe('Scraping Types', () => {
  describe('Enums', () => {
    it('should have correct ScrapedSourceType values', () => {
      expect(ScrapedSourceType.GOV).toBe('GOV');
      expect(ScrapedSourceType.FOUNDATION).toBe('FOUNDATION');
      expect(ScrapedSourceType.BUSINESS).toBe('BUSINESS');
      expect(ScrapedSourceType.NGO).toBe('NGO');
      expect(ScrapedSourceType.OTHER).toBe('OTHER');
    });

    it('should have correct ScrapingFrequency values', () => {
      expect(ScrapingFrequency.HOURLY).toBe('HOURLY');
      expect(ScrapingFrequency.DAILY).toBe('DAILY');
      expect(ScrapingFrequency.WEEKLY).toBe('WEEKLY');
      expect(ScrapingFrequency.MONTHLY).toBe('MONTHLY');
    });

    it('should have correct ScrapedSourceStatus values', () => {
      expect(ScrapedSourceStatus.ACTIVE).toBe('ACTIVE');
      expect(ScrapedSourceStatus.INACTIVE).toBe('INACTIVE');
    });

    it('should have correct ScrapeJobStatus values', () => {
      expect(ScrapeJobStatus.PENDING).toBe('PENDING');
      expect(ScrapeJobStatus.RUNNING).toBe('RUNNING');
      expect(ScrapeJobStatus.COMPLETED).toBe('COMPLETED');
      expect(ScrapeJobStatus.FAILED).toBe('FAILED');
      expect(ScrapeJobStatus.CANCELLED).toBe('CANCELLED');
    });

    it('should have correct GrantCategory values', () => {
      expect(GrantCategory.HEALTHCARE_PUBLIC_HEALTH).toBe('HEALTHCARE_PUBLIC_HEALTH');
      expect(GrantCategory.EDUCATION_TRAINING).toBe('EDUCATION_TRAINING');
      expect(GrantCategory.ENVIRONMENT_SUSTAINABILITY).toBe('ENVIRONMENT_SUSTAINABILITY');
      expect(GrantCategory.SOCIAL_SERVICES).toBe('SOCIAL_SERVICES');
      expect(GrantCategory.ARTS_CULTURE).toBe('ARTS_CULTURE');
      expect(GrantCategory.TECHNOLOGY_INNOVATION).toBe('TECHNOLOGY_INNOVATION');
      expect(GrantCategory.RESEARCH_DEVELOPMENT).toBe('RESEARCH_DEVELOPMENT');
      expect(GrantCategory.COMMUNITY_DEVELOPMENT).toBe('COMMUNITY_DEVELOPMENT');
    });
  });

  describe('Interface Validation', () => {
    it('should create valid SourceConfiguration', () => {
      const config: SourceConfiguration = {
        id: 'test-source',
        url: 'https://example.com',
        type: ScrapedSourceType.FOUNDATION,
        engine: 'static',
        selectors: {
          grantContainer: '.grant',
          title: '.title',
          description: '.description',
          deadline: '.deadline',
          fundingAmount: '.amount',
          eligibility: '.eligibility',
          applicationUrl: '.apply-url',
          funderInfo: '.funder',
        },
        rateLimit: {
          requestsPerMinute: 10,
          delayBetweenRequests: 2000,
          respectRobotsTxt: true,
        },
        headers: {
          'User-Agent': 'Test Agent',
        },
      };

      expect(config.id).toBe('test-source');
      expect(config.type).toBe(ScrapedSourceType.FOUNDATION);
      expect(config.engine).toBe('static');
      expect(config.selectors.title).toBe('.title');
      expect(config.rateLimit.requestsPerMinute).toBe(10);
    });

    it('should create valid RawGrantData', () => {
      const rawData: RawGrantData = {
        title: 'Test Grant',
        description: 'A test grant description',
        deadline: '2024-12-31',
        fundingAmount: '$100,000',
        eligibility: 'Non-profit organizations',
        applicationUrl: 'https://example.com/apply',
        funderName: 'Test Foundation',
        sourceUrl: 'https://example.com/grants/test',
        scrapedAt: new Date(),
        rawContent: {
          originalHtml: '<div>Grant content</div>',
        },
      };

      expect(rawData.title).toBe('Test Grant');
      expect(rawData.funderName).toBe('Test Foundation');
      expect(rawData.scrapedAt).toBeInstanceOf(Date);
      expect(rawData.rawContent.originalHtml).toBe('<div>Grant content</div>');
    });

    it('should create valid ProcessedGrantData', () => {
      const processedData: ProcessedGrantData = {
        title: 'Test Grant',
        description: 'A processed grant description',
        deadline: new Date('2024-12-31'),
        fundingAmountMin: 50000,
        fundingAmountMax: 100000,
        eligibilityCriteria: 'Non-profit organizations',
        applicationUrl: 'https://example.com/apply',
        funder: {
          name: 'Test Foundation',
          website: 'https://testfoundation.org',
          type: ScrapedSourceType.FOUNDATION,
        },
        category: GrantCategory.HEALTHCARE_PUBLIC_HEALTH,
        locationEligibility: ['US', 'CA'],
        confidenceScore: 0.95,
        contentHash: 'abc123def456',
      };

      expect(processedData.title).toBe('Test Grant');
      expect(processedData.deadline).toBeInstanceOf(Date);
      expect(processedData.fundingAmountMin).toBe(50000);
      expect(processedData.fundingAmountMax).toBe(100000);
      expect(processedData.category).toBe(GrantCategory.HEALTHCARE_PUBLIC_HEALTH);
      expect(processedData.locationEligibility).toContain('US');
      expect(processedData.confidenceScore).toBe(0.95);
    });

    it('should create valid ValidationResult', () => {
      const validationResult: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: [
          {
            field: 'description',
            message: 'Description is shorter than recommended',
            suggestion: 'Consider adding more details',
          },
        ],
        qualityScore: 0.85,
      };

      expect(validationResult.isValid).toBe(true);
      expect(validationResult.errors).toHaveLength(0);
      expect(validationResult.warnings).toHaveLength(1);
      expect(validationResult.warnings[0].field).toBe('description');
      expect(validationResult.qualityScore).toBe(0.85);
    });

    it('should create valid ScrapingResult', () => {
      const scrapingResult: ScrapingResult = {
        sourceId: 'test-source',
        totalFound: 10,
        totalInserted: 8,
        totalUpdated: 2,
        totalSkipped: 0,
        errors: [],
        duration: 5000,
        metadata: {
          userAgent: 'Test Agent',
          processingTime: 4500,
        },
      };

      expect(scrapingResult.sourceId).toBe('test-source');
      expect(scrapingResult.totalFound).toBe(10);
      expect(scrapingResult.totalInserted).toBe(8);
      expect(scrapingResult.totalUpdated).toBe(2);
      expect(scrapingResult.totalSkipped).toBe(0);
      expect(scrapingResult.errors).toHaveLength(0);
      expect(scrapingResult.duration).toBe(5000);
      expect(scrapingResult.metadata.userAgent).toBe('Test Agent');
    });
  });
});