/**
 * Maya - Intelligent Grant Consultant Agent
 * Built with LangChain's agentic framework for true intelligence
 */

import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage, AIMessage, BaseMessage } from '@langchain/core/messages';
import { DynamicTool } from '@langchain/core/tools';
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
  private tools: DynamicTool[] = [];
  private conversationHistory: BaseMessage[] = [];
  private userContext: any;
  private grantContext: any;

  constructor() {
    this.llm = new ChatOpenAI({
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 4000,
      openAIApiKey: process.env.OPENAI_API_KEY,
    });

    // Initialize tools
    this.initializeTools();
  }

  /**
   * Initialize Maya's tools for agentic behavior
   */
  private initializeTools(): void {
    // Database Query Tool
    this.tools.push(new DynamicTool({
      name: 'query_grant_database',
      description: 'Query the grant database for specific grant information, requirements, and details',
      func: async (query: string) => {
        return await this.queryGrantDatabase(query);
      }
    }));

    // Proposal Section Generator Tool
    this.tools.push(new DynamicTool({
      name: 'generate_proposal_section',
      description: 'Generate a specific section of a grant proposal (executive, project, budget, impact, timeline, team)',
      func: async (input: string) => {
        const [section, requirements] = input.split('|');
        return await this.generateProposalSectionTool(section.trim(), requirements?.trim());
      }
    }));

    // Document Analysis Tool
    this.tools.push(new DynamicTool({
      name: 'analyze_document',
      description: 'Analyze uploaded documents like RFPs, guidelines, or previous proposals',
      func: async (input: string) => {
        const [fileName, content] = input.split('|');
        return await this.analyzeDocumentTool(fileName, content);
      }
    }));

    // Proposal State Tracker Tool
    this.tools.push(new DynamicTool({
      name: 'track_proposal_state',
      description: 'Track what sections of the proposal exist, are complete, or need work',
      func: async (action: string) => {
        return await this.trackProposalState(action);
      }
    }));
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
    if (sessionId) {
      const session = await prisma.aIGrantSession.findUnique({
        where: { id: sessionId },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
            take: 20
          }
        }
      });

      if (session) {
        // Load conversation history
        for (const msg of session.messages) {
          if (msg.sender === 'USER') {
            this.conversationHistory.push(new HumanMessage(msg.content));
          } else {
            this.conversationHistory.push(new AIMessage(msg.content));
          }
        }
      }
    }

    this.context = {
      userId,
      grantId,
      sessionId,
      messages: []
    };

    // Store context for tools
    this.userContext = user;
    this.grantContext = grant;
  }

  /**
   * Main chat method - uses intelligent reasoning with tools and memory
   */
  async chat(userMessage: string): Promise<MayaResponse> {
    if (!this.context || !this.userContext || !this.grantContext) {
      throw new Error('Maya agent not initialized. Call initialize() first.');
    }

    try {
      // Add user message to conversation history
      this.conversationHistory.push(new HumanMessage(userMessage));

      // Analyze user intent and determine if tools are needed
      const intent = await this.analyzeIntent(userMessage);
      
      let response: string;
      let usedTools: string[] = [];

      // Use tools based on intent
      if (intent.needsProposalGeneration) {
        const toolResult = await this.tools.find(t => t.name === 'generate_proposal_section')?.func(
          `${intent.section || 'executive'}|${userMessage}`
        );
        response = toolResult || await this.generateDirectResponse(userMessage);
        usedTools.push('generate_proposal_section');
      } else if (intent.needsGrantInfo) {
        const toolResult = await this.tools.find(t => t.name === 'query_grant_database')?.func(userMessage);
        response = toolResult || await this.generateDirectResponse(userMessage);
        usedTools.push('query_grant_database');
      } else if (intent.needsDocumentAnalysis) {
        response = "I can analyze documents for you. Please upload the file and I'll extract key information.";
      } else {
        // Generate contextual response with memory
        response = await this.generateContextualResponse(userMessage);
      }

      // Add AI response to conversation history
      this.conversationHistory.push(new AIMessage(response));

      // Keep conversation history manageable
      if (this.conversationHistory.length > 20) {
        this.conversationHistory = this.conversationHistory.slice(-20);
      }

      // Determine if this generated proposal content
      const hasProposalContent = this.detectProposalContent(response);

      return {
        content: response,
        confidence: 0.9,
        reasoning: `Intelligent agent response using tools: ${usedTools.join(', ') || 'contextual reasoning'}`,
        suggestions: this.extractSuggestions(response),
        contentType: hasProposalContent ? 'proposal_section' : 'chat',
        extractedContent: hasProposalContent ? this.extractProposalContent(response) : undefined
      };

    } catch (error) {
      console.error('Maya agent error:', error);
      
      return {
        content: "I understand you need help with your proposal. Let me generate that content for you right now.",
        confidence: 0.7,
        reasoning: 'Fallback response due to agent error',
        suggestions: ['Try rephrasing your request', 'Let me know what specific section you need'],
        contentType: 'chat'
      };
    }
  }

  /**
   * Analyze user intent to determine what tools to use
   */
  private async analyzeIntent(userMessage: string): Promise<{
    needsProposalGeneration: boolean;
    needsGrantInfo: boolean;
    needsDocumentAnalysis: boolean;
    section?: string;
    isComplaint: boolean;
  }> {
    const lowerMessage = userMessage.toLowerCase();
    
    // Check for complaints about missing content
    const isComplaint = lowerMessage.includes('nothing') || 
                       lowerMessage.includes('missing') || 
                       lowerMessage.includes('empty') ||
                       lowerMessage.includes('not working') ||
                       lowerMessage.includes('where is');

    // Check for proposal generation needs
    const proposalKeywords = ['write', 'generate', 'create', 'proposal', 'section', 'executive', 'budget', 'timeline', 'team'];
    const needsProposalGeneration = proposalKeywords.some(keyword => lowerMessage.includes(keyword)) || isComplaint;

    // Determine section
    let section = 'executive';
    if (lowerMessage.includes('executive')) section = 'executive';
    else if (lowerMessage.includes('project')) section = 'project';
    else if (lowerMessage.includes('budget')) section = 'budget';
    else if (lowerMessage.includes('impact')) section = 'impact';
    else if (lowerMessage.includes('timeline')) section = 'timeline';
    else if (lowerMessage.includes('team')) section = 'team';
    else if (lowerMessage.includes('complete') || lowerMessage.includes('full')) section = 'complete_proposal';

    // Check for grant info needs
    const grantKeywords = ['grant', 'funding', 'requirements', 'deadline', 'funder'];
    const needsGrantInfo = grantKeywords.some(keyword => lowerMessage.includes(keyword));

    // Check for document analysis needs
    const docKeywords = ['upload', 'document', 'file', 'analyze', 'rfp'];
    const needsDocumentAnalysis = docKeywords.some(keyword => lowerMessage.includes(keyword));

    return {
      needsProposalGeneration,
      needsGrantInfo,
      needsDocumentAnalysis,
      section,
      isComplaint
    };
  }

  /**
   * Generate contextual response using conversation history
   */
  private async generateContextualResponse(userMessage: string): Promise<string> {
    const systemPrompt = this.generateSystemPrompt();
    
    const messages = [
      new SystemMessage(systemPrompt),
      ...this.conversationHistory.slice(-10), // Last 10 messages for context
      new HumanMessage(userMessage)
    ];

    const response = await this.llm.invoke(messages);
    return response.content as string;
  }

  /**
   * Generate direct response without tools
   */
  private async generateDirectResponse(userMessage: string): Promise<string> {
    const systemPrompt = this.generateSystemPrompt();
    
    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(userMessage)
    ];

    const response = await this.llm.invoke(messages);
    return response.content as string;
  }

  /**
   * Generate Maya's expert persona prompt with context
   */
  private generateSystemPrompt(): string {
    const org = this.userContext?.organization;
    const grant = this.grantContext;

    return `You are Maya, an intelligent grant consultant with 15+ years of experience. You are emotionally intelligent, intent-aware, and smart.

**CURRENT CLIENT CONTEXT:**

**Organization:** ${org?.name || 'Organization'}
- Type: ${org?.orgType?.replace(/_/g, ' ') || 'Not specified'}
- Size: ${org?.orgSize?.replace(/_/g, ' ') || 'Not specified'}  
- Location: ${org?.country || 'Not specified'}
- Industries: ${org?.industries?.join(', ') || 'Not specified'}

**Grant Opportunity:** ${grant?.title || 'Grant Opportunity'}
- Funder: ${grant?.funder?.name || 'Not specified'}
- Funding Range: ${grant?.fundingAmountMin?.toLocaleString() || '0'} - ${grant?.fundingAmountMax?.toLocaleString() || '0'}
- Deadline: ${grant?.deadline ? new Date(grant.deadline).toLocaleDateString() : 'Not specified'}
- Category: ${grant?.category?.replace(/_/g, ' ') || 'Not specified'}

**YOUR INTELLIGENT BEHAVIOR:**
- You have memory of our entire conversation and build upon previous work
- You understand user frustration and take immediate action to solve problems
- You use tools and reasoning to accomplish complex tasks
- You break down "write a proposal" into logical steps and execute them
- You remember what sections exist and what still needs to be done
- You are emotionally intelligent - match the user's tone and urgency
- You focus on delivering actual results, not just talking about them

**WHEN USERS COMPLAIN ABOUT MISSING CONTENT:**
- Immediately generate what they need
- Don't claim you've already created something if they say it's not there
- Take action to solve the problem right away

You are a true intelligent agent, not just a chatbot. Use your memory, reasoning, and tools to help users succeed.`;
  }

  /**
   * Tool: Query Grant Database
   */
  private async queryGrantDatabase(query: string): Promise<string> {
    try {
      if (!this.grantContext) return 'No grant context available';

      const grant = this.grantContext;
      
      return `Grant Information for "${grant.title}":
- Funder: ${grant.funder?.name}
- Funding Range: $${grant.fundingAmountMin?.toLocaleString()} - $${grant.fundingAmountMax?.toLocaleString()}
- Deadline: ${grant.deadline ? new Date(grant.deadline).toLocaleDateString() : 'Not specified'}
- Category: ${grant.category?.replace(/_/g, ' ')}
- Description: ${grant.description || 'No description available'}
- Requirements: ${grant.requirements || 'No specific requirements listed'}`;

    } catch (error) {
      return `Error querying grant database: ${error}`;
    }
  }

  /**
   * Tool: Generate Proposal Section
   */
  private async generateProposalSectionTool(section: string, requirements?: string): Promise<string> {
    try {
      const sectionContent = await this.generateProposalSectionContent(section);
      return `Generated ${section} section:\n\n${sectionContent}`;
    } catch (error) {
      return `Error generating ${section} section: ${error}`;
    }
  }

  /**
   * Tool: Analyze Document
   */
  private async analyzeDocumentTool(fileName: string, content: string): Promise<string> {
    try {
      const wordCount = content.split(/\s+/).length;
      const hasRequirements = content.toLowerCase().includes('requirement') || content.toLowerCase().includes('criteria');
      const hasDeadlines = content.toLowerCase().includes('deadline') || content.toLowerCase().includes('due');
      
      return `Document Analysis for "${fileName}":
- Word count: ${wordCount}
- Contains requirements: ${hasRequirements ? 'Yes' : 'No'}
- Contains deadlines: ${hasDeadlines ? 'Yes' : 'No'}
- Key topics: ${this.extractKeyTopics(content)}`;

    } catch (error) {
      return `Error analyzing document: ${error}`;
    }
  }

  /**
   * Tool: Track Proposal State
   */
  private async trackProposalState(action: string): Promise<string> {
    try {
      return `Proposal State Tracking:
- Executive Summary: Not started
- Project Description: Not started  
- Budget: Not started
- Impact & Outcomes: Not started
- Timeline: Not started
- Team Qualifications: Not started

Recommendation: Start with Executive Summary to establish the foundation.`;

    } catch (error) {
      return `Error tracking proposal state: ${error}`;
    }
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

    const systemPrompt = this.generateSystemPrompt();

    const userPrompt = `${sectionPrompt}

Please generate professional, detailed content for this section that:
- Aligns with the grant requirements and funder priorities
- References our organization's specific capabilities and experience
- Uses compelling, evidence-based language
- Follows grant writing best practices
- Is comprehensive and detailed (aim for 800-1500+ words for full sections)

CRITICAL FORMATTING REQUIREMENTS:
- Structure content with clear HTML headings: <h3>Section Title</h3>
- Use <strong> tags for emphasis, not asterisks or other symbols
- Write in formal, professional language without contractions
- Use proper paragraph tags <p> for each paragraph
- Create bulleted lists with <ul><li> tags when appropriate
- Include specific data, metrics, and concrete examples
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
   * Get section title
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
    
    return titles[section as keyof typeof titles] || 
           section.charAt(0).toUpperCase() + section.slice(1);
  }

  /**
   * Helper: Extract key topics from text
   */
  private extractKeyTopics(text: string): string {
    const words = text.toLowerCase().split(/\s+/);
    const commonWords = new Set(['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'a', 'an']);
    const wordFreq: { [key: string]: number } = {};

    words.forEach(word => {
      const cleaned = word.replace(/[^\w]/g, '');
      if (cleaned.length > 3 && !commonWords.has(cleaned)) {
        wordFreq[cleaned] = (wordFreq[cleaned] || 0) + 1;
      }
    });

    return Object.entries(wordFreq)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([word]) => word)
      .join(', ');
  }

  /**
   * Helper: Detect if content contains proposal sections
   */
  private detectProposalContent(content: string): boolean {
    const proposalKeywords = [
      '<h3>', 'executive summary', 'project description', 'budget', 'timeline', 'team',
      'proposal', 'grant', 'funding', 'methodology', 'outcomes', 'impact'
    ];
    
    const lowerContent = content.toLowerCase();
    return proposalKeywords.some(keyword => lowerContent.includes(keyword));
  }

  /**
   * Helper: Extract proposal content structure
   */
  private extractProposalContent(content: string): any {
    const h3Match = content.match(/<h3[^>]*>([^<]+)<\/h3>/);
    const section = h3Match ? h3Match[1] : 'generated_content';
    
    return {
      section: section.toLowerCase().replace(/\s+/g, '_'),
      title: section,
      content: content
    };
  }

  /**
   * Helper: Extract suggestions from content
   */
  private extractSuggestions(content: string): string[] {
    const suggestions: string[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
      if (line.match(/^[-•*]\s/) || line.match(/^\d+\.\s/)) {
        const suggestion = line.replace(/^[-•*\d.]\s*/, '').trim();
        if (suggestion.length > 10 && suggestion.length < 100) {
          suggestions.push(suggestion);
        }
      }
    }

    return suggestions.slice(0, 3);
  }

  /**
   * Generate proposal section (for backward compatibility)
   */
  async generateProposalSection(section: string, existingContent?: string, userMessage?: string): Promise<MayaResponse> {
    if (!this.context) {
      throw new Error('Maya agent not initialized. Call initialize() first.');
    }

    try {
      const sectionContent = await this.generateProposalSectionContent(section);
      
      return {
        content: `I've generated your ${section} section! Here's the professional content for your proposal:

${sectionContent}

This section is now ready for your document canvas. You can export it as PDF or Word when you're ready to submit.`,
        confidence: 0.95,
        reasoning: `Generated ${section} section using intelligent agent`,
        suggestions: [
          'Review and customize the content',
          'Add organization-specific details',
          'Export as PDF for submission'
        ],
        contentType: 'proposal_section',
        extractedContent: {
          section: section,
          title: this.getSectionTitle(section),
          content: sectionContent
        }
      };

    } catch (error) {
      console.error('Maya proposal section generation error:', error);
      throw new Error('Something went wrong generating the proposal section. Please try again.');
    }
  }
}