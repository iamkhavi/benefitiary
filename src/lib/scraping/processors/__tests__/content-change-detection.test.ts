/**
 * Integration tests for content change detection system
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Deduplicator, ContentHasher } from '../deduplicator';
import { ProcessedGrantData, GrantCategory, ScrapedSourceType, ContentChangeDetection } from '../../types';

describe('Content Change Detection Integration', () => {
  let deduplicator: Deduplicator;
  let contentHasher: ContentHasher;

  beforeEach(() => {
    deduplicator = new Deduplicator();
    contentHasher = new ContentHasher();
  });

  describe('End-to-end change detection workflow', () => {
    it('should detect and categorize critical changes', async () => {
      const originalGrant: ProcessedGrantData = createMockGrant({
        title: 'Medical Research Grant',
        description: 'Funding for medical research projects',
        deadline: new Date('2024-12-31'),
        fundingAmountMax: 100000,
        applicationUrl: 'https://foundation.org/apply/123'
      });

      const updatedGrant: ProcessedGrantData = createMockGrant({
        title: 'Medical Research Grant',
        description: 'Funding for medical research projects',
        deadline: new Date('2024-11-30'), // Deadline moved up - critical change
        fundingAmountMax: 75000, // Funding reduced - critical change
        applicationUrl: 'https://foundation.org/apply/456' // URL changed - critical change
      });

      const originalHash = contentHasher.generateHash(originalGrant);
      const updatedHash = contentHasher.generateHash(updatedGrant);

      const changeDetection = await deduplicator.compareHashes(
        'grant-123',
        originalHash,
        updatedHash,
        originalGrant,
        updatedGrant
      );

      expect(changeDetection).not.toBeNull();
      expect(changeDetection!.changeType).toBe('critical');
      expect(changeDetection!.changedFields).toContain('deadline');
      expect(changeDetection!.changedFields).toContain('fundingAmountMax');
      expect(changeDetection!.changedFields).toContain('applicationUrl');
    });

    it('should detect and categorize major changes', async () => {
      const originalGrant: ProcessedGrantData = createMockGrant({
        title: 'Research Grant',
        eligibilityCriteria: 'Open to universities',
        category: GrantCategory.RESEARCH_DEVELOPMENT,
        funder: { name: 'Science Foundation', type: ScrapedSourceType.FOUNDATION }
      });

      const updatedGrant: ProcessedGrantData = createMockGrant({
        title: 'Advanced Research Grant Program', // Title changed - major
        eligibilityCriteria: 'Open to universities and research institutions', // Eligibility expanded - major
        category: GrantCategory.TECHNOLOGY_INNOVATION, // Category changed - major
        funder: { name: 'National Science Foundation', type: ScrapedSourceType.GOV } // Funder changed - major
      });

      const originalHash = contentHasher.generateHash(originalGrant);
      const updatedHash = contentHasher.generateHash(updatedGrant);

      const changeDetection = await deduplicator.compareHashes(
        'grant-456',
        originalHash,
        updatedHash,
        originalGrant,
        updatedGrant
      );

      expect(changeDetection).not.toBeNull();
      expect(changeDetection!.changeType).toBe('major');
      expect(changeDetection!.changedFields).toContain('title');
      expect(changeDetection!.changedFields).toContain('eligibilityCriteria');
      expect(changeDetection!.changedFields).toContain('category');
      expect(changeDetection!.changedFields).toContain('funder');
    });

    it('should detect and categorize minor changes', async () => {
      const originalGrant: ProcessedGrantData = createMockGrant({
        title: 'Research Grant',
        description: 'Original description',
        locationEligibility: ['US']
      });

      const updatedGrant: ProcessedGrantData = createMockGrant({
        title: 'Research Grant',
        description: 'Updated description with more details', // Description changed - minor
        locationEligibility: ['US', 'CA'] // Location expanded - minor
      });

      const originalHash = contentHasher.generateHash(originalGrant);
      const updatedHash = contentHasher.generateHash(updatedGrant);

      const changeDetection = await deduplicator.compareHashes(
        'grant-789',
        originalHash,
        updatedHash,
        originalGrant,
        updatedGrant
      );

      expect(changeDetection).not.toBeNull();
      expect(changeDetection!.changeType).toBe('minor');
      expect(changeDetection!.changedFields).toContain('description');
      expect(changeDetection!.changedFields).toContain('locationEligibility');
    });

    it('should handle mixed change types correctly', async () => {
      const originalGrant: ProcessedGrantData = createMockGrant({
        title: 'Research Grant',
        description: 'Original description',
        deadline: new Date('2024-12-31'),
        fundingAmountMax: 100000
      });

      const updatedGrant: ProcessedGrantData = createMockGrant({
        title: 'Advanced Research Grant', // Major change
        description: 'Updated description', // Minor change
        deadline: new Date('2024-11-30'), // Critical change
        fundingAmountMax: 100000 // No change
      });

      const originalHash = contentHasher.generateHash(originalGrant);
      const updatedHash = contentHasher.generateHash(updatedGrant);

      const changeDetection = await deduplicator.compareHashes(
        'grant-mixed',
        originalHash,
        updatedHash,
        originalGrant,
        updatedGrant
      );

      expect(changeDetection).not.toBeNull();
      // Should be categorized as critical due to deadline change
      expect(changeDetection!.changeType).toBe('critical');
      expect(changeDetection!.changedFields).toContain('title');
      expect(changeDetection!.changedFields).toContain('description');
      expect(changeDetection!.changedFields).toContain('deadline');
      expect(changeDetection!.changedFields).not.toContain('fundingAmountMax');
    });
  });

  describe('Hash consistency and stability', () => {
    it('should generate consistent hashes across multiple calls', () => {
      const grant: ProcessedGrantData = createMockGrant({
        title: 'Consistent Grant',
        description: 'This should always generate the same hash'
      });

      const hash1 = contentHasher.generateHash(grant);
      const hash2 = contentHasher.generateHash(grant);
      const hash3 = contentHasher.generateHash(grant);

      expect(hash1).toBe(hash2);
      expect(hash2).toBe(hash3);
    });

    it('should be insensitive to field order in arrays', () => {
      const grant1: ProcessedGrantData = createMockGrant({
        locationEligibility: ['US', 'CA', 'MX']
      });

      const grant2: ProcessedGrantData = createMockGrant({
        locationEligibility: ['CA', 'MX', 'US']
      });

      const hash1 = contentHasher.generateHash(grant1);
      const hash2 = contentHasher.generateHash(grant2);

      expect(hash1).toBe(hash2);
    });

    it('should normalize whitespace and punctuation consistently', () => {
      const grant1: ProcessedGrantData = createMockGrant({
        title: 'Research Grant!!!',
        description: 'A   comprehensive   research   grant.'
      });

      const grant2: ProcessedGrantData = createMockGrant({
        title: 'research grant',
        description: 'a comprehensive research grant'
      });

      const hash1 = contentHasher.generateHash(grant1);
      const hash2 = contentHasher.generateHash(grant2);

      expect(hash1).toBe(hash2);
    });
  });

  describe('Duplicate detection with content changes', () => {
    it('should detect duplicates even with minor content changes', async () => {
      const existingGrant: ProcessedGrantData = createMockGrant({
        title: 'Medical Research Grant',
        funder: { name: 'Gates Foundation', type: ScrapedSourceType.FOUNDATION },
        deadline: new Date('2024-12-31'),
        fundingAmountMax: 100000
      });

      const newGrant: ProcessedGrantData = createMockGrant({
        title: 'Medical Research Grant Program', // Slightly different title
        funder: { name: 'Gates Foundation', type: ScrapedSourceType.FOUNDATION }, // Same funder for better match
        deadline: new Date('2024-12-29'), // Within 7 days for deadline match
        fundingAmountMax: 100000 // Same amount for better match
      });

      const matches = await deduplicator.findDuplicateMatches([newGrant], [existingGrant]);

      expect(matches).toHaveLength(1);
      expect(matches[0].matchScore).toBeGreaterThan(0.8);
    });

    it('should merge duplicates and update content hash', async () => {
      const existingGrant: ProcessedGrantData = createMockGrant({
        title: 'Short Title',
        description: 'Brief description',
        fundingAmountMax: 50000
      });

      const newGrant: ProcessedGrantData = createMockGrant({
        title: 'Much Longer and More Descriptive Title',
        description: 'Much more detailed description',
        fundingAmountMax: 75000
      });

      const merged = await deduplicator.mergeGrantData(existingGrant, newGrant);

      // Verify the merged grant has updated content
      expect(merged.title).toBe('Much Longer and More Descriptive Title');
      expect(merged.description).toBe('Much more detailed description');
      expect(merged.fundingAmountMax).toBe(75000);

      // Verify the content hash reflects the merged content
      const expectedHash = contentHasher.generateHash(merged);
      expect(merged.contentHash).toBe(expectedHash);
    });
  });

  describe('Performance and edge cases', () => {
    it('should handle large numbers of grants efficiently', async () => {
      const grants: ProcessedGrantData[] = [];
      for (let i = 0; i < 1000; i++) {
        grants.push(createMockGrant({
          title: `Grant ${i}`,
          description: `Description for grant ${i}`
        }));
      }

      const startTime = Date.now();
      const uniqueGrants = await deduplicator.detectDuplicates(grants);
      const endTime = Date.now();

      expect(uniqueGrants).toHaveLength(1000); // All unique
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle grants with missing or null fields', async () => {
      const grant1: ProcessedGrantData = createMockGrant({
        title: 'Grant with missing fields',
        description: '',
        deadline: undefined,
        fundingAmountMin: undefined,
        fundingAmountMax: undefined,
        applicationUrl: undefined,
        eligibilityCriteria: '',
        locationEligibility: []
      });

      const grant2: ProcessedGrantData = createMockGrant({
        title: 'Grant with missing fields',
        description: '',
        deadline: undefined,
        fundingAmountMin: undefined,
        fundingAmountMax: undefined,
        applicationUrl: undefined,
        eligibilityCriteria: '',
        locationEligibility: []
      });

      const hash1 = contentHasher.generateHash(grant1);
      const hash2 = contentHasher.generateHash(grant2);

      expect(hash1).toBe(hash2);

      const uniqueGrants = await deduplicator.detectDuplicates([grant1, grant2]);
      expect(uniqueGrants).toHaveLength(1);
    });

    it('should handle very long text fields', async () => {
      const longDescription = 'A'.repeat(10000); // 10KB description
      
      const grant: ProcessedGrantData = createMockGrant({
        description: longDescription
      });

      const hash = contentHasher.generateHash(grant);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);

      const uniqueGrants = await deduplicator.detectDuplicates([grant]);
      expect(uniqueGrants).toHaveLength(1);
    });

    it('should handle special characters and unicode', async () => {
      const grant1: ProcessedGrantData = createMockGrant({
        title: 'Beca de Investigación Médica',
        description: 'Financiamiento para proyectos de investigación médica en español',
        funder: { name: 'Fundación García-López', type: ScrapedSourceType.FOUNDATION }
      });

      const grant2: ProcessedGrantData = createMockGrant({
        title: 'Beca de Investigación Médica',
        description: 'Financiamiento para proyectos de investigación médica en español',
        funder: { name: 'Fundación García-López', type: ScrapedSourceType.FOUNDATION }
      });

      const hash1 = contentHasher.generateHash(grant1);
      const hash2 = contentHasher.generateHash(grant2);

      expect(hash1).toBe(hash2);
    });
  });
});

// Helper function to create mock grants
function createMockGrant(overrides: Partial<ProcessedGrantData> = {}): ProcessedGrantData {
  return {
    title: 'Default Grant Title',
    description: 'Default grant description',
    deadline: new Date('2024-12-31'),
    fundingAmountMin: 10000,
    fundingAmountMax: 50000,
    eligibilityCriteria: 'Default eligibility criteria',
    applicationUrl: 'https://example.com/apply',
    funder: {
      name: 'Default Foundation',
      website: 'https://example.com',
      contactEmail: 'info@example.com',
      type: ScrapedSourceType.FOUNDATION
    },
    category: GrantCategory.RESEARCH_DEVELOPMENT,
    locationEligibility: ['US'],
    confidenceScore: 0.8,
    contentHash: 'default-hash',
    ...overrides
  };
}