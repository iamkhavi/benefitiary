/**
 * Maya - Simple Grant Consultant Agent
 * Uses LangChain for agentic behavior without over-engineering
 */

import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

interface ChatContext {
  userId: string;
  grantId: string;
  sessionId?: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
}

interface MayaResponse {
  content: string;
  confidence: number;
  reasoning?: string;
  suggestions?: string[];
  contentType?: 'chat' | 'proposal_section' | 'document_extract';
  extractedContent?: {
    section: string;
    title: string;
    content: string;
  };
}

export class MayaAgent {
  private llm: ChatOpenAI;
  private context: ChatContext | null = null;

  constructor() {
    this.llm = new ChatOpenAI({
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 4000, // Increased for longer content generation
      openAIApiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Initialize Maya with user and grant context
   */
  async initialize(userId: string, grantId: string, sessionId?: string): Promise<void> {
    // Load user organization and grant data
    const [user, grant] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        include: { organization: true }
      }),
      prisma.grant.findUnique({
        where: { id: grantId },
        include: { funder: true }
      })
    ]);

    if (!user || !grant) {
      throw new Error('User or grant not found');
    }

    // Load conversation history if session exists
    let messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];
    if (sessionId) {
      const session = await prisma.aIGrantSession.findUnique({
        where: { id: sessionId },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
            take: 20 // Keep last 20 messages for context
          }
        }
      });

      if (session) {
        messages = session.messages.map(msg => ({
          role: msg.sender === 'USER' ? 'user' as const : 'assistant' as const,
          content: msg.content
        }));
      }
    }

    this.context = {
      userId,
      grantId,
      sessionId,
      messages
    };

    // Store context for prompt generation
    this.userContext = user;
    this.grantContext = grant;
  }

  private userContext: any;
  private grantContext: any;

  /**
   * Generate Maya's expert persona prompt with context
   */
  private generateSystemPrompt(): string {
    const org = this.userContext?.organization;
    const grant = this.grantContext;

    return `You are Maya, a grant consultant with 15+ years of experience helping organizations secure funding. You provide expert, personalized advice in a natural, conversational tone.

**CURRENT CLIENT CONTEXT:**

**Organization:** ${org?.name || 'Organization'}
- Type: ${org?.orgType?.replace(/_/g, ' ') || 'Not specified'}
- Size: ${org?.orgSize?.replace(/_/g, ' ') || 'Not specified'}  
- Location: ${org?.country || 'Not specified'}
- Industries: ${org?.industries?.join(', ') || 'Not specified'}

**Grant Opportunity:** ${grant?.title || 'Grant Opportunity'}
- Funder: ${grant?.funder?.name || 'Not specified'}
- Funding Range: $${grant?.fundingAmountMin?.toLocaleString() || '0'} - $${grant?.fundingAmountMax?.toLocaleString() || '0'}
- Deadline: ${grant?.deadline ? new Date(grant.deadline).toLocaleDateString() : 'Not specified'}
- Category: ${grant?.category?.replace(/_/g, ' ') || 'Not specified'}

**YOUR CONSULTATION STYLE:**
- ALWAYS acknowledge and validate the user's request in the first 1-2 sentences
- Show you understand what they're asking for before providing guidance
- Speak with warmth and empathy, like a supportive mentor who genuinely cares
- Be encouraging and optimistic while remaining strategically realistic
- Reference the specific organization and grant in your advice
- Provide actionable, concrete recommendations with positive framing
- Explain your reasoning clearly but gently
- Ask clarifying questions with curiosity, not judgment
- Celebrate their efforts and acknowledge the courage it takes to seek funding
- PROACTIVELY ASK FOR RESOURCES when they would help create better proposals

**YOUR CAPABILITIES:**
- You CAN generate proposal content that appears on the document canvas
- You CAN create exportable documents (PDFs, Word docs, any document type)
- You ARE connected to a collaborative document editor
- When users request proposal content, you generate it and place it on their canvas
- You help users create professional, exportable documents of any kind
- You CAN analyze uploaded RFP documents, proposal samples, and guidelines
- You ADAPT your writing style and format based on uploaded examples
- You UNDERSTAND that each funder has unique requirements and preferences

**IMPORTANT: FUNDER-SPECIFIC ADAPTATION:**
- EVERY funder has different requirements, formats, and evaluation criteria
- ALWAYS ask for the specific RFP, guidelines, or proposal samples when available
- ADAPT your content structure, tone, and focus based on funder preferences
- NEVER assume a one-size-fits-all approach to proposal writing
- CUSTOMIZE sections, headings, and emphasis based on what the funder values
- REFERENCE specific evaluation criteria from RFPs when creating content

**ETHICAL STANDARDS & INTEGRITY:**
- NEVER expose or reference specific user data, PII, or database information
- Be honest about grant fit - if organization and funder priorities don't align, say so
- Provide realistic assessments from a reviewer's perspective
- Suggest alternative strategies or better-suited opportunities when appropriate
- Your goal is to help users WIN, not just apply - be their strategic advisor
- Maintain confidentiality and never share user information across sessions

**CRITICAL FORMATTING RULES FOR PROPOSALS:**
- Generate clean HTML content with proper <h3>, <p>, <strong>, <ul>, <li> tags
- NO asterisks (*), NO markdown formatting, NO informal symbols
- Use <strong>Bold Text</strong> for emphasis, never **text**
- Structure with clear headings: <h3>Professional Section Title</h3>
- Write formal, academic language in third person
- Include specific metrics, dates, and concrete details
- Create professional paragraphs with <p> tags
- Use <ul><li> for bulleted lists when appropriate
- Output must be publication-ready, formal business document quality

**WHEN TO ASK FOR ADDITIONAL RESOURCES:**
- **RFP Documents**: ALWAYS ask for the complete RFP/guidelines - this is CRITICAL for proper formatting and content
- **Proposal Samples**: Ask for successful proposals to this funder or similar funders to understand their preferences
- **Funder Guidelines**: Request any additional funder-specific requirements or evaluation rubrics
- **Previous Proposals**: When they mention past grant applications or want to improve existing content
- **CVs/Resumes**: When discussing team qualifications or project leadership
- **Budget Information**: When creating budget sections or discussing financial capacity
- **Organizational Documents**: When discussing organizational capacity, track record, or capabilities
- **Financial Statements**: When discussing organizational sustainability or matching funds
- **Letters of Support**: When discussing partnerships or community endorsements
- **Project Plans**: When they mention existing project documentation
- **Impact Data**: When discussing outcomes, metrics, or evaluation frameworks

**CRITICAL: FUNDER RESEARCH LIMITATIONS:**
- You do NOT have web search capabilities to research funders in real-time
- You CANNOT browse the internet for current funder information
- You MUST rely on uploaded documents and user-provided information
- ALWAYS be transparent about these limitations when users ask about current funder requirements

**HOW TO ASK FOR RESOURCES:**
- Be specific about what you need and why it would help
- Explain how the resource will improve their proposal
- Offer alternatives if they don't have the exact document
- Make it easy by suggesting they can upload files or share key information

**EXAMPLE REQUESTS:**
- "To write a stronger team section, could you share CVs of key project staff? This will help me highlight their relevant experience."
- "For the budget section, do you have a detailed budget breakdown or financial projections? Even a rough draft would help me create more accurate content."
- "It sounds like you've applied for similar grants before. Could you share a previous proposal? I can help you improve and adapt it for this opportunity."
- "Do you have the full RFP document? I'd like to review the specific evaluation criteria to make sure we address everything."

**AVOID:**
- Robotic or template-like responses
- Generic advice that could apply to anyone
- Capability lists or menu options
- Overly formal language
- Asking for resources you don't actually need

Remember: You're a proactive consultant who asks for what you need to do the best job possible. Use that knowledge to provide personalized, expert guidance.`;
  }

  /**
   * Check for uploaded RFP or funder documents in the session
   */
  private async getUploadedFunderDocuments(): Promise<string> {
    if (!this.context?.sessionId) return '';

    try {
      const contextFiles = await prisma.aIContextFile.findMany({
        where: { sessionId: this.context.sessionId },
        orderBy: { createdAt: 'desc' }
      });

      if (contextFiles.length === 0) return '';

      let funderContext = '\n\n**UPLOADED FUNDER DOCUMENTS:**\n';
      for (const file of contextFiles) {
        funderContext += `\n**${file.fileName}:**\n${file.summary}\n`;
        if (file.extractedText) {
          // Include key excerpts from RFP/guidelines
          const excerpt = file.extractedText.substring(0, 1000);
          funderContext += `Key content: ${excerpt}...\n`;
        }
      }

      return funderContext;
    } catch (error) {
      console.error('Error fetching uploaded documents:', error);
      return '';
    }
  }

  /**
   * Generate complete proposal with cover page, table of contents, and content
   */
  async generateCompleteProposal(sections: string[] = ['executive', 'project', 'budget', 'impact', 'timeline', 'team']): Promise<MayaResponse> {
    if (!this.context) {
      throw new Error('Maya agent not initialized. Call initialize() first.');
    }

    try {
      const org = this.userContext?.organization;
      const grant = this.grantContext;

      // Generate cover page
      const coverPage = this.generateCoverPage();

      // Generate table of contents
      const tableOfContents = this.generateTableOfContents(sections);

      // Generate all content sections
      const contentSections = [];
      for (const section of sections) {
        const sectionContent = await this.generateProposalSectionContent(section);
        contentSections.push(sectionContent);
      }

      // Combine all parts with styling
      const completeProposal = `
        <style>
          ${this.getProposalCSS()}
        </style>
        <div class="proposal-document">
          <!-- Page 1: Cover Page -->
          <div class="page cover-page">
            ${coverPage}
          </div>
          
          <!-- Page 2: Table of Contents -->
          <div class="page table-of-contents">
            ${tableOfContents}
          </div>
          
          <!-- Content Pages -->
          ${contentSections.map((content, index) => `
            <div class="page content-page">
              <div class="page-header">
                <div class="page-number">Page ${index + 3}</div>
              </div>
              ${content}
            </div>
          `).join('')}
        </div>
      `;

      return {
        content: `I've generated your complete proposal with professional formatting! Here's what I've created:

**Your Proposal Structure:**
• **Page 1**: Professional cover page with ${org?.name || 'your organization'}'s information
• **Page 2**: Comprehensive table of contents for easy navigation
• **Pages 3+**: All proposal sections with detailed, compelling content

The proposal is now ready for ${grant?.funder?.name || 'your target funder'} and follows professional grant application standards. Each section builds a strong case for funding your project.

**What's Included:**
• Executive summary highlighting your key value proposition
• Detailed project description with methodology and innovation
• Comprehensive budget overview with justifications
• Expected impact and measurable outcomes
• Project timeline with key milestones
• Team qualifications and organizational capacity

You can now export this as a PDF or Word document for submission. Would you like me to adjust any specific sections or help you customize the formatting further?`,
        confidence: 0.95,
        reasoning: 'Generated complete proposal with professional page structure',
        suggestions: [
          'Review and customize the cover page information',
          'Add your organization logo to the cover page',
          'Export as PDF for professional submission',
          'Customize sections based on funder requirements'
        ],
        contentType: 'proposal_section',
        extractedContent: {
          section: 'complete_proposal',
          title: 'Complete Grant Proposal',
          content: completeProposal
        }
      };

    } catch (error) {
      console.error('Maya complete proposal generation error:', error);
      throw new Error('Something went wrong generating the complete proposal. Please try again.');
    }
  }

  /**
   * Generate professional cover page
   */
  private generateCoverPage(): string {
    const org = this.userContext?.organization;
    const grant = this.grantContext;
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return `
      <div class="cover-page-content">
        <div class="header-section">
          <div class="organization-branding">
            <div class="logo-container">
              <div class="logo-placeholder">[ORGANIZATION LOGO]</div>
            </div>
            <div class="org-name-header">
              <h1 class="organization-name">${org?.name || 'Organization Name'}</h1>
              <p class="org-tagline">${org?.orgType?.replace(/_/g, ' ') || 'Organization Type'}</p>
            </div>
          </div>
        </div>
        
        <div class="title-section">
          <div class="proposal-header">
            <h1 class="main-title">Grant Proposal</h1>
            <div class="title-underline"></div>
          </div>
          
          <div class="grant-details">
            <h2 class="grant-title">${grant?.title || 'Grant Opportunity Title'}</h2>
            <p class="grant-subtitle">Funding Request Proposal</p>
          </div>
        </div>
        
        <div class="submission-section">
          <div class="submission-grid">
            <div class="submission-item">
              <h3>Submitted To:</h3>
              <p class="funder-name">${grant?.funder?.name || 'Funding Organization'}</p>
            </div>
            
            <div class="submission-item">
              <h3>Submitted By:</h3>
              <p class="applicant-name">${org?.name || 'Organization Name'}</p>
              <p class="applicant-location">${org?.country || 'Location'}</p>
            </div>
            
            <div class="submission-item">
              <h3>Submission Date:</h3>
              <p class="submission-date">${currentDate}</p>
            </div>
            
            <div class="submission-item">
              <h3>Requested Amount:</h3>
              <p class="requested-amount">$${grant?.fundingAmountMax?.toLocaleString() || '[Amount]'}</p>
            </div>
          </div>
        </div>
        
        <div class="contact-section">
          <h3>Primary Contact Information</h3>
          <div class="contact-grid">
            <div class="contact-item">
              <strong>Principal Investigator:</strong><br>
              [Principal Investigator Name]<br>
              [Title/Position]
            </div>
            <div class="contact-item">
              <strong>Contact Details:</strong><br>
              Email: [contact@organization.com]<br>
              Phone: [Phone Number]
            </div>
          </div>
        </div>
        
        <div class="cover-footer">
          <div class="footer-line"></div>
          <p class="confidentiality-notice">This proposal contains confidential and proprietary information</p>
        </div>
      </div>
    `;
  }

  /**
   * Generate table of contents
   */
  private generateTableOfContents(sections: string[]): string {
    const sectionTitles = {
      'executive': 'Executive Summary',
      'project': 'Project Description',
      'budget': 'Budget Overview',
      'impact': 'Expected Impact & Outcomes',
      'timeline': 'Project Timeline',
      'team': 'Team & Organizational Capacity'
    };

    let pageNumber = 3; // Start after cover page and TOC
    const tocEntries = sections.map(section => {
      const title = sectionTitles[section as keyof typeof sectionTitles] ||
        section.charAt(0).toUpperCase() + section.slice(1);
      const entry = `<div class="toc-entry"><span class="toc-title">${title}</span><span class="toc-page">${pageNumber}</span></div>`;
      pageNumber++;
      return entry;
    });

    return `
      <div class="table-of-contents-content">
        <h1>Table of Contents</h1>
        <div class="toc-list">
          ${tocEntries.join('\n          ')}
        </div>
      </div>
    `;
  }

  /**
   * Generate CSS for proposal formatting
   */
  private getProposalCSS(): string {
    return `
      .proposal-document {
        font-family: 'Times New Roman', serif;
        line-height: 1.6;
        color: #333;
      }
      
      .page {
        min-height: 11in;
        width: 8.5in;
        margin: 0 auto 1in auto;
        padding: 1in;
        background: white;
        box-shadow: 0 0 10px rgba(0,0,0,0.1);
        page-break-after: always;
      }
      
      .cover-page {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        text-align: center;
      }
      
      .cover-page-content .header-section {
        margin-bottom: 2in;
      }
      
      .logo-placeholder {
        border: 2px dashed #ccc;
        padding: 40px;
        margin: 20px auto;
        width: 200px;
        color: #666;
        font-style: italic;
      }
      
      .title-section h1 {
        font-size: 36px;
        margin-bottom: 20px;
        color: #2c3e50;
      }
      
      .title-section h2 {
        font-size: 24px;
        margin-bottom: 30px;
        color: #34495e;
      }
      
      .organization-section, .contact-section {
        margin: 40px 0;
        text-align: left;
      }
      
      .org-name {
        font-size: 20px;
        color: #2c3e50;
      }
      
      .submission-info {
        margin-top: 60px;
        padding-top: 20px;
        border-top: 1px solid #eee;
      }
      
      .table-of-contents-content h1 {
        font-size: 28px;
        margin-bottom: 40px;
        text-align: center;
        color: #2c3e50;
      }
      
      .toc-list {
        margin-top: 40px;
      }
      
      .toc-entry {
        display: flex;
        justify-content: space-between;
        padding: 10px 0;
        border-bottom: 1px dotted #ccc;
        font-size: 16px;
      }
      
      .toc-title {
        font-weight: bold;
      }
      
      .content-page {
        position: relative;
      }
      
      .page-header {
        position: absolute;
        top: 0.5in;
        right: 0.5in;
        font-size: 12px;
        color: #666;
      }
      
      .content-page h3 {
        font-size: 20px;
        margin: 30px 0 20px 0;
        color: #2c3e50;
        border-bottom: 2px solid #3498db;
        padding-bottom: 10px;
      }
      
      .content-page p {
        margin-bottom: 15px;
        text-align: justify;
      }
      
      .content-page ul {
        margin: 15px 0;
        padding-left: 30px;
      }
      
      .content-page li {
        margin-bottom: 8px;
      }
      
      .content-page strong {
        color: #2c3e50;
      }
      
      /* Enhanced Cover Page Styles */
      .organization-branding {
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 40px;
        gap: 30px;
      }
      
      .logo-container {
        flex-shrink: 0;
      }
      
      .logo-placeholder {
        border: 2px dashed #3498db;
        padding: 30px;
        width: 120px;
        height: 120px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #3498db;
        font-style: italic;
        font-size: 12px;
        text-align: center;
        border-radius: 8px;
      }
      
      .org-name-header {
        text-align: left;
      }
      
      .organization-name {
        font-size: 28px;
        font-weight: bold;
        color: #2c3e50;
        margin: 0 0 8px 0;
        line-height: 1.2;
      }
      
      .org-tagline {
        font-size: 16px;
        color: #7f8c8d;
        margin: 0;
        font-style: italic;
      }
      
      .proposal-header {
        text-align: center;
        margin: 60px 0 40px 0;
      }
      
      .main-title {
        font-size: 42px;
        font-weight: bold;
        color: #2c3e50;
        margin: 0 0 15px 0;
        letter-spacing: 2px;
      }
      
      .title-underline {
        width: 200px;
        height: 4px;
        background: linear-gradient(90deg, #3498db, #2980b9);
        margin: 0 auto;
        border-radius: 2px;
      }
      
      .grant-details {
        text-align: center;
        margin: 40px 0;
      }
      
      .grant-title {
        font-size: 24px;
        color: #34495e;
        margin: 0 0 10px 0;
        font-weight: 600;
      }
      
      .grant-subtitle {
        font-size: 16px;
        color: #7f8c8d;
        margin: 0;
        font-style: italic;
      }
      
      .submission-section {
        margin: 50px 0;
        padding: 30px;
        background: #f8f9fa;
        border-radius: 8px;
        border-left: 4px solid #3498db;
      }
      
      .submission-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 30px;
      }
      
      .submission-item h3 {
        font-size: 14px;
        color: #7f8c8d;
        margin: 0 0 8px 0;
        text-transform: uppercase;
        letter-spacing: 1px;
        font-weight: 600;
      }
      
      .funder-name, .applicant-name, .submission-date, .requested-amount {
        font-size: 16px;
        color: #2c3e50;
        margin: 0;
        font-weight: 600;
      }
      
      .applicant-location {
        font-size: 14px;
        color: #7f8c8d;
        margin: 4px 0 0 0;
      }
      
      .contact-section {
        margin: 40px 0;
        text-align: left;
      }
      
      .contact-section h3 {
        font-size: 18px;
        color: #2c3e50;
        margin: 0 0 20px 0;
        text-align: center;
        font-weight: 600;
      }
      
      .contact-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 30px;
      }
      
      .contact-item {
        padding: 20px;
        background: #ffffff;
        border: 1px solid #ecf0f1;
        border-radius: 6px;
        font-size: 14px;
        line-height: 1.6;
      }
      
      .contact-item strong {
        color: #2c3e50;
        display: block;
        margin-bottom: 8px;
      }
      
      .cover-footer {
        margin-top: 60px;
        text-align: center;
      }
      
      .footer-line {
        width: 100%;
        height: 2px;
        background: linear-gradient(90deg, transparent, #bdc3c7, transparent);
        margin: 0 0 20px 0;
      }
      
      .confidentiality-notice {
        font-size: 12px;
        color: #95a5a6;
        font-style: italic;
        margin: 0;
      }

      @media print {
        .page {
          box-shadow: none;
          margin: 0;
        }
        
        .submission-grid, .contact-grid {
          grid-template-columns: 1fr 1fr;
        }
        
        .organization-branding {
          flex-direction: column;
          gap: 20px;
        }
        
        .org-name-header {
          text-align: center;
        }
      }
    `;
  }

  /**
   * Generate individual proposal section content
   */
  private async generateProposalSectionContent(section: string): Promise<string> {
    const sectionPrompts = {
      'executive': 'Generate a compelling executive summary that highlights the problem, solution, and expected impact',
      'project': 'Create a detailed project description including methodology, approach, and innovation',
      'budget': 'Develop a comprehensive budget overview with major cost categories and justifications',
      'impact': 'Describe expected outcomes, measurable results, and long-term benefits',
      'timeline': 'Create a project timeline with key milestones and deliverables',
      'team': 'Highlight team expertise, organizational capacity, and qualifications'
    };

    const sectionPrompt = sectionPrompts[section as keyof typeof sectionPrompts] ||
      `Generate content for the ${section} section of the proposal`;

    const systemPrompt = this.generateProposalSystemPrompt();
    const funderDocuments = await this.getUploadedFunderDocuments();

    const userPrompt = `${sectionPrompt}

${funderDocuments}

Please generate professional, detailed content for this section that:
- Aligns with the grant requirements and funder priorities
- References our organization's specific capabilities and experience
- Uses compelling, evidence-based language
- Follows grant writing best practices
- Is comprehensive and detailed (aim for 800-1500+ words for full sections)
- Includes relevant subsections, bullet points, and detailed explanations
- Demonstrates deep understanding of the project and requirements
- Shows clear value proposition and competitive advantages

Create content that would be found in a winning, professional grant proposal. Be thorough, detailed, and comprehensive - this should be publication-ready content that fully addresses this section's requirements.

CRITICAL FORMATTING REQUIREMENTS:
- Structure content with clear HTML headings: <h3>Section Title</h3>
- Use <strong> tags for emphasis, not asterisks or other symbols
- Write in formal, professional language without contractions
- Use proper paragraph tags <p> for each paragraph
- Create bulleted lists with <ul><li> tags when appropriate
- Include specific data, metrics, and concrete examples
- Maintain consistent professional tone throughout
- NO asterisks (*), NO informal punctuation, NO casual language
- Format like a formal business document ready for publication`;

    try {
      const messages = [
        new SystemMessage(systemPrompt),
        new HumanMessage(userPrompt)
      ];

      const response = await this.llm.invoke(messages);
      return response.content as string;

    } catch (error) {
      console.error('Error generating section content:', error);
      return `<h3>${this.getSectionTitle(section)}</h3><p>[Content generation failed for this section. Please try again.]</p>`;
    }
  }

  /**
   * Generate proposal section content
   */
  async generateProposalSection(section: string, existingContent?: string, userMessage?: string): Promise<MayaResponse> {
    if (!this.context) {
      throw new Error('Maya agent not initialized. Call initialize() first.');
    }

    console.log('=== GENERATING PROPOSAL SECTION ===');
    console.log('Section:', section);
    console.log('User Message:', userMessage);
    console.log('Has Existing Content:', !!existingContent);
    console.log('==================================');

    const sectionPrompts = {
      'executive': 'Generate a compelling executive summary that highlights the problem, solution, and expected impact',
      'project': 'Create a detailed project description including methodology, approach, and innovation',
      'budget': 'Develop a comprehensive budget overview with major cost categories and justifications',
      'impact': 'Describe expected outcomes, measurable results, and long-term benefits',
      'timeline': 'Create a project timeline with key milestones and deliverables',
      'team': 'Highlight team expertise, organizational capacity, and qualifications'
    };

    const sectionPrompt = sectionPrompts[section as keyof typeof sectionPrompts] ||
      `Generate content for the ${section} section of the proposal`;

    try {
      const systemPrompt = this.generateProposalSystemPrompt();
      const funderDocuments = await this.getUploadedFunderDocuments();

      const userPrompt = `${sectionPrompt}

${funderDocuments}

${existingContent ? `Current content to improve/expand:\n${existingContent}\n\n` : ''}

Please generate professional, detailed content for this section that:
- Aligns with the grant requirements and funder priorities
- References our organization's specific capabilities and experience
- Uses compelling, evidence-based language
- Follows grant writing best practices
- Is comprehensive and detailed (aim for 800-1500+ words for full sections)
- Includes relevant subsections, bullet points, and detailed explanations
- Demonstrates deep understanding of the project and requirements
- Shows clear value proposition and competitive advantages

Create content that would be found in a winning, professional grant proposal. Be thorough, detailed, and comprehensive - this should be publication-ready content that fully addresses this section's requirements.

CRITICAL FORMATTING REQUIREMENTS:
- Structure content with clear HTML headings: <h3>Section Title</h3>
- Use <strong> tags for emphasis, not asterisks or other symbols
- Write in formal, professional language without contractions
- Use proper paragraph tags <p> for each paragraph
- Create bulleted lists with <ul><li> tags when appropriate
- Include specific data, metrics, and concrete examples
- Maintain consistent professional tone throughout
- NO asterisks (*), NO informal punctuation, NO casual language
- Format like a formal business document ready for publication`;

      const messages = [
        new SystemMessage(systemPrompt),
        new HumanMessage(userPrompt)
      ];

      const response = await this.llm.invoke(messages);
      const content = response.content as string;

      // Generate dynamic contextual feedback using OpenAI
      const feedbackResponse = await this.generateContextualFeedback(section, content, userMessage || `Generate ${section} section`);

      return {
        content: feedbackResponse.content,
        confidence: 0.9,
        reasoning: `Generated ${section} section using organization and grant context`,
        suggestions: feedbackResponse.suggestions,
        contentType: 'proposal_section',
        extractedContent: {
          section: section,
          title: this.getSectionTitle(section),
          content: content
        }
      };

    } catch (error) {
      console.error('Maya proposal generation error:', error);
      throw new Error('Something went wrong. Please try again.');
    }
  }

  /**
   * Get proper section title for proposal sections
   */
  private getSectionTitle(section: string): string {
    const titles = {
      'executive': 'Executive Summary',
      'project': 'Project Description',
      'budget': 'Budget Overview',
      'impact': 'Expected Impact & Outcomes',
      'timeline': 'Project Timeline',
      'team': 'Team & Organizational Capacity'
    };
    return titles[section as keyof typeof titles] || section.charAt(0).toUpperCase() + section.slice(1);
  }

  /**
   * Assess grant fit and provide honest feedback
   */
  private assessGrantFit(): { fitScore: number; concerns: string[]; recommendations: string[] } {
    const org = this.userContext?.organization;
    const grant = this.grantContext;

    const concerns: string[] = [];
    const recommendations: string[] = [];
    let fitScore = 90; // Start very optimistic for demo purposes

    // Check industry alignment
    if (org?.industries && grant?.category) {
      const orgIndustries = org.industries.map((i: string) => i.toLowerCase());
      const grantCategory = grant.category.toLowerCase().replace(/_/g, ' ');

      const hasAlignment = orgIndustries.some((industry: string) =>
        grantCategory.includes(industry) || industry.includes(grantCategory.split(' ')[0])
      );

      if (!hasAlignment) {
        fitScore -= 10; // Reduced penalty for demo purposes
        concerns.push(`Your organization focuses on ${orgIndustries.join(', ')} while this grant targets ${grantCategory}`);
        recommendations.push('Consider how to bridge your expertise with the funder\'s priorities');
      }
    }

    // Check organization size vs grant size
    if (org?.orgSize && grant?.fundingAmountMax) {
      const isSmallOrg = ['SOLO_1', 'MICRO_2_10'].includes(org.orgSize);
      const isLargeGrant = grant.fundingAmountMax > 100000;

      if (isSmallOrg && isLargeGrant) {
        fitScore -= 8; // Reduced penalty for demo purposes
        concerns.push('This is a large grant for a small organization - funders may question capacity');
        recommendations.push('Emphasize partnerships or phased implementation to demonstrate feasibility');
      }
    }

    return { fitScore, concerns, recommendations };
  }

  /**
   * Generate dynamic strategic guidance using OpenAI when grant fit is poor
   */
  private async generateStrategicGuidance(userMessage: string, fitAssessment: any): Promise<{ content: string; suggestions: string[] }> {
    const org = this.userContext?.organization;
    const grant = this.grantContext;

    const guidancePrompt = `The user just asked: "${userMessage}"

They want help with their application to ${grant?.title || 'a grant opportunity'} from ${grant?.funder?.name || 'a funder'}.

**Context:**
- Organization: ${org?.name || 'User organization'} (${org?.orgType?.replace(/_/g, ' ') || 'organization'})
- Grant focus: ${grant?.category?.replace(/_/g, ' ') || 'Not specified'}
- Fit concerns: ${fitAssessment.concerns.join('; ')}
- Recommendations: ${fitAssessment.recommendations.join('; ')}

**Your task:**
Write an empathetic, supportive response that:
1. FIRST acknowledges their specific request and shows you understand what they want
2. Expresses genuine care for their success
3. Gently explains the positioning challenges you've identified
4. Provides strategic options with encouraging language
5. Offers to support them regardless of which direction they choose

**Tone Guidelines:**
- Start by validating their request: "I understand you're looking to..."
- Be warm and supportive, not clinical or harsh
- Frame challenges as "positioning opportunities" not problems
- Use encouraging language like "strengthen", "enhance", "build on"
- Show confidence in their ability to succeed
- End with an open, supportive question

**Formatting:**
- Use **bold** for section headers only
- Use bullet points (•) for lists
- Keep it conversational and warm
- Avoid clinical language

Write your response now:`;

    try {
      const response = await this.llm.invoke([
        new SystemMessage(this.generateSystemPrompt()),
        new HumanMessage(guidancePrompt)
      ]);

      const content = response.content as string;

      return {
        content: this.fixFormattingIssues(content),
        suggestions: fitAssessment.recommendations
      };
    } catch (error) {
      console.error('Error generating strategic guidance:', error);

      // Fallback to simple empathetic response
      return {
        content: `I understand you're looking to work on your application for this opportunity, and I'm here to help you succeed. Let me share some thoughts on how we can strengthen your positioning for the best possible outcome.

Based on my review, there are a few areas where we can enhance your application strategy. Would you like to work together on addressing these, or explore other opportunities that might be an even better fit for your organization's strengths?`,
        suggestions: fitAssessment.recommendations
      };
    }
  }

  /**
   * Generate contextual feedback using OpenAI based on what actually happened
   */
  private async generateContextualFeedback(section: string, generatedContent: string, originalUserRequest: string): Promise<{ content: string; suggestions: string[] }> {
    const org = this.userContext?.organization;
    const grant = this.grantContext;

    const feedbackPrompt = `You just generated a ${section} section for ${org?.name || 'the user'}'s grant proposal to ${grant?.funder?.name || 'a funder'}. 

**Context:**
- User's original request: "${originalUserRequest}"
- Section generated: ${this.getSectionTitle(section)}
- Content length: ${generatedContent.split(/\s+/).length} words
- Grant: ${grant?.title || 'Grant opportunity'}
- Organization: ${org?.name || 'User organization'} (${org?.orgType?.replace(/_/g, ' ') || 'organization'})

**What you accomplished:**
You created content for their document canvas that addresses their specific request.

**Your task:**
Write a warm, encouraging response that:
1. FIRST acknowledges their original request and shows you understood what they wanted
2. Celebrates what you just accomplished together in a personalized way
3. Highlights 2-3 specific strengths of what you created with enthusiasm
4. Suggests 3-4 concrete next steps that feel achievable and exciting
5. Maintains your supportive mentor persona - confident, encouraging, and genuinely invested in their success

**Tone Guidelines:**
- Be genuinely excited about their progress
- Use encouraging language like "great work", "you're building something strong"
- Frame next steps as opportunities, not obligations
- Show confidence in their ability to succeed
- Make them feel supported and capable

**Formatting:**
- Use **bold** for key achievements and positive highlights
- Use bullet points (•) for lists
- Keep it conversational and warm
- Avoid clinical or detached language
- Make it feel like encouragement from a mentor who believes in them

Write your response now:`;

    try {
      const messages = [
        new SystemMessage(this.generateSystemPrompt()),
        new HumanMessage(feedbackPrompt)
      ];

      const response = await this.llm.invoke(messages);
      const content = response.content as string;

      // Extract suggestions from the response (look for bullet points or numbered items)
      const suggestions = this.extractSuggestions(content);

      return {
        content,
        suggestions
      };

    } catch (error) {
      console.error('Error generating contextual feedback:', error);

      // Fallback to a warm, encouraging response
      return {
        content: `Excellent work! I've created the ${this.getSectionTitle(section)} and added it to your document canvas. This content is specifically crafted for ${org?.name || 'your organization'}'s unique strengths and ${grant?.funder?.name || 'this funder'}'s priorities.

**You're Making Great Progress:**
• The content on your canvas captures your organization's value proposition
• Each section builds toward a compelling case for funding
• You're developing something that truly represents your mission

**Exciting Next Steps:**
• Review and personalize the content with your specific achievements
• Consider how this section strengthens your overall narrative
• Let's continue building momentum with another section

I'm excited to see how this proposal comes together! What would you like to work on next?`,
        suggestions: [
          'Review and customize the generated content',
          'Add specific organizational details',
          'Work on the next proposal section'
        ]
      };
    }
  }



  /**
   * Generate system prompt specifically for proposal writing
   */
  private generateProposalSystemPrompt(): string {
    const org = this.userContext?.organization;
    const grant = this.grantContext;

    return `You are Maya, an expert grant writer with 15+ years of experience crafting winning proposals. You specialize in creating compelling, evidence-based content that aligns with funder priorities.

**CURRENT PROPOSAL CONTEXT:**

**Organization:** ${org?.name || 'Organization'}
- Type: ${org?.orgType?.replace(/_/g, ' ') || 'Not specified'}
- Size: ${org?.orgSize?.replace(/_/g, ' ') || 'Not specified'}
- Location: ${org?.country || 'Not specified'}
- Industries: ${org?.industries?.join(', ') || 'Not specified'}

**Target Grant:** ${grant?.title || 'Grant Opportunity'}
- Funder: ${grant?.funder?.name || 'Not specified'}
- Funding Range: $${grant?.fundingAmountMin?.toLocaleString() || '0'} - $${grant?.fundingAmountMax?.toLocaleString() || '0'}
- Category: ${grant?.category?.replace(/_/g, ' ') || 'Not specified'}
- Deadline: ${grant?.deadline ? new Date(grant.deadline).toLocaleDateString() : 'Not specified'}

**PROPOSAL WRITING GUIDELINES:**
- Write in professional, compelling language that demonstrates expertise
- Reference specific organizational capabilities and track record
- Align content with funder priorities and evaluation criteria
- Use evidence-based arguments with concrete examples
- Maintain appropriate academic/professional tone
- Include measurable outcomes and impact metrics
- Follow standard grant proposal structure and formatting

**AVOID:**
- Generic, template-like language
- Overly technical jargon without explanation
- Unsupported claims or promises
- Repetitive content across sections
- Informal or conversational tone

Generate content that positions this organization as the ideal recipient for this specific grant opportunity.`;
  }

  /**
   * Fallback proposal content when AI fails
   */
  private async generateFallbackProposalContent(section: string): Promise<MayaResponse> {
    const org = this.userContext?.organization;
    const grant = this.grantContext;

    const fallbackContent = {
      'executive': `This proposal outlines ${org?.name || 'our organization'}'s innovative approach to addressing critical challenges through the ${grant?.title || 'funding opportunity'}. Our comprehensive strategy combines proven methodologies with cutting-edge solutions to deliver measurable impact and sustainable outcomes.

Key highlights include our organization's established track record, strategic partnerships, and commitment to excellence in project delivery. The requested funding of ${grant?.fundingAmountMax ? `$${grant.fundingAmountMax.toLocaleString()}` : '[amount]'} will enable us to implement a transformative initiative that aligns perfectly with the funder's priorities and objectives.`,

      'project': `Our project methodology employs a systematic, evidence-based approach designed to achieve sustainable impact through carefully planned interventions. The implementation strategy incorporates best practices from the field while addressing the unique challenges and opportunities within our target context.

The project design emphasizes collaboration, innovation, and measurable outcomes. Through strategic partnerships and leveraging our organization's core competencies, we will deliver results that exceed expectations and create lasting value for all stakeholders involved.`,

      'budget': `The project budget has been carefully developed to ensure cost-effective utilization of resources while maximizing impact. Major budget categories include personnel costs, direct project expenses, equipment and supplies, and evaluation activities.

Our organization's financial management practices ensure transparent, accountable use of funds with regular monitoring and reporting. The budget allocation reflects our commitment to delivering exceptional value and achieving the proposed objectives within the specified timeframe.`,

      'impact': `The anticipated outcomes of this project include significant improvements in key performance indicators, enhanced organizational capacity, and sustainable systemic change. Our impact measurement framework incorporates both quantitative metrics and qualitative assessments to provide comprehensive evaluation of project success.

Long-term benefits extend beyond immediate project deliverables to include strengthened partnerships, increased organizational capacity, and improved conditions for our target beneficiaries. The project's design ensures sustainability and continued impact beyond the funding period.`,

      'timeline': `The project timeline spans [duration] and is organized into distinct phases, each with specific milestones and deliverables. Our implementation schedule balances ambitious goals with realistic timelines, ensuring quality outcomes while maintaining project momentum.

Key milestones include project initiation, stakeholder engagement, implementation phases, evaluation activities, and final reporting. Regular progress reviews and adaptive management approaches ensure timely completion and successful achievement of all project objectives.`,

      'team': `Our project team combines extensive experience, diverse expertise, and proven track record in relevant domains. Team members bring complementary skills and deep understanding of the challenges and opportunities within this field.

${org?.name || 'Our organization'} has demonstrated capacity to successfully manage complex projects, maintain strong stakeholder relationships, and deliver high-quality results. Our organizational infrastructure, systems, and processes provide the foundation for successful project implementation and sustainable impact.`
    };

    const content = fallbackContent[section as keyof typeof fallbackContent] ||
      `[This section requires development based on your specific ${section} requirements and organizational context.]`;

    // Generate dynamic contextual feedback even for fallback
    const feedbackResponse = await this.generateContextualFeedback(section, content, 'Generate proposal section');

    return {
      content: feedbackResponse.content,
      confidence: 0.7,
      reasoning: 'Fallback proposal content using available context',
      suggestions: feedbackResponse.suggestions,
      contentType: 'proposal_section',
      extractedContent: {
        section: section,
        title: this.getSectionTitle(section),
        content: content
      }
    };
  }

  /**
   * Analyze user message to identify needed resources
   */
  private analyzeResourceNeeds(userMessage: string, conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>): string[] {
    const message = userMessage.toLowerCase();
    const fullConversation = conversationHistory.map(m => m.content.toLowerCase()).join(' ') + ' ' + message;

    const resourceNeeds: string[] = [];

    // Check for team/personnel related discussions
    if (message.includes('team') || message.includes('staff') || message.includes('personnel') ||
      message.includes('qualifications') || message.includes('experience') || message.includes('expertise')) {
      if (!fullConversation.includes('cv') && !fullConversation.includes('resume')) {
        resourceNeeds.push('CVs or resumes of key team members');
      }
    }

    // Check for budget related discussions
    if (message.includes('budget') || message.includes('cost') || message.includes('funding') ||
      message.includes('financial') || message.includes('money') || message.includes('price')) {
      if (!fullConversation.includes('budget breakdown') && !fullConversation.includes('financial plan')) {
        resourceNeeds.push('detailed budget breakdown or financial projections');
      }
    }

    // Check for proposal writing discussions
    if (message.includes('proposal') || message.includes('application') || message.includes('write') ||
      message.includes('draft') || message.includes('section')) {
      if (!fullConversation.includes('previous proposal') && !fullConversation.includes('past application')) {
        resourceNeeds.push('previous proposals or grant applications for reference');
      }
    }

    // Check for requirements discussions
    if (message.includes('requirement') || message.includes('criteria') || message.includes('guideline') ||
      message.includes('rfp') || message.includes('solicitation')) {
      if (!fullConversation.includes('full rfp') && !fullConversation.includes('complete guidelines')) {
        resourceNeeds.push('complete RFP document or grant guidelines');
      }
    }

    // Check for organizational capacity discussions
    if (message.includes('organization') || message.includes('capacity') || message.includes('track record') ||
      message.includes('history') || message.includes('achievements')) {
      if (!fullConversation.includes('organizational documents') && !fullConversation.includes('annual report')) {
        resourceNeeds.push('organizational documents (annual reports, impact statements, etc.)');
      }
    }

    // Check for partnership discussions
    if (message.includes('partner') || message.includes('collaboration') || message.includes('support') ||
      message.includes('endorsement') || message.includes('letter')) {
      if (!fullConversation.includes('letter of support') && !fullConversation.includes('endorsement letter')) {
        resourceNeeds.push('letters of support or partnership agreements');
      }
    }

    // Check for impact/evaluation discussions
    if (message.includes('impact') || message.includes('outcome') || message.includes('result') ||
      message.includes('evaluation') || message.includes('metric') || message.includes('data')) {
      if (!fullConversation.includes('impact data') && !fullConversation.includes('evaluation report')) {
        resourceNeeds.push('impact data or evaluation reports from previous projects');
      }
    }

    return resourceNeeds;
  }

  /**
   * Clean up response formatting to avoid excessive markdown
   */
  private cleanResponseFormatting(content: string): string {
    // Remove excessive asterisks and clean up formatting
    let cleaned = content;

    // Fix multiple consecutive asterisks
    cleaned = cleaned.replace(/\*{3,}/g, '**');

    // Ensure proper spacing around headers
    cleaned = cleaned.replace(/\*\*([^*]+)\*\*(?!\s)/g, '**$1**\n');

    // Clean up bullet points - ensure consistent formatting
    cleaned = cleaned.replace(/^[\s]*[-*]\s*/gm, '• ');

    // Remove excessive line breaks
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

    // Trim whitespace
    cleaned = cleaned.trim();

    return cleaned;
  }

  /**
   * Fix formatting issues in Maya's responses
   */
  private fixFormattingIssues(content: string): string {
    let fixed = content;

    // Fix broken headers - common patterns from the chat log
    fixed = fixed.replace(/\*([^*]+)\*\*/g, '**$1**'); // *text** → **text**
    fixed = fixed.replace(/\*\*([^*]+)\*/g, '**$1**'); // **text* → **text**
    fixed = fixed.replace(/\*{3,}([^*]+)\*{3,}/g, '**$1**'); // ***text*** → **text**

    // Fix bullet point formatting issues
    fixed = fixed.replace(/•\s*--\s*•\s*/g, '\n\n'); // Remove broken bullet separators
    fixed = fixed.replace(/•\s*\*/g, '\n\n**'); // Fix •* patterns
    fixed = fixed.replace(/^\s*•\s*\*\*/gm, '**'); // Remove bullets before headers

    // Clean up numbered lists
    fixed = fixed.replace(/^\s*(\d+)\.\s*\*\*/gm, '\n**'); // Remove numbers before headers

    // Ensure proper spacing around headers
    fixed = fixed.replace(/\*\*([^*]+)\*\*(?!\s*\n)/g, '**$1**\n\n');

    // Fix multiple consecutive line breaks
    fixed = fixed.replace(/\n{3,}/g, '\n\n');

    // Clean up bullet points - ensure consistent formatting
    fixed = fixed.replace(/^[\s]*[-*•]\s*/gm, '• ');

    // Remove any remaining malformed asterisks
    fixed = fixed.replace(/\*(?!\*)/g, ''); // Remove single asterisks

    return fixed.trim();
  }

  /**
   * Generate resource request suggestions
   */
  private generateResourceRequests(resourceNeeds: string[]): string {
    if (resourceNeeds.length === 0) return '';

    const requests = resourceNeeds.slice(0, 2); // Limit to 2 requests to avoid overwhelming

    let requestText = '\n\n**📎 I\'d love to help you even more effectively:**\n';
    requests.forEach((resource, index) => {
      requestText += `${index + 1}. **${resource}** - This would help me create even stronger, more personalized content for you\n`;
    });

    requestText += '\nNo pressure at all! You can upload documents using the "Upload Files" button, or just share whatever information you have handy. Even rough notes or partial information helps me support you better!';

    return requestText;
  }

  /**
   * Detect if user is requesting sample/demo content
   */
  private isDemoRequest(message: string): boolean {
    const demoKeywords = ['sample', 'demo', 'example', 'show me', 'test', 'try', 'see how', 'what would', 'just draft', 'for testing', 'draft a', 'create a', 'generate a'];
    return demoKeywords.some(keyword => message.toLowerCase().includes(keyword));
  }

  /**
   * Detect editing intent (rewrite, append, modify, etc.)
   */
  private detectEditingIntent(message: string): { intent: 'rewrite' | 'append' | 'modify' | 'new'; target?: string } {
    const msg = message.toLowerCase();

    // Rewrite intents
    if (msg.includes('rewrite') || msg.includes('start over') || msg.includes('completely new') ||
      msg.includes('from scratch') || msg.includes('entirely new') || msg.includes('replace all')) {
      return { intent: 'rewrite' };
    }

    // Modify specific section intents
    if (msg.includes('modify') || msg.includes('update') || msg.includes('change') ||
      msg.includes('improve') || msg.includes('revise') || msg.includes('edit')) {
      return { intent: 'modify' };
    }

    // Append intents
    if (msg.includes('add') || msg.includes('append') || msg.includes('include more') ||
      msg.includes('expand') || msg.includes('continue')) {
      return { intent: 'append' };
    }

    // Default to new content
    return { intent: 'new' };
  }

  /**
   * Smart detection for proposal content requests - context-aware and comprehensive
   */
  private detectProposalRequest(userMessage: string): { isProposalRequest: boolean; section?: string; editingIntent?: { intent: 'rewrite' | 'append' | 'modify' | 'new'; target?: string } } {
    const message = userMessage.toLowerCase();

    // Section-specific keywords
    const sectionKeywords = {
      'executive': ['executive summary', 'executive', 'summary', 'overview'],
      'project': ['project description', 'project', 'methodology', 'approach'],
      'budget': ['budget', 'cost', 'financial', 'funding breakdown'],
      'impact': ['impact', 'outcomes', 'results', 'benefits'],
      'timeline': ['timeline', 'schedule', 'milestones', 'phases'],
      'team': ['team', 'staff', 'personnel', 'qualifications', 'capacity']
    };

    // Check for complete proposal requests first
    const completeProposalKeywords = [
      'complete proposal', 'full proposal', 'entire proposal', 'whole proposal',
      'page 1', 'page one', 'cover page', 'table of contents', 'complete document',
      'full document', 'entire document', 'all sections', 'complete application'
    ];

    if (completeProposalKeywords.some(keyword => message.includes(keyword))) {
      return { isProposalRequest: true, section: 'complete_proposal' };
    }

    // Comprehensive proposal intent detection
    const proposalIntents = [
      // Direct requests
      'write', 'draft', 'create', 'generate', 'build', 'make',
      'help me write', 'can you write', 'please write', 'draft a', 'create a',

      // Document-related
      'proposal', 'application', 'submission', 'document', 'export', 'pdf',
      'sample proposal', 'proposal that', 'grant application',

      // Action-oriented
      'apply', 'submit', 'prepare', 'put together', 'work on',
      'help me apply', 'help with', 'assist with',

      // Content requests
      'what should i include', 'what do i need', 'how do i',
      'structure', 'format', 'template', 'example'
    ];

    // Grant/funding context indicators
    const grantContexts = [
      'grant', 'funding', 'funder', 'application', 'proposal',
      'submit', 'apply', 'win', 'secure funding', 'get funding'
    ];

    // Check for proposal intent
    const hasProposalIntent = proposalIntents.some(intent => message.includes(intent));
    const hasGrantContext = grantContexts.some(context => message.includes(context));

    // Smart detection logic
    if (hasProposalIntent && hasGrantContext) {
      // Find specific section if mentioned
      for (const [section, keywords] of Object.entries(sectionKeywords)) {
        if (keywords.some(keyword => message.includes(keyword))) {
          const editingIntent = this.detectEditingIntent(userMessage);
          return { isProposalRequest: true, section, editingIntent };
        }
      }

      // Default to executive summary for general requests
      const editingIntent = this.detectEditingIntent(userMessage);
      return { isProposalRequest: true, section: 'executive', editingIntent };
    }

    // Catch common phrases that clearly indicate proposal needs
    const clearProposalPhrases = [
      'draft a proposal', 'write a proposal', 'create a proposal',
      'sample proposal', 'proposal template', 'help me apply',
      'application for', 'submit for', 'apply for this grant',
      'win this grant', 'get this funding', 'proposal that',
      'document i can export', 'exportable', 'pdf'
    ];

    if (clearProposalPhrases.some(phrase => message.includes(phrase))) {
      const editingIntent = this.detectEditingIntent(userMessage);
      return { isProposalRequest: true, section: 'executive', editingIntent };
    }

    const editingIntent = this.detectEditingIntent(userMessage);
    return { isProposalRequest: false, editingIntent };
  }

  /**
   * Handle requests that require web search (which Maya cannot do)
   */
  private handleWebSearchRequest(userMessage: string): MayaResponse | null {
    const searchKeywords = [
      'search for', 'look up', 'find information about', 'research', 'browse',
      'current requirements', 'latest guidelines', 'recent changes',
      'what does their website say', 'check their website', 'online information'
    ];

    const isSearchRequest = searchKeywords.some(keyword =>
      userMessage.toLowerCase().includes(keyword)
    );

    if (isSearchRequest) {
      return {
        content: `I understand you'd like me to research current information, but I need to be transparent about my limitations: **I don't have web search capabilities** and cannot browse the internet for real-time information.

**What I CAN do instead:**
• Work with documents you upload (RFPs, guidelines, proposal samples)
• Use the grant information already in our system
• Help you structure questions to research yourself
• Analyze any funder materials you can share with me

**For the most current information, I recommend:**
• Visiting the funder's official website directly
• Uploading their latest RFP or guidelines using the "Upload Files" button
• Sharing any recent communications from the funder

Would you like to upload any funder documents, or shall I help you with what we already know about this opportunity?`,
        confidence: 0.9,
        contentType: 'chat',
        suggestions: [
          'Upload the latest RFP document',
          'Share funder guidelines you have',
          'Work with existing grant information'
        ]
      };
    }

    return null;
  }

  /**
   * Chat with Maya - main conversation method
   */
  async chat(userMessage: string): Promise<MayaResponse> {
    if (!this.context) {
      throw new Error('Maya agent not initialized. Call initialize() first.');
    }

    // Check if this is a web search request first
    const searchResponse = this.handleWebSearchRequest(userMessage);
    if (searchResponse) {
      return searchResponse;
    }

    try {
      // Check if this is a proposal content request
      const proposalRequest = this.detectProposalRequest(userMessage);

      // Debug logging
      console.log('=== MAYA PROPOSAL DETECTION ===');
      console.log('User Message:', userMessage);
      console.log('Is Proposal Request:', proposalRequest.isProposalRequest);
      console.log('Detected Section:', proposalRequest.section);
      console.log('Is Demo Request:', this.isDemoRequest(userMessage));
      console.log('===============================');

      if (proposalRequest.isProposalRequest && proposalRequest.section) {
        // Assess grant fit first - be honest about poor matches
        const fitAssessment = this.assessGrantFit();

        // Check if this is a demo/sample request - be very lenient for testing
        const isDemoRequest = this.isDemoRequest(userMessage);

        // Debug fit assessment
        console.log('=== FIT ASSESSMENT DEBUG ===');
        console.log('Fit Score:', fitAssessment.fitScore);
        console.log('Is Demo Request:', isDemoRequest);
        console.log('Concerns:', fitAssessment.concerns);
        console.log('Will Generate Content:', isDemoRequest || fitAssessment.fitScore >= 40);
        console.log('===========================');

        if (isDemoRequest) {
          // For demo requests, always generate content regardless of fit
          console.log('GENERATING CONTENT: Demo request detected');
          if (proposalRequest.section === 'complete_proposal') {
            return await this.generateCompleteProposal();
          } else {
            return await this.generateProposalSection(proposalRequest.section, undefined, userMessage);
          }
        }

        if (fitAssessment.fitScore < 40) {
          // Only block if fit is extremely poor (below 40)
          const strategicGuidance = await this.generateStrategicGuidance(userMessage, fitAssessment);

          return {
            content: strategicGuidance.content,
            confidence: 0.9,
            reasoning: 'Providing empathetic strategic guidance to help user make informed decisions',
            suggestions: strategicGuidance.suggestions,
            contentType: 'chat'
          };
        }

        // Generate proposal content based on request type
        if (proposalRequest.section === 'complete_proposal') {
          console.log('GENERATING COMPLETE PROPOSAL: Full document with cover page and TOC');
          return await this.generateCompleteProposal();
        } else {
          console.log('GENERATING SECTION:', proposalRequest.section);
          return await this.generateProposalSection(proposalRequest.section, undefined, userMessage);
        }
      }

      // Build conversation messages for regular chat
      const messages = [
        new SystemMessage(this.generateSystemPrompt()),
        // Add conversation history
        ...this.context.messages.map(msg =>
          msg.role === 'user'
            ? new HumanMessage(msg.content)
            : new AIMessage(msg.content)
        ),
        // Add current user message
        new HumanMessage(userMessage)
      ];

      // Get Maya's response
      const response = await this.llm.invoke(messages);
      let content = response.content as string;

      // Clean up formatting issues
      content = this.fixFormattingIssues(content);

      // Analyze if Maya should ask for additional resources
      const resourceNeeds = this.analyzeResourceNeeds(userMessage, this.context.messages);
      const resourceRequests = this.generateResourceRequests(resourceNeeds);

      // Add resource requests to Maya's response if needed (but keep it natural)
      if (resourceRequests && !content.toLowerCase().includes('upload') && !content.toLowerCase().includes('document')) {
        content += resourceRequests;
      }

      // Update conversation history
      this.context.messages.push(
        { role: 'user', content: userMessage },
        { role: 'assistant', content: content }
      );

      // Keep only last 20 messages to manage context length
      if (this.context.messages.length > 20) {
        this.context.messages = this.context.messages.slice(-20);
      }

      return {
        content,
        confidence: 0.85, // Maya is confident in her expertise
        reasoning: 'Response generated using organization and grant context with conversation memory',
        suggestions: this.extractSuggestions(content),
        contentType: 'chat'
      };

    } catch (error) {
      console.error('Maya chat error:', error);

      throw new Error('Something went wrong. Please try again.');
    }
  }

  /**
   * Extract actionable suggestions from Maya's response
   */
  private extractSuggestions(content: string): string[] {
    const suggestions: string[] = [];

    // Look for numbered lists or bullet points
    const lines = content.split('\n');
    for (const line of lines) {
      if (line.match(/^\d+\./) || line.match(/^[-•*]/)) {
        const suggestion = line.replace(/^\d+\./, '').replace(/^[-•*]/, '').trim();
        if (suggestion.length > 10) {
          suggestions.push(suggestion);
        }
      }
    }

    return suggestions.slice(0, 3); // Return top 3 suggestions
  }

  /**
   * Simple fallback when OpenAI fails
   */
  private generateFallbackResponse(userMessage: string): MayaResponse {
    return {
      content: 'An error occurred, please try again later.',
      confidence: 0.1,
      reasoning: 'Fallback response due to API error',
      suggestions: [],
      contentType: 'chat'
    };
  }

  /**
   * Analyze uploaded file using the existing AI extract system
   */
  async analyzeUploadedFile(fileName: string, fileContent: string, fileType: string): Promise<MayaResponse> {
    if (!this.context) {
      throw new Error('Maya agent not initialized. Call initialize() first.');
    }

    try {
      // Use the existing AI extract system for document analysis
      if (fileType === 'application/pdf') {
        return await this.analyzeDocumentWithAIExtract(fileName, fileContent);
      }

      // For non-PDF files, use text analysis
      return await this.analyzeTextDocument(fileName, fileContent);
    } catch (error) {
      console.error('Maya file analysis error:', error);
      throw new Error('Failed to analyze uploaded document.');
    }
  }

  /**
   * Analyze document using the existing AI extract system
   */
  private async analyzeDocumentWithAIExtract(fileName: string, fileContent: string): Promise<MayaResponse> {
    try {
      // Create a FormData object to send to the AI extract endpoint
      const formData = new FormData();
      const blob = new Blob([fileContent], { type: 'application/pdf' });
      const file = new File([blob], fileName, { type: 'application/pdf' });
      formData.append('file', file);

      // Call the existing AI extract API
      const response = await fetch('/api/admin/grants/ai-extract', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`AI extract failed: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success && result.extractedData) {
        // Maya can now understand the document structure and content
        return {
          content: this.generateDocumentAnalysisResponse(result.extractedData, fileName),
          confidence: 0.9,
          contentType: 'document_extract',
          suggestions: [
            'Use this structure for your proposal',
            'Adapt the formatting style',
            'Reference the evaluation criteria'
          ]
        };
      } else {
        throw new Error('Failed to extract document content');
      }
    } catch (error) {
      console.error('AI extract analysis failed:', error);
      return await this.analyzeTextDocument(fileName, fileContent);
    }
  }

  /**
   * Generate Maya's response about the analyzed document
   */
  private generateDocumentAnalysisResponse(extractedData: any, fileName: string): string {
    const org = this.userContext?.organization;

    return `Excellent! I've analyzed **${fileName}** and can now help you create a proposal that matches this format and style.

**Document Analysis:**
• **Type**: ${extractedData.fundingType || 'Grant/RFP'} document
• **Structure**: ${extractedData.proposalSections?.length || 'Multiple'} main sections identified
• **Funding Range**: ${extractedData.fundingAmountMin ? `$${extractedData.fundingAmountMin.toLocaleString()} - $${extractedData.fundingAmountMax?.toLocaleString()}` : 'Not specified'}
• **Key Requirements**: ${extractedData.requiredDocuments?.slice(0, 3).join(', ') || 'Standard proposal documents'}

**What I Can Do Now:**
• **Emulate the structure** - I'll organize your proposal using the same section headings and flow
• **Match the tone** - I'll adapt my writing style to match this funder's preferences  
• **Address evaluation criteria** - I'll ensure we hit all the key points they're looking for
• **Follow their format** - I'll use similar formatting, emphasis, and organization

**Ready to Start:**
I can now generate proposal content that follows this document's structure and requirements. Just tell me which section you'd like to work on, and I'll create content that aligns with what this funder expects.

Would you like me to start with a specific section, or shall I create an outline based on this document's structure?`;
  }

  /**
   * Analyze text documents (non-PDF)
   */
  private async analyzeTextDocument(fileName: string, fileContent: string): Promise<MayaResponse> {
    try {
      const systemPrompt = `You are Maya, a grant consultant analyzing an uploaded document to help with grant applications.

**DOCUMENT ANALYSIS INSTRUCTIONS:**
- Identify the type of document (CV, budget, proposal, RFP, etc.)
- Extract key information relevant to grant applications
- Provide specific insights on how this document can strengthen the proposal
- Suggest improvements or additional information needed
- Be encouraging and constructive in your feedback

**CURRENT CONTEXT:**
- Organization: ${this.userContext?.organization?.name || 'Client organization'}
- Grant: ${this.grantContext?.title || 'Target grant opportunity'}
- File: ${fileName}

Analyze this document and provide helpful insights for the grant application.`;

      const userPrompt = `I've uploaded a file: ${fileName}

Please analyze this document and tell me:
1. What type of document this is
2. Key information you found that's relevant to our grant application
3. How this can strengthen our proposal
4. Any suggestions for improvement or additional information needed

File content:
${fileContent.substring(0, 3000)}${fileContent.length > 3000 ? '...[truncated]' : ''}`;

      const messages = [
        new SystemMessage(systemPrompt),
        new HumanMessage(userPrompt)
      ];

      const response = await this.llm.invoke(messages);
      const content = response.content as string;

      return {
        content,
        confidence: 0.8,
        reasoning: `Analyzed uploaded file: ${fileName}`,
        suggestions: [
          'Review the analysis and incorporate relevant information',
          'Consider uploading additional supporting documents',
          'Use the insights to strengthen your proposal sections'
        ],
        contentType: 'chat'
      };

    } catch (error) {
      console.error('Maya file analysis error:', error);
      return {
        content: 'An error occurred while analyzing the file, please try again later.',
        confidence: 0.1,
        reasoning: 'Fallback response for file analysis error',
        suggestions: [],
        contentType: 'chat'
      };
    }
  }

  /**
   * Generate clarifying questions based on conversation context
   */
  async generateClarifyingQuestions(topic: string): Promise<MayaResponse> {
    if (!this.context) {
      throw new Error('Maya agent not initialized. Call initialize() first.');
    }

    const org = this.userContext?.organization;
    const grant = this.grantContext;

    const clarifyingQuestions = {
      'budget': [
        `What's your organization's annual operating budget? This helps me understand your financial capacity.`,
        `Do you have matching funds or in-kind contributions to include? Many funders value organizational investment.`,
        `What's your typical overhead rate for grants? This affects how we structure the budget.`,
        `Are there any cost restrictions or guidelines in the RFP that I should know about?`
      ],
      'team': [
        `Who will be the Project Director or Principal Investigator? I need their background for the team section.`,
        `What's the time commitment for key staff members? This affects personnel costs and credibility.`,
        `Do you have any advisory board members or consultants who add expertise?`,
        `What's your organization's track record with similar projects?`
      ],
      'impact': [
        `What specific outcomes do you want to achieve? I need concrete, measurable goals.`,
        `How will you measure success? Do you have baseline data or evaluation plans?`,
        `Who is your target population and how many people will you serve?`,
        `What's your theory of change or logic model for this project?`
      ],
      'timeline': [
        `When do you realistically want to start the project? Consider grant processing time.`,
        `Are there any external deadlines or seasonal factors that affect timing?`,
        `What are the major project phases or milestones you envision?`,
        `Do you have capacity to start immediately if funded, or do you need ramp-up time?`
      ],
      'partnerships': [
        `Who are your key partners and what roles will they play?`,
        `Do you have letters of support or MOUs with partners?`,
        `What unique value does each partner bring to the project?`,
        `How will you manage partner relationships and coordination?`
      ]
    };

    const questions = clarifyingQuestions[topic as keyof typeof clarifyingQuestions] || [
      `Could you provide more specific details about ${topic}?`,
      `What's most important to you regarding ${topic}?`,
      `Are there any constraints or requirements I should know about for ${topic}?`
    ];

    const content = `**Great question about ${topic}!**

To give you the most helpful advice for ${org?.name || 'your organization'}'s application to ${grant?.title || 'this grant'}, I need to understand your situation better.

**Key Questions for Better Guidance:**

${questions.map((q, i) => `${i + 1}. ${q}`).join('\n\n')}

**How to Proceed:**
• Answer any or all questions that are relevant
• Share partial information if you have it
• We can tackle them one at a time if you prefer

Feel free to provide as much or as little detail as you're comfortable with!`;

    return {
      content,
      confidence: 0.9,
      reasoning: `Generated clarifying questions for ${topic} to provide better guidance`,
      suggestions: [
        'Answer the questions that are most relevant to your situation',
        'Share any documents or information you have related to these questions',
        'Let me know if you need help with any specific aspect'
      ],
      contentType: 'chat'
    };
  }

  /**
   * Save conversation to database
   */
  async saveConversation(userMessage: string, mayaResponse: MayaResponse): Promise<{ sessionId: string; messageId: string }> {
    if (!this.context) {
      throw new Error('No context available for saving');
    }

    // Create or update session
    const session = await prisma.aIGrantSession.upsert({
      where: {
        userId_grantId: {
          userId: this.context.userId,
          grantId: this.context.grantId
        }
      },
      create: {
        userId: this.context.userId,
        grantId: this.context.grantId,
        title: `Chat with Maya - ${new Date().toLocaleDateString()}`,
        contextSummary: 'Grant consultation session with Maya',
        isActive: true
      },
      update: {
        lastMessageAt: new Date(),
        isActive: true
      }
    });

    // Update context with session ID
    this.context.sessionId = session.id;

    // Save user message
    await prisma.aIMessage.create({
      data: {
        sessionId: session.id,
        sender: 'USER',
        messageType: 'TEXT',
        content: userMessage,
        metadata: {
          timestamp: new Date().toISOString()
        }
      }
    });

    // Save Maya's response
    const aiMessage = await prisma.aIMessage.create({
      data: {
        sessionId: session.id,
        sender: 'AI',
        messageType: 'TEXT',
        content: mayaResponse.content,
        metadata: {
          model: 'gpt-4',
          confidence: mayaResponse.confidence,
          reasoning: mayaResponse.reasoning,
          suggestions: mayaResponse.suggestions
        }
      }
    });

    return {
      sessionId: session.id,
      messageId: aiMessage.id
    };
  }
}

/**
 * Factory function to create Maya agent
 */
export async function createMayaAgent(userId: string, grantId: string, sessionId?: string): Promise<MayaAgent> {
  const maya = new MayaAgent();
  await maya.initialize(userId, grantId, sessionId);
  return maya;
}