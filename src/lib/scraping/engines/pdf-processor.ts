/**
 * PDF Processing Engine for extracting grant information from PDF documents
 * Supports text extraction, table parsing, form field identification, and OCR
 */

const pdfParse = require('pdf-parse');
import { createWorker } from 'tesseract.js';
import pdf2pic from 'pdf2pic';
import { promises as fs } from 'fs';
import path from 'path';
import { ScrapingEngine, RawGrantData, SourceConfiguration, ScrapingError } from '../types';
import { PDFTextAnalyzer } from '../utils/pdf-text-analyzer';

export interface PDFProcessorConfig {
  enableOCR: boolean;
  ocrLanguage: string;
  maxPages: number;
  imageQuality: number;
  tempDir: string;
  timeout: number;
}

export interface PDFTextSection {
  title?: string;
  content: string;
  pageNumber: number;
  confidence: number;
}

export interface PDFTable {
  headers: string[];
  rows: string[][];
  pageNumber: number;
}

export interface PDFFormField {
  name: string;
  value: string;
  type: 'text' | 'checkbox' | 'radio' | 'select';
  pageNumber: number;
}

export interface PDFProcessingResult {
  text: string;
  sections: PDFTextSection[];
  tables: PDFTable[];
  formFields: PDFFormField[];
  metadata: {
    title?: string;
    author?: string;
    subject?: string;
    creator?: string;
    producer?: string;
    creationDate?: Date;
    modificationDate?: Date;
    pages: number;
  };
}

export class PDFProcessor implements ScrapingEngine {
  private config: PDFProcessorConfig;
  private ocrWorker: any;
  private textAnalyzer: PDFTextAnalyzer;

  constructor(config: Partial<PDFProcessorConfig> = {}) {
    this.config = {
      enableOCR: true,
      ocrLanguage: 'eng',
      maxPages: 50,
      imageQuality: 2,
      tempDir: '/tmp/pdf-processing',
      timeout: 300000, // 5 minutes
      ...config
    };
    this.textAnalyzer = new PDFTextAnalyzer();
  }

  async scrape(source: SourceConfiguration): Promise<RawGrantData[]> {
    try {
      // For PDF processing, the URL should point to a PDF file
      const pdfBuffer = await this.downloadPDF(source.url);
      const processingResult = await this.processPDF(pdfBuffer);
      
      return await this.extractGrantsFromPDF(processingResult, source);
    } catch (error) {
      throw new Error(`PDF processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async downloadPDF(url: string): Promise<Buffer> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download PDF: ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async processPDF(pdfBuffer: Buffer): Promise<PDFProcessingResult> {
    try {
      // Extract text and metadata using pdf-parse
      const pdfData = await pdfParse(pdfBuffer);
      
      const result: PDFProcessingResult = {
        text: pdfData.text,
        sections: [],
        tables: [],
        formFields: [],
        metadata: {
          title: pdfData.info?.Title,
          author: pdfData.info?.Author,
          subject: pdfData.info?.Subject,
          creator: pdfData.info?.Creator,
          producer: pdfData.info?.Producer,
          creationDate: pdfData.info?.CreationDate ? new Date(pdfData.info.CreationDate) : undefined,
          modificationDate: pdfData.info?.ModDate ? new Date(pdfData.info.ModDate) : undefined,
          pages: pdfData.numpages
        }
      };

      // Parse sections from text
      result.sections = await this.parseTextSections(pdfData.text);
      
      // Extract tables from text
      result.tables = await this.extractTables(pdfData.text);
      
      // If OCR is enabled and text extraction yielded poor results, use OCR
      if (this.config.enableOCR && this.shouldUseOCR(pdfData.text)) {
        const ocrResult = await this.performOCR(pdfBuffer);
        result.text = this.combineTextResults(pdfData.text, ocrResult.text);
        result.sections = [...result.sections, ...ocrResult.sections];
      }

      return result;
    } catch (error) {
      throw new Error(`PDF processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async parseTextSections(text: string): Promise<PDFTextSection[]> {
    const sections: PDFTextSection[] = [];
    const lines = text.split('\n');
    let currentSection: PDFTextSection | null = null;
    let pageNumber = 1;

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Detect page breaks
      if (this.isPageBreak(trimmedLine)) {
        pageNumber++;
        continue;
      }

      // Detect section headers (lines that are all caps, short, or have specific patterns)
      if (this.isSectionHeader(trimmedLine)) {
        // Save previous section
        if (currentSection) {
          sections.push(currentSection);
        }
        
        // Start new section
        currentSection = {
          title: trimmedLine,
          content: '',
          pageNumber,
          confidence: 0.8
        };
      } else if (currentSection && trimmedLine) {
        // Add content to current section
        currentSection.content += (currentSection.content ? '\n' : '') + trimmedLine;
      } else if (!currentSection && trimmedLine) {
        // Create a section without title for orphaned content
        currentSection = {
          content: trimmedLine,
          pageNumber,
          confidence: 0.6
        };
      }
    }

    // Add the last section
    if (currentSection) {
      sections.push(currentSection);
    }

    return sections;
  }

  private async extractTables(text: string): Promise<PDFTable[]> {
    const tables: PDFTable[] = [];
    const lines = text.split('\n');
    let currentTable: PDFTable | null = null;
    let pageNumber = 1;

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (this.isPageBreak(trimmedLine)) {
        pageNumber++;
        continue;
      }

      // Detect table rows (lines with multiple columns separated by spaces/tabs)
      if (this.isTableRow(trimmedLine)) {
        const columns = this.parseTableRow(trimmedLine);
        
        if (!currentTable) {
          // Start new table with headers
          currentTable = {
            headers: columns,
            rows: [],
            pageNumber
          };
        } else {
          // Add row to current table
          currentTable.rows.push(columns);
        }
      } else if (currentTable && !trimmedLine) {
        // Empty line might indicate end of table
        if (currentTable.rows.length > 0) {
          tables.push(currentTable);
          currentTable = null;
        }
      }
    }

    // Add the last table
    if (currentTable && currentTable.rows.length > 0) {
      tables.push(currentTable);
    }

    return tables;
  }

  private async performOCR(pdfBuffer: Buffer): Promise<{ text: string; sections: PDFTextSection[] }> {
    if (!this.ocrWorker) {
      this.ocrWorker = await createWorker(this.config.ocrLanguage);
    }

    try {
      // Convert PDF pages to images
      const images = await this.convertPDFToImages(pdfBuffer);
      let combinedText = '';
      const sections: PDFTextSection[] = [];

      for (let i = 0; i < images.length; i++) {
        const { data: { text, confidence } } = await this.ocrWorker.recognize(images[i]);
        combinedText += text + '\n';
        
        sections.push({
          content: text,
          pageNumber: i + 1,
          confidence: confidence / 100 // Convert to 0-1 scale
        });
      }

      return { text: combinedText, sections };
    } catch (error) {
      throw new Error(`OCR processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async convertPDFToImages(pdfBuffer: Buffer): Promise<string[]> {
    // Create temp directory if it doesn't exist
    await fs.mkdir(this.config.tempDir, { recursive: true });
    
    // Save PDF to temp file
    const tempPdfPath = path.join(this.config.tempDir, `temp_${Date.now()}.pdf`);
    await fs.writeFile(tempPdfPath, pdfBuffer);

    try {
      const convertOptions = {
        density: 100 * this.config.imageQuality,
        saveFilename: "page",
        savePath: this.config.tempDir,
        format: "png",
        width: 2048,
        height: 2048
      };

      const convert2pic = pdf2pic.fromPath(tempPdfPath, convertOptions);
      const results = await convert2pic.bulk(-1, { responseType: "image" });
      
      return results.map(result => result.path).filter((path): path is string => path !== undefined);
    } finally {
      // Clean up temp PDF file
      await fs.unlink(tempPdfPath).catch(() => {});
    }
  }

  private async extractGrantsFromPDF(
    processingResult: PDFProcessingResult, 
    source: SourceConfiguration
  ): Promise<RawGrantData[]> {
    const grants: RawGrantData[] = [];
    
    // Look for grant information in sections
    for (const section of processingResult.sections) {
      const grantData = await this.extractGrantFromSection(section, processingResult, source);
      if (grantData) {
        grants.push(grantData);
      }
    }

    // If no grants found in sections, try to extract from full text
    if (grants.length === 0) {
      const grantData = await this.extractGrantFromFullText(processingResult, source);
      if (grantData) {
        grants.push(grantData);
      }
    }

    return grants;
  }

  private async extractGrantFromSection(
    section: PDFTextSection,
    processingResult: PDFProcessingResult,
    source: SourceConfiguration
  ): Promise<RawGrantData | null> {
    const content = section.content.toLowerCase();
    
    // Check if this section contains grant-related keywords
    const grantKeywords = [
      'grant', 'funding', 'award', 'opportunity', 'rfp', 'request for proposal',
      'application', 'deadline', 'eligibility', 'amount', 'budget'
    ];
    
    const hasGrantKeywords = grantKeywords.some(keyword => content.includes(keyword));
    if (!hasGrantKeywords) {
      return null;
    }

    // Extract grant information
    const title = section.title || this.extractTitle(section.content);
    const description = this.extractDescription(section.content);
    const deadline = this.extractDeadline(section.content);
    const fundingAmount = this.extractFundingAmount(section.content);
    const eligibility = this.extractEligibility(section.content);
    const applicationUrl = this.extractApplicationUrl(section.content);

    return {
      title: title || 'Untitled Grant Opportunity',
      description,
      deadline,
      fundingAmount,
      eligibility,
      applicationUrl,
      funderName: processingResult.metadata.author || 'Unknown Funder',
      sourceUrl: source.url,
      scrapedAt: new Date(),
      rawContent: {
        section: section,
        metadata: processingResult.metadata,
        pageNumber: section.pageNumber,
        confidence: section.confidence
      }
    };
  }

  private async extractGrantFromFullText(
    processingResult: PDFProcessingResult,
    source: SourceConfiguration
  ): Promise<RawGrantData | null> {
    const text = processingResult.text;
    
    const title = processingResult.metadata.title || this.extractTitle(text);
    const description = this.extractDescription(text);
    const deadline = this.extractDeadline(text);
    const fundingAmount = this.extractFundingAmount(text);
    const eligibility = this.extractEligibility(text);
    const applicationUrl = this.extractApplicationUrl(text);

    return {
      title: title || 'PDF Grant Opportunity',
      description,
      deadline,
      fundingAmount,
      eligibility,
      applicationUrl,
      funderName: processingResult.metadata.author || 'Unknown Funder',
      sourceUrl: source.url,
      scrapedAt: new Date(),
      rawContent: {
        fullText: text,
        metadata: processingResult.metadata,
        sections: processingResult.sections,
        tables: processingResult.tables
      }
    };
  }

  // Helper methods for text analysis
  private isPageBreak(line: string): boolean {
    return /^page\s+\d+/i.test(line) || /^\d+$/.test(line) || line.includes('Page ');
  }

  private isSectionHeader(line: string): boolean {
    if (line.length > 100) return false; // Too long to be a header
    if (line.length < 3) return false; // Too short
    
    // Check for common header patterns
    const headerPatterns = [
      /^[A-Z\s]+$/, // All caps
      /^\d+\.\s+[A-Z]/, // Numbered section
      /^[A-Z][a-z]+(\s+[A-Z][a-z]+)*:?$/, // Title case
      /^(SECTION|PART|CHAPTER)\s+/i,
      /^(ELIGIBILITY|DEADLINE|FUNDING|APPLICATION|REQUIREMENTS)/i
    ];
    
    return headerPatterns.some(pattern => pattern.test(line));
  }

  private isTableRow(line: string): boolean {
    // Look for lines with multiple columns separated by whitespace
    const columns = line.split(/\s{2,}/).filter(col => col.trim());
    return columns.length >= 2 && columns.length <= 10;
  }

  private parseTableRow(line: string): string[] {
    return line.split(/\s{2,}/).map(col => col.trim()).filter(col => col);
  }

  private shouldUseOCR(extractedText: string): boolean {
    // Use OCR if extracted text is too short or contains many non-text characters
    const textLength = extractedText.trim().length;
    const nonTextRatio = (extractedText.match(/[^\w\s]/g) || []).length / textLength;
    
    return textLength < 100 || nonTextRatio > 0.3;
  }

  private combineTextResults(pdfText: string, ocrText: string): string {
    // If PDF text is significantly longer, prefer it
    if (pdfText.length > ocrText.length * 1.5) {
      return pdfText;
    }
    
    // If OCR text is much longer, prefer it
    if (ocrText.length > pdfText.length * 1.5) {
      return ocrText;
    }
    
    // Combine both with OCR as fallback
    return pdfText + '\n\n--- OCR SUPPLEMENT ---\n\n' + ocrText;
  }

  private extractTitle(text: string): string | undefined {
    const titleResults = this.textAnalyzer.analyzeTitle(text);
    const bestTitle = this.textAnalyzer.getBestMatch(titleResults);
    return bestTitle?.value;
  }

  private extractDescription(text: string): string | undefined {
    const descriptionResults = this.textAnalyzer.analyzeDescription(text);
    const bestDescription = this.textAnalyzer.getBestMatch(descriptionResults);
    return bestDescription?.value;
  }

  private extractDeadline(text: string): string | undefined {
    const deadlineResults = this.textAnalyzer.analyzeDeadline(text);
    const bestDeadline = this.textAnalyzer.getBestMatch(deadlineResults);
    return bestDeadline?.value;
  }

  private extractFundingAmount(text: string): string | undefined {
    const fundingResults = this.textAnalyzer.analyzeFunding(text);
    const bestFunding = this.textAnalyzer.getBestMatch(fundingResults);
    return bestFunding?.value;
  }

  private extractEligibility(text: string): string | undefined {
    const eligibilityResults = this.textAnalyzer.analyzeEligibility(text);
    const bestEligibility = this.textAnalyzer.getBestMatch(eligibilityResults);
    return bestEligibility?.value;
  }

  private extractApplicationUrl(text: string): string | undefined {
    const urlResults = this.textAnalyzer.analyzeUrls(text);
    const bestUrl = this.textAnalyzer.getBestMatch(urlResults);
    return bestUrl?.value;
  }

  async cleanup(): Promise<void> {
    if (this.ocrWorker) {
      await this.ocrWorker.terminate();
      this.ocrWorker = null;
    }
    
    // Clean up temp directory
    try {
      const files = await fs.readdir(this.config.tempDir);
      await Promise.all(
        files.map(file => 
          fs.unlink(path.join(this.config.tempDir, file)).catch(() => {})
        )
      );
    } catch (error) {
      // Ignore cleanup errors
    }
  }
}