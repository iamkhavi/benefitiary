/**
 * Example usage of PDF processor for grant extraction
 */

import { PDFProcessor } from '../engines/pdf-processor';
import { SourceConfiguration, ScrapedSourceType } from '../types';

export async function demonstratePDFProcessing() {
  // Create PDF processor instance
  const processor = new PDFProcessor({
    enableOCR: false, // Disable OCR for this example
    tempDir: '/tmp/pdf-demo',
    timeout: 60000
  });

  // Example source configuration for a PDF grant document
  const mockSource: SourceConfiguration = {
    id: 'example-pdf-grant',
    url: 'https://example.com/grant-rfp.pdf',
    type: ScrapedSourceType.FOUNDATION,
    engine: 'static',
    selectors: {} as any,
    rateLimit: {} as any,
    headers: {}
  };

  try {
    console.log('Processing PDF grant document...');
    
    // This would normally download and process a real PDF
    // For demo purposes, we'll show what the processor can extract
    
    const mockPdfContent = `
GATES FOUNDATION GLOBAL HEALTH GRANT

PROGRAM OVERVIEW
The Gates Foundation Global Health Grant Program supports innovative 
research and development projects that address critical health challenges 
in low- and middle-income countries.

ELIGIBILITY CRITERIA
• 501(c)(3) nonprofit organizations
• Academic and research institutions
• International NGOs with health focus
• Minimum 3 years relevant experience

FUNDING INFORMATION
Grant Amount: $100,000 - $500,000
Project Duration: 12-24 months
Indirect Costs: Maximum 15%

APPLICATION DEADLINE
Full proposals due: April 30, 2024
Award notification: June 15, 2024

CONTACT INFORMATION
Program Officer: Dr. Sarah Johnson
Email: globalhealth@gatesfoundation.org
Application Portal: https://grants.gatesfoundation.org/apply
    `.trim();

    // Demonstrate text analysis capabilities
    const analyzer = (processor as any).textAnalyzer;
    
    console.log('\n=== PDF Text Analysis Results ===');
    
    // Analyze different components
    const titleResults = analyzer.analyzeTitle(mockPdfContent);
    const deadlineResults = analyzer.analyzeDeadline(mockPdfContent);
    const fundingResults = analyzer.analyzeFunding(mockPdfContent);
    const eligibilityResults = analyzer.analyzeEligibility(mockPdfContent);
    const urlResults = analyzer.analyzeUrls(mockPdfContent);
    
    console.log('\nTitle Analysis:');
    titleResults.forEach((result: any, index: number) => {
      console.log(`  ${index + 1}. "${result.value}" (confidence: ${result.confidence})`);
    });
    
    console.log('\nDeadline Analysis:');
    deadlineResults.forEach((result: any, index: number) => {
      console.log(`  ${index + 1}. "${result.value}" (confidence: ${result.confidence})`);
    });
    
    console.log('\nFunding Analysis:');
    fundingResults.forEach((result: any, index: number) => {
      console.log(`  ${index + 1}. "${result.value}" (confidence: ${result.confidence})`);
    });
    
    console.log('\nEligibility Analysis:');
    eligibilityResults.slice(0, 2).forEach((result: any, index: number) => {
      console.log(`  ${index + 1}. "${result.value.substring(0, 100)}..." (confidence: ${result.confidence})`);
    });
    
    console.log('\nURL Analysis:');
    urlResults.forEach((result: any, index: number) => {
      console.log(`  ${index + 1}. "${result.value}" (confidence: ${result.confidence})`);
    });
    
    // Demonstrate best match selection
    console.log('\n=== Best Matches ===');
    console.log(`Best Title: "${analyzer.getBestMatch(titleResults)?.value}"`);
    console.log(`Best Deadline: "${analyzer.getBestMatch(deadlineResults)?.value}"`);
    console.log(`Best Funding: "${analyzer.getBestMatch(fundingResults)?.value}"`);
    console.log(`Best URL: "${analyzer.getBestMatch(urlResults)?.value}"`);
    
    // Demonstrate grant type detection
    const grantTypes = analyzer.detectGrantType(mockPdfContent);
    console.log(`\nDetected Grant Types: ${grantTypes.join(', ')}`);
    
    // Demonstrate contact extraction
    const contactInfo = analyzer.extractContactInfo(mockPdfContent);
    console.log(`\nContact Information:`);
    console.log(`  Emails: ${contactInfo.emails.join(', ')}`);
    console.log(`  Websites: ${contactInfo.websites.join(', ')}`);
    
    // Demonstrate text quality assessment
    const textQuality = analyzer.calculateTextQuality(mockPdfContent);
    console.log(`\nText Quality Score: ${textQuality.toFixed(2)}`);
    
    // Demonstrate key phrase extraction
    const keyPhrases = analyzer.extractKeyPhrases(mockPdfContent, 8);
    console.log(`\nKey Phrases: ${keyPhrases.join(', ')}`);
    
    console.log('\n=== PDF Processing Complete ===');
    
  } catch (error) {
    console.error('Error processing PDF:', error);
  } finally {
    // Clean up resources
    await processor.cleanup();
  }
}

// Export for use in other examples or tests
export { PDFProcessor };

// Run example if this file is executed directly
if (require.main === module) {
  demonstratePDFProcessing().catch(console.error);
}