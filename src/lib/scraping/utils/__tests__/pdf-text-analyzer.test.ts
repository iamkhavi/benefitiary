/**
 * Tests for PDF text analyzer
 */

import { describe, it, expect } from 'vitest';
import { PDFTextAnalyzer } from '../pdf-text-analyzer';

describe('PDFTextAnalyzer', () => {
  let analyzer: PDFTextAnalyzer;

  beforeEach(() => {
    analyzer = new PDFTextAnalyzer();
  });

  describe('Title Analysis', () => {
    it('should extract grant title from header format', () => {
      const text = `
COMMUNITY HEALTH INNOVATION GRANT
This grant supports innovative approaches to community health.
      `.trim();

      const results = analyzer.analyzeTitle(text);
      expect(results).toHaveLength(1);
      expect(results[0].value).toBe('COMMUNITY HEALTH INNOVATION GRANT');
      expect(results[0].confidence).toBeGreaterThan(0.8);
    });

    it('should extract RFP title', () => {
      const text = 'Request for Proposals: Digital Health Solutions Grant Program';
      
      const results = analyzer.analyzeTitle(text);
      expect(results).toHaveLength(1);
      expect(results[0].value).toBe('Digital Health Solutions Grant Program');
      expect(results[0].source).toBe('rfp_title');
    });

    it('should extract grant program title', () => {
      const text = 'Grant Program: Environmental Sustainability Initiative';
      
      const results = analyzer.analyzeTitle(text);
      expect(results).toHaveLength(1);
      expect(results[0].value).toBe('Environmental Sustainability Initiative');
    });

    it('should return best match for multiple title patterns', () => {
      const text = `
RESEARCH EXCELLENCE GRANT
Grant Program: Advanced Research Initiative
Opportunity: Scientific Innovation Fund
      `.trim();

      const results = analyzer.analyzeTitle(text);
      const bestMatch = analyzer.getBestMatch(results);
      
      expect(bestMatch).toBeDefined();
      expect(bestMatch!.value).toBe('RESEARCH EXCELLENCE GRANT');
      expect(bestMatch!.confidence).toBeGreaterThan(0.8);
    });
  });

  describe('Deadline Analysis', () => {
    it('should extract explicit deadline', () => {
      const text = 'Deadline: March 15, 2024 at 5:00 PM EST';
      
      const results = analyzer.analyzeDeadline(text);
      expect(results.length).toBeGreaterThan(0);
      const bestMatch = analyzer.getBestMatch(results);
      expect(bestMatch?.value).toBe('March 15, 2024 at 5:00 PM EST');
      expect(bestMatch?.confidence).toBe(0.95);
    });

    it('should extract due date format', () => {
      const text = 'Applications are due by April 30, 2024';
      
      const results = analyzer.analyzeDeadline(text);
      expect(results.length).toBeGreaterThan(0);
      const bestMatch = analyzer.getBestMatch(results);
      expect(bestMatch?.value).toBe('April 30, 2024');
    });

    it('should extract numeric date formats', () => {
      const text = 'Submit your proposal by 03/15/2024';
      
      const results = analyzer.analyzeDeadline(text);
      expect(results).toHaveLength(1);
      expect(results[0].value).toBe('03/15/2024');
    });

    it('should extract month name dates', () => {
      const text = 'The deadline is December 31, 2024';
      
      const results = analyzer.analyzeDeadline(text);
      expect(results.length).toBeGreaterThan(0);
      const bestMatch = analyzer.getBestMatch(results);
      expect(bestMatch?.value).toBe('December 31, 2024');
    });
  });

  describe('Funding Analysis', () => {
    it('should extract funding range', () => {
      const text = 'Funding: $50,000 to $150,000 per project';
      
      const results = analyzer.analyzeFunding(text);
      expect(results.length).toBeGreaterThan(0);
      const bestMatch = analyzer.getBestMatch(results);
      expect(bestMatch?.value).toBe('$50,000 - $150,000');
      expect(bestMatch?.confidence).toBe(0.95);
    });

    it('should extract maximum funding amount', () => {
      const text = 'Awards up to $100,000 are available';
      
      const results = analyzer.analyzeFunding(text);
      expect(results).toHaveLength(1);
      expect(results[0].value).toBe('$100,000');
    });

    it('should extract award amount', () => {
      const text = 'Award amount: $75,000 over two years';
      
      const results = analyzer.analyzeFunding(text);
      expect(results).toHaveLength(1);
      expect(results[0].value).toBe('$75,000');
    });

    it('should extract dollar amounts from text', () => {
      const text = 'The total budget is $250,000 for this initiative';
      
      const results = analyzer.analyzeFunding(text);
      expect(results).toHaveLength(1);
      expect(results[0].value).toBe('$250,000');
    });
  });

  describe('Eligibility Analysis', () => {
    it('should extract eligibility section', () => {
      const text = `
Eligibility: Applicants must be 501(c)(3) nonprofit organizations
with at least three years of experience in community health.
Organizations must demonstrate financial stability.

FUNDING DETAILS
      `.trim();

      const results = analyzer.analyzeEligibility(text);
      expect(results.length).toBeGreaterThanOrEqual(2); // Should match both eligibility section and 501(c)(3)
      
      const sectionMatch = results.find(r => r.source === 'eligibility_section');
      expect(sectionMatch).toBeDefined();
      expect(sectionMatch!.value).toContain('501(c)(3)');
      expect(sectionMatch!.value).toContain('three years');
    });

    it('should extract nonprofit requirement', () => {
      const text = 'Only 501(c)(3) tax-exempt organizations are eligible';
      
      const results = analyzer.analyzeEligibility(text);
      expect(results).toHaveLength(1);
      expect(results[0].value).toBe('501(c)(3) tax-exempt organizations are eligible');
      expect(results[0].confidence).toBe(0.95);
    });

    it('should extract requirements section', () => {
      const text = `
Requirements: Organizations must have a minimum annual budget of $100,000
and demonstrate experience in the target population.
      `.trim();

      const results = analyzer.analyzeEligibility(text);
      expect(results.length).toBeGreaterThan(0);
      const bestMatch = analyzer.getBestMatch(results);
      expect(bestMatch?.value).toContain('annual budget');
    });
  });

  describe('Description Analysis', () => {
    it('should extract program overview', () => {
      const text = `
Program Overview: This initiative supports innovative research
in sustainable agriculture practices. The program aims to develop
new technologies and methodologies for improving crop yields.

ELIGIBILITY
      `.trim();

      const results = analyzer.analyzeDescription(text);
      expect(results).toHaveLength(1);
      expect(results[0].value).toContain('sustainable agriculture');
    });

    it('should extract description section', () => {
      const text = `
Description: The Community Health Grant Program provides funding
for projects that address health disparities in underserved communities.
      `.trim();

      const results = analyzer.analyzeDescription(text);
      expect(results).toHaveLength(1);
      expect(results[0].value).toContain('health disparities');
    });
  });

  describe('URL Analysis', () => {
    it('should prioritize application portal URLs', () => {
      const text = `
Visit our website at https://foundation.org
Submit applications at https://grants.foundation.org/apply
More info: https://foundation.org/about
      `.trim();

      const results = analyzer.analyzeUrls(text);
      const bestMatch = analyzer.getBestMatch(results);
      
      expect(bestMatch).toBeDefined();
      expect(bestMatch!.value).toBe('https://grants.foundation.org/apply');
      expect(bestMatch!.confidence).toBe(0.95);
    });

    it('should extract grant-related URLs', () => {
      const text = 'More information: https://foundation.org/grants/health-initiative';
      
      const results = analyzer.analyzeUrls(text);
      expect(results).toHaveLength(1);
      expect(results[0].value).toBe('https://foundation.org/grants/health-initiative');
    });
  });

  describe('Grant Type Detection', () => {
    it('should detect research grants', () => {
      const text = 'This research grant supports scientific investigation and study';
      
      const types = analyzer.detectGrantType(text);
      expect(types).toContain('research');
    });

    it('should detect education grants', () => {
      const text = 'Supporting K-12 education and student learning initiatives';
      
      const types = analyzer.detectGrantType(text);
      expect(types).toContain('education');
    });

    it('should detect multiple grant types', () => {
      const text = 'This program supports health research in educational settings';
      
      const types = analyzer.detectGrantType(text);
      expect(types).toContain('health');
      expect(types).toContain('research');
      expect(types).toContain('education');
    });
  });

  describe('Contact Information Extraction', () => {
    it('should extract email addresses', () => {
      const text = 'Contact us at grants@foundation.org or info@example.com';
      
      const contact = analyzer.extractContactInfo(text);
      expect(contact.emails).toHaveLength(2);
      expect(contact.emails).toContain('grants@foundation.org');
      expect(contact.emails).toContain('info@example.com');
    });

    it('should extract phone numbers', () => {
      const text = 'Call (555) 123-4567 or 555.987.6543 for more information';
      
      const contact = analyzer.extractContactInfo(text);
      expect(contact.phones).toHaveLength(2);
      expect(contact.phones).toContain('(555) 123-4567');
      expect(contact.phones).toContain('555.987.6543');
    });

    it('should extract websites', () => {
      const text = 'Visit www.foundation.org or https://grants.example.com';
      
      const contact = analyzer.extractContactInfo(text);
      expect(contact.websites).toHaveLength(2);
      expect(contact.websites).toContain('www.foundation.org');
      expect(contact.websites).toContain('https://grants.example.com');
    });
  });

  describe('Text Quality Assessment', () => {
    it('should rate high-quality grant text highly', () => {
      const highQualityText = `
The Community Health Innovation Grant supports nonprofit organizations
in developing innovative solutions to address health disparities.
This funding opportunity provides awards of up to $100,000 for projects
that demonstrate measurable impact on community health outcomes.
Eligible applicants must be 501(c)(3) organizations with demonstrated
experience in community health programming. Applications are due March 15, 2024.
      `.trim();

      const quality = analyzer.calculateTextQuality(highQualityText);
      expect(quality).toBeGreaterThan(0.7);
    });

    it('should rate poor quality text lowly', () => {
      const poorQualityText = 'abc def ### @@@ %%% ***';
      
      const quality = analyzer.calculateTextQuality(poorQualityText);
      expect(quality).toBeLessThan(0.4);
    });

    it('should rate empty text as zero quality', () => {
      const quality = analyzer.calculateTextQuality('');
      expect(quality).toBe(0);
    });
  });

  describe('Key Phrase Extraction', () => {
    it('should extract relevant key phrases', () => {
      const text = `
This research grant supports innovative scientific investigation
in community health and medical research. The funding program
aims to advance healthcare outcomes through evidence-based research.
      `.trim();

      const phrases = analyzer.extractKeyPhrases(text, 5);
      expect(phrases).toContain('research');
      expect(phrases).toContain('grant');
      expect(phrases.length).toBeLessThanOrEqual(5);
    });

    it('should boost grant-related terms', () => {
      const text = `
The application process requires detailed project proposals.
Grant funding will support research initiatives and program development.
      `.trim();

      const phrases = analyzer.extractKeyPhrases(text, 3);
      expect(phrases).toContain('grant'); // Should be in top results
    });
  });

  describe('Comprehensive Analysis', () => {
    it('should analyze all fields at once', () => {
      const text = `
HEALTH RESEARCH GRANT PROGRAM

Program Overview: This grant supports innovative health research
projects that address critical public health challenges.

Eligibility: 501(c)(3) nonprofit organizations and academic institutions
are eligible to apply.

Funding: Awards range from $50,000 to $200,000 per project.

Deadline: Applications due April 30, 2024.

Apply online at: https://grants.health.org/apply
      `.trim();

      const analysis = analyzer.analyzeAll(text);
      
      expect(analysis.title.length).toBeGreaterThan(0);
      const bestTitle = analyzer.getBestMatch(analysis.title);
      expect(bestTitle?.value).toBe('HEALTH RESEARCH GRANT PROGRAM');
      
      expect(analysis.description).toHaveLength(1);
      expect(analysis.description[0].value).toContain('health research');
      
      expect(analysis.eligibility).toHaveLength(2); // Section + 501(c)(3)
      
      expect(analysis.funding).toHaveLength(1);
      expect(analysis.funding[0].value).toBe('$50,000 - $200,000');
      
      expect(analysis.deadline).toHaveLength(1);
      expect(analysis.deadline[0].value).toBe('April 30, 2024');
      
      expect(analysis.urls).toHaveLength(1);
      expect(analysis.urls[0].value).toBe('https://grants.health.org/apply');
    });
  });

  describe('Best Match Selection', () => {
    it('should return null for empty results', () => {
      const bestMatch = analyzer.getBestMatch([]);
      expect(bestMatch).toBeNull();
    });

    it('should return highest confidence match', () => {
      const results = [
        { field: 'test', value: 'low', confidence: 0.3, source: 'pattern1' },
        { field: 'test', value: 'high', confidence: 0.9, source: 'pattern2' },
        { field: 'test', value: 'medium', confidence: 0.6, source: 'pattern3' }
      ];

      const bestMatch = analyzer.getBestMatch(results);
      expect(bestMatch).toBeDefined();
      expect(bestMatch!.value).toBe('high');
      expect(bestMatch!.confidence).toBe(0.9);
    });
  });
});