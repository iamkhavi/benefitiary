/**
 * Tests for ContentHasher class
 */

import { describe, it, expect } from 'vitest';
import { ContentHasher } from '../content-hasher';
import { ProcessedGrantData, GrantCategory, ScrapedSourceType } from '../../types';

describe('ContentHasher', () => {
  let contentHasher: ContentHasher;

  beforeEach(() => {
    contentHasher = new ContentHasher();
  });

  describe('generateHash', () => {
    it('should generate consistent hashes for identical grants', () => {
      const grant1 = createMockGrant('Test Grant');
      const grant2 = createMockGrant('Test Grant');

      const hash1 = contentHasher.generateHash(grant1);
      const hash2 = contentHasher.generateHash(grant2);

      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/); // SHA-256 format
    });

    it('should generate different hashes for different grants', () => {
      const grant1 = createMockGrant('Grant One');
      const grant2 = createMockGrant('Grant Two');

      const hash1 = contentHasher.generateHash(grant1);
      const hash2 = contentHasher.generateHash(grant2);

      expect(hash1).not.toBe(hash2);
    });

    it('should generate same hash regardless of locationEligibility order', () => {
      const grant1 = createMockGrant('Test Grant');
      grant1.locationEligibility = ['US', 'CA', 'UK'];

      const grant2 = createMockGrant('Test Grant');
      grant2.locationEligibility = ['CA', 'UK', 'US'];

      const hash1 = contentHasher.generateHash(grant1);
      const hash2 = contentHasher.generateHash(grant2);

      expect(hash1).toBe(hash2);
    });

    it('should normalize text content for consistent hashing', () => {
      const grant1 = createMockGrant('Test Grant');
      grant1.title = '  Test   Grant  ';
      grant1.description = 'This is a test description.';

      const grant2 = createMockGrant('Test Grant');
      grant2.title = 'test grant';
      grant2.description = 'this is a test description';

      const hash1 = contentHasher.generateHash(grant1);
      const hash2 = contentHasher.generateHash(grant2);

      expect(hash1).toBe(hash2);
    });

    it('should handle null/undefined values consistently', () => {
      const grant1 = createMockGrant('Test Grant');
      grant1.deadline = undefined;
      grant1.fundingAmountMin = undefined;
      grant1.applicationUrl = undefined;

      const grant2 = createMockGrant('Test Grant');
      grant2.deadline = undefined;
      grant2.fundingAmountMin = undefined;
      grant2.applicationUrl = undefined;

      const hash1 = contentHasher.generateHash(grant1);
      const hash2 = contentHasher.generateHash(grant2);

      expect(hash1).toBe(hash2);
    });
  });

  describe('compareHashes', () => {
    it('should detect no changes when hashes are identical', () => {
      const hash = 'abc123def456';
      const comparison = contentHasher.compareHashes(hash, hash);

      expect(comparison.previousHash).toBe(hash);
      expect(comparison.currentHash).toBe(hash);
      expect(comparison.changedFields).toHaveLength(0);
      expect(comparison.changeType).toBe('minor');
    });

    it('should detect changes when hashes differ', () => {
      const oldHash = 'abc123def456';
      const newHash = 'xyz789uvw012';
      
      const comparison = contentHasher.compareHashes(oldHash, newHash);

      expect(comparison.previousHash).toBe(oldHash);
      expect(comparison.currentHash).toBe(newHash);
      expect(comparison.changedFields).toEqual(['unknown']);
      expect(comparison.changeType).toBe('major');
    });

    it('should identify specific changed fields when grant objects provided', () => {
      const oldGrant = createMockGrant('Old Grant');
      const newGrant = createMockGrant('New Grant');
      newGrant.deadline = new Date('2025-01-01');
      newGrant.fundingAmountMax = 75000;

      const oldHash = contentHasher.generateHash(oldGrant);
      const newHash = contentHasher.generateHash(newGrant);

      const comparison = contentHasher.compareHashes(
        oldHash,
        newHash,
        oldGrant,
        newGrant
      );

      expect(comparison.changedFields).toContain('title');
      expect(comparison.changedFields).toContain('deadline');
      expect(comparison.changedFields).toContain('fundingAmountMax');
    });
  });

  describe('identifyChangedFields', () => {
    it('should identify title changes', () => {
      const oldGrant = createMockGrant('Old Title');
      const newGrant = createMockGrant('New Title');

      const changedFields = contentHasher.identifyChangedFields(oldGrant, newGrant);

      expect(changedFields).toContain('title');
    });

    it('should identify deadline changes', () => {
      const oldGrant = createMockGrant('Test Grant');
      oldGrant.deadline = new Date('2024-12-31');

      const newGrant = createMockGrant('Test Grant');
      newGrant.deadline = new Date('2025-01-31');

      const changedFields = contentHasher.identifyChangedFields(oldGrant, newGrant);

      expect(changedFields).toContain('deadline');
    });

    it('should identify funding amount changes', () => {
      const oldGrant = createMockGrant('Test Grant');
      oldGrant.fundingAmountMin = 10000;
      oldGrant.fundingAmountMax = 50000;

      const newGrant = createMockGrant('Test Grant');
      newGrant.fundingAmountMin = 15000;
      newGrant.fundingAmountMax = 75000;

      const changedFields = contentHasher.identifyChangedFields(oldGrant, newGrant);

      expect(changedFields).toContain('fundingAmountMin');
      expect(changedFields).toContain('fundingAmountMax');
    });

    it('should identify location eligibility changes', () => {
      const oldGrant = createMockGrant('Test Grant');
      oldGrant.locationEligibility = ['US', 'CA'];

      const newGrant = createMockGrant('Test Grant');
      newGrant.locationEligibility = ['US', 'UK', 'AU'];

      const changedFields = contentHasher.identifyChangedFields(oldGrant, newGrant);

      expect(changedFields).toContain('locationEligibility');
    });

    it('should identify funder changes', () => {
      const oldGrant = createMockGrant('Test Grant');
      oldGrant.funder.name = 'Old Foundation';

      const newGrant = createMockGrant('Test Grant');
      newGrant.funder.name = 'New Foundation';

      const changedFields = contentHasher.identifyChangedFields(oldGrant, newGrant);

      expect(changedFields).toContain('funder');
    });

    it('should not identify changes in identical grants', () => {
      const grant1 = createMockGrant('Test Grant');
      const grant2 = createMockGrant('Test Grant');

      const changedFields = contentHasher.identifyChangedFields(grant1, grant2);

      expect(changedFields).toHaveLength(0);
    });

    it('should handle null/undefined date comparisons', () => {
      const oldGrant = createMockGrant('Test Grant');
      oldGrant.deadline = undefined;

      const newGrant = createMockGrant('Test Grant');
      newGrant.deadline = new Date('2024-12-31');

      const changedFields = contentHasher.identifyChangedFields(oldGrant, newGrant);

      expect(changedFields).toContain('deadline');
    });
  });

  describe('generateQuickHash', () => {
    it('should generate consistent quick hashes', () => {
      const hash1 = contentHasher.generateQuickHash('Test Grant', 'Test Foundation');
      const hash2 = contentHasher.generateQuickHash('Test Grant', 'Test Foundation');

      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{32}$/); // MD5 format
    });

    it('should normalize text for quick hashing', () => {
      const hash1 = contentHasher.generateQuickHash('  Test Grant  ', '  Test Foundation  ');
      const hash2 = contentHasher.generateQuickHash('test grant', 'test foundation');

      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different inputs', () => {
      const hash1 = contentHasher.generateQuickHash('Grant A', 'Foundation A');
      const hash2 = contentHasher.generateQuickHash('Grant B', 'Foundation B');

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('generateFieldHash', () => {
    it('should generate hash for specific fields only', () => {
      const grant = createMockGrant('Test Grant');
      
      const titleHash = contentHasher.generateFieldHash(grant, ['title']);
      const titleDescHash = contentHasher.generateFieldHash(grant, ['title', 'description']);

      expect(titleHash).not.toBe(titleDescHash);
      expect(titleHash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should handle funding amount field grouping', () => {
      const grant = createMockGrant('Test Grant');
      
      const fundingHash = contentHasher.generateFieldHash(grant, ['fundingAmount']);
      
      expect(fundingHash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should handle unknown fields gracefully', () => {
      const grant = createMockGrant('Test Grant');
      
      const hash = contentHasher.generateFieldHash(grant, ['unknownField']);
      
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('isValidHash', () => {
    it('should validate correct SHA-256 hash format', () => {
      const validHash = 'a'.repeat(64);
      expect(contentHasher.isValidHash(validHash)).toBe(true);
    });

    it('should reject invalid hash formats', () => {
      expect(contentHasher.isValidHash('invalid')).toBe(false);
      expect(contentHasher.isValidHash('a'.repeat(63))).toBe(false);
      expect(contentHasher.isValidHash('a'.repeat(65))).toBe(false);
      expect(contentHasher.isValidHash('g'.repeat(64))).toBe(false); // Invalid hex character
    });

    it('should handle empty or null inputs', () => {
      expect(contentHasher.isValidHash('')).toBe(false);
      expect(contentHasher.isValidHash(null as any)).toBe(false);
      expect(contentHasher.isValidHash(undefined as any)).toBe(false);
    });
  });

  describe('generateVersionedHash', () => {
    it('should generate versioned hash with timestamp', () => {
      const grant = createMockGrant('Test Grant');
      const timestamp = new Date('2024-01-01T00:00:00Z');

      const versionedHash = contentHasher.generateVersionedHash(grant, timestamp);

      expect(versionedHash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should generate different hashes for different timestamps', () => {
      const grant = createMockGrant('Test Grant');
      const timestamp1 = new Date('2024-01-01T00:00:00Z');
      const timestamp2 = new Date('2024-01-02T00:00:00Z');

      const hash1 = contentHasher.generateVersionedHash(grant, timestamp1);
      const hash2 = contentHasher.generateVersionedHash(grant, timestamp2);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('change type determination', () => {
    it('should classify critical changes correctly', () => {
      const oldGrant = createMockGrant('Test Grant');
      const newGrant = createMockGrant('Test Grant');
      newGrant.deadline = new Date('2025-01-01');

      const oldHash = contentHasher.generateHash(oldGrant);
      const newHash = contentHasher.generateHash(newGrant);

      const comparison = contentHasher.compareHashes(
        oldHash,
        newHash,
        oldGrant,
        newGrant
      );

      expect(comparison.changeType).toBe('critical');
    });

    it('should classify major changes correctly', () => {
      const oldGrant = createMockGrant('Old Title');
      const newGrant = createMockGrant('New Title');

      const oldHash = contentHasher.generateHash(oldGrant);
      const newHash = contentHasher.generateHash(newGrant);

      const comparison = contentHasher.compareHashes(
        oldHash,
        newHash,
        oldGrant,
        newGrant
      );

      expect(comparison.changeType).toBe('major');
    });

    it('should classify minor changes correctly', () => {
      const oldGrant = createMockGrant('Test Grant');
      const newGrant = createMockGrant('Test Grant');
      newGrant.locationEligibility = ['US', 'CA', 'UK']; // Minor metadata change

      const oldHash = contentHasher.generateHash(oldGrant);
      const newHash = contentHasher.generateHash(newGrant);

      const comparison = contentHasher.compareHashes(
        oldHash,
        newHash,
        oldGrant,
        newGrant
      );

      expect(comparison.changeType).toBe('minor');
    });
  });
});

// Helper function to create mock grant data
function createMockGrant(title: string): ProcessedGrantData {
  return {
    title,
    description: `Description for ${title}`,
    deadline: new Date('2024-12-31'),
    fundingAmountMin: 10000,
    fundingAmountMax: 50000,
    eligibilityCriteria: 'Test eligibility criteria',
    applicationUrl: 'https://example.com/apply',
    category: GrantCategory.HEALTHCARE_PUBLIC_HEALTH,
    locationEligibility: ['US', 'CA'],
    confidenceScore: 0.95,
    contentHash: '',
    funder: {
      name: 'Test Foundation',
      website: 'https://testfoundation.org',
      contactEmail: 'grants@testfoundation.org',
      type: ScrapedSourceType.FOUNDATION
    }
  };
}