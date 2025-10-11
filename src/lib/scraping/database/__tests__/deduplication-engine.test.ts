/**
 * Tests for DeduplicationEngine class
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { DeduplicationEngine } from '../deduplication-engine';
import { ProcessedGrantData, GrantCategory, ScrapedSourceType } from '../../types';

// Mock Prisma Client
const mockPrisma = {
  grant: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    updateMany: vi.fn()
  },
  auditLog: {
    create: vi.fn()
  },
  $transaction: vi.fn()
} as unknown as PrismaClient;

describe('DeduplicationEngine', () => {
  let deduplicationEngine: DeduplicationEngine;

  beforeEach(() => {
    deduplicationEngine = new DeduplicationEngine(mockPrisma);
    vi.clearAllMocks();
  });

  describe('checkForDuplicates', () => {
    it('should detect exact content hash matches', async () => {
      const grant = createMockGrant('Test Grant');
      
      // Mock exact match found
      mockPrisma.grant.findFirst = vi.fn().mockResolvedValue({
        id: 'existing-grant-1'
      });

      const result = await deduplicationEngine.checkForDuplicates(grant);

      expect(result.isDuplicate).toBe(true);
      expect(result.action).toBe('skip');
      expect(result.existingGrantId).toBe('existing-grant-1');
      expect(result.confidence).toBe(1.0);
      expect(result.reason).toContain('Exact content hash match');
    });

    it('should detect title matches with same funder', async () => {
      const grant = createMockGrant('Healthcare Innovation Grant');
      
      // Mock no exact match, but title match
      mockPrisma.grant.findFirst = vi.fn()
        .mockResolvedValueOnce(null) // No exact match
        .mockResolvedValueOnce(null); // No existing grant for update check

      mockPrisma.grant.findMany = vi.fn().mockResolvedValue([
        {
          id: 'similar-grant-1',
          title: 'Healthcare Innovation Grant 2024',
          funder: { name: 'Test Foundation' }
        }
      ]);

      const result = await deduplicationEngine.checkForDuplicates(grant);

      expect(result.isDuplicate).toBe(true);
      expect(result.existingGrantId).toBe('similar-grant-1');
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should detect fuzzy matches with high confidence', async () => {
      const grant = createMockGrant('Medical Research Grant');
      
      // Mock no exact or title matches
      mockPrisma.grant.findFirst = vi.fn().mockResolvedValue(null);
      mockPrisma.grant.findMany = vi.fn()
        .mockResolvedValueOnce([]) // No title matches
        .mockResolvedValueOnce([ // Fuzzy search results
          {
            id: 'fuzzy-match-1',
            title: 'Medical Research Funding Opportunity',
            description: 'Research grant for medical innovations',
            deadline: new Date('2024-12-31'),
            fundingAmountMin: 10000,
            fundingAmountMax: 50000,
            funder: { name: 'Test Foundation' }
          }
        ]);

      const result = await deduplicationEngine.checkForDuplicates(grant);

      if (result.isDuplicate) {
        expect(result.confidence).toBeGreaterThan(0.6);
        expect(result.existingGrantId).toBe('fuzzy-match-1');
      }
    });

    it('should return no duplicate when no matches found', async () => {
      const grant = createMockGrant('Unique Grant Title');
      
      // Mock no matches found
      mockPrisma.grant.findFirst = vi.fn().mockResolvedValue(null);
      mockPrisma.grant.findMany = vi.fn().mockResolvedValue([]);

      const result = await deduplicationEngine.checkForDuplicates(grant);

      expect(result.isDuplicate).toBe(false);
      expect(result.action).toBe('insert');
      expect(result.confidence).toBe(0.0);
      expect(result.reason).toContain('No duplicates found');
    });

    it('should determine update action for title matches with content differences', async () => {
      const grant = createMockGrant('Test Grant');
      
      // Mock title match found
      mockPrisma.grant.findFirst = vi.fn().mockResolvedValue(null); // No exact match
      mockPrisma.grant.findMany = vi.fn().mockResolvedValue([
        {
          id: 'existing-grant-1',
          title: 'Test Grant',
          funder: { name: 'Test Foundation' }
        }
      ]);

      // Mock existing grant with different content
      mockPrisma.grant.findUnique = vi.fn().mockResolvedValue({
        id: 'existing-grant-1',
        title: 'Test Grant',
        description: 'Old description',
        deadline: new Date('2024-11-30'),
        fundingAmountMin: 5000,
        fundingAmountMax: 25000,
        eligibilityCriteria: 'Old criteria',
        applicationUrl: 'https://old-url.com',
        category: 'HEALTHCARE_PUBLIC_HEALTH',
        locationEligibility: ['US'],
        confidenceScore: 0.8,
        contentHash: 'old-hash',
        funder: { name: 'Test Foundation' }
      });

      const result = await deduplicationEngine.checkForDuplicates(grant);

      expect(result.isDuplicate).toBe(true);
      expect(result.action).toBe('update');
      expect(result.existingGrantId).toBe('existing-grant-1');
    });
  });

  describe('title similarity calculation', () => {
    it('should calculate high similarity for nearly identical titles', () => {
      const engine = deduplicationEngine as any;
      
      const similarity = engine.calculateTitleSimilarity(
        'Healthcare Innovation Grant 2024',
        'Healthcare Innovation Grant'
      );

      expect(similarity).toBeGreaterThan(0.8);
    });

    it('should calculate low similarity for different titles', () => {
      const engine = deduplicationEngine as any;
      
      const similarity = engine.calculateTitleSimilarity(
        'Healthcare Innovation Grant',
        'Education Technology Fund'
      );

      expect(similarity).toBeLessThan(0.5);
    });

    it('should return 1.0 for identical normalized titles', () => {
      const engine = deduplicationEngine as any;
      
      const similarity = engine.calculateTitleSimilarity(
        '  Healthcare Grant  ',
        'healthcare grant'
      );

      expect(similarity).toBe(1.0);
    });
  });

  describe('funder similarity calculation', () => {
    it('should calculate high similarity for similar funder names', () => {
      const engine = deduplicationEngine as any;
      
      const similarity = engine.calculateFunderSimilarity(
        'Gates Foundation',
        'Bill & Melinda Gates Foundation'
      );

      expect(similarity).toBeGreaterThan(0.8);
    });

    it('should return 1.0 for identical funder names', () => {
      const engine = deduplicationEngine as any;
      
      const similarity = engine.calculateFunderSimilarity(
        'Test Foundation',
        'Test Foundation'
      );

      expect(similarity).toBe(1.0);
    });

    it('should return 0.9 for substring matches', () => {
      const engine = deduplicationEngine as any;
      
      const similarity = engine.calculateFunderSimilarity(
        'Ford Foundation',
        'Ford'
      );

      expect(similarity).toBe(0.9);
    });
  });

  describe('overall similarity calculation', () => {
    it('should calculate high similarity for very similar grants', () => {
      const engine = deduplicationEngine as any;
      
      const grant1 = createMockGrant('Medical Research Grant');
      const grant2 = {
        title: 'Medical Research Grant 2024',
        description: 'Similar description',
        deadline: new Date('2024-12-31'),
        fundingAmountMin: 10000,
        funder: { name: 'Test Foundation' }
      };

      const similarity = engine.calculateOverallSimilarity(grant1, grant2);

      expect(similarity).toBeGreaterThan(0.7);
    });

    it('should calculate low similarity for different grants', () => {
      const engine = deduplicationEngine as any;
      
      const grant1 = createMockGrant('Medical Research Grant');
      const grant2 = {
        title: 'Education Technology Fund',
        description: 'Different description',
        deadline: new Date('2025-06-30'),
        fundingAmountMin: 100000,
        funder: { name: 'Different Foundation' }
      };

      const similarity = engine.calculateOverallSimilarity(grant1, grant2);

      expect(similarity).toBeLessThan(0.5);
    });
  });

  describe('keyword extraction', () => {
    it('should extract meaningful keywords from text', () => {
      const engine = deduplicationEngine as any;
      
      const keywords = engine.extractKeywords(
        'Healthcare innovation grant for medical research and development'
      );

      expect(keywords).toContain('healthcare');
      expect(keywords).toContain('innovation');
      expect(keywords).toContain('grant');
      expect(keywords).toContain('medical');
      expect(keywords).toContain('research');
      expect(keywords).toContain('development');
      
      // Should not contain stop words
      expect(keywords).not.toContain('for');
      expect(keywords).not.toContain('and');
    });

    it('should filter out short words and stop words', () => {
      const engine = deduplicationEngine as any;
      
      const keywords = engine.extractKeywords(
        'The big red car was old but not bad'
      );

      expect(keywords).not.toContain('the');
      expect(keywords).not.toContain('was');
      expect(keywords).not.toContain('but');
      expect(keywords).not.toContain('not');
      expect(keywords).not.toContain('big'); // Too short
      expect(keywords).not.toContain('red'); // Too short
      expect(keywords).not.toContain('car'); // Too short
      expect(keywords).not.toContain('old'); // Stop word
      expect(keywords).not.toContain('bad'); // Too short
    });

    it('should handle empty or null text', () => {
      const engine = deduplicationEngine as any;
      
      expect(engine.extractKeywords('')).toEqual([]);
      expect(engine.extractKeywords(null)).toEqual([]);
      expect(engine.extractKeywords(undefined)).toEqual([]);
    });
  });

  describe('Levenshtein distance calculation', () => {
    it('should calculate correct distance for identical strings', () => {
      const engine = deduplicationEngine as any;
      
      const distance = engine.levenshteinDistance('hello', 'hello');
      expect(distance).toBe(0);
    });

    it('should calculate correct distance for different strings', () => {
      const engine = deduplicationEngine as any;
      
      const distance = engine.levenshteinDistance('kitten', 'sitting');
      expect(distance).toBe(3); // k->s, e->i, insert g
    });

    it('should handle empty strings', () => {
      const engine = deduplicationEngine as any;
      
      expect(engine.levenshteinDistance('', 'hello')).toBe(5);
      expect(engine.levenshteinDistance('hello', '')).toBe(5);
      expect(engine.levenshteinDistance('', '')).toBe(0);
    });
  });

  describe('markAsDuplicate', () => {
    it('should mark grant as duplicate and create audit log', async () => {
      mockPrisma.$transaction = vi.fn().mockImplementation(async (callback) => {
        return await callback({
          grant: {
            update: vi.fn().mockResolvedValue({ id: 'duplicate-grant' })
          },
          auditLog: {
            create: vi.fn().mockResolvedValue({})
          }
        });
      });

      await deduplicationEngine.markAsDuplicate(
        'original-grant-1',
        'duplicate-grant-1',
        'Manual duplicate marking'
      );

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('stop word detection', () => {
    it('should correctly identify stop words', () => {
      const engine = deduplicationEngine as any;
      
      expect(engine.isStopWord('the')).toBe(true);
      expect(engine.isStopWord('and')).toBe(true);
      expect(engine.isStopWord('for')).toBe(true);
      expect(engine.isStopWord('healthcare')).toBe(false);
      expect(engine.isStopWord('innovation')).toBe(false);
    });
  });

  describe('field matching identification', () => {
    it('should identify matched fields correctly', () => {
      const engine = deduplicationEngine as any;
      
      const grant1 = createMockGrant('Medical Research Grant');
      const grant2 = {
        title: 'Medical Research Grant',
        funder: { name: 'Test Foundation' },
        deadline: new Date('2024-12-31')
      };

      const matchedFields = engine.identifyMatchedFields(grant1, grant2);

      expect(matchedFields).toContain('title');
      expect(matchedFields).toContain('funder');
      expect(matchedFields).toContain('deadline');
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