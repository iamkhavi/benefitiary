/**
 * Unit tests for TextCleaner utility
 * Tests text cleaning and normalization functionality
 */

import { describe, it, expect } from 'vitest';
import { TextCleaner } from '../text-cleaner';

describe('TextCleaner', () => {
  describe('cleanText', () => {
    it('should clean HTML entities', () => {
      const input = 'Grant &amp; Research Program with &quot;quotes&quot; and &nbsp; spaces';
      const result = TextCleaner.cleanText(input);
      expect(result).toBe('Grant & Research Program with "quotes" and spaces');
    });

    it('should normalize whitespace', () => {
      const input = 'Text   with\t\tmultiple\n\nwhitespace\r\ncharacters';
      const result = TextCleaner.cleanText(input);
      expect(result).toBe('Text with multiple whitespace characters');
    });

    it('should remove bullets and list markers', () => {
      const input = '• First item\n- Second item\n1. Third item\na) Fourth item';
      const result = TextCleaner.cleanText(input);
      expect(result).toBe('First item Second item Third item Fourth item');
    });

    it('should remove trailing ellipsis', () => {
      const input = 'This is a truncated text...';
      const result = TextCleaner.cleanText(input);
      expect(result).toBe('This is a truncated text');
    });

    it('should handle empty and null inputs', () => {
      expect(TextCleaner.cleanText('')).toBe('');
      expect(TextCleaner.cleanText(null as any)).toBe('');
      expect(TextCleaner.cleanText(undefined as any)).toBe('');
    });

    it('should respect maxLength option', () => {
      const input = 'This is a very long text that should be truncated';
      const result = TextCleaner.cleanText(input, { maxLength: 20 });
      expect(result).toBe('This is a very long...');
      expect(result.length).toBeLessThanOrEqual(23); // 20 + '...'
    });

    it('should allow disabling specific cleaning options', () => {
      const input = '• Item with &amp; entity...';
      const result = TextCleaner.cleanText(input, {
        removeBullets: false,
        removeHtmlEntities: false,
        removeEllipsis: false
      });
      expect(result).toBe('• Item with &amp; entity...');
    });
  });

  describe('extractFundingAmount', () => {
    it('should extract single funding amounts', () => {
      const tests = [
        { input: '$100,000', expected: { min: 100000, max: 100000, currency: '$' } },
        { input: '$50K', expected: { min: 50000, max: 50000, currency: '$' } },
        { input: '$2.5M', expected: { min: 2500000, max: 2500000, currency: '$' } },
        { input: 'Up to $75,000', expected: { max: 75000, currency: '$' } }
      ];

      tests.forEach(({ input, expected }) => {
        const result = TextCleaner.extractFundingAmount(input);
        expect(result).toEqual(expected);
      });
    });

    it('should extract funding ranges', () => {
      const tests = [
        { 
          input: '$100,000 - $500,000', 
          expected: { min: 100000, max: 500000, currency: '$' } 
        },
        { 
          input: '$50K to $200K', 
          expected: { min: 50000, max: 200000, currency: '$' } 
        },
        { 
          input: '€10,000 – €50,000', 
          expected: { min: 10000, max: 50000, currency: '€' } 
        }
      ];

      tests.forEach(({ input, expected }) => {
        const result = TextCleaner.extractFundingAmount(input);
        expect(result).toEqual(expected);
      });
    });

    it('should handle invalid funding amounts', () => {
      const tests = ['No funding info', 'TBD', '', 'Contact for details'];
      
      tests.forEach(input => {
        const result = TextCleaner.extractFundingAmount(input);
        expect(result).toBeNull();
      });
    });

    it('should handle different currency symbols', () => {
      const tests = [
        { input: '€100,000', expected: { min: 100000, max: 100000, currency: '€' } },
        { input: '£50,000', expected: { min: 50000, max: 50000, currency: '£' } },
        { input: '¥1,000,000', expected: { min: 1000000, max: 1000000, currency: '¥' } }
      ];

      tests.forEach(({ input, expected }) => {
        const result = TextCleaner.extractFundingAmount(input);
        expect(result).toEqual(expected);
      });
    });
  });

  describe('extractDeadline', () => {
    it('should extract dates in various formats', () => {
      const tests = [
        '12/31/2024',
        '2024-12-31',
        'December 31, 2024',
        '31 December 2024',
        'Application deadline: March 15, 2025'
      ];

      tests.forEach(input => {
        const result = TextCleaner.extractDeadline(input);
        expect(result).toBeInstanceOf(Date);
        expect(result?.getFullYear()).toBeGreaterThan(2020);
      });
    });

    it('should handle invalid date strings', () => {
      const tests = ['No deadline', 'TBD', 'Rolling basis', ''];
      
      tests.forEach(input => {
        const result = TextCleaner.extractDeadline(input);
        expect(result).toBeNull();
      });
    });

    it('should extract the first valid date found', () => {
      const input = 'Applications open January 1, 2024 and close March 31, 2024';
      const result = TextCleaner.extractDeadline(input);
      expect(result).toBeInstanceOf(Date);
      expect(result?.getMonth()).toBe(0); // January (0-indexed)
    });
  });

  describe('extractLocationEligibility', () => {
    it('should extract US states', () => {
      const input = 'Available to organizations in California, Texas, and New York';
      const result = TextCleaner.extractLocationEligibility(input);
      expect(result).toContain('California');
      expect(result).toContain('Texas');
      expect(result).toContain('New York');
    });

    it('should extract countries', () => {
      const input = 'Open to applicants from United States, Canada, and United Kingdom';
      const result = TextCleaner.extractLocationEligibility(input);
      expect(result).toContain('United States');
      expect(result).toContain('Canada');
      expect(result).toContain('United Kingdom');
    });

    it('should extract special eligibility terms', () => {
      const input = 'This grant is available nationwide to eligible organizations';
      const result = TextCleaner.extractLocationEligibility(input);
      expect(result).toContain('nationwide');
    });

    it('should handle empty input', () => {
      const result = TextCleaner.extractLocationEligibility('');
      expect(result).toEqual([]);
    });

    it('should remove duplicates', () => {
      const input = 'California organizations and California residents';
      const result = TextCleaner.extractLocationEligibility(input);
      const californiaCount = result.filter(loc => loc.toLowerCase() === 'california').length;
      expect(californiaCount).toBe(1);
    });
  });

  describe('calculateQualityScore', () => {
    it('should give high scores to well-formed text', () => {
      const input = 'This is a comprehensive grant description with funding information of $100,000. The deadline is December 31, 2024. Eligible organizations must apply through the online portal.';
      const score = TextCleaner.calculateQualityScore(input);
      expect(score).toBeGreaterThan(70);
    });

    it('should give low scores to poor quality text', () => {
      const input = 'Short';
      const score = TextCleaner.calculateQualityScore(input);
      expect(score).toBeLessThan(30);
    });

    it('should penalize truncated text', () => {
      const input = 'This text is truncated and incomplete...';
      const score = TextCleaner.calculateQualityScore(input);
      const fullInput = 'This text is complete and provides full information about the grant opportunity.';
      const fullScore = TextCleaner.calculateQualityScore(fullInput);
      expect(score).toBeLessThan(fullScore);
    });

    it('should reward funding and deadline information', () => {
      const basicInput = 'This is a basic grant description without specific details.';
      const detailedInput = 'This grant provides $50,000 funding with a deadline of March 2024.';
      
      const basicScore = TextCleaner.calculateQualityScore(basicInput);
      const detailedScore = TextCleaner.calculateQualityScore(detailedInput);
      
      expect(detailedScore).toBeGreaterThan(basicScore);
    });

    it('should handle empty input', () => {
      const score = TextCleaner.calculateQualityScore('');
      expect(score).toBe(0);
    });
  });

  describe('removeHtmlArtifacts', () => {
    it('should remove HTML tags', () => {
      const input = 'Text with <strong>bold</strong> and <em>italic</em> tags';
      const result = TextCleaner.removeHtmlArtifacts(input);
      expect(result).toBe('Text with bold and italic tags');
    });

    it('should remove HTML comments', () => {
      const input = 'Text with <!-- comment --> content';
      const result = TextCleaner.removeHtmlArtifacts(input);
      expect(result).toBe('Text with  content');
    });

    it('should remove script and style tags', () => {
      const input = 'Text <script>alert("test")</script> with <style>body{color:red}</style> content';
      const result = TextCleaner.removeHtmlArtifacts(input);
      expect(result).toBe('Text  with  content');
    });

    it('should remove common web artifacts', () => {
      const input = 'Link with javascript:void(0) and class="test-class" attributes';
      const result = TextCleaner.removeHtmlArtifacts(input);
      expect(result).toBe('Link with  and  attributes');
    });

    it('should normalize excessive punctuation', () => {
      const input = 'Text with...... excessive punctuation----- and equals======';
      const result = TextCleaner.removeHtmlArtifacts(input);
      expect(result).toBe('Text with... excessive punctuation-- and equals');
    });
  });

  describe('integration tests', () => {
    it('should handle complex real-world grant text', () => {
      const input = `
        &bull; The Gates Foundation Grant Program&nbsp;&nbsp;
        <p>Funding: $100,000 - $500,000</p>
        <!-- Application deadline -->
        <strong>Deadline:</strong> March 31, 2024...
        
        Available to organizations in California, Texas, and nationwide applicants.
        
        <script>trackEvent('grant_view')</script>
      `;

      const cleaned = TextCleaner.cleanText(input);
      expect(cleaned).not.toContain('&bull;');
      expect(cleaned).not.toContain('&nbsp;');
      expect(cleaned).not.toContain('<p>');
      expect(cleaned).not.toContain('<script>');
      // Note: The ellipsis from "March 31, 2024..." should be removed, but the test input has it in the middle

      const funding = TextCleaner.extractFundingAmount(cleaned);
      expect(funding).toEqual({ min: 100000, max: 500000, currency: '$' });

      const locations = TextCleaner.extractLocationEligibility(cleaned);
      expect(locations).toContain('California');
      expect(locations).toContain('Texas');
      expect(locations).toContain('nationwide');

      const score = TextCleaner.calculateQualityScore(cleaned);
      expect(score).toBeGreaterThan(50);
    });

    it('should maintain text readability after cleaning', () => {
      const input = 'The&nbsp;National&nbsp;Science&nbsp;Foundation&nbsp;offers&nbsp;grants&nbsp;up&nbsp;to&nbsp;$250,000...';
      const cleaned = TextCleaner.cleanText(input);
      expect(cleaned).toBe('The National Science Foundation offers grants up to $250,000');
      expect(cleaned.split(' ')).toHaveLength(9);
    });
  });
});