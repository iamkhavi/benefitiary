/**
 * PDF Export Utilities
 * Generate professional PDFs from proposal content
 */

import jsPDF from 'jspdf';

interface ProposalData {
  title: string;
  organizationName: string;
  grantTitle: string;
  funderName: string;
  content: string;
  metadata?: {
    author?: string;
    date?: string;
    version?: string;
  };
}

export class PDFExporter {
  private doc: jsPDF;
  private pageWidth: number;
  private pageHeight: number;
  private margin: number;
  private currentY: number;
  private lineHeight: number;

  constructor() {
    this.doc = new jsPDF('p', 'mm', 'a4');
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
    this.margin = 20;
    this.currentY = this.margin;
    this.lineHeight = 7;
  }

  /**
   * Export proposal to PDF
   */
  async exportProposal(proposalData: ProposalData): Promise<Blob> {
    // Set document properties
    this.doc.setProperties({
      title: proposalData.title,
      subject: `Grant Proposal - ${proposalData.grantTitle}`,
      author: proposalData.organizationName,
      creator: 'Benefitiary AI Assistant'
    });

    // Add header
    this.addHeader(proposalData);
    
    // Add title page
    this.addTitlePage(proposalData);
    
    // Add content
    this.addContent(proposalData.content);
    
    // Add footer to all pages
    this.addFooters(proposalData);

    // Return PDF as blob
    return new Promise((resolve) => {
      const pdfBlob = this.doc.output('blob');
      resolve(pdfBlob);
    });
  }

  /**
   * Add professional header
   */
  private addHeader(proposalData: ProposalData): void {
    // Organization name
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(proposalData.organizationName, this.margin, this.currentY);
    
    // Date
    const date = proposalData.metadata?.date || new Date().toLocaleDateString();
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(10);
    this.doc.text(date, this.pageWidth - this.margin - 30, this.currentY);
    
    this.currentY += 15;
    
    // Add line separator
    this.doc.setDrawColor(200, 200, 200);
    this.doc.line(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY);
    this.currentY += 10;
  }

  /**
   * Add title page
   */
  private addTitlePage(proposalData: ProposalData): void {
    // Center the title vertically
    this.currentY = this.pageHeight / 3;
    
    // Main title
    this.doc.setFontSize(24);
    this.doc.setFont('helvetica', 'bold');
    const titleLines = this.doc.splitTextToSize(proposalData.title, this.pageWidth - 2 * this.margin);
    titleLines.forEach((line: string) => {
      const textWidth = this.doc.getTextWidth(line);
      const x = (this.pageWidth - textWidth) / 2;
      this.doc.text(line, x, this.currentY);
      this.currentY += 12;
    });
    
    this.currentY += 20;
    
    // Grant information
    this.doc.setFontSize(16);
    this.doc.setFont('helvetica', 'normal');
    
    const grantInfo = [
      `Grant Opportunity: ${proposalData.grantTitle}`,
      `Funding Organization: ${proposalData.funderName}`,
      `Submitted by: ${proposalData.organizationName}`
    ];
    
    grantInfo.forEach(info => {
      const textWidth = this.doc.getTextWidth(info);
      const x = (this.pageWidth - textWidth) / 2;
      this.doc.text(info, x, this.currentY);
      this.currentY += 10;
    });
    
    // Add new page for content
    this.doc.addPage();
    this.currentY = this.margin + 20;
  }

  /**
   * Add main content
   */
  private addContent(htmlContent: string): void {
    // Convert HTML to plain text and structure
    const textContent = this.htmlToText(htmlContent);
    const sections = this.parseContentSections(textContent);
    
    sections.forEach(section => {
      this.addSection(section.title, section.content);
    });
  }

  /**
   * Add a content section
   */
  private addSection(title: string, content: string): void {
    // Check if we need a new page
    if (this.currentY > this.pageHeight - 50) {
      this.doc.addPage();
      this.currentY = this.margin + 20;
    }
    
    // Section title
    this.doc.setFontSize(16);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(title, this.margin, this.currentY);
    this.currentY += 12;
    
    // Section content
    this.doc.setFontSize(11);
    this.doc.setFont('helvetica', 'normal');
    
    const lines = this.doc.splitTextToSize(content, this.pageWidth - 2 * this.margin);
    lines.forEach((line: string) => {
      // Check if we need a new page
      if (this.currentY > this.pageHeight - this.margin - 10) {
        this.doc.addPage();
        this.currentY = this.margin + 20;
      }
      
      this.doc.text(line, this.margin, this.currentY);
      this.currentY += this.lineHeight;
    });
    
    this.currentY += 10; // Space between sections
  }

  /**
   * Convert HTML to plain text
   */
  private htmlToText(html: string): string {
    // Remove HTML tags and decode entities
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
  }

  /**
   * Parse content into sections
   */
  private parseContentSections(content: string): Array<{ title: string; content: string }> {
    const sections: Array<{ title: string; content: string }> = [];
    const lines = content.split('\n').filter(line => line.trim());
    
    let currentSection: { title: string; content: string } | null = null;
    
    lines.forEach(line => {
      const trimmedLine = line.trim();
      
      // Check if this is a heading (simple heuristic)
      if (trimmedLine.length < 100 && 
          (trimmedLine.includes('Summary') || 
           trimmedLine.includes('Description') || 
           trimmedLine.includes('Budget') || 
           trimmedLine.includes('Impact') || 
           trimmedLine.includes('Timeline') || 
           trimmedLine.includes('Team') ||
           trimmedLine.includes('Methodology') ||
           trimmedLine.includes('Objectives'))) {
        
        // Save previous section
        if (currentSection) {
          sections.push(currentSection);
        }
        
        // Start new section
        currentSection = {
          title: trimmedLine,
          content: ''
        };
      } else if (currentSection && trimmedLine) {
        // Add content to current section
        currentSection.content += (currentSection.content ? '\n\n' : '') + trimmedLine;
      }
    });
    
    // Add the last section
    if (currentSection) {
      sections.push(currentSection);
    }
    
    return sections;
  }

  /**
   * Add footers to all pages
   */
  private addFooters(proposalData: ProposalData): void {
    const pageCount = this.doc.getNumberOfPages();
    
    for (let i = 1; i <= pageCount; i++) {
      this.doc.setPage(i);
      
      // Footer line
      this.doc.setDrawColor(200, 200, 200);
      this.doc.line(this.margin, this.pageHeight - 15, this.pageWidth - this.margin, this.pageHeight - 15);
      
      // Page number
      this.doc.setFontSize(9);
      this.doc.setFont('helvetica', 'normal');
      this.doc.text(
        `Page ${i} of ${pageCount}`,
        this.pageWidth - this.margin - 20,
        this.pageHeight - 8
      );
      
      // Organization name in footer
      this.doc.text(
        proposalData.organizationName,
        this.margin,
        this.pageHeight - 8
      );
    }
  }
}

/**
 * Utility function to download PDF
 */
export async function downloadProposalPDF(
  title: string,
  organizationName: string,
  grantTitle: string,
  funderName: string,
  content: string
): Promise<void> {
  const exporter = new PDFExporter();
  
  const proposalData: ProposalData = {
    title,
    organizationName,
    grantTitle,
    funderName,
    content,
    metadata: {
      date: new Date().toLocaleDateString(),
      version: '1.0'
    }
  };
  
  const pdfBlob = await exporter.exportProposal(proposalData);
  
  // Create download link
  const url = URL.createObjectURL(pdfBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_proposal.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}