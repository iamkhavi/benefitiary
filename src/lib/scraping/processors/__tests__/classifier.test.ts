/**
 * Tests for ClassificationEngine
 * Validates grant classification, tagging, and location extraction functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ClassificationEngine } from '../classifier';
import { ProcessedGrantData, GrantCategory } from '../../types';

describe('ClassificationEngine', () => {
  let classifier: ClassificationEngine;
  
  beforeEach(() => {
    classifier = new ClassificationEngine();
  });

  describe('Grant Classification', () => {
    it('should classify healthcare grants correctly', async () => {
      const healthcareGrant: ProcessedGrantData = {
        title: 'Medical Research Grant for Cancer Treatment',
        description: 'This grant supports clinical research into innovative cancer treatment methods, focusing on patient outcomes and therapeutic interventions.',
        deadline: new Date('2024-12-31'),
        fundingAmountMin: 100000,
        fundingAmountMax: 500000,
        eligibilityCriteria: 'Medical institutions and healthcare providers',
        applicationUrl: 'https://example.com/apply',
        funder: {
          name: 'Health Foundation',
          website: 'https://healthfoundation.org',
          type: 'FOUNDATION' as any
        },
        category: GrantCategory.HEALTHCARE_PUBLIC_HEALTH,
        locationEligibility: [],
        confidenceScore: 0,
        contentHash: 'hash123'
      };

      const result = await classifier.classifyGrant(healthcareGrant);

      expect(result.category).toBe(GrantCategory.HEALTHCARE_PUBLIC_HEALTH);
      expect(result.confidence).toBeGreaterThan(0.7);
      expect(result.tags).toContain('medium-grant');
      expect(result.reasoning.some(r => /healthcare|medical|clinical/i.test(r))).toBe(true);
    });

    it('should classify education grants correctly', async () => {
      const educationGrant: ProcessedGrantData = {
        title: 'STEM Education Initiative for K-12 Schools',
        description: 'Supporting innovative STEM curriculum development and teacher training programs in elementary and secondary schools.',
        deadline: new Date('2024-06-30'),
        fundingAmountMin: 50000,
        fundingAmountMax: 200000,
        eligibilityCriteria: 'Public and private schools, educational nonprofits',
        applicationUrl: 'https://example.com/apply',
        funder: {
          name: 'Education Foundation',
          website: 'https://educationfoundation.org',
          type: 'FOUNDATION' as any
        },
        category: GrantCategory.EDUCATION_TRAINING,
        locationEligibility: [],
        confidenceScore: 0,
        contentHash: 'hash456'
      };

      const result = await classifier.classifyGrant(educationGrant);

      expect(result.category).toBe(GrantCategory.EDUCATION_TRAINING);
      expect(result.confidence).toBeGreaterThan(0.6);
      expect(result.tags).toContain('medium-grant');
      expect(result.reasoning.some(r => /education|school|curriculum/i.test(r))).toBe(true);
    });

    it('should classify environment grants correctly', async () => {
      const environmentGrant: ProcessedGrantData = {
        title: 'Climate Change Mitigation and Renewable Energy Project',
        description: 'Funding for innovative solutions to reduce carbon emissions and promote sustainable energy practices in communities.',
        deadline: new Date('2024-09-15'),
        fundingAmountMin: 250000,
        fundingAmountMax: 1000000,
        eligibilityCriteria: 'Environmental organizations, research institutions',
        applicationUrl: 'https://example.com/apply',
        funder: {
          name: 'Green Foundation',
          website: 'https://greenfoundation.org',
          type: 'FOUNDATION' as any
        },
        category: GrantCategory.ENVIRONMENT_SUSTAINABILITY,
        locationEligibility: [],
        confidenceScore: 0,
        contentHash: 'hash789'
      };

      const result = await classifier.classifyGrant(environmentGrant);

      expect(result.category).toBe(GrantCategory.ENVIRONMENT_SUSTAINABILITY);
      expect(result.confidence).toBeGreaterThan(0.7);
      expect(result.tags).toContain('large-grant');
      expect(result.reasoning.some(r => /environment|climate|renewable|sustainability/i.test(r))).toBe(true);
    });

    it('should handle grants with mixed category signals', async () => {
      const mixedGrant: ProcessedGrantData = {
        title: 'Health Education Technology Innovation',
        description: 'Developing digital health education platforms using AI technology for medical training and patient education.',
        deadline: new Date('2024-08-31'),
        fundingAmountMin: 75000,
        fundingAmountMax: 300000,
        eligibilityCriteria: 'Universities, healthcare institutions, tech companies',
        applicationUrl: 'https://example.com/apply',
        funder: {
          name: 'Innovation Foundation',
          website: 'https://innovationfoundation.org',
          type: 'FOUNDATION' as any
        },
        category: GrantCategory.TECHNOLOGY_INNOVATION,
        locationEligibility: [],
        confidenceScore: 0,
        contentHash: 'hash101'
      };

      const result = await classifier.classifyGrant(mixedGrant);

      // Should pick the strongest category signal
      expect([
        GrantCategory.HEALTHCARE_PUBLIC_HEALTH,
        GrantCategory.EDUCATION_TRAINING,
        GrantCategory.TECHNOLOGY_INNOVATION
      ]).toContain(result.category);
      expect(result.confidence).toBeGreaterThan(0.4);
      expect(result.tags.length).toBeGreaterThan(0);
    });
  });

  describe('Tag Generation', () => {
    it('should generate funding amount tags', async () => {
      const smallGrant: ProcessedGrantData = {
        title: 'Small Community Project',
        description: 'Local community improvement initiative',
        fundingAmountMax: 25000,
        eligibilityCriteria: 'Community organizations',
        funder: { name: 'Local Foundation', type: 'FOUNDATION' as any },
        category: GrantCategory.COMMUNITY_DEVELOPMENT,
        locationEligibility: [],
        confidenceScore: 0,
        contentHash: 'small123'
      };

      const result = await classifier.classifyGrant(smallGrant);
      expect(result.tags).toContain('small-grant');

      const largeGrant: ProcessedGrantData = {
        ...smallGrant,
        fundingAmountMax: 2000000,
        contentHash: 'large123'
      };

      const largeResult = await classifier.classifyGrant(largeGrant);
      expect(largeResult.tags).toContain('large-grant');
    });

    it('should generate organization type tags', async () => {
      const nonprofitGrant: ProcessedGrantData = {
        title: 'Nonprofit Capacity Building',
        description: 'Supporting 501c3 charitable organizations with capacity building initiatives',
        eligibilityCriteria: 'Registered nonprofit organizations',
        funder: { name: 'Charity Foundation', type: 'FOUNDATION' as any },
        category: GrantCategory.COMMUNITY_DEVELOPMENT,
        locationEligibility: [],
        confidenceScore: 0,
        contentHash: 'nonprofit123'
      };

      const result = await classifier.classifyGrant(nonprofitGrant);
      expect(result.tags).toContain('nonprofit');
    });

    it('should generate deadline urgency tags', async () => {
      const urgentGrant: ProcessedGrantData = {
        title: 'Urgent Response Grant',
        description: 'Emergency funding for immediate community needs',
        deadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
        eligibilityCriteria: 'Emergency response organizations',
        funder: { name: 'Emergency Foundation', type: 'FOUNDATION' as any },
        category: GrantCategory.SOCIAL_SERVICES,
        locationEligibility: [],
        confidenceScore: 0,
        contentHash: 'urgent123'
      };

      const result = await classifier.classifyGrant(urgentGrant);
      expect(result.tags).toContain('urgent-deadline');
    });

    it('should limit tags to reasonable number', async () => {
      const verboseGrant: ProcessedGrantData = {
        title: 'Comprehensive Multi-Sector Innovation Research Development Technology Healthcare Education Environment Sustainability Community Social Arts Culture Grant',
        description: 'This extensive grant covers multiple domains including healthcare medical clinical research, education training academic learning, environment sustainability climate renewable energy, technology innovation AI artificial intelligence, social services community development, arts culture creative programs, and much more comprehensive coverage of various sectors and domains.',
        eligibilityCriteria: 'All types of organizations including nonprofits, universities, hospitals, schools, research institutions, government agencies, small businesses, startups, and community groups',
        funder: { name: 'Comprehensive Foundation', type: 'FOUNDATION' as any },
        category: GrantCategory.RESEARCH_DEVELOPMENT,
        locationEligibility: [],
        confidenceScore: 0,
        contentHash: 'verbose123'
      };

      const result = await classifier.classifyGrant(verboseGrant);
      expect(result.tags.length).toBeLessThanOrEqual(15);
    });
  });

  describe('Location Eligibility Extraction', () => {
    it('should extract US state names', async () => {
      const stateGrant: ProcessedGrantData = {
        title: 'California Environmental Initiative',
        description: 'This grant is available to organizations in California, Nevada, and Oregon.',
        eligibilityCriteria: 'Organizations must be located in California, Nevada, or Oregon',
        funder: { name: 'West Coast Foundation', type: 'FOUNDATION' as any },
        category: GrantCategory.ENVIRONMENT_SUSTAINABILITY,
        locationEligibility: [],
        confidenceScore: 0,
        contentHash: 'state123'
      };

      const result = await classifier.classifyGrant(stateGrant);
      expect(result.reasoning.some(r => /location restrictions/i.test(r))).toBe(true);
    });

    it('should extract major cities', async () => {
      const cityGrant: ProcessedGrantData = {
        title: 'Urban Development Grant',
        description: 'Supporting urban development projects in New York, Los Angeles, and Chicago.',
        eligibilityCriteria: 'Organizations in New York, Los Angeles, or Chicago metropolitan areas',
        funder: { name: 'Urban Foundation', type: 'FOUNDATION' as any },
        category: GrantCategory.COMMUNITY_DEVELOPMENT,
        locationEligibility: [],
        confidenceScore: 0,
        contentHash: 'city123'
      };

      const result = await classifier.classifyGrant(cityGrant);
      expect(result.reasoning.some(r => /location restrictions/i.test(r))).toBe(true);
    });

    it('should extract country names', async () => {
      const internationalGrant: ProcessedGrantData = {
        title: 'International Development Grant',
        description: 'Supporting development projects in United States, Canada, and Mexico.',
        eligibilityCriteria: 'Organizations in United States, Canada, or Mexico',
        funder: { name: 'International Foundation', type: 'FOUNDATION' as any },
        category: GrantCategory.COMMUNITY_DEVELOPMENT,
        locationEligibility: [],
        confidenceScore: 0,
        contentHash: 'international123'
      };

      const result = await classifier.classifyGrant(internationalGrant);
      expect(result.reasoning.some(r => /location restrictions/i.test(r))).toBe(true);
    });
  });

  describe('Confidence Scoring', () => {
    it('should provide high confidence for clear category matches', async () => {
      const clearGrant: ProcessedGrantData = {
        title: 'Medical Research Clinical Trial Healthcare Grant',
        description: 'This healthcare grant supports medical research, clinical trials, patient treatment, and hospital-based therapeutic interventions.',
        eligibilityCriteria: 'Medical institutions, hospitals, healthcare providers',
        funder: { name: 'Medical Foundation', type: 'FOUNDATION' as any },
        category: GrantCategory.HEALTHCARE_PUBLIC_HEALTH,
        locationEligibility: [],
        confidenceScore: 0,
        contentHash: 'clear123'
      };

      const result = await classifier.classifyGrant(clearGrant);
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should provide lower confidence for ambiguous grants', async () => {
      const ambiguousGrant: ProcessedGrantData = {
        title: 'General Support Grant',
        description: 'Supporting various initiatives and projects.',
        eligibilityCriteria: 'Eligible organizations',
        funder: { name: 'General Foundation', type: 'FOUNDATION' as any },
        category: GrantCategory.COMMUNITY_DEVELOPMENT,
        locationEligibility: [],
        confidenceScore: 0,
        contentHash: 'ambiguous123'
      };

      const result = await classifier.classifyGrant(ambiguousGrant);
      expect(result.confidence).toBeLessThan(0.8);
    });

    it('should flag low confidence grants for manual review', async () => {
      const unclearGrant: ProcessedGrantData = {
        title: 'Special Initiative',
        description: 'Various activities and programs.',
        eligibilityCriteria: 'Eligible organizations',
        funder: { name: 'Foundation', type: 'FOUNDATION' as any },
        category: GrantCategory.COMMUNITY_DEVELOPMENT,
        locationEligibility: [],
        confidenceScore: 0,
        contentHash: 'unclear123'
      };

      const result = await classifier.classifyGrant(unclearGrant);
      expect(result.confidence).toBeLessThan(0.5);
      // Low confidence should be flagged in reasoning or through separate mechanism
    });
  });

  describe('Edge Cases', () => {
    it('should handle grants with missing description', async () => {
      const minimalGrant: ProcessedGrantData = {
        title: 'Healthcare Grant',
        description: '',
        eligibilityCriteria: '',
        funder: { name: 'Foundation', type: 'FOUNDATION' as any },
        category: GrantCategory.HEALTHCARE_PUBLIC_HEALTH,
        locationEligibility: [],
        confidenceScore: 0,
        contentHash: 'minimal123'
      };

      const result = await classifier.classifyGrant(minimalGrant);
      expect(result).toBeDefined();
      expect(result.category).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should handle grants with very long descriptions', async () => {
      const longDescription = 'healthcare medical clinical research '.repeat(100);
      const longGrant: ProcessedGrantData = {
        title: 'Healthcare Research Grant',
        description: longDescription,
        eligibilityCriteria: 'Medical institutions',
        funder: { name: 'Medical Foundation', type: 'FOUNDATION' as any },
        category: GrantCategory.HEALTHCARE_PUBLIC_HEALTH,
        locationEligibility: [],
        confidenceScore: 0,
        contentHash: 'long123'
      };

      const result = await classifier.classifyGrant(longGrant);
      expect(result).toBeDefined();
      expect(result.category).toBe(GrantCategory.HEALTHCARE_PUBLIC_HEALTH);
      expect(result.tags.length).toBeLessThanOrEqual(15);
    });

    it('should handle grants with special characters and HTML', async () => {
      const htmlGrant: ProcessedGrantData = {
        title: 'Healthcare & Medical Research Grant',
        description: '<p>This <strong>healthcare</strong> grant supports medical research & clinical trials.</p>',
        eligibilityCriteria: 'Medical institutions & hospitals',
        funder: { name: 'Medical Foundation', type: 'FOUNDATION' as any },
        category: GrantCategory.HEALTHCARE_PUBLIC_HEALTH,
        locationEligibility: [],
        confidenceScore: 0,
        contentHash: 'html123'
      };

      const result = await classifier.classifyGrant(htmlGrant);
      expect(result).toBeDefined();
      expect(result.category).toBe(GrantCategory.HEALTHCARE_PUBLIC_HEALTH);
    });
  });

  describe('Performance', () => {
    it('should classify grants within reasonable time', async () => {
      const grant: ProcessedGrantData = {
        title: 'Performance Test Grant',
        description: 'Testing classification performance with reasonable content length and complexity.',
        eligibilityCriteria: 'Various organizations',
        funder: { name: 'Test Foundation', type: 'FOUNDATION' as any },
        category: GrantCategory.COMMUNITY_DEVELOPMENT,
        locationEligibility: [],
        confidenceScore: 0,
        contentHash: 'perf123'
      };

      const startTime = Date.now();
      const result = await classifier.classifyGrant(grant);
      const endTime = Date.now();

      expect(result).toBeDefined();
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});