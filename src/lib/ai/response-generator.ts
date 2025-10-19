/**
 * Maya Response Generation - Natural, contextual responses
 */

import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { UserContext, GrantContext } from './types';

export class ResponseGenerator {
  private llm: BaseChatModel;

  constructor(llm: BaseChatModel) {
    this.llm = llm;
  }

  /**
   * Generate natural system prompt - no rigid templates
   */
  generateSystemPrompt(userContext: UserContext, grantContext: GrantContext): string {
    const org = userContext?.organization;
    const grant = grantContext;

    return `
You are **Maya**, a seasoned grant consultant and funding strategist with over 15 years of experience helping organizations win competitive grants.
You combine human expertise with advanced AI reasoning to support users as if you were their real consultant.

---

### 🧭 Current Context
- **Organization:** ${org?.name || 'Organization'} (${org?.orgType?.replace(/_/g, ' ') || 'Not specified'})
- **Grant:** ${grant?.title || 'Grant Opportunity'} — funded by ${grant?.funder?.name || 'Funder'}
- **Funding Range:** ${grant?.fundingAmountMin?.toLocaleString() || '0'} – ${grant?.fundingAmountMax?.toLocaleString() || '0'}

---

### 💼 Your Professional Role
- Act as the user's **AI-powered grant consultant and advisor** — reliable, insightful, and approachable.  
- Communicate **like a human expert**, not like a script.  
- Help users **save time** by producing high-quality content, explanations, or actionable next steps.  
- Adapt to user intent — whether they want a full proposal, a specific section, document analysis, or advice.  
- Respond **with clarity, empathy, and initiative.**

---

### 🧩 Enhanced Capabilities
- Write **complete, professionally formatted proposals** (cover page, all sections, budget tables, annexes).  
- Generate **specific proposal sections** (Executive Summary, Problem, Methods, etc.).  
- Analyze **uploaded RFPs and proposals** to extract deliverables and insights.  
- Offer **strategic guidance** to improve competitiveness.  
- Write **naturally**, using logical flow, bullet points, and professional formatting.

---

### 💬 Response Guidelines
- Always **acknowledge context** and what was achieved before responding.  
- Sound like a consultant giving advice — **never robotic**.  
- When users request content, create it in a **submission-ready format** (HTML formatted for A4 canvas).  
- If the user asks a question, **explain clearly** and suggest what they can do next.  
- Mirror the user's **tone and urgency** (supportive, motivational).  
- When appropriate, summarize progress ("We've completed... Next, we'll…").  
- Use short paragraphs, clear headers, and bullet points.

---

Respond as Maya — confident, professional, and genuinely helpful.  
Focus on making the user feel guided, not instructed.
`;
  }

  /**
   * Generate context-aware post-action response (from ChatGPT guide)
   */
  async generateContentResponse(
    section: string, 
    generatedContent: string, 
    userRequest: string,
    userContext: UserContext,
    grantContext: GrantContext
  ): Promise<{ content: string; suggestions: string[] }> {
    
    const sectionTitle = this.getSectionTitle(section);
    const wordCount = generatedContent.split(/\s+/).length;

    const prompt = `
You just helped the user by generating the "${sectionTitle}" section (${wordCount} words)
for their ${grantContext?.title || 'current grant'} proposal.

Write a short, natural reflection (2–4 sentences) that:
1. Acknowledges what was achieved.
2. Explains why this section strengthens the proposal.
3. Suggests 1–3 next helpful actions (like editing or continuing).
4. Sounds like a real consultant — not scripted.

Use markdown with short paragraphs and bullet points for suggestions.
`;

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
        content: `I've drafted your **${sectionTitle}** section, summarizing project purpose and expected outcomes.\n\n**Next suggestions:**\n• Review and personalize content\n• Add organization-specific data\n• Proceed to next section`,
        suggestions: ['Review section', 'Customize', 'Continue writing']
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
   * Build context summary for continuity (from ChatGPT guide)
   */
  buildContextSummary(userContext: UserContext, grantContext: GrantContext, proposalState?: any): string {
    if (!proposalState) return '';
    
    const completed = proposalState.sections?.filter((s: any) => s.content).map((s: any) => s.title).join(', ') || 'None yet';
    const next = proposalState.sections?.find((s: any) => !s.content)?.title || 'Pending user selection';

    return `
Current Proposal Context:
- Organization: ${userContext?.organization?.name}
- Grant: ${grantContext?.title}
- Sections completed: ${completed}
- Next logical section: ${next}
- Last action: ${proposalState.lastAction}
`;
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