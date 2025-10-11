import { describe, it, expect, beforeEach } from 'vitest';
import { QA_CONFIG, QUALITY_GATES, QualityValidator } from './qa-config';
import { GrantCategory } from '../types';

describe('Quality Validation Tests', () => {
  describe('Data Quality Standards', () => {
    it('should validate grant data according to quality standards', () => {
      const validGrant = {
        title: 'Education Innovation Grant',
        description: 'A comprehensive grant program supporting innovative educational initiatives in underserved communities with a focus on STEM education and digital literacy.',
        deadline: new Date('2024-12-31'),
        fundingAmountMin: 25000,
        fundingAmountMax: 100000,
        eligibilityCriteria: 'Non-profit educational organizations with 501(c)(3) status',
        applicationUrl: 'https://example.org/apply',
        funder: { name: 'Education Foundation' },
        category: GrantCategory.EDUCATION_TRAINING,
        locationEligibility: ['United States'],
        confidenceScore: 0.9,
        contentHash: 'valid-hash',
        sourceUrl: 'https://example.org',
        scrapedAt: new Date()
      };

      const validation = QualityValidator.validateGrant(validGrant);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject grants with missing required fields', () => {
      const invalidGrant = {
        title: '', // Invalid: empty title
        description: 'Valid description',
        deadline: new Date('2024-12-31'),
        fundingAmountMin: 25000,
        fundingAmountMax: 100000,
        eligibilityCriteria: 'Non-profits',
        applicationUrl: 'https://example.org/apply',
        funder: null, // Invalid: missing funder
        category: GrantCategory.OTHER,
        locationEligibility: ['United States'],
        confidenceScore: 0.9,
        contentHash: 'invalid-hash',
        sourceUrl: 'https://example.org',
        scrapedAt: new Date()
      };

      const validation = QualityValidator.validateGrant(invalidGrant);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it('should validate title length requirements', () => {
      const shortTitleGrant = {
        title: 'Hi', // Too short
        description: 'A comprehensive description that meets the minimum length requirements for grant descriptions.',
        deadline: new Date('2024-12-31'),
        fundingAmountMin: 25000,
        fundingAmountMax: 100000,
        eligibilityCriteria: 'Non-profit organizations',
        applicationUrl: 'https://example.org/apply',
        funder: { name: 'Test Foundation' },
        category: GrantCategory.OTHER,
        locationEligibility: ['United States'],
        confidenceScore: 0.8,
        contentHash: 'test-hash',
        sourceUrl: 'https://example.org',
        scrapedAt: new Date()
      };

      const validation = QualityValidator.validateGrant(shortTitleGrant);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.includes('Title length'))).toBe(true);
    });

    it('should validate description length requirements', () => {
      const shortDescGrant = {
        title: 'Valid Grant Title',
        description: 'Too short', // Too short
        deadline: new Date('2024-12-31'),
        fundingAmountMin: 25000,
        fundingAmountMax: 100000,
        eligibilityCriteria: 'Non-profit organizations',
        applicationUrl: 'https://example.org/apply',
        funder: { name: 'Test Foundation' },
        category: GrantCategory.OTHER,
        locationEligibility: ['United States'],
        confidenceScore: 0.8,
        contentHash: 'test-hash',
        sourceUrl: 'https://example.org',
        scrapedAt: new Date()
      };

      const validation = QualityValidator.validateGrant(shortDescGrant);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.includes('Description length'))).toBe(true);
    });

    it('should validate URL format', () => {
      const invalidUrlGrant = {
        title: 'Valid Grant Title',
        description: 'A comprehensive description that meets the minimum length requirements for grant descriptions.',
        deadline: new Date('2024-12-31'),
        fundingAmountMin: 25000,
        fundingAmountMax: 100000,
        eligibilityCriteria: 'Non-profit organizations',
        applicationUrl: 'not-a-valid-url', // Invalid URL
        funder: { name: 'Test Foundation' },
        category: GrantCategory.OTHER,
        locationEligibility: ['United States'],
        confidenceScore: 0.8,
        contentHash: 'test-hash',
        sourceUrl: 'https://example.org',
        scrapedAt: new Date()
      };

      const validation = QualityValidator.validateGrant(invalidUrlGrant);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.includes('Invalid application URL'))).toBe(true);
    });
  });

  describe('Classification Quality Standards', () => {
    it('should validate supported categories', () => {
      const validClassification = {
        category: GrantCategory.HEALTHCARE_PUBLIC_HEALTH,
        confidence: 0.9,
        tags: ['health', 'medical', 'research'],
        reasoning: ['Medical keywords found', 'Healthcare context detected']
      };

      const validation = QualityValidator.validateClassification(validClassification);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject classifications with low confidence', () => {
      const lowConfidenceClassification = {
        category: GrantCategory.OTHER,
        confidence: 0.4, // Below threshold
        tags: ['unclear'],
        reasoning: ['Insufficient context']
      };

      const validation = QualityValidator.validateClassification(lowConfidenceClassification);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.includes('Confidence score too low'))).toBe(true);
    });

    it('should reject classifications with too many tags', () => {
      const tooManyTagsClassification = {
        category: GrantCategory.EDUCATION_TRAINING,
        confidence: 0.8,
        tags: Array.from({ length: 15 }, (_, i) => `tag${i}`), // Too many tags
        reasoning: ['Education context']
      };

      const validation = QualityValidator.validateClassification(tooManyTagsClassification);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.includes('Too many tags'))).toBe(true);
    });

    it('should validate all supported categories are recognized', () => {
      const supportedCategories = QA_CONFIG.validation.supportedCategories;
      const grantCategories = Object.values(GrantCategory);

      // All GrantCategory values should be in supported categories
      grantCategories.forEach(category => {
        expect(supportedCategories).toContain(category);
      });
    });
  });

  describe('Performance Quality Standards', () => {
    it('should validate performance metrics within acceptable ranges', () => {
      const goodPerformanceMetrics = {
        grantsPerSecond: 15, // Above benchmark
        memoryUsage: 100 * 1024 * 1024, // 100MB - within limits
        averageResponseTime: 5000 // 5 seconds - within limits
      };

      const validation = QualityValidator.validatePerformance(goodPerformanceMetrics);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject poor performance metrics', () => {
      const poorPerformanceMetrics = {
        grantsPerSecond: 2, // Below benchmark
        memoryUsage: 600 * 1024 * 1024, // 600MB - too high
        averageResponseTime: 45000 // 45 seconds - too slow
      };

      const validation = QualityValidator.validatePerformance(poorPerformanceMetrics);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Quality Gate Validation', () => {
    it('should validate quality gate conditions', () => {
      const mockMetrics = {
        overallCoverage: 85, // Above minimum
        testResults: [
          { passed: 10, failed: 0, suite: 'Unit Tests' },
          { passed: 8, failed: 0, suite: 'Integration Tests' },
          { passed: 5, failed: 0, suite: 'End-to-End Tests' }
        ],
        performanceMetrics: {
          averageTestDuration: 120000 // 2 minutes - within limits
        },
        qualityScore: 85 // Above minimum
      };

      // Test each quality gate
      QUALITY_GATES.forEach(gate => {
        const passed = gate.condition(mockMetrics);
        
        if (gate.severity === 'error') {
          expect(passed).toBe(true, `Quality Gate Failed: ${gate.name} - ${gate.message}`);
        }
      });
    });

    it('should fail quality gates with poor metrics', () => {
      const poorMetrics = {
        overallCoverage: 60, // Below minimum
        testResults: [
          { passed: 5, failed: 5, suite: 'Unit Tests' },
          { passed: 3, failed: 2, suite: 'Regression Tests' }
        ],
        performanceMetrics: {
          averageTestDuration: 400000 // 6.7 minutes - too slow
        },
        qualityScore: 45 // Below minimum
      };

      const failedGates = QUALITY_GATES.filter(gate => !gate.condition(poorMetrics));
      expect(failedGates.length).toBeGreaterThan(0);
    });
  });

  describe('Configuration Validation', () => {
    it('should validate QA configuration structure', () => {
      expect(QA_CONFIG).toBeDefined();
      expect(QA_CONFIG.thresholds).toBeDefined();
      expect(QA_CONFIG.validation).toBeDefined();
      expect(QA_CONFIG.benchmarks).toBeDefined();
    });

    it('should have reasonable threshold values', () => {
      const thresholds = QA_CONFIG.thresholds;
      
      expect(thresholds.minimumCoverage).toBeGreaterThan(0);
      expect(thresholds.minimumCoverage).toBeLessThanOrEqual(100);
      
      expect(thresholds.minSuccessRate).toBeGreaterThan(0);
      expect(thresholds.minSuccessRate).toBeLessThanOrEqual(1);
      
      expect(thresholds.maxErrorRate).toBeGreaterThanOrEqual(0);
      expect(thresholds.maxErrorRate).toBeLessThan(1);
    });

    it('should have valid validation rules', () => {
      const validation = QA_CONFIG.validation;
      
      expect(validation.requiredGrantFields).toBeInstanceOf(Array);
      expect(validation.requiredGrantFields.length).toBeGreaterThan(0);
      
      expect(validation.minTitleLength).toBeGreaterThan(0);
      expect(validation.maxTitleLength).toBeGreaterThan(validation.minTitleLength);
      
      expect(validation.minDescriptionLength).toBeGreaterThan(0);
      expect(validation.maxDescriptionLength).toBeGreaterThan(validation.minDescriptionLength);
    });

    it('should have realistic performance benchmarks', () => {
      const benchmarks = QA_CONFIG.benchmarks;
      
      expect(benchmarks.grantsPerSecond).toBeGreaterThan(0);
      expect(benchmarks.sourcesPerMinute).toBeGreaterThan(0);
      
      expect(benchmarks.maxMemoryPerGrant).toBeGreaterThan(0);
      expect(benchmarks.maxMemoryPerSource).toBeGreaterThan(benchmarks.maxMemoryPerGrant);
      
      expect(benchmarks.maxRequestTime).toBeGreaterThan(0);
      expect(benchmarks.maxRetryDelay).toBeGreaterThan(0);
    });
  });

  describe('Error Handling Quality', () => {
    it('should handle null and undefined inputs gracefully', () => {
      expect(() => QualityValidator.validateGrant(null)).not.toThrow();
      expect(() => QualityValidator.validateGrant(undefined)).not.toThrow();
      expect(() => QualityValidator.validateClassification(null)).not.toThrow();
      expect(() => QualityValidator.validatePerformance(undefined)).not.toThrow();
    });

    it('should handle malformed data gracefully', () => {
      const malformedInputs = [
        {},
        { title: null },
        { description: undefined },
        { funder: 'not-an-object' },
        { category: 'INVALID_CATEGORY' }
      ];

      malformedInputs.forEach(input => {
        expect(() => {
          const validation = QualityValidator.validateGrant(input);
          expect(validation).toBeDefined();
          expect(typeof validation.isValid).toBe('boolean');
          expect(Array.isArray(validation.errors)).toBe(true);
        }).not.toThrow();
      });
    });
  });

  describe('Data Consistency Validation', () => {
    it('should maintain consistent validation results', () => {
      const testGrant = {
        title: 'Consistent Test Grant',
        description: 'This grant is used to test validation consistency across multiple runs.',
        deadline: new Date('2024-12-31'),
        fundingAmountMin: 50000,
        fundingAmountMax: 100000,
        eligibilityCriteria: 'Non-profit organizations',
        applicationUrl: 'https://example.org/apply',
        funder: { name: 'Test Foundation' },
        category: GrantCategory.OTHER,
        locationEligibility: ['United States'],
        confidenceScore: 0.8,
        contentHash: 'consistent-hash',
        sourceUrl: 'https://example.org',
        scrapedAt: new Date()
      };

      // Run validation multiple times
      const results = Array.from({ length: 5 }, () => 
        QualityValidator.validateGrant(testGrant)
      );

      // All results should be identical
      const firstResult = results[0];
      results.forEach(result => {
        expect(result.isValid).toBe(firstResult.isValid);
        expect(result.errors).toEqual(firstResult.errors);
      });
    });

    it('should provide deterministic classification validation', () => {
      const testClassification = {
        category: GrantCategory.SCIENCE_TECHNOLOGY_RESEARCH,
        confidence: 0.85,
        tags: ['science', 'technology', 'research'],
        reasoning: ['Scientific keywords detected']
      };

      // Run validation multiple times
      const results = Array.from({ length: 5 }, () => 
        QualityValidator.validateClassification(testClassification)
      );

      // All results should be identical
      const firstResult = results[0];
      results.forEach(result => {
        expect(result.isValid).toBe(firstResult.isValid);
        expect(result.errors).toEqual(firstResult.errors);
      });
    });
  });
});