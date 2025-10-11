/**
 * Tests for GrantValidator class
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GrantValidator } from '../validator';
import { ProcessedGrantData, GrantCategory, ScrapedSourceType } from '../../types';

describe('GrantValidator', () => {
  let validator: GrantValidator;
  let validGrantData: ProcessedGrantData;

  beforeEach(() => {
    validator = new GrantValidator();
    validGrantData = {
      title: 'Healthcare Innovation Grant',
      description: 'This is a comprehensive grant program designed to support innovative healthcare solutions and medical research initiatives.',
      deadline: new Date('2025-12-31'),
      fundingAmountMin: 10000,
      fundingAmountMax: 50000,
      eligibilityCriteria: 'Open to US-based healthcare organizations',
      applicationUrl: 'https://example.com/apply',
      funder: {
        name: 'Test Foundation',
        website: 'https://testfoundation.org',
        type: ScrapedSourceType.FOUNDATION
      },
      category: GrantCategory.HEALTHCARE_PUBLIC_HEALTH,
      locationEligibility: ['United States'],
      confidenceScore: 85,
      contentHash: 'abc123def456'
    };
  });

  describe('validate', () => {
    it('should validate complete valid data', () => {
      const result = validator.validate(validGrantData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.qualityScore).toBeGreaterThan(80);
    });

    it('should require title', () => {
      validGrantData.title = '';

      const result = validator.validate(validGrantData);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'title' && e.message.includes('required'))).toBe(true);
    });

    it('should require description', () => {
      validGrantData.description = '';

      const result = validator.validate(validGrantData);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'description' && e.message.includes('required'))).toBe(true);
    });

    it('should require funder name', () => {
      validGrantData.funder.name = '';

      const result = validator.validate(validGrantData);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'funder.name' && e.message.includes('required'))).toBe(true);
    });

    it('should validate title length', () => {
      validGrantData.title = 'ABC'; // Too short

      const result = validator.validate(validGrantData);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'title' && e.message.includes('at least'))).toBe(true);
    });

    it('should warn about long descriptions', () => {
      validGrantData.description = 'A'.repeat(6000); // Too long

      const result = validator.validate(validGrantData);

      expect(result.warnings.some(w => w.field === 'description' && w.message.includes('longer than recommended'))).toBe(true);
    });

    it('should validate URL format', () => {
      validGrantData.applicationUrl = 'not-a-valid-url';

      const result = validator.validate(validGrantData);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'applicationUrl' && e.message.includes('valid URL'))).toBe(true);
    });

    it('should validate date type', () => {
      validGrantData.deadline = 'not-a-date' as any;

      const result = validator.validate(validGrantData);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'deadline' && e.message.includes('valid date'))).toBe(true);
    });

    it('should validate number types', () => {
      validGrantData.fundingAmountMin = 'not-a-number' as any;

      const result = validator.validate(validGrantData);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'fundingAmountMin' && e.message.includes('valid number'))).toBe(true);
    });

    it('should validate confidence score range', () => {
      validGrantData.confidenceScore = 150; // Out of range

      const result = validator.validate(validGrantData);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'confidenceScore')).toBe(true);
    });
  });

  describe('business logic validation', () => {
    it('should validate funding amount logic', () => {
      validGrantData.fundingAmountMin = 100000;
      validGrantData.fundingAmountMax = 50000; // Min > Max

      const result = validator.validate(validGrantData);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'fundingAmount' && e.message.includes('Minimum funding amount'))).toBe(true);
    });

    it('should warn about large funding ranges', () => {
      validGrantData.fundingAmountMin = 1000;
      validGrantData.fundingAmountMax = 50000; // Very large range

      const result = validator.validate(validGrantData);

      expect(result.warnings.some(w => w.field === 'fundingAmount' && w.message.includes('very large'))).toBe(true);
    });

    it('should warn about past deadlines', () => {
      validGrantData.deadline = new Date('2020-01-01'); // Past date

      const result = validator.validate(validGrantData);

      expect(result.warnings.some(w => w.field === 'deadline' && w.message.includes('in the past'))).toBe(true);
    });

    it('should warn about very soon deadlines', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      validGrantData.deadline = tomorrow;

      const result = validator.validate(validGrantData);

      expect(result.warnings.some(w => w.field === 'deadline' && w.message.includes('very soon'))).toBe(true);
    });

    it('should warn about far future deadlines', () => {
      const farFuture = new Date();
      farFuture.setFullYear(farFuture.getFullYear() + 2);
      validGrantData.deadline = farFuture;

      const result = validator.validate(validGrantData);

      expect(result.warnings.some(w => w.field === 'deadline' && w.message.includes('more than a year'))).toBe(true);
    });

    it('should warn about short descriptions', () => {
      validGrantData.description = 'Very short description.'; // Less than 10 words

      const result = validator.validate(validGrantData);

      expect(result.warnings.some(w => w.field === 'description' && w.message.includes('very short'))).toBe(true);
    });

    it('should detect placeholder text', () => {
      validGrantData.description = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.';

      const result = validator.validate(validGrantData);

      expect(result.warnings.some(w => w.field === 'description' && w.message.includes('placeholder text'))).toBe(true);
    });

    it('should warn about missing location eligibility', () => {
      validGrantData.locationEligibility = [];

      const result = validator.validate(validGrantData);

      expect(result.warnings.some(w => w.field === 'locationEligibility' && w.message.includes('No location eligibility'))).toBe(true);
    });

    it('should warn about missing funder contact info', () => {
      validGrantData.funder.website = undefined;
      validGrantData.funder.contactEmail = undefined;

      const result = validator.validate(validGrantData);

      expect(result.warnings.some(w => w.field === 'funder' && w.message.includes('No contact information'))).toBe(true);
    });

    it('should warn about inconsistent confidence scores', () => {
      validGrantData.confidenceScore = 95;
      validGrantData.title = ''; // This will cause errors

      const result = validator.validate(validGrantData);

      expect(result.warnings.some(w => w.field === 'confidenceScore' && w.message.includes('High confidence score'))).toBe(true);
    });
  });

  describe('quality scoring', () => {
    it('should reduce quality score for errors', () => {
      validGrantData.title = ''; // Major error

      const result = validator.validate(validGrantData);

      expect(result.qualityScore).toBeLessThan(80);
    });

    it('should reduce quality score for warnings', () => {
      validGrantData.locationEligibility = []; // Minor warning

      const result = validator.validate(validGrantData);

      expect(result.qualityScore).toBeLessThan(100);
      expect(result.qualityScore).toBeGreaterThan(90);
    });

    it('should not allow negative quality scores', () => {
      // Create data with many errors
      validGrantData.title = '';
      validGrantData.description = '';
      validGrantData.funder.name = '';
      validGrantData.confidenceScore = 150;
      validGrantData.fundingAmountMin = 'invalid' as any;

      const result = validator.validate(validGrantData);

      expect(result.qualityScore).toBeGreaterThanOrEqual(0);
    });
  });

  describe('optional fields', () => {
    it('should allow missing optional fields', () => {
      validGrantData.deadline = undefined;
      validGrantData.fundingAmountMin = undefined;
      validGrantData.fundingAmountMax = undefined;
      validGrantData.applicationUrl = undefined;
      validGrantData.eligibilityCriteria = '';

      const result = validator.validate(validGrantData);

      expect(result.isValid).toBe(true);
    });

    it('should validate optional fields when present', () => {
      validGrantData.applicationUrl = 'invalid-url';

      const result = validator.validate(validGrantData);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'applicationUrl')).toBe(true);
    });
  });

  describe('getValidationSummary', () => {
    it('should provide comprehensive validation summary', () => {
      const results = [
        validator.validate(validGrantData),
        validator.validate({ ...validGrantData, title: '' }),
        validator.validate({ ...validGrantData, description: 'Short.' }),
        validator.validate({ ...validGrantData, applicationUrl: 'invalid' })
      ];

      const summary = validator.getValidationSummary(results);

      expect(summary.totalValidated).toBe(4);
      expect(summary.validCount).toBe(1);
      expect(summary.errorCount).toBeGreaterThan(0);
      expect(summary.warningCount).toBeGreaterThan(0);
      expect(summary.averageQualityScore).toBeGreaterThan(0);
      expect(summary.commonErrors.length).toBeGreaterThan(0);
      expect(summary.commonWarnings.length).toBeGreaterThan(0);
    });

    it('should sort common errors by frequency', () => {
      const results = [
        validator.validate({ ...validGrantData, title: '' }),
        validator.validate({ ...validGrantData, title: '' }),
        validator.validate({ ...validGrantData, description: '' })
      ];

      const summary = validator.getValidationSummary(results);

      expect(summary.commonErrors[0].count).toBe(2); // Title error appears twice
      expect(summary.commonErrors[1].count).toBe(1); // Description error appears once
    });
  });

  describe('nested field validation', () => {
    it('should validate nested funder fields', () => {
      validGrantData.funder.name = 'A'; // Too short

      const result = validator.validate(validGrantData);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'funder.name')).toBe(true);
    });

    it('should validate nested funder website URL', () => {
      validGrantData.funder.website = 'not-a-url';

      const result = validator.validate(validGrantData);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'funder.website')).toBe(true);
    });
  });

  describe('array validation', () => {
    it('should validate location eligibility array', () => {
      validGrantData.locationEligibility = ['Valid Location', ''] as any;

      const result = validator.validate(validGrantData);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'locationEligibility')).toBe(true);
    });

    it('should handle non-array location eligibility', () => {
      validGrantData.locationEligibility = 'Not an array' as any;

      const result = validator.validate(validGrantData);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'locationEligibility')).toBe(true);
    });
  });
});