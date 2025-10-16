/**
 * Maya - Simple Grant Consultant Agent
 * Uses LangChain for agentic behavior without over-engineering
 */

import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages';
import { prisma } from '@/lib/prisma';

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
      maxTokens: 1200,
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
- Speak naturally and conversationally, like a trusted advisor
- Reference the specific organization and grant in your advice
- Provide actionable, concrete recommendations
- Explain your reasoning clearly
- Ask clarifying questions when you need more information
- Be encouraging but realistic about challenges
- PROACTIVELY ASK FOR RESOURCES when they would help create better proposals
- Use simple, clean formatting - avoid excessive markdown, headers, or symbols
- Keep responses focused and conversational, not overwhelming

**WHEN TO ASK FOR ADDITIONAL RESOURCES:**
- **CVs/Resumes**: When discussing team qualifications or project leadership
- **Budget Information**: When creating budget sections or discussing financial capacity
- **Previous Proposals**: When they mention past grant applications or want to improve existing content
- **RFP Documents**: When they reference specific requirements you haven't seen
- **Organizational Documents**: When discussing organizational capacity, track record, or capabilities
- **Financial Statements**: When discussing organizational sustainability or matching funds
- **Letters of Support**: When discussing partnerships or community endorsements
- **Project Plans**: When they mention existing project documentation
- **Impact Data**: When discussing outcomes, metrics, or evaluation frameworks

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
   * Generate proposal section content
   */
  async generateProposalSection(section: string, existingContent?: string): Promise<MayaResponse> {
    if (!this.context) {
      throw new Error('Maya agent not initialized. Call initialize() first.');
    }

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
      const userPrompt = `${sectionPrompt}

${existingContent ? `Current content to improve/expand:\n${existingContent}\n\n` : ''}

Please generate professional, detailed content for this section that:
- Aligns with the grant requirements and funder priorities
- References our organization's specific capabilities and experience
- Uses compelling, evidence-based language
- Follows grant writing best practices
- Is approximately 200-400 words

Focus on making this section stand out while maintaining accuracy and professionalism.`;

      const messages = [
        new SystemMessage(systemPrompt),
        new HumanMessage(userPrompt)
      ];

      const response = await this.llm.invoke(messages);
      const content = response.content as string;

      return {
        content: `I've generated the ${section} section for your proposal. You can see it on the canvas to the left, where you can review and edit it further.`,
        confidence: 0.9,
        reasoning: `Generated ${section} section using organization and grant context`,
        suggestions: [`Review and customize the ${section} content`, 'Add specific metrics and data', 'Include relevant citations or references'],
        contentType: 'proposal_section',
        extractedContent: {
          section: section,
          title: this.getSectionTitle(section),
          content: content
        }
      };

    } catch (error) {
      console.error('Maya proposal generation error:', error);
      return this.generateFallbackProposalContent(section);
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
  private generateFallbackProposalContent(section: string): MayaResponse {
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

    return {
      content: `I've generated the ${section} section for your proposal. You can see it on the canvas to the left, where you can review and edit it further.`,
      confidence: 0.7,
      reasoning: 'Fallback proposal content using available context',
      suggestions: [
        'Customize this content with specific details',
        'Add relevant data and metrics',
        'Include supporting evidence and examples'
      ],
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
   * Generate resource request suggestions
   */
  private generateResourceRequests(resourceNeeds: string[]): string {
    if (resourceNeeds.length === 0) return '';
    
    const requests = resourceNeeds.slice(0, 2); // Limit to 2 requests to avoid overwhelming
    
    let requestText = '\n\n**📎 To help you better, I could use:**\n';
    requests.forEach((resource, index) => {
      requestText += `${index + 1}. **${resource}** - This would help me provide more specific and tailored advice\n`;
    });
    
    requestText += '\nYou can upload these documents using the "Upload Files" button, or just share the key information in our chat. Even rough drafts or partial information would be helpful!';
    
    return requestText;
  }

  /**
   * Detect if user is requesting proposal content generation
   */
  private detectProposalRequest(userMessage: string): { isProposalRequest: boolean; section?: string } {
    const message = userMessage.toLowerCase();
    
    // Check for explicit section requests
    const sectionKeywords = {
      'executive': ['executive summary', 'executive', 'summary', 'overview'],
      'project': ['project description', 'project', 'methodology', 'approach'],
      'budget': ['budget', 'cost', 'financial', 'funding breakdown'],
      'impact': ['impact', 'outcomes', 'results', 'benefits'],
      'timeline': ['timeline', 'schedule', 'milestones', 'phases'],
      'team': ['team', 'staff', 'personnel', 'qualifications', 'capacity']
    };

    // Check for proposal generation keywords
    const proposalKeywords = [
      'write', 'draft', 'create', 'generate', 'help me write',
      'can you write', 'please write', 'draft a', 'create a'
    ];

    const hasProposalKeyword = proposalKeywords.some(keyword => message.includes(keyword));
    
    if (hasProposalKeyword) {
      // Find which section they're asking for
      for (const [section, keywords] of Object.entries(sectionKeywords)) {
        if (keywords.some(keyword => message.includes(keyword))) {
          return { isProposalRequest: true, section };
        }
      }
      
      // General proposal request
      if (message.includes('proposal') || message.includes('application')) {
        return { isProposalRequest: true };
      }
    }

    return { isProposalRequest: false };
  }

  /**
   * Chat with Maya - main conversation method
   */
  async chat(userMessage: string): Promise<MayaResponse> {
    if (!this.context) {
      throw new Error('Maya agent not initialized. Call initialize() first.');
    }

    try {
      // Check if this is a proposal content request
      const proposalRequest = this.detectProposalRequest(userMessage);
      
      if (proposalRequest.isProposalRequest && proposalRequest.section) {
        // Generate proposal section content
        return await this.generateProposalSection(proposalRequest.section);
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

      // Analyze if Maya should ask for additional resources
      const resourceNeeds = this.analyzeResourceNeeds(userMessage, this.context.messages);
      const resourceRequests = this.generateResourceRequests(resourceNeeds);
      
      // Add resource requests to Maya's response if needed
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
      
      // Simple fallback using available context
      return this.generateFallbackResponse(userMessage);
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
   * Analyze uploaded file and provide insights
   */
  async analyzeUploadedFile(fileName: string, fileContent: string, fileType: string): Promise<MayaResponse> {
    if (!this.context) {
      throw new Error('Maya agent not initialized. Call initialize() first.');
    }

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
- File: ${fileName} (${fileType})

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

    const content = `Great question about ${topic}! To give you the most helpful advice for ${org?.name || 'your organization'}'s application to ${grant?.title || 'this grant'}, I need to understand your situation better.

**Here are some key questions that will help me provide more targeted guidance:**

${questions.map((q, i) => `${i + 1}. ${q}`).join('\n\n')}

Feel free to answer any or all of these - even partial information helps me give you better advice. We can also tackle them one at a time if you prefer!`;

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