/**
 * Comprehensive tests for DataProcessor class
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DataProcessor, ProcessingOptions } from '../data-processor';
import { RawGrantData, GrantCategory, ScrapedSourceType } from '../../types';

describe('DataProcessor', () => {
  let processor: DataProcessor;
  let mockRawData: RawGrantData;

  beforeEach(() => {
    processor = new DataProcessor();
    mockRawData = {
      title: 'Test Grant for Healthcare Innovation',
      description: 'This is a test grant for healthcare innovation projects.',
      deadline: '2024-12-31',
      fundingAmount: '$50,000 - $100,000',
      eligibility: 'Open to US-based organizations',
      applicationUrl: 'https://example.com/apply',
      funderName: 'Test Foundation',
      sourceUrl: 'https://testfoundation.org/grants',
      scrapedAt: new Date(),
      rawContent: {}
    };
  });

  describe('processGrant', () => {
    it('should process valid grant data successfully', async () => {
      const result = await processor.processGrant(mockRawData);

      expect(result.data.title).toBe('Test Grant for Healthcare Innovation');
      expect(result.data.description).toBe('This is a test grant for healthcare innovation projects.');
      expect(result.data.deadline).toBeInstanceOf(Date);
      expect(result.data.fundingAmountMin).toBe(50000);
      expect(result.data.fundingAmountMax).toBe(100000);
      expect(result.data.category).toBe(GrantCategory.HEALTHCARE_PUBLIC_HEALTH);
      expect(result.data.funder.name).toBe('Test Foundation');
      expect(result.data.locationEligibility).toContain('United States');
      expect(result.qualityScore).toBeGreaterThan(80);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle missing title with error', async () => {
      mockRawData.title = '';

      const result = await processor.processGrant(mockRawData);

      expect(result.errors).toContain('Title is required');
      expect(result.qualityScore).toBeLessThan(80);
    });

    it('should handle missing description with warning in strict mode', async () => {
      const strictProcessor = new DataProcessor({ strictValidation: true });
      mockRawData.description = '';

      const result = await strictProcessor.processGrant(mockRawData);

      expect(result.warnings.some(w => w.includes('Description is missing'))).toBe(true);
      expect(result.qualityScore).toBeLessThan(100);
    });
  });

  describe('funding amount parsing', () => {
    it('should parse single amount', async () => {
      mockRawData.fundingAmount = '$25,000';

      const result = await processor.processGrant(mockRawData);

      expect(result.data.fundingAmountMin).toBe(25000);
      expect(result.data.fundingAmountMax).toBe(25000);
    });

    it('should parse range amounts', async () => {
      mockRawData.fundingAmount = '$10,000 - $50,000';

      const result = await processor.processGrant(mockRawData);

      expect(result.data.fundingAmountMin).toBe(10000);
      expect(result.data.fundingAmountMax).toBe(50000);
    });

    it('should parse "up to" amounts', async () => {
      mockRawData.fundingAmount = 'Up to $100,000';

      const result = await processor.processGrant(mockRawData);

      expect(result.data.fundingAmountMin).toBe(0);
      expect(result.data.fundingAmountMax).toBe(100000);
    });

    it('should parse minimum amounts', async () => {
      mockRawData.fundingAmount = 'Minimum $5,000';

      const result = await processor.processGrant(mockRawData);

      expect(result.data.fundingAmountMin).toBe(5000);
      expect(result.data.fundingAmountMax).toBeUndefined();
    });

    it('should handle different currencies', async () => {
      const processorWithRates = new DataProcessor({
        currencyConversionRates: { EUR: 1.1, GBP: 1.25 }
      });

      mockRawData.fundingAmount = '€10,000';
      const result = await processorWithRates.processGrant(mockRawData);

      expect(result.data.fundingAmountMin).toBe(11000); // 10000 * 1.1
      expect(result.data.fundingAmountMax).toBe(11000);
    });

    it('should handle invalid funding amounts', async () => {
      mockRawData.fundingAmount = 'No amount specified';

      const result = await processor.processGrant(mockRawData);

      expect(result.warnings.some(w => w.includes('Funding amount parsing'))).toBe(true);
      expect(result.data.fundingAmountMin).toBeUndefined();
      expect(result.data.fundingAmountMax).toBeUndefined();
    });

    it('should parse complex funding text', async () => {
      mockRawData.fundingAmount = 'Awards range from $25,000 to $75,000 per project';

      const result = await processor.processGrant(mockRawData);

      expect(result.data.fundingAmountMin).toBe(25000);
      expect(result.data.fundingAmountMax).toBe(75000);
    });
  });

  describe('deadline parsing', () => {
    it('should parse ISO date format', async () => {
      mockRawData.deadline = '2024-12-31';

      const result = await processor.processGrant(mockRawData);

      expect(result.data.deadline).toBeInstanceOf(Date);
      expect(result.data.deadline?.getFullYear()).toBe(2024);
      expect(result.data.deadline?.getMonth()).toBe(11); // December is month 11
      expect(result.data.deadline?.getDate()).toBe(31);
    });

    it('should parse US date format', async () => {
      mockRawData.deadline = '12/31/2024';

      const result = await processor.processGrant(mockRawData);

      expect(result.data.deadline).toBeInstanceOf(Date);
      expect(result.data.deadline?.getFullYear()).toBe(2024);
    });

    it('should parse month name format', async () => {
      mockRawData.deadline = 'December 31, 2024';

      const result = await processor.processGrant(mockRawData);

      expect(result.data.deadline).toBeInstanceOf(Date);
      expect(result.data.deadline?.getFullYear()).toBe(2024);
      expect(result.data.deadline?.getMonth()).toBe(11);
      expect(result.data.deadline?.getDate()).toBe(31);
    });

    it('should parse day month year format', async () => {
      mockRawData.deadline = '31 December 2024';

      const result = await processor.processGrant(mockRawData);

      expect(result.data.deadline).toBeInstanceOf(Date);
      expect(result.data.deadline?.getFullYear()).toBe(2024);
      expect(result.data.deadline?.getMonth()).toBe(11);
      expect(result.data.deadline?.getDate()).toBe(31);
    });

    it('should handle invalid dates', async () => {
      mockRawData.deadline = 'Invalid date string';

      const result = await processor.processGrant(mockRawData);

      expect(result.warnings.some(w => w.includes('Deadline parsing'))).toBe(true);
      expect(result.data.deadline).toBeUndefined();
    });

    it('should handle missing deadline', async () => {
      mockRawData.deadline = undefined;

      const result = await processor.processGrant(mockRawData);

      expect(result.data.deadline).toBeUndefined();
      expect(result.warnings.filter(w => w.includes('Deadline')).length).toBe(0);
    });
  });

  describe('text normalization', () => {
    it('should remove HTML tags', async () => {
      mockRawData.title = '<h1>Grant Title</h1>';
      mockRawData.description = '<p>This is a <strong>test</strong> description.</p>';

      const result = await processor.processGrant(mockRawData);

      expect(result.data.title).toBe('Grant Title');
      expect(result.data.description).toBe('This is a test description.');
    });

    it('should decode HTML entities', async () => {
      mockRawData.title = 'Grant &amp; Innovation';
      mockRawData.description = 'Research &quot;project&quot; for health &amp; wellness.';

      const result = await processor.processGrant(mockRawData);

      expect(result.data.title).toBe('Grant & Innovation');
      expect(result.data.description).toBe('Research "project" for health & wellness.');
    });

    it('should normalize whitespace', async () => {
      mockRawData.title = '  Grant   Title  ';
      mockRawData.description = 'This  is\n\na\t\ttest   description.';

      const result = await processor.processGrant(mockRawData);

      expect(result.data.title).toBe('Grant Title');
      expect(result.data.description).toBe('This is a test description.');
    });

    it('should handle aggressive normalization', async () => {
      const aggressiveProcessor = new DataProcessor({ textNormalizationLevel: 'aggressive' });
      mockRawData.title = 'Grant Title!!!';
      mockRawData.description = 'This is a test... description???';

      const result = await aggressiveProcessor.processGrant(mockRawData);

      expect(result.data.title).toBe('Grant Title!');
      expect(result.data.description).toBe('This is a test… description?');
    });
  });

  describe('URL validation', () => {
    it('should validate and normalize URLs', async () => {
      mockRawData.applicationUrl = 'example.com/apply';

      const result = await processor.processGrant(mockRawData);

      expect(result.data.applicationUrl).toBe('https://example.com/apply');
    });

    it('should handle invalid URLs', async () => {
      mockRawData.applicationUrl = 'not-a-valid-url';

      const result = await processor.processGrant(mockRawData);

      expect(result.warnings.some(w => w.includes('Invalid application URL'))).toBe(true);
      expect(result.data.applicationUrl).toBeUndefined();
    });

    it('should preserve valid URLs', async () => {
      mockRawData.applicationUrl = 'https://example.com/apply?id=123';

      const result = await processor.processGrant(mockRawData);

      expect(result.data.applicationUrl).toBe('https://example.com/apply?id=123');
    });
  });

  describe('funder data processing', () => {
    it('should process funder information', async () => {
      mockRawData.funderName = 'Test Foundation';
      mockRawData.sourceUrl = 'https://testfoundation.org/grants';

      const result = await processor.processGrant(mockRawData);

      expect(result.data.funder.name).toBe('Test Foundation');
      expect(result.data.funder.website).toBe('https://testfoundation.org');
      expect(result.data.funder.type).toBe(ScrapedSourceType.FOUNDATION);
    });

    it('should detect government funders', async () => {
      mockRawData.funderName = 'Department of Health';
      mockRawData.sourceUrl = 'https://health.gov/grants';

      const result = await processor.processGrant(mockRawData);

      expect(result.data.funder.type).toBe(ScrapedSourceType.GOV);
    });

    it('should detect international funders', async () => {
      mockRawData.funderName = 'World Health Organization';
      mockRawData.sourceUrl = 'https://who.int/grants';

      const result = await processor.processGrant(mockRawData);

      expect(result.data.funder.type).toBe(ScrapedSourceType.NGO);
    });

    it('should detect corporate funders', async () => {
      mockRawData.funderName = 'Tech Corp Foundation';
      mockRawData.sourceUrl = 'https://techcorp.com/grants';

      const result = await processor.processGrant(mockRawData);

      expect(result.data.funder.type).toBe(ScrapedSourceType.BUSINESS);
    });
  });

  describe('location eligibility extraction', () => {
    it('should extract US locations', async () => {
      mockRawData.description = 'Open to organizations in the United States and Canada';
      mockRawData.eligibility = 'Must be based in California or New York';

      const result = await processor.processGrant(mockRawData);

      expect(result.data.locationEligibility).toContain('United States');
      expect(result.data.locationEligibility).toContain('Canada');
      expect(result.data.locationEligibility).toContain('California');
      expect(result.data.locationEligibility).toContain('New York');
    });

    it('should extract international locations', async () => {
      mockRawData.description = 'Available to organizations in Europe and Asia';

      const result = await processor.processGrant(mockRawData);

      expect(result.data.locationEligibility).toContain('Europe');
      expect(result.data.locationEligibility).toContain('Asia');
    });

    it('should handle no location mentions', async () => {
      mockRawData.description = 'Grant for innovative projects';
      mockRawData.eligibility = 'Open to all eligible organizations';

      const result = await processor.processGrant(mockRawData);

      expect(result.data.locationEligibility).toHaveLength(0);
    });
  });

  describe('category inference', () => {
    it('should infer healthcare category', async () => {
      mockRawData.title = 'Healthcare Innovation Grant';
      mockRawData.description = 'Supporting medical research and health initiatives';

      const result = await processor.processGrant(mockRawData);

      expect(result.data.category).toBe(GrantCategory.HEALTHCARE_PUBLIC_HEALTH);
    });

    it('should infer education category', async () => {
      mockRawData.title = 'Education Excellence Grant';
      mockRawData.description = 'Supporting schools and university programs';

      const result = await processor.processGrant(mockRawData);

      expect(result.data.category).toBe(GrantCategory.EDUCATION_TRAINING);
    });

    it('should infer technology category', async () => {
      mockRawData.title = 'AI Innovation Grant';
      mockRawData.description = 'Supporting artificial intelligence and technology development';

      const result = await processor.processGrant(mockRawData);

      expect(result.data.category).toBe(GrantCategory.TECHNOLOGY_INNOVATION);
    });

    it('should default to community development', async () => {
      mockRawData.title = 'General Grant';
      mockRawData.description = 'Supporting various community initiatives';

      const result = await processor.processGrant(mockRawData);

      expect(result.data.category).toBe(GrantCategory.COMMUNITY_DEVELOPMENT);
    });
  });

  describe('content hash generation', () => {
    it('should generate consistent hashes for same content', async () => {
      const result1 = await processor.processGrant(mockRawData);
      const result2 = await processor.processGrant(mockRawData);

      expect(result1.data.contentHash).toBe(result2.data.contentHash);
    });

    it('should generate different hashes for different content', async () => {
      const result1 = await processor.processGrant(mockRawData);
      
      mockRawData.title = 'Different Title';
      const result2 = await processor.processGrant(mockRawData);

      expect(result1.data.contentHash).not.toBe(result2.data.contentHash);
    });
  });

  describe('quality scoring', () => {
    it('should give high scores for complete data', async () => {
      const result = await processor.processGrant(mockRawData);

      expect(result.qualityScore).toBeGreaterThan(80);
    });

    it('should reduce score for missing title', async () => {
      mockRawData.title = '';

      const result = await processor.processGrant(mockRawData);

      expect(result.qualityScore).toBeLessThan(80);
    });

    it('should reduce score for parsing errors', async () => {
      mockRawData.deadline = 'invalid date';
      mockRawData.fundingAmount = 'no amount';

      const result = await processor.processGrant(mockRawData);

      expect(result.qualityScore).toBeLessThan(80);
    });
  });

  describe('error handling', () => {
    it('should handle processing errors gracefully', async () => {
      // Create a scenario that might cause errors
      const invalidData = {
        ...mockRawData,
        title: null as any,
        scrapedAt: 'invalid date' as any
      };

      await expect(processor.processGrant(invalidData)).rejects.toThrow();
    });
  });
});