import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DataProcessor } from '../processors/data-processor';
import { GrantValidator } from '../processors/validator';
import { ClassificationEngine } from '../processors/classifier';
import { DeduplicationEngine } from '../database/deduplication-engine';
import { ContentHasher } from '../database/content-hasher';
import { 
  RawGrantData, 
  ProcessedGrantData, 
  GrantCategory,
  ValidationResult,
  ClassificationResult
} from '../types';

describe('Data Quality Validation Tests', () => {
  let dataProcessor: DataProcessor;
  let dataValidator: DataValidator;
  let classificationEngine: ClassificationEngine;
  let deduplicationEngine: DeduplicationEngine;
  let contentHasher: ContentHasher;

  beforeEach(() => {
    dataProcessor = new DataProcessor();
    dataValidator = new GrantValidator();
    classificationEngine = new ClassificationEngine();
    deduplicationEngine = new DeduplicationEngine();
    contentHasher = new ContentHasher();
  });

  describe('Data Validation and Cleaning', () => {
    it('should validate required fields correctly', async () => {
      const invalidGrants: RawGrantData[] = [
        {
          title: '', // Invalid: empty title
          description: 'Valid description',
          deadline: '2024-12-31',
          fundingAmount: '$50,000',
          eligibility: 'Non-profits',
          applicationUrl: 'https://example.org/apply',
          funderName: 'Test Foundation',
          sourceUrl: 'https://example.org',
          scrapedAt: new Date(),
          rawContent: {}
        },
        {
          title: 'Valid Title',
          description: '', // Invalid: empty description
          deadline: '2024-12-31',
          fundingAmount: '$50,000',
          eligibility: 'Non-profits',
          applicationUrl: 'https://example.org/apply',
          funderName: '', // Invalid: empty funder name
          sourceUrl: 'https://example.org',
          scrapedAt: new Date(),
          rawContent: {}
        }
      ];

      const processedGrants = await dataProcessor.processRawData(invalidGrants);
      
      for (const grant of processedGrants) {
        const validation = await dataValidator.validateGrant(grant);
        
        if (!grant.title || !grant.description || !grant.funder?.name) {
          expect(validation.isValid).toBe(false);
          expect(validation.errors.length).toBeGreaterThan(0);
          expect(validation.qualityScore).toBeLessThan(0.7);
        }
      }
    });

    it('should normalize funding amounts correctly', async () => {
      const testCases = [
        { input: '$50,000', expectedMin: 50000, expectedMax: 50000 },
        { input: '$25,000 - $100,000', expectedMin: 25000, expectedMax: 100000 },
        { input: '€75,000', expectedMin: 75000, expectedMax: 75000 },
        { input: 'Up to $200,000', expectedMin: 0, expectedMax: 200000 },
        { input: 'Minimum $10,000', expectedMin: 10000, expectedMax: null },
        { input: 'Variable funding', expectedMin: null, expectedMax: null },
        { input: 'invalid amount', expectedMin: null, expectedMax: null }
      ];

      for (const testCase of testCases) {
        const rawGrant: RawGrantData = {
          title: 'Test Grant',
          description: 'Test description',
          deadline: '2024-12-31',
          fundingAmount: testCase.input,
          eligibility: 'Non-profits',
          applicationUrl: 'https://example.org/apply',
          funderName: 'Test Foundation',
          sourceUrl: 'https://example.org',
          scrapedAt: new Date(),
          rawContent: {}
        };

        const processed = await dataProcessor.processRawData([rawGrant]);
        expect(processed).toHaveLength(1);

        const grant = processed[0];
        expect(grant.fundingAmountMin).toBe(testCase.expectedMin);
        expect(grant.fundingAmountMax).toBe(testCase.expectedMax);
      }
    });

    it('should parse various date formats correctly', async () => {
      const testCases = [
        { input: '2024-12-31', expected: new Date('2024-12-31') },
        { input: 'December 31, 2024', expected: new Date('2024-12-31') },
        { input: '31/12/2024', expected: new Date('2024-12-31') },
        { input: '12/31/2024', expected: new Date('2024-12-31') },
        { input: 'Dec 31, 2024', expected: new Date('2024-12-31') },
        { input: 'Rolling deadline', expected: null },
        { input: 'No deadline', expected: null },
        { input: 'invalid date', expected: null }
      ];

      for (const testCase of testCases) {
        const rawGrant: RawGrantData = {
          title: 'Test Grant',
          description: 'Test description',
          deadline: testCase.input,
          fundingAmount: '$50,000',
          eligibility: 'Non-profits',
          applicationUrl: 'https://example.org/apply',
          funderName: 'Test Foundation',
          sourceUrl: 'https://example.org',
          scrapedAt: new Date(),
          rawContent: {}
        };

        const processed = await dataProcessor.processRawData([rawGrant]);
        expect(processed).toHaveLength(1);

        const grant = processed[0];
        if (testCase.expected) {
          expect(grant.deadline?.toDateString()).toBe(testCase.expected.toDateString());
        } else {
          expect(grant.deadline).toBeNull();
        }
      }
    });

    it('should clean and normalize text content', async () => {
      const rawGrant: RawGrantData = {
        title: '  Education Grant   \n\t',
        description: '<p>This is a <strong>great</strong> opportunity for &nbsp; education.</p>\n\n\n',
        deadline: '2024-12-31',
        fundingAmount: '$50,000',
        eligibility: 'Non-profit   organizations\t\nonly',
        applicationUrl: 'https://example.org/apply',
        funderName: 'Test Foundation',
        sourceUrl: 'https://example.org',
        scrapedAt: new Date(),
        rawContent: {}
      };

      const processed = await dataProcessor.processRawData([rawGrant]);
      expect(processed).toHaveLength(1);

      const grant = processed[0];
      expect(grant.title).toBe('Education Grant');
      expect(grant.description).toBe('This is a great opportunity for education.');
      expect(grant.eligibilityCriteria).toBe('Non-profit organizations only');
    });

    it('should extract location eligibility correctly', async () => {
      const testCases = [
        {
          text: 'Organizations in California, New York, and Texas are eligible',
          expected: ['California', 'New York', 'Texas']
        },
        {
          text: 'US-based non-profits only',
          expected: ['United States']
        },
        {
          text: 'International organizations welcome',
          expected: ['International']
        },
        {
          text: 'No geographic restrictions',
          expected: ['Global']
        }
      ];

      for (const testCase of testCases) {
        const rawGrant: RawGrantData = {
          title: 'Test Grant',
          description: testCase.text,
          deadline: '2024-12-31',
          fundingAmount: '$50,000',
          eligibility: testCase.text,
          applicationUrl: 'https://example.org/apply',
          funderName: 'Test Foundation',
          sourceUrl: 'https://example.org',
          scrapedAt: new Date(),
          rawContent: {}
        };

        const processed = await dataProcessor.processRawData([rawGrant]);
        expect(processed).toHaveLength(1);

        const grant = processed[0];
        expect(grant.locationEligibility).toEqual(expect.arrayContaining(testCase.expected));
      }
    });
  });

  describe('Grant Classification Accuracy', () => {
    it('should classify grants into correct categories', async () => {
      const testCases = [
        {
          title: 'Medical Research Grant',
          description: 'Funding for cancer research and treatment development',
          expectedCategory: GrantCategory.HEALTHCARE_PUBLIC_HEALTH
        },
        {
          title: 'Education Innovation Fund',
          description: 'Supporting innovative teaching methods and curriculum development',
          expectedCategory: GrantCategory.EDUCATION_TRAINING
        },
        {
          title: 'Environmental Conservation Grant',
          description: 'Protecting wildlife habitats and promoting sustainability',
          expectedCategory: GrantCategory.ENVIRONMENT_CONSERVATION
        },
        {
          title: 'Arts and Culture Initiative',
          description: 'Supporting local artists and cultural programs',
          expectedCategory: GrantCategory.ARTS_CULTURE_HUMANITIES
        },
        {
          title: 'Technology Innovation Fund',
          description: 'Advancing scientific research and technological development',
          expectedCategory: GrantCategory.SCIENCE_TECHNOLOGY_RESEARCH
        }
      ];

      for (const testCase of testCases) {
        const processedGrant: ProcessedGrantData = {
          title: testCase.title,
          description: testCase.description,
          deadline: new Date('2024-12-31'),
          fundingAmountMin: 50000,
          fundingAmountMax: 100000,
          eligibilityCriteria: 'Non-profit organizations',
          applicationUrl: 'https://example.org/apply',
          funder: {
            name: 'Test Foundation',
            website: 'https://example.org',
            contactEmail: 'contact@example.org'
          },
          category: GrantCategory.OTHER, // Will be overridden by classification
          locationEligibility: ['United States'],
          confidenceScore: 0.8,
          contentHash: 'test-hash'
        };

        const classification = await classificationEngine.classifyGrant(processedGrant);
        
        expect(classification.category).toBe(testCase.expectedCategory);
        expect(classification.confidence).toBeGreaterThan(0.7);
        expect(classification.tags).toContain(expect.any(String));
      }
    });

    it('should generate relevant tags for grants', async () => {
      const processedGrant: ProcessedGrantData = {
        title: 'Youth Education Technology Grant',
        description: 'Supporting STEM education programs for underserved youth using innovative technology solutions',
        deadline: new Date('2024-12-31'),
        fundingAmountMin: 25000,
        fundingAmountMax: 75000,
        eligibilityCriteria: 'Non-profit organizations serving youth',
        applicationUrl: 'https://example.org/apply',
        funder: {
          name: 'Tech Foundation',
          website: 'https://techfoundation.org',
          contactEmail: 'grants@techfoundation.org'
        },
        category: GrantCategory.EDUCATION_TRAINING,
        locationEligibility: ['United States'],
        confidenceScore: 0.9,
        contentHash: 'test-hash'
      };

      const classification = await classificationEngine.classifyGrant(processedGrant);
      
      const expectedTags = ['youth', 'education', 'technology', 'STEM', 'underserved'];
      const actualTags = classification.tags.map(tag => tag.toLowerCase());
      
      expectedTags.forEach(expectedTag => {
        expect(actualTags.some(tag => tag.includes(expectedTag))).toBe(true);
      });
    });

    it('should provide confidence scores for classifications', async () => {
      const testCases = [
        {
          description: 'Clear medical research grant for cancer treatment',
          expectedConfidence: 0.9 // High confidence
        },
        {
          description: 'General community support program',
          expectedConfidence: 0.6 // Medium confidence
        },
        {
          description: 'Vague funding opportunity',
          expectedConfidence: 0.4 // Low confidence
        }
      ];

      for (const testCase of testCases) {
        const processedGrant: ProcessedGrantData = {
          title: 'Test Grant',
          description: testCase.description,
          deadline: new Date('2024-12-31'),
          fundingAmountMin: 50000,
          fundingAmountMax: 50000,
          eligibilityCriteria: 'Non-profits',
          applicationUrl: 'https://example.org/apply',
          funder: {
            name: 'Test Foundation',
            website: 'https://example.org',
            contactEmail: 'contact@example.org'
          },
          category: GrantCategory.OTHER,
          locationEligibility: ['United States'],
          confidenceScore: 0.8,
          contentHash: 'test-hash'
        };

        const classification = await classificationEngine.classifyGrant(processedGrant);
        
        if (testCase.expectedConfidence >= 0.8) {
          expect(classification.confidence).toBeGreaterThanOrEqual(0.8);
        } else if (testCase.expectedConfidence >= 0.6) {
          expect(classification.confidence).toBeGreaterThanOrEqual(0.6);
          expect(classification.confidence).toBeLessThan(0.8);
        } else {
          expect(classification.confidence).toBeLessThan(0.6);
        }
      }
    });
  });

  describe('Duplicate Detection and Prevention', () => {
    it('should detect exact duplicates', async () => {
      const baseGrant: ProcessedGrantData = {
        title: 'Education Innovation Grant',
        description: 'Supporting innovative educational programs',
        deadline: new Date('2024-12-31'),
        fundingAmountMin: 50000,
        fundingAmountMax: 100000,
        eligibilityCriteria: 'Non-profit organizations',
        applicationUrl: 'https://example.org/apply',
        funder: {
          name: 'Education Foundation',
          website: 'https://education.org',
          contactEmail: 'grants@education.org'
        },
        category: GrantCategory.EDUCATION_TRAINING,
        locationEligibility: ['United States'],
        confidenceScore: 0.9,
        contentHash: contentHasher.generateHash(baseGrant)
      };

      const duplicate = { ...baseGrant };
      const grants = [baseGrant, duplicate];

      const duplicates = await deduplicationEngine.findDuplicates(grants);
      
      expect(duplicates).toHaveLength(1);
      expect(duplicates[0].duplicates).toHaveLength(2);
      expect(duplicates[0].similarity).toBe(1.0); // Exact match
    });

    it('should detect similar grants with minor differences', async () => {
      const grant1: ProcessedGrantData = {
        title: 'Education Innovation Grant',
        description: 'Supporting innovative educational programs in STEM',
        deadline: new Date('2024-12-31'),
        fundingAmountMin: 50000,
        fundingAmountMax: 100000,
        eligibilityCriteria: 'Non-profit organizations',
        applicationUrl: 'https://example.org/apply/1',
        funder: {
          name: 'Education Foundation',
          website: 'https://education.org',
          contactEmail: 'grants@education.org'
        },
        category: GrantCategory.EDUCATION_TRAINING,
        locationEligibility: ['United States'],
        confidenceScore: 0.9,
        contentHash: 'hash1'
      };

      const grant2: ProcessedGrantData = {
        ...grant1,
        title: 'Educational Innovation Grant', // Slight title difference
        description: 'Supporting innovative educational programs in Science, Technology, Engineering, and Math',
        applicationUrl: 'https://example.org/apply/2',
        contentHash: 'hash2'
      };

      const grants = [grant1, grant2];
      const duplicates = await deduplicationEngine.findDuplicates(grants);
      
      expect(duplicates).toHaveLength(1);
      expect(duplicates[0].similarity).toBeGreaterThan(0.8);
      expect(duplicates[0].similarity).toBeLessThan(1.0);
    });

    it('should merge duplicate grants intelligently', async () => {
      const grant1: ProcessedGrantData = {
        title: 'Health Research Grant',
        description: 'Basic description',
        deadline: new Date('2024-12-31'),
        fundingAmountMin: 50000,
        fundingAmountMax: null,
        eligibilityCriteria: 'Non-profits',
        applicationUrl: 'https://source1.org/apply',
        funder: {
          name: 'Health Foundation',
          website: 'https://health.org',
          contactEmail: null
        },
        category: GrantCategory.HEALTHCARE_PUBLIC_HEALTH,
        locationEligibility: ['United States'],
        confidenceScore: 0.7,
        contentHash: 'hash1'
      };

      const grant2: ProcessedGrantData = {
        ...grant1,
        description: 'Detailed description of health research funding opportunity',
        fundingAmountMax: 100000,
        eligibilityCriteria: 'Non-profit healthcare organizations',
        applicationUrl: 'https://source2.org/apply',
        funder: {
          ...grant1.funder,
          contactEmail: 'grants@health.org'
        },
        confidenceScore: 0.9,
        contentHash: 'hash2'
      };

      const merged = await deduplicationEngine.mergeGrants([grant1, grant2]);
      
      // Should take the best information from both grants
      expect(merged.description).toBe(grant2.description); // More detailed
      expect(merged.fundingAmountMax).toBe(100000); // More complete
      expect(merged.eligibilityCriteria).toBe(grant2.eligibilityCriteria); // More specific
      expect(merged.funder.contactEmail).toBe('grants@health.org'); // More complete
      expect(merged.confidenceScore).toBe(0.9); // Higher confidence
    });
  });

  describe('Content Change Detection', () => {
    it('should detect changes in grant content', async () => {
      const originalGrant: ProcessedGrantData = {
        title: 'Research Grant',
        description: 'Original description',
        deadline: new Date('2024-12-31'),
        fundingAmountMin: 50000,
        fundingAmountMax: 100000,
        eligibilityCriteria: 'Non-profits',
        applicationUrl: 'https://example.org/apply',
        funder: {
          name: 'Research Foundation',
          website: 'https://research.org',
          contactEmail: 'grants@research.org'
        },
        category: GrantCategory.SCIENCE_TECHNOLOGY_RESEARCH,
        locationEligibility: ['United States'],
        confidenceScore: 0.8,
        contentHash: contentHasher.generateHash(originalGrant)
      };

      const updatedGrant: ProcessedGrantData = {
        ...originalGrant,
        description: 'Updated description with new requirements',
        deadline: new Date('2025-01-31'), // Extended deadline
        fundingAmountMax: 150000, // Increased funding
        contentHash: contentHasher.generateHash(originalGrant) // Will be recalculated
      };

      const changeDetection = contentHasher.compareHashes(
        originalGrant.contentHash,
        contentHasher.generateHash(updatedGrant)
      );

      expect(changeDetection.changedFields).toContain('description');
      expect(changeDetection.changedFields).toContain('deadline');
      expect(changeDetection.changedFields).toContain('fundingAmountMax');
      expect(changeDetection.changeType).toBe('major'); // Significant changes
    });

    it('should categorize change severity correctly', async () => {
      const baseGrant: ProcessedGrantData = {
        title: 'Test Grant',
        description: 'Original description',
        deadline: new Date('2024-12-31'),
        fundingAmountMin: 50000,
        fundingAmountMax: 100000,
        eligibilityCriteria: 'Non-profits',
        applicationUrl: 'https://example.org/apply',
        funder: {
          name: 'Test Foundation',
          website: 'https://test.org',
          contactEmail: 'grants@test.org'
        },
        category: GrantCategory.OTHER,
        locationEligibility: ['United States'],
        confidenceScore: 0.8,
        contentHash: 'original-hash'
      };

      // Minor change (description update)
      const minorChange = {
        ...baseGrant,
        description: 'Slightly updated description'
      };

      // Major change (deadline and funding change)
      const majorChange = {
        ...baseGrant,
        deadline: new Date('2025-06-30'),
        fundingAmountMax: 200000
      };

      // Critical change (eligibility change)
      const criticalChange = {
        ...baseGrant,
        eligibilityCriteria: 'For-profit organizations only'
      };

      const minorDetection = contentHasher.compareHashes(
        baseGrant.contentHash,
        contentHasher.generateHash(minorChange)
      );

      const majorDetection = contentHasher.compareHashes(
        baseGrant.contentHash,
        contentHasher.generateHash(majorChange)
      );

      const criticalDetection = contentHasher.compareHashes(
        baseGrant.contentHash,
        contentHasher.generateHash(criticalChange)
      );

      expect(minorDetection.changeType).toBe('minor');
      expect(majorDetection.changeType).toBe('major');
      expect(criticalDetection.changeType).toBe('critical');
    });
  });

  describe('Data Quality Scoring', () => {
    it('should calculate quality scores accurately', async () => {
      const highQualityGrant: ProcessedGrantData = {
        title: 'Comprehensive Education Grant Program',
        description: 'Detailed description of a comprehensive education grant program that supports innovative teaching methods, curriculum development, and student engagement initiatives in underserved communities.',
        deadline: new Date('2024-12-31'),
        fundingAmountMin: 25000,
        fundingAmountMax: 100000,
        eligibilityCriteria: 'Non-profit educational organizations with 501(c)(3) status serving underserved communities',
        applicationUrl: 'https://education-foundation.org/grants/apply',
        funder: {
          name: 'National Education Foundation',
          website: 'https://education-foundation.org',
          contactEmail: 'grants@education-foundation.org'
        },
        category: GrantCategory.EDUCATION_TRAINING,
        locationEligibility: ['United States', 'Puerto Rico'],
        confidenceScore: 0.95,
        contentHash: 'high-quality-hash'
      };

      const lowQualityGrant: ProcessedGrantData = {
        title: 'Grant',
        description: 'Funding available.',
        deadline: null,
        fundingAmountMin: null,
        fundingAmountMax: null,
        eligibilityCriteria: 'Organizations',
        applicationUrl: null,
        funder: {
          name: 'Foundation',
          website: null,
          contactEmail: null
        },
        category: GrantCategory.OTHER,
        locationEligibility: [],
        confidenceScore: 0.3,
        contentHash: 'low-quality-hash'
      };

      const highQualityValidation = await dataValidator.validateGrant(highQualityGrant);
      const lowQualityValidation = await dataValidator.validateGrant(lowQualityGrant);

      expect(highQualityValidation.qualityScore).toBeGreaterThan(0.8);
      expect(highQualityValidation.isValid).toBe(true);
      expect(highQualityValidation.errors).toHaveLength(0);

      expect(lowQualityValidation.qualityScore).toBeLessThan(0.5);
      expect(lowQualityValidation.isValid).toBe(false);
      expect(lowQualityValidation.errors.length).toBeGreaterThan(0);
    });
  });
});