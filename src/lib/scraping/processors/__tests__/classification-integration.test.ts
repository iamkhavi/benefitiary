/**
 * Integration tests for classification system with data processing pipeline
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ClassificationEngine } from '../classifier';
import { DataProcessor } from '../data-processor';
import { RawGrantData, GrantCategory } from '../../types';

describe('Classification Integration', () => {
  let classifier: ClassificationEngine;
  let processor: DataProcessor;

  beforeEach(() => {
    classifier = new ClassificationEngine();
    processor = new DataProcessor();
  });

  it('should integrate classification with data processing pipeline', async () => {
    const rawGrant: RawGrantData = {
      title: 'Healthcare Innovation Research Grant',
      description: 'This grant supports medical research and clinical trials for innovative healthcare solutions, focusing on patient outcomes and therapeutic interventions.',
      deadline: '2024-12-31',
      fundingAmount: '$100,000 - $500,000',
      eligibilityCriteria: 'Medical institutions, hospitals, and healthcare research organizations',
      applicationUrl: 'https://example.com/apply',
      funderName: 'Medical Research Foundation',
      sourceUrl: 'https://example.com/grant',
      scrapedAt: new Date(),
      rawContent: {}
    };

    // Process raw data
    const processingResult = await processor.processGrant(rawGrant);
    
    // Classify the processed grant
    const classificationResult = await classifier.classifyGrant(processingResult.data);

    // Verify integration
    expect(classificationResult.category).toBe(GrantCategory.HEALTHCARE_PUBLIC_HEALTH);
    expect(classificationResult.confidence).toBeGreaterThan(0.7);
    expect(classificationResult.tags).toContain('medium-grant');
    expect(classificationResult.reasoning.length).toBeGreaterThan(0);
    expect(classificationResult.reasoning.some(r => /healthcare|medical|clinical/i.test(r))).toBe(true);
  });

  it('should handle classification of grants with various funding amounts', async () => {
    const testCases = [
      { amount: '$25,000', expectedTag: 'small-grant' },
      { amount: '$250,000', expectedTag: 'medium-grant' },
      { amount: '$2,500,000', expectedTag: 'large-grant' }
    ];

    for (const testCase of testCases) {
      const rawGrant: RawGrantData = {
        title: 'Test Grant',
        description: 'Test grant for funding amount classification',
        fundingAmount: testCase.amount,
        eligibilityCriteria: 'Test organizations',
        funderName: 'Test Foundation',
        sourceUrl: 'https://example.com/grant',
        scrapedAt: new Date(),
        rawContent: {}
      };

      const processingResult = await processor.processGrant(rawGrant);
      const classificationResult = await classifier.classifyGrant(processingResult.data);

      expect(classificationResult.tags).toContain(testCase.expectedTag);
    }
  });

  it('should classify grants with location eligibility', async () => {
    const rawGrant: RawGrantData = {
      title: 'California Environmental Grant',
      description: 'Environmental sustainability grant for organizations in California, Nevada, and Oregon.',
      eligibilityCriteria: 'Organizations must be located in California, Nevada, or Oregon',
      funderName: 'West Coast Environmental Foundation',
      sourceUrl: 'https://example.com/grant',
      scrapedAt: new Date(),
      rawContent: {}
    };

    const processingResult = await processor.processGrant(rawGrant);
    const classificationResult = await classifier.classifyGrant(processingResult.data);

    expect(classificationResult.category).toBe(GrantCategory.ENVIRONMENT_SUSTAINABILITY);
    expect(classificationResult.reasoning.some(r => /location restrictions/i.test(r))).toBe(true);
  });

  it('should handle edge cases in classification pipeline', async () => {
    const rawGrant: RawGrantData = {
      title: '',
      description: '',
      eligibilityCriteria: '',
      funderName: 'Unknown Foundation',
      sourceUrl: 'https://example.com/grant',
      scrapedAt: new Date(),
      rawContent: {}
    };

    const processingResult = await processor.processGrant(rawGrant);
    const classificationResult = await classifier.classifyGrant(processingResult.data);

    // Should handle empty data gracefully
    expect(classificationResult).toBeDefined();
    expect(classificationResult.category).toBeDefined();
    expect(classificationResult.confidence).toBeGreaterThan(0);
    expect(Array.isArray(classificationResult.tags)).toBe(true);
    expect(Array.isArray(classificationResult.reasoning)).toBe(true);
  });
});