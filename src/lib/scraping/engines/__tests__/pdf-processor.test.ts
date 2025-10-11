/**
 * Tests for PDF processing engine
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PDFProcessor, PDFProcessorConfig } from '../pdf-processor';
import { SourceConfiguration, ScrapedSourceType } from '../../types';

// Mock dependencies
vi.mock('pdf-parse', () => ({
  default: vi.fn()
}));
vi.mock('tesseract.js', () => ({
  createWorker: vi.fn()
}));
vi.mock('pdf2pic', () => ({
  convert: vi.fn()
}));
vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    promises: {
      mkdir: vi.fn(),
      writeFile: vi.fn(),
      readdir: vi.fn().mockResolvedValue([]),
      unlink: vi.fn()
    }
  };
});

// Mock fetch
global.fetch = vi.fn();

describe('PDFProcessor', () => {
  let processor: PDFProcessor;
  let mockSourceConfig: SourceConfiguration;

  beforeEach(() => {
    processor = new PDFProcessor({
      enableOCR: false, // Disable OCR for most tests
      tempDir: '/tmp/test',
      timeout: 30000
    });

    mockSourceConfig = {
      id: 'test-pdf-source',
      url: 'https://example.com/grant.pdf',
      type: ScrapedSourceType.FOUNDATION,
      engine: 'static',
      selectors: {} as any,
      rateLimit: {} as any,
      headers: {}
    };

    // Reset mocks
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await processor.cleanup();
  });

  describe('PDF Download', () => {
    it('should download PDF from URL', async () => {
      const mockPdfBuffer = Buffer.from('mock pdf content');
      const mockResponse = {
        ok: true,
        arrayBuffer: () => Promise.resolve(mockPdfBuffer.buffer)
      };
      
      (global.fetch as any).mockResolvedValue(mockResponse);

      const result = await (processor as any).downloadPDF('https://example.com/test.pdf');
      
      expect(fetch).toHaveBeenCalledWith('https://example.com/test.pdf');
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should throw error for failed download', async () => {
      const mockResponse = {
        ok: false,
        statusText: 'Not Found'
      };
      
      (global.fetch as any).mockResolvedValue(mockResponse);

      await expect((processor as any).downloadPDF('https://example.com/test.pdf'))
        .rejects.toThrow('Failed to download PDF: Not Found');
    });
  });

  describe('Text Section Parsing', () => {
    it('should parse text into sections with headers', async () => {
      const mockText = `
GRANT OPPORTUNITY
This is the introduction text.

ELIGIBILITY CRITERIA
You must be a nonprofit organization.
Additional requirements apply.

FUNDING AMOUNT
Up to $50,000 available.
      `.trim();

      const sections = await (processor as any).parseTextSections(mockText);

      expect(sections).toHaveLength(3);
      expect(sections[0].title).toBe('GRANT OPPORTUNITY');
      expect(sections[0].content).toBe('This is the introduction text.');
      expect(sections[1].title).toBe('ELIGIBILITY CRITERIA');
      expect(sections[1].content).toContain('nonprofit organization');
      expect(sections[2].title).toBe('FUNDING AMOUNT');
      expect(sections[2].content).toBe('Up to $50,000 available.');
    });

    it('should handle text without clear headers', async () => {
      const mockText = `
This is some grant text without clear headers.
It contains information about funding opportunities.
The deadline is March 15, 2024.
      `.trim();

      const sections = await (processor as any).parseTextSections(mockText);

      expect(sections).toHaveLength(1);
      expect(sections[0].title).toBeUndefined();
      expect(sections[0].content).toContain('grant text');
    });
  });

  describe('Table Extraction', () => {
    it('should extract tables from text', async () => {
      const mockText = `
Grant Program    Amount      Deadline
Research Grants  $25,000     March 15
Education Grants $15,000     April 30
Community Grants $10,000     May 15
      `.trim();

      const tables = await (processor as any).extractTables(mockText);

      expect(tables).toHaveLength(1);
      expect(tables[0].headers).toEqual(['Grant Program', 'Amount', 'Deadline']);
      expect(tables[0].rows).toHaveLength(3);
      expect(tables[0].rows[0]).toEqual(['Research Grants', '$25,000', 'March 15']);
    });

    it('should handle malformed tables', async () => {
      const mockText = `
This is not a table.
Just regular text.
      `.trim();

      const tables = await (processor as any).extractTables(mockText);

      expect(tables).toHaveLength(0);
    });
  });

  describe('Grant Information Extraction', () => {
    it('should extract title from text', () => {
      const text = `
COMMUNITY HEALTH GRANT OPPORTUNITY
This grant supports community health initiatives.
      `.trim();

      const title = (processor as any).extractTitle(text);
      expect(title).toBe('COMMUNITY HEALTH GRANT OPPORTUNITY');
    });

    it('should extract deadline from text', () => {
      const text = 'Deadline: March 15, 2024. Please submit on time.';
      const deadline = (processor as any).extractDeadline(text);
      expect(deadline).toContain('March 15, 2024');
    });

    it('should extract funding amount from text', () => {
      const text = 'Funding: Up to $50,000 per project is available.';
      const amount = (processor as any).extractFundingAmount(text);
      expect(amount).toBe('$50,000');
    });

    it('should extract eligibility criteria', () => {
      const text = `
Eligibility: Applicants must be 501(c)(3) nonprofit organizations 
with at least 2 years of experience in community health.
      `.trim();

      const eligibility = (processor as any).extractEligibility(text);
      expect(eligibility).toContain('501(c)(3) nonprofit');
    });

    it('should extract application URL', () => {
      const text = 'Apply online at https://grants.example.com/apply or visit our website.';
      const url = (processor as any).extractApplicationUrl(text);
      expect(url).toBe('https://grants.example.com/apply');
    });
  });

  describe('Section Header Detection', () => {
    it('should identify section headers correctly', () => {
      const processor_instance = processor as any;
      
      expect(processor_instance.isSectionHeader('ELIGIBILITY CRITERIA')).toBe(true);
      expect(processor_instance.isSectionHeader('1. Grant Overview')).toBe(true);
      expect(processor_instance.isSectionHeader('Application Process:')).toBe(true);
      expect(processor_instance.isSectionHeader('SECTION A')).toBe(true);
      
      // Should not identify regular text as headers
      expect(processor_instance.isSectionHeader('This is a regular sentence with normal text.')).toBe(false);
      expect(processor_instance.isSectionHeader('a')).toBe(false); // Too short
      expect(processor_instance.isSectionHeader('This is a very long line that contains too much text to be considered a section header and should be rejected')).toBe(false);
    });
  });

  describe('Table Row Detection', () => {
    it('should identify table rows correctly', () => {
      const processor_instance = processor as any;
      
      expect(processor_instance.isTableRow('Column1    Column2    Column3')).toBe(true);
      expect(processor_instance.isTableRow('Name       Amount     Date')).toBe(true);
      expect(processor_instance.isTableRow('Research   $25,000    March')).toBe(true);
      
      // Should not identify regular text as table rows
      expect(processor_instance.isTableRow('This is regular text')).toBe(false);
      expect(processor_instance.isTableRow('Single column')).toBe(false);
    });

    it('should parse table rows into columns', () => {
      const processor_instance = processor as any;
      
      const columns = processor_instance.parseTableRow('Research Grants    $25,000    March 15, 2024');
      expect(columns).toEqual(['Research Grants', '$25,000', 'March 15, 2024']);
    });
  });

  describe('OCR Decision Making', () => {
    it('should decide to use OCR for poor text extraction', () => {
      const processor_instance = processor as any;
      
      // Short text should trigger OCR
      expect(processor_instance.shouldUseOCR('abc')).toBe(true);
      
      // Text with many non-text characters should trigger OCR
      expect(processor_instance.shouldUseOCR('###@@@%%%***')).toBe(true);
      
      // Good text should not trigger OCR (longer text with reasonable content)
      const goodText = 'This is a well-extracted text from a PDF document with proper content that contains sufficient information for processing without requiring OCR assistance.';
      expect(processor_instance.shouldUseOCR(goodText)).toBe(false);
    });

    it('should combine text results appropriately', () => {
      const processor_instance = processor as any;
      
      const pdfText = 'This is text from PDF parsing.';
      const ocrText = 'This is text from OCR processing.';
      
      const combined = processor_instance.combineTextResults(pdfText, ocrText);
      expect(combined).toContain('PDF parsing');
      expect(combined).toContain('OCR processing');
    });
  });

  describe('Full PDF Processing', () => {
    it('should process PDF and extract grants', async () => {
      // Mock pdf-parse
      const pdfParse = await import('pdf-parse');
      vi.mocked(pdfParse.default).mockResolvedValue({
        text: `
COMMUNITY HEALTH GRANT
This grant supports community health initiatives in underserved areas.

ELIGIBILITY
Nonprofit organizations with 501(c)(3) status are eligible.

FUNDING
Up to $50,000 per project.

DEADLINE
Applications due March 15, 2024.
        `.trim(),
        info: {
          Title: 'Community Health Grant RFP',
          Author: 'Health Foundation'
        },
        numpages: 5
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
      expect(grants[0].title).toBe('COMMUNITY HEALTH GRANT');
      if (grants[0].description) {
        expect(grants[0].description).toContain('community health initiatives');
      }
      if (grants[0].deadline) {
        expect(grants[0].deadline).toBe('March 15, 2024');
      }
      if (grants[0].fundingAmount) {
        expect(grants[0].fundingAmount).toBe('$50,000');
      }
      if (grants[0].eligibility) {
        expect(grants[0].eligibility).toContain('501(c)(3)');
      }
      expect(grants[0].funderName).toBe('Health Foundation');
    });

    it('should handle PDF processing errors gracefully', async () => {
      // Mock pdf-parse to throw error
      const pdfParse = await import('pdf-parse');
      vi.mocked(pdfParse.default).mockRejectedValue(new Error('PDF parsing failed'));

      // Mock fetch for PDF download
      const mockPdfBuffer = Buffer.from('mock pdf content');
      const mockResponse = {
        ok: true,
        arrayBuffer: () => Promise.resolve(mockPdfBuffer.buffer)
      };
      (global.fetch as any).mockResolvedValue(mockResponse);

      await expect(processor.scrape(mockSourceConfig))
        .rejects.toThrow('PDF processing failed');
    });
  });

  describe('Configuration', () => {
    it('should use default configuration when none provided', () => {
      const defaultProcessor = new PDFProcessor();
      const config = (defaultProcessor as any).config;
      
      expect(config.enableOCR).toBe(true);
      expect(config.ocrLanguage).toBe('eng');
      expect(config.maxPages).toBe(50);
      expect(config.timeout).toBe(300000);
    });

    it('should merge custom configuration with defaults', () => {
      const customProcessor = new PDFProcessor({
        enableOCR: false,
        maxPages: 10
      });
      const config = (customProcessor as any).config;
      
      expect(config.enableOCR).toBe(false);
      expect(config.maxPages).toBe(10);
      expect(config.ocrLanguage).toBe('eng'); // Should keep default
    });
  });

  describe('Cleanup', () => {
    it('should cleanup resources properly', async () => {
      // Create a processor with OCR enabled to test worker cleanup
      const processorWithOCR = new PDFProcessor({ enableOCR: true });
      
      // Mock OCR worker
      const mockTerminate = vi.fn().mockResolvedValue(undefined);
      (processorWithOCR as any).ocrWorker = {
        terminate: mockTerminate
      };
      
      await processorWithOCR.cleanup();
      
      // Should terminate OCR worker
      expect(mockTerminate).toHaveBeenCalled();
      expect((processorWithOCR as any).ocrWorker).toBeNull();
    });
  });
});