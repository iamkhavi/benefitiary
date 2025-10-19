/**
 * Maya Response Generation - Natural, contextual responses
 */

import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { UserContext, GrantContext } from './types';

export class ResponseGenerator {
  private llm: ChatOpenAI;

  constructor(llm: ChatOpenAI) {
    this.llm = llm;
  }

  /**
   * Generate natural system prompt - no rigid templates
   */
  generateSystemPrompt(userContext: UserContext, grantContext: GrantContext): string {
    const org = userContext?.organization;
    const grant = grantContext;

    return `You are Maya, an experienced grant consultant. You help organizations create winning proposals.

**Current Context:**
- Organization: ${org?.name || 'Organization'} (${org?.orgType?.replace(/_/g, ' ') || 'Not specified'})
- Grant: ${grant?.title || 'Grant Opportunity'} from ${grant?.funder?.name || 'Funder'}
- Funding: $${grant?.fundingAmountMin?.toLocaleString() || '0'} - $${grant?.fundingAmountMax?.toLocaleString() || '0'}

**Your Role:**
- Generate actual proposal content when users request it
- Respond naturally to user questions and concerns
- Be direct and helpful - focus on results
- When users complain about missing content, immediately create what they need
- Match the user's tone and emotional state
- Use bullet points and clear structure in responses
- Don't follow rigid templates - respond contextually

**Key Capabilities:**
- Create complete proposals with cover pages and sections
- Generate individual proposal sections (executive, project, budget, etc.)
- Analyze uploaded documents
- Provide strategic guidance on grant applications

Respond naturally and helpfully to whatever the user needs.`;
  }

  /**
   * Generate contextual response after creating content
   */
  async generateContentResponse(
    section: string, 
    generatedContent: string, 
    userRequest: string,
    userContext: UserContext,
    grantContext: GrantContext
  ): Promise<{ content: string; suggestions: string[] }> {
    
    const prompt = `I just generated a ${this.getSectionTitle(section)} section for the user's grant proposal.

User request: "${userRequest}"
Content created: ${generatedContent.split(/\s+/).length} words
Organization: ${userContext?.organization?.name || 'User organization'}

Respond naturally - acknowledge what was accomplished and suggest next steps. Be concise and use bullet points.`;

    try {
      const response = await this.llm.invoke([
        new SystemMessage(this.generateSystemPrompt(userContext, grantContext)),
        new HumanMessage(prompt)
      ]);

      const content = response.content as string;
      return {
        content: this.cleanResponse(content),
        suggestions: this.extractSuggestions(content)
      };
    } catch (error) {
      return {
        content: `✅ Added ${this.getSectionTitle(section)} to your canvas\n\n**Next steps:**\n• Review and customize the content\n• Add specific details about your organization\n• Continue with other sections`,
        suggestions: ['Review generated content', 'Customize with your details', 'Work on next section']
      };
    }
  }

  /**
   * Generate response for general chat (no content generation)
   */
  async generateChatResponse(
    userMessage: string,
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
    userContext: UserContext,
    grantContext: GrantContext
  ): Promise<string> {
    
    const messages = [
      new SystemMessage(this.generateSystemPrompt(userContext, grantContext)),
      // Add recent conversation history
      ...conversationHistory.slice(-6).map(msg =>
        msg.role === 'user' ? new HumanMessage(msg.content) : new SystemMessage(msg.content)
      ),
      new HumanMessage(userMessage)
    ];

    try {
      const response = await this.llm.invoke(messages);
      return this.cleanResponse(response.content as string);
    } catch (error) {
      return "I'm having trouble processing that request. Could you try rephrasing it?";
    }
  }

  /**
   * Clean up response formatting
   */
  private cleanResponse(content: string): string {
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/^\s*[-•]\s*/gm, '• ')
      .trim();
  }

  /**
   * Extract actionable suggestions from response
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
   * Get proper section title
   */
  private getSectionTitle(section: string): string {
    const titles = {
      'executive': 'Executive Summary',
      'project': 'Project Description', 
      'budget': 'Budget Overview',
      'impact': 'Expected Impact',
      'timeline': 'Project Timeline',
      'team': 'Team & Qualifications',
      'complete_proposal': 'Complete Proposal'
    };
    return titles[section as keyof typeof titles] || section.charAt(0).toUpperCase() + section.slice(1);
  }
}