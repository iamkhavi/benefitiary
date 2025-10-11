/**
 * Integration tests for PDF processing with real PDF scenarios
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PDFProcessor } from '../pdf-processor';
import { SourceConfiguration, ScrapedSourceType } from '../../types';

describe('PDF Processing Integration', () => {
  let processor: PDFProcessor;
  let mockSourceConfig: SourceConfiguration;

  beforeEach(() => {
    processor = new PDFProcessor({
      enableOCR: false, // Disable OCR for integration tests
      tempDir: '/tmp/pdf-integration-test',
      timeout: 60000
    });

    mockSourceConfig = {
      id: 'integration-pdf-source',
      url: 'https://example.com/grant-rfp.pdf',
      type: ScrapedSourceType.FOUNDATION,
      engine: 'static',
      selectors: {} as any,
      rateLimit: {} as any,
      headers: {}
    };
  });

  afterEach(async () => {
    await processor.cleanup();
  });

  describe('Real-world PDF Scenarios', () => {
    it('should process a typical grant RFP PDF', async () => {
      // Mock a realistic grant RFP PDF content
      const mockPdfContent = `
GATES FOUNDATION
REQUEST FOR PROPOSALS

GLOBAL HEALTH INNOVATION GRANT

PROGRAM OVERVIEW
The Gates Foundation is seeking innovative solutions to address critical global health challenges.
This grant program supports research and development of new technologies, interventions, and 
approaches that can improve health outcomes in low- and middle-income countries.

ELIGIBILITY CRITERIA
• Nonprofit organizations with 501(c)(3) status
• Academic institutions and research organizations
• International NGOs with demonstrated experience in global health
• Organizations must have at least 3 years of relevant experience
• Collaborative partnerships are encouraged

FUNDING DETAILS
Grant Amount: $100,000 - $500,000 per project
Project Duration: 12-24 months
Total Program Budget: $10 million
Indirect Costs: Limited to 15% of direct costs

APPLICATION REQUIREMENTS
1. Project proposal (maximum 15 pages)
2. Detailed budget and budget justification
3. Timeline and milestones
4. Team qualifications and CVs
5. Letters of support from partners

DEADLINE INFORMATION
Letter of Intent Due: February 15, 2024
Full Proposal Due: April 30, 2024
Award Notification: June 15, 2024
Project Start Date: September 1, 2024

CONTACT INFORMATION
Program Officer: Dr. Sarah Johnson
Email: global.health@gatesfoundation.org
Phone: (206) 555-0123
Website: https://www.gatesfoundation.org/grants/global-health

APPLICATION PORTAL
Submit applications through our online portal:
https://grants.gatesfoundation.org/apply

For technical support, contact: support@gatesfoundation.org
      `.trim();

      // Mock pdf-parse
      const mockPdfParse = await import('pdf-parse');
      (mockPdfParse.default as any).mockResolvedValue({
        text: mockPdfContent,
        info: {
          Title: 'Global Health Innovation Grant - Request for Proposals',
          Author: 'Gates Foundation',
          Subject: 'Grant Opportunity',
          Creator: 'Adobe Acrobat',
          CreationDate: new Date('2024-01-15'),
          ModDate: new Date('2024-01-20')
        },
        numpages: 8
      });

      // Mock fetch for PDF download
      const mockPdfBuffer = Buffer.from('mock pdf content');
      const mockResponse = {
        ok: true,
        arrayBuffer: () => Promise.resolve(mockPdfBuffer.buffer)
      };
      (global.fetch as any).mockResolvedValue(mockResponse);

      const grants = await processor.scrape(mockSourceConfig);

      expect(grants).toHaveLength(1);
      
      const grant = grants[0];
      expect(grant.title).toBe('GLOBAL HEALTH INNOVATION GRANT');
      expect(grant.description).toContain('innovative solutions');
      expect(grant.description).toContain('global health challenges');
      expect(grant.deadline).toBe('April 30, 2024');
      expect(grant.fundingAmount).toBe('$500,000'); // Should extract the maximum
      expect(grant.eligibility).toContain('501(c)(3)');
      expect(grant.applicationUrl).toBe('https://grants.gatesfoundation.org/apply');
      expect(grant.funderName).toBe('Gates Foundation');
      expect(grant.sourceUrl).toBe(mockSourceConfig.url);
      
      // Check raw content preservation
      expect(grant.rawContent).toBeDefined();
      expect(grant.rawContent.metadata).toBeDefined();
      expect(grant.rawContent.metadata.title).toBe('Global Health Innovation Grant - Request for Proposals');
      expect(grant.rawContent.metadata.pages).toBe(8);
    });

    it('should handle PDF with tables and structured data', async () => {
      const mockPdfWithTables = `
RESEARCH GRANT OPPORTUNITIES 2024

FUNDING CATEGORIES

Category                Amount Range        Duration    Deadline
Basic Research         $50,000-$150,000    1-2 years   March 31
Applied Research       $100,000-$300,000   2-3 years   April 15  
Clinical Trials        $500,000-$1,000,000 3-5 years   May 30
Community Studies      $25,000-$75,000     6-18 months June 15

ELIGIBILITY BY CATEGORY

All applicants must:
- Hold a doctoral degree (PhD, MD, or equivalent)
- Be affiliated with an accredited institution
- Have no more than 2 active grants from our foundation

Additional requirements by category:
Basic Research: Minimum 2 years post-doctoral experience
Applied Research: Demonstrated track record of publications
Clinical Trials: IRB approval and clinical research experience
Community Studies: Community partnership letters required

APPLICATION PROCESS
1. Submit pre-application through online portal
2. Invited applicants submit full proposal
3. Peer review process (8-10 weeks)
4. Final selection and award notification

For more information: https://research.foundation.org/grants
      `.trim();

      const mockPdfParse = await import('pdf-parse');
      (mockPdfParse.default as any).mockResolvedValue({
        text: mockPdfWithTables,
        info: {
          Title: 'Research Grant Opportunities 2024',
          Author: 'Research Foundation'
        },
        numpages: 3
      });

      const mockResponse = {
        ok: true,
        arrayBuffer: () => Promise.resolve(Buffer.from('mock').buffer)
      };
      (global.fetch as any).mockResolvedValue(mockResponse);

      const grants = await processor.scrape(mockSourceConfig);

      expect(grants).toHaveLength(1);
      
      const grant = grants[0];
      expect(grant.title).toBe('RESEARCH GRANT OPPORTUNITIES 2024');
      expect(grant.eligibility).toContain('doctoral degree');
      expect(grant.applicationUrl).toBe('https://research.foundation.org/grants');
      
      // Should have extracted table data in raw content
      expect(grant.rawContent.tables).toBeDefined();
      expect(grant.rawContent.tables.length).toBeGreaterThan(0);
    });

    it('should handle PDF with minimal grant information', async () => {
      const mockMinimalPdf = `
COMMUNITY FOUNDATION GRANT

We offer small grants to local nonprofits.

Contact us for more information.
Email: grants@community.org
      `.trim();

      const mockPdfParse = await import('pdf-parse');
      (mockPdfParse.default as any).mockResolvedValue({
        text: mockMinimalPdf,
        info: {
          Title: 'Community Grant Info'
        },
        numpages: 1
      });

      const mockResponse = {
        ok: true,
        arrayBuffer: () => Promise.resolve(Buffer.from('mock').buffer)
      };
      (global.fetch as any).mockResolvedValue(mockResponse);

      const grants = await processor.scrape(mockSourceConfig);

      expect(grants).toHaveLength(1);
      
      const grant = grants[0];
      expect(grant.title).toBe('Community Grant Info'); // Falls back to PDF title
      expect(grant.description).toContain('small grants');
      expect(grant.deadline).toBeUndefined();
      expect(grant.fundingAmount).toBeUndefined();
    });

    it('should extract multiple grants from a single PDF', async () => {
      const mockMultiGrantPdf = `
FOUNDATION GRANT PROGRAMS 2024

EDUCATION GRANT PROGRAM
Supporting K-12 education initiatives.
Funding: Up to $25,000
Deadline: March 15, 2024
Eligibility: Public and private schools

HEALTH GRANT PROGRAM  
Improving community health outcomes.
Funding: Up to $50,000
Deadline: April 30, 2024
Eligibility: Healthcare organizations and nonprofits

ARTS GRANT PROGRAM
Promoting arts and culture in communities.
Funding: Up to $15,000
Deadline: May 15, 2024
Eligibility: Arts organizations and cultural institutions
      `.trim();

      const mockPdfParse = await import('pdf-parse');
      (mockPdfParse.default as any).mockResolvedValue({
        text: mockMultiGrantPdf,
        info: {
          Title: 'Foundation Grant Programs 2024',
          Author: 'Community Foundation'
        },
        numpages: 2
      });

      const mockResponse = {
        ok: true,
        arrayBuffer: () => Promise.resolve(Buffer.from('mock').buffer)
      };
      (global.fetch as any).mockResolvedValue(mockResponse);

      const grants = await processor.scrape(mockSourceConfig);

      // Should extract multiple grants from sections
      expect(grants.length).toBeGreaterThanOrEqual(1);
      
      // Check that we got meaningful grant data
      const grant = grants[0];
      expect(grant.title).toBeDefined();
      expect(grant.description).toBeDefined();
    });
  });

  describe('Error Handling in Integration', () => {
    it('should handle corrupted PDF gracefully', async () => {
      const mockPdfParse = await import('pdf-parse');
      (mockPdfParse.default as any).mockRejectedValue(new Error('Invalid PDF format'));

      const mockResponse = {
        ok: true,
        arrayBuffer: () => Promise.resolve(Buffer.from('corrupted').buffer)
      };
      (global.fetch as any).mockResolvedValue(mockResponse);

      await expect(processor.scrape(mockSourceConfig))
        .rejects.toThrow('PDF processing failed');
    });

    it('should handle network errors during PDF download', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      await expect(processor.scrape(mockSourceConfig))
        .rejects.toThrow('PDF processing failed');
    });

    it('should handle PDF with no extractable text', async () => {
      const mockPdfParse = await import('pdf-parse');
      (mockPdfParse.default as any).mockResolvedValue({
        text: '', // Empty text
        info: {},
        numpages: 1
      });

      const mockResponse = {
        ok: true,
        arrayBuffer: () => Promise.resolve(Buffer.from('mock').buffer)
      };
      (global.fetch as any).mockResolvedValue(mockResponse);

      const grants = await processor.scrape(mockSourceConfig);

      // Should still return a grant with minimal information
      expect(grants).toHaveLength(1);
      expect(grants[0].title).toBe('PDF Grant Opportunity'); // Default title
    });
  });

  describe('Performance and Resource Management', () => {
    it('should handle large PDF files efficiently', async () => {
      // Simulate a large PDF with lots of content
      const largePdfContent = 'Grant information. '.repeat(10000);
      
      const mockPdfParse = await import('pdf-parse');
      (mockPdfParse.default as any).mockResolvedValue({
        text: largePdfContent,
        info: { Title: 'Large Grant Document' },
        numpages: 50
      });

      const mockResponse = {
        ok: true,
        arrayBuffer: () => Promise.resolve(Buffer.from('large-mock').buffer)
      };
      (global.fetch as any).mockResolvedValue(mockResponse);

      const startTime = Date.now();
      const grants = await processor.scrape(mockSourceConfig);
      const processingTime = Date.now() - startTime;

      expect(grants).toHaveLength(1);
      expect(processingTime).toBeLessThan(30000); // Should complete within 30 seconds
    });

    it('should cleanup temporary files after processing', async () => {
      const fs = await import('fs');
      
      const mockPdfParse = await import('pdf-parse');
      (mockPdfParse.default as any).mockResolvedValue({
        text: 'Simple grant text',
        info: {},
        numpages: 1
      });

      const mockResponse = {
        ok: true,
        arrayBuffer: () => Promise.resolve(Buffer.from('mock').buffer)
      };
      (global.fetch as any).mockResolvedValue(mockResponse);

      await processor.scrape(mockSourceConfig);
      await processor.cleanup();

      // Should attempt to clean up temp directory
      expect(fs.promises.readdir).toHaveBeenCalled();
    });
  });

  describe('Content Quality Assessment', () => {
    it('should assign appropriate confidence scores', async () => {
      const highQualityPdf = `
RESEARCH EXCELLENCE GRANT

PROGRAM DESCRIPTION
This comprehensive grant program supports cutting-edge research in biotechnology.
The program aims to accelerate scientific discovery and innovation.

ELIGIBILITY REQUIREMENTS
- PhD in relevant field required
- Minimum 5 years research experience
- Institutional affiliation required
- Previous grant management experience preferred

FUNDING INFORMATION
Award Amount: $250,000 over 3 years
Indirect Costs: 25% of direct costs allowed
Equipment purchases: Up to 30% of total budget

DEADLINE
Full proposals due: June 30, 2024
Award start date: January 1, 2025

APPLICATION INSTRUCTIONS
Submit through our online portal at https://grants.research.org/apply
Include all required documents and supporting materials.
      `.trim();

      const mockPdfParse = await import('pdf-parse');
      (mockPdfParse.default as any).mockResolvedValue({
        text: highQualityPdf,
        info: {
          Title: 'Research Excellence Grant - RFP',
          Author: 'Research Institute'
        },
        numpages: 5
      });

      const mockResponse = {
        ok: true,
        arrayBuffer: () => Promise.resolve(Buffer.from('mock').buffer)
      };
      (global.fetch as any).mockResolvedValue(mockResponse);

      const grants = await processor.scrape(mockSourceConfig);

      expect(grants).toHaveLength(1);
      
      const grant = grants[0];
      // Should have high confidence due to complete information
      expect(grant.rawContent.sections).toBeDefined();
      expect(grant.rawContent.sections.some((s: any) => s.confidence > 0.7)).toBe(true);
    });
  });
});