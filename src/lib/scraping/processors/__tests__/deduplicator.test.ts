/**
 * Tests for duplicate detection and content change detection
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Deduplicator, ContentHasher, DuplicateMatch } from '../deduplicator';
import { ProcessedGrantData, GrantCategory, ScrapedSourceType } from '../../types';

describe('ContentHasher', () => {
  let contentHasher: ContentHasher;

  beforeEach(() => {
    contentHasher = new ContentHasher();
  });

  describe('generateHash', () => {
    it('should generate consistent hashes for identical grants', () => {
      const grant1: ProcessedGrantData = createMockGrant({
        title: 'Test Grant',
        description: 'A test grant for research',
        deadline: new Date('2024-12-31'),
        fundingAmountMin: 10000,
        fundingAmountMax: 50000
      });

      const grant2: ProcessedGrantData = createMockGrant({
        title: 'Test Grant',
        description: 'A test grant for research',
        deadline: new Date('2024-12-31'),
        fundingAmountMin: 10000,
        fundingAmountMax: 50000
      });

      const hash1 = contentHasher.generateHash(grant1);
      const hash2 = contentHasher.generateHash(grant2);

      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex format
    });

    it('should generate different hashes for different grants', () => {
      const grant1: ProcessedGrantData = createMockGrant({
        title: 'Test Grant 1',
        description: 'First test grant'
      });

      const grant2: ProcessedGrantData = createMockGrant({
        title: 'Test Grant 2',
        description: 'Second test grant'
      });

      const hash1 = contentHasher.generateHash(grant1);
      const hash2 = contentHasher.generateHash(grant2);

      expect(hash1).not.toBe(hash2);
    });

    it('should normalize text consistently', () => {
      const grant1: ProcessedGrantData = createMockGrant({
        title: 'Test Grant!!!',
        description: 'A   test   grant   for research.'
      });

      const grant2: ProcessedGrantData = createMockGrant({
        title: 'test grant',
        description: 'a test grant for research'
      });

      const hash1 = contentHasher.generateHash(grant1);
      const hash2 = contentHasher.generateHash(grant2);

      expect(hash1).toBe(hash2);
    });

    it('should handle missing optional fields', () => {
      const grant: ProcessedGrantData = createMockGrant({
        title: 'Test Grant',
        description: 'A test grant',
        deadline: undefined,
        fundingAmountMin: undefined,
        fundingAmountMax: undefined,
        applicationUrl: undefined
      });

      const hash = contentHasher.generateHash(grant);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('generateDuplicateHash', () => {
    it('should generate less sensitive hashes for duplicate detection', () => {
      const grant1: ProcessedGrantData = createMockGrant({
        title: 'Research Grant for Medical Innovation',
        funder: { name: 'Gates Foundation', type: ScrapedSourceType.FOUNDATION },
        deadline: new Date('2024-12-31T23:59:59Z'),
        fundingAmountMin: 10000,
        fundingAmountMax: 50000
      });

      const grant2: ProcessedGrantData = createMockGrant({
        title: 'Research Grant for Medical Innovation!!!',
        funder: { name: 'The Gates Foundation Inc.', type: ScrapedSourceType.FOUNDATION },
        deadline: new Date('2024-12-31T12:00:00Z'), // Same day, different time
        fundingAmountMin: 10000,
        fundingAmountMax: 50000
      });

      const hash1 = contentHasher.generateDuplicateHash(grant1);
      const hash2 = contentHasher.generateDuplicateHash(grant2);

      expect(hash1).toBe(hash2);
    });

    it('should normalize funding ranges consistently', () => {
      const grant1: ProcessedGrantData = createMockGrant({
        title: 'Same Grant Title',
        funder: { name: 'Same Foundation', type: ScrapedSourceType.FOUNDATION },
        deadline: new Date('2024-12-31'),
        fundingAmountMin: 10000,
        fundingAmountMax: 50000
      });

      const grant2: ProcessedGrantData = createMockGrant({
        title: 'Same Grant Title',
        funder: { name: 'Same Foundation', type: ScrapedSourceType.FOUNDATION },
        deadline: new Date('2024-12-31'),
        fundingAmountMin: 10000, // Exact same amounts
        fundingAmountMax: 50000  // Exact same amounts
      });

      const hash1 = contentHasher.generateDuplicateHash(grant1);
      const hash2 = contentHasher.generateDuplicateHash(grant2);

      expect(hash1).toBe(hash2); // Should be identical
    });

    it('should generate different hashes for truly different grants', () => {
      const grant1: ProcessedGrantData = createMockGrant({
        title: 'Medical Research Grant',
        funder: { name: 'Gates Foundation', type: ScrapedSourceType.FOUNDATION }
      });

      const grant2: ProcessedGrantData = createMockGrant({
        title: 'Education Grant',
        funder: { name: 'Ford Foundation', type: ScrapedSourceType.FOUNDATION }
      });

      const hash1 = contentHasher.generateDuplicateHash(grant1);
      const hash2 = contentHasher.generateDuplicateHash(grant2);

      expect(hash1).not.toBe(hash2);
    });
  });
});

describe('Deduplicator', () => {
  let deduplicator: Deduplicator;

  beforeEach(() => {
    deduplicator = new Deduplicator();
  });

  describe('detectDuplicates', () => {
    it('should remove exact duplicates from grant list', async () => {
      const grant1: ProcessedGrantData = createMockGrant({
        title: 'Test Grant',
        funder: { name: 'Test Foundation', type: ScrapedSourceType.FOUNDATION }
      });

      const grant2: ProcessedGrantData = createMockGrant({
        title: 'Test Grant',
        funder: { name: 'Test Foundation', type: ScrapedSourceType.FOUNDATION }
      });

      const grant3: ProcessedGrantData = createMockGrant({
        title: 'Different Grant',
        funder: { name: 'Other Foundation', type: ScrapedSourceType.FOUNDATION }
      });

      const grants = [grant1, grant2, grant3];
      const uniqueGrants = await deduplicator.detectDuplicates(grants);

      expect(uniqueGrants).toHaveLength(2);
      expect(uniqueGrants.map(g => g.title)).toContain('Test Grant');
      expect(uniqueGrants.map(g => g.title)).toContain('Different Grant');
    });

    it('should handle empty grant list', async () => {
      const uniqueGrants = await deduplicator.detectDuplicates([]);
      expect(uniqueGrants).toHaveLength(0);
    });

    it('should preserve grants with no duplicates', async () => {
      const grants = [
        createMockGrant({ title: 'Grant 1' }),
        createMockGrant({ title: 'Grant 2' }),
        createMockGrant({ title: 'Grant 3' })
      ];

      const uniqueGrants = await deduplicator.detectDuplicates(grants);
      expect(uniqueGrants).toHaveLength(3);
    });
  });

  describe('findDuplicateMatches', () => {
    it('should find high similarity matches', async () => {
      const existingGrant: ProcessedGrantData = createMockGrant({
        title: 'Medical Research Grant',
        funder: { name: 'Gates Foundation', type: ScrapedSourceType.FOUNDATION },
        deadline: new Date('2024-12-31'),
        fundingAmountMax: 100000
      });

      const newGrant: ProcessedGrantData = createMockGrant({
        title: 'Medical Research Grant Program',
        funder: { name: 'Gates Foundation', type: ScrapedSourceType.FOUNDATION },
        deadline: new Date('2024-12-30'),
        fundingAmountMax: 100000
      });

      const matches = await deduplicator.findDuplicateMatches([newGrant], [existingGrant]);

      expect(matches).toHaveLength(1);
      expect(matches[0].matchScore).toBeGreaterThan(0.8);
      expect(matches[0].matchReasons).toContain('Same funder');
      expect(matches[0].matchReasons).toContain('Similar deadline');
    });

    it('should not match dissimilar grants', async () => {
      const existingGrant: ProcessedGrantData = createMockGrant({
        title: 'Medical Research Grant',
        funder: { name: 'Gates Foundation', type: ScrapedSourceType.FOUNDATION }
      });

      const newGrant: ProcessedGrantData = createMockGrant({
        title: 'Arts Education Program',
        funder: { name: 'Ford Foundation', type: ScrapedSourceType.FOUNDATION }
      });

      const matches = await deduplicator.findDuplicateMatches([newGrant], [existingGrant]);

      expect(matches).toHaveLength(0);
    });

    it('should handle multiple potential matches', async () => {
      const existingGrants = [
        createMockGrant({ 
          title: 'Research Grant A',
          funder: { name: 'Foundation A', type: ScrapedSourceType.FOUNDATION }
        }),
        createMockGrant({ 
          title: 'Research Grant B',
          funder: { name: 'Foundation B', type: ScrapedSourceType.FOUNDATION }
        })
      ];

      const newGrant: ProcessedGrantData = createMockGrant({
        title: 'Research Grant A Program',
        funder: { name: 'Foundation A', type: ScrapedSourceType.FOUNDATION }
      });

      const matches = await deduplicator.findDuplicateMatches([newGrant], existingGrants);

      expect(matches).toHaveLength(1);
      expect(matches[0].existingGrant.title).toBe('Research Grant A');
    });
  });

  describe('compareHashes', () => {
    it('should return null for identical hashes', async () => {
      const hash = 'abc123';
      const result = await deduplicator.compareHashes('grant-1', hash, hash);
      
      expect(result).toBeNull();
    });

    it('should detect changes when hashes differ', async () => {
      const oldGrant: ProcessedGrantData = createMockGrant({
        title: 'Original Title',
        description: 'Original description'
      });

      const newGrant: ProcessedGrantData = createMockGrant({
        title: 'Updated Title',
        description: 'Original description'
      });

      const result = await deduplicator.compareHashes(
        'grant-1',
        'old-hash',
        'new-hash',
        oldGrant,
        newGrant
      );

      expect(result).not.toBeNull();
      expect(result!.grantId).toBe('grant-1');
      expect(result!.previousHash).toBe('old-hash');
      expect(result!.currentHash).toBe('new-hash');
      expect(result!.changedFields).toContain('title');
      expect(result!.changeType).toBe('major');
    });
  });

  describe('identifyChangedFields', () => {
    it('should identify changed title', async () => {
      const oldGrant: ProcessedGrantData = createMockGrant({ title: 'Old Title' });
      const newGrant: ProcessedGrantData = createMockGrant({ title: 'New Title' });

      const changedFields = await deduplicator.identifyChangedFields(oldGrant, newGrant);

      expect(changedFields).toContain('title');
    });

    it('should identify changed deadline', async () => {
      const oldGrant: ProcessedGrantData = createMockGrant({ 
        deadline: new Date('2024-12-31') 
      });
      const newGrant: ProcessedGrantData = createMockGrant({ 
        deadline: new Date('2025-01-15') 
      });

      const changedFields = await deduplicator.identifyChangedFields(oldGrant, newGrant);

      expect(changedFields).toContain('deadline');
    });

    it('should identify changed funding amounts', async () => {
      const oldGrant: ProcessedGrantData = createMockGrant({ 
        fundingAmountMin: 10000,
        fundingAmountMax: 50000
      });
      const newGrant: ProcessedGrantData = createMockGrant({ 
        fundingAmountMin: 15000,
        fundingAmountMax: 75000
      });

      const changedFields = await deduplicator.identifyChangedFields(oldGrant, newGrant);

      expect(changedFields).toContain('fundingAmountMin');
      expect(changedFields).toContain('fundingAmountMax');
    });

    it('should identify changed location eligibility', async () => {
      const oldGrant: ProcessedGrantData = createMockGrant({ 
        locationEligibility: ['US', 'CA'] 
      });
      const newGrant: ProcessedGrantData = createMockGrant({ 
        locationEligibility: ['US', 'CA', 'MX'] 
      });

      const changedFields = await deduplicator.identifyChangedFields(oldGrant, newGrant);

      expect(changedFields).toContain('locationEligibility');
    });

    it('should return empty array for identical grants', async () => {
      const grant1: ProcessedGrantData = createMockGrant({ title: 'Same Grant' });
      const grant2: ProcessedGrantData = createMockGrant({ title: 'Same Grant' });

      const changedFields = await deduplicator.identifyChangedFields(grant1, grant2);

      expect(changedFields).toHaveLength(0);
    });
  });

  describe('mergeGrantData', () => {
    it('should merge grants intelligently', async () => {
      const existingGrant: ProcessedGrantData = createMockGrant({
        title: 'Short Title',
        description: 'Brief description',
        fundingAmountMax: 50000,
        confidenceScore: 0.8,
        locationEligibility: ['US']
      });

      const newGrant: ProcessedGrantData = createMockGrant({
        title: 'Much Longer and More Descriptive Title',
        description: 'Much more detailed and comprehensive description of the grant program',
        fundingAmountMax: 75000,
        confidenceScore: 0.9,
        locationEligibility: ['US', 'CA']
      });

      const merged = await deduplicator.mergeGrantData(existingGrant, newGrant);

      expect(merged.title).toBe('Much Longer and More Descriptive Title');
      expect(merged.description).toBe('Much more detailed and comprehensive description of the grant program');
      expect(merged.fundingAmountMax).toBe(75000);
      expect(merged.confidenceScore).toBe(0.9);
      expect(merged.locationEligibility.sort()).toEqual(['CA', 'US']);
    });

    it('should prefer later deadlines', async () => {
      const existingGrant: ProcessedGrantData = createMockGrant({
        deadline: new Date('2024-12-31')
      });

      const newGrant: ProcessedGrantData = createMockGrant({
        deadline: new Date('2025-01-15')
      });

      const merged = await deduplicator.mergeGrantData(existingGrant, newGrant);

      expect(merged.deadline).toEqual(new Date('2025-01-15'));
    });

    it('should merge funder data completely', async () => {
      const existingGrant: ProcessedGrantData = createMockGrant({
        funder: {
          name: 'Gates Foundation',
          website: 'https://gatesfoundation.org',
          type: ScrapedSourceType.FOUNDATION
        }
      });

      const newGrant: ProcessedGrantData = createMockGrant({
        funder: {
          name: 'Bill & Melinda Gates Foundation',
          contactEmail: 'info@gatesfoundation.org',
          type: ScrapedSourceType.FOUNDATION
        }
      });

      const merged = await deduplicator.mergeGrantData(existingGrant, newGrant);

      expect(merged.funder.name).toBe('Bill & Melinda Gates Foundation');
      expect(merged.funder.website).toBe('https://gatesfoundation.org');
      expect(merged.funder.contactEmail).toBe('info@gatesfoundation.org');
    });

    it('should prefer government URLs', async () => {
      const existingGrant: ProcessedGrantData = createMockGrant({
        applicationUrl: 'https://grants.gov/apply/123',
        funder: { name: 'NIH', type: ScrapedSourceType.GOV }
      });

      const newGrant: ProcessedGrantData = createMockGrant({
        applicationUrl: 'https://thirdparty.com/apply/123',
        funder: { name: 'NIH', type: ScrapedSourceType.FOUNDATION }
      });

      const merged = await deduplicator.mergeGrantData(existingGrant, newGrant);

      expect(merged.applicationUrl).toBe('https://grants.gov/apply/123');
    });
  });

  describe('generateContentHash', () => {
    it('should generate content hash using ContentHasher', async () => {
      const grant: ProcessedGrantData = createMockGrant({
        title: 'Test Grant'
      });

      const hash = await deduplicator.generateContentHash(grant);

      expect(hash).toMatch(/^[a-f0-9]{64}$/);
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