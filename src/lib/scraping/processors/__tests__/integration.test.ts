/**
 * Integration tests for the complete data processing and validation pipeline
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DataProcessor, ProcessingOptions } from '../data-processor';
import { GrantValidator } from '../validator';
import { RawGrantData, GrantCategory, ScrapedSourceType } from '../../types';

describe('Data Processing and Validation Integration', () => {
  let processor: DataProcessor;
  let validator: GrantValidator;

  beforeEach(() => {
    processor = new DataProcessor();
    validator = new GrantValidator();
  });

  describe('Complete Pipeline', () => {
    it('should process and validate a complete grant successfully', async () => {
      const rawData: RawGrantData = {
        title: 'Healthcare Innovation Grant for Digital Health Solutions',
        description: 'This comprehensive grant program supports innovative healthcare technology solutions that improve patient outcomes and reduce healthcare costs. We are looking for projects that leverage artificial intelligence, machine learning, and digital health platforms to transform healthcare delivery.',
        deadline: '2026-06-30',
        fundingAmount: '$25,000 - $150,000',
        eligibility: 'Open to US-based healthcare organizations, universities, and research institutions',
        applicationUrl: 'https://healthfoundation.org/apply',
        funderName: 'Digital Health Foundation',
        sourceUrl: 'https://healthfoundation.org/grants/innovation',
        scrapedAt: new Date(),
        rawContent: {
          originalHtml: '<div>Grant details...</div>',
          metadata: { source: 'foundation_website' }
        }
      };

      // Process the raw data
      const processingResult = await processor.processGrant(rawData);

      // Validate the processed data
      const validationResult = validator.validate(processingResult.data);

      // Assertions for processing
      expect(processingResult.errors).toHaveLength(0);
      expect(processingResult.qualityScore).toBeGreaterThan(85);
      expect(processingResult.data.title).toBe('Healthcare Innovation Grant for Digital Health Solutions');
      expect(processingResult.data.category).toBe(GrantCategory.HEALTHCARE_PUBLIC_HEALTH);
      expect(processingResult.data.fundingAmountMin).toBe(25000);
      expect(processingResult.data.fundingAmountMax).toBe(150000);
      expect(processingResult.data.deadline).toBeInstanceOf(Date);
      expect(processingResult.data.locationEligibility).toContain('United States');
      expect(processingResult.data.funder.name).toBe('Digital Health Foundation');
      expect(processingResult.data.funder.type).toBe(ScrapedSourceType.FOUNDATION);

      // Assertions for validation
      expect(validationResult.isValid).toBe(true);
      expect(validationResult.errors).toHaveLength(0);
      expect(validationResult.qualityScore).toBeGreaterThan(80);
    });

    it('should handle messy real-world data with HTML artifacts', async () => {
      const rawData: RawGrantData = {
        title: '<h2>Environmental &amp; Sustainability Grant</h2>',
        description: `<p>This grant supports <strong>environmental conservation</strong> projects...</p>
                     <ul><li>Climate change mitigation</li><li>Renewable energy</li></ul>
                     <p>&nbsp;&nbsp;&nbsp;Multiple spaces and HTML entities: &quot;quotes&quot; &amp; symbols.</p>`,
        deadline: 'December 15, 2025',
        fundingAmount: 'Up to €75,000 (approximately $82,500)',
        eligibility: 'Available to organizations in Europe, North America, and Australia',
        applicationUrl: 'sustainablefuture.org/apply',
        funderName: 'Global Environmental Foundation',
        sourceUrl: 'https://sustainablefuture.org/grants',
        scrapedAt: new Date(),
        rawContent: {}
      };

      const processingResult = await processor.processGrant(rawData);
      const validationResult = validator.validate(processingResult.data);

      // Should clean HTML artifacts
      expect(processingResult.data.title).toBe('Environmental & Sustainability Grant');
      expect(processingResult.data.description).not.toContain('<p>');
      expect(processingResult.data.description).not.toContain('&amp;');
      expect(processingResult.data.description).toContain('quotes');

      // Should parse funding amount with currency conversion
      expect(processingResult.data.fundingAmountMin).toBe(0);
      expect(processingResult.data.fundingAmountMax).toBeGreaterThanOrEqual(75000);

      // Should parse date correctly
      expect(processingResult.data.deadline).toBeInstanceOf(Date);
      expect(processingResult.data.deadline?.getMonth()).toBe(11); // December

      // Should extract locations
      expect(processingResult.data.locationEligibility).toContain('Europe');
      expect(processingResult.data.locationEligibility).toContain('North America');
      expect(processingResult.data.locationEligibility).toContain('Australia');

      // Should categorize correctly
      expect(processingResult.data.category).toBe(GrantCategory.ENVIRONMENT_SUSTAINABILITY);

      // Should validate successfully despite messy input
      expect(validationResult.isValid).toBe(true);
    });

    it('should handle government grant data', async () => {
      const rawData: RawGrantData = {
        title: 'NSF Research Grant for AI in Education',
        description: 'The National Science Foundation seeks proposals for research projects that explore the application of artificial intelligence technologies in educational settings.',
        deadline: '2026-03-15T23:59:59Z',
        fundingAmount: '$100,000 to $500,000 over 3 years',
        eligibility: 'US universities and research institutions',
        applicationUrl: 'https://nsf.gov/funding/apply',
        funderName: 'National Science Foundation',
        sourceUrl: 'https://nsf.gov/funding/opportunities',
        scrapedAt: new Date(),
        rawContent: {}
      };

      const processingResult = await processor.processGrant(rawData);
      const validationResult = validator.validate(processingResult.data);

      expect(processingResult.data.funder.type).toBe(ScrapedSourceType.GOV);
      expect(processingResult.data.category).toBe(GrantCategory.RESEARCH_DEVELOPMENT);
      expect(processingResult.data.fundingAmountMin).toBe(100000);
      expect(processingResult.data.fundingAmountMax).toBe(500000);
      
      expect(validationResult.isValid).toBe(true);
    });

    it('should handle international grant data', async () => {
      const rawData: RawGrantData = {
        title: 'World Bank Development Grant',
        description: 'Supporting global development initiatives in emerging economies',
        deadline: '31/12/2025', // European date format
        fundingAmount: '£50,000 - £200,000',
        eligibility: 'International organizations worldwide',
        applicationUrl: 'https://worldbank.org/grants/apply',
        funderName: 'World Bank Group',
        sourceUrl: 'https://worldbank.org/grants',
        scrapedAt: new Date(),
        rawContent: {}
      };

      const processingResult = await processor.processGrant(rawData);
      const validationResult = validator.validate(processingResult.data);

      expect(processingResult.data.funder.type).toBe(ScrapedSourceType.NGO);
      expect(processingResult.data.category).toBe(GrantCategory.COMMUNITY_DEVELOPMENT);
      expect(processingResult.data.fundingAmountMin).toBeGreaterThan(50000); // Converted from GBP
      expect(processingResult.data.fundingAmountMax).toBeGreaterThan(200000);
      expect(validationResult.isValid).toBe(true);
    });

    it('should handle problematic data gracefully', async () => {
      const rawData: RawGrantData = {
        title: 'Grant',
        description: 'Short desc.',
        deadline: 'invalid date',
        fundingAmount: 'No amount specified',
        eligibility: '',
        applicationUrl: 'not-a-url',
        funderName: '',
        sourceUrl: 'https://example.com',
        scrapedAt: new Date(),
        rawContent: {}
      };

      const processingResult = await processor.processGrant(rawData);
      const validationResult = validator.validate(processingResult.data);

      // Should have warnings and errors but not crash
      expect(processingResult.warnings.length).toBeGreaterThan(0);
      expect(processingResult.qualityScore).toBeLessThan(80);
      
      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors.length).toBeGreaterThan(0);
      expect(validationResult.qualityScore).toBeLessThan(70);
    });
  });

  describe('Processing Options', () => {
    it('should respect strict validation mode', async () => {
      const strictProcessor = new DataProcessor({ strictValidation: true });
      
      const rawData: RawGrantData = {
        title: 'Test Grant',
        description: '', // Missing description
        deadline: '2025-12-31',
        fundingAmount: '$50,000',
        eligibility: 'Open to all',
        applicationUrl: 'https://example.com/apply',
        funderName: 'Test Foundation',
        sourceUrl: 'https://example.com',
        scrapedAt: new Date(),
        rawContent: {}
      };

      const result = await strictProcessor.processGrant(rawData);
      
      expect(result.warnings.some(w => w.includes('Description is missing'))).toBe(true);
    });

    it('should handle different currency conversion rates', async () => {
      const processorWithRates = new DataProcessor({
        currencyConversionRates: { EUR: 1.2, GBP: 1.3 }
      });

      const rawData: RawGrantData = {
        title: 'European Grant',
        description: 'A grant from Europe',
        deadline: '2025-12-31',
        fundingAmount: '€10,000',
        eligibility: 'European organizations',
        applicationUrl: 'https://example.com/apply',
        funderName: 'European Foundation',
        sourceUrl: 'https://example.com',
        scrapedAt: new Date(),
        rawContent: {}
      };

      const result = await processorWithRates.processGrant(rawData);
      
      expect(result.data.fundingAmountMin).toBe(12000); // 10000 * 1.2
    });

    it('should handle aggressive text normalization', async () => {
      const aggressiveProcessor = new DataProcessor({
        textNormalizationLevel: 'aggressive'
      });

      const rawData: RawGrantData = {
        title: 'Grant Title!!!',
        description: 'This is a test... with excessive punctuation???',
        deadline: '2025-12-31',
        fundingAmount: '$50,000',
        eligibility: 'Open to all',
        applicationUrl: 'https://example.com/apply',
        funderName: 'Test Foundation',
        sourceUrl: 'https://example.com',
        scrapedAt: new Date(),
        rawContent: {}
      };

      const result = await aggressiveProcessor.processGrant(rawData);
      
      expect(result.data.title).toBe('Grant Title!');
      expect(result.data.description).toBe('This is a test… with excessive punctuation?');
    });
  });

  describe('Validation Summary', () => {
    it('should provide comprehensive validation summary for multiple grants', async () => {
      const grants = [
        {
          title: 'Valid Grant',
          description: 'This is a valid grant with all required information.',
          deadline: new Date('2025-12-31'),
          fundingAmountMin: 10000,
          fundingAmountMax: 50000,
          eligibilityCriteria: 'Open to all',
          applicationUrl: 'https://example.com/apply',
          funder: { name: 'Test Foundation', type: ScrapedSourceType.FOUNDATION },
          category: GrantCategory.COMMUNITY_DEVELOPMENT,
          locationEligibility: ['United States'],
          confidenceScore: 85,
          contentHash: 'valid123'
        },
        {
          title: '', // Invalid
          description: 'Short', // Too short
          deadline: new Date('2025-12-31'),
          fundingAmountMin: 10000,
          fundingAmountMax: 50000,
          eligibilityCriteria: 'Open to all',
          applicationUrl: 'https://example.com/apply',
          funder: { name: 'Test Foundation', type: ScrapedSourceType.FOUNDATION },
          category: GrantCategory.COMMUNITY_DEVELOPMENT,
          locationEligibility: ['United States'],
          confidenceScore: 85,
          contentHash: 'invalid123'
        }
      ];

      const results = grants.map(grant => validator.validate(grant as any));
      const summary = validator.getValidationSummary(results);

      expect(summary.totalValidated).toBe(2);
      expect(summary.validCount).toBe(1);
      expect(summary.errorCount).toBeGreaterThan(0);
      expect(summary.warningCount).toBeGreaterThan(0);
      expect(summary.averageQualityScore).toBeGreaterThan(0);
      expect(summary.commonErrors.length).toBeGreaterThan(0);
    });
  });
});