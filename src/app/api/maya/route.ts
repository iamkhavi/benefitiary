/**
 * Maya xAI Wrapper - Simple, Direct, Intelligent
 * No LangChain, no over-engineering - just raw AI power
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface MayaRequest {
  userMessage: string;
  sessionId?: string;
  grantId: string;
  userContext?: any;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  currentCanvasContent?: string;
  uploadedDocuments?: Array<{
    fileName: string;
    content: string;
    type: 'pdf' | 'doc' | 'txt';
  }>; // NEW: Document processing capability
}

interface MayaResponse {
  intent: 'chat_advice' | 'canvas_write' | 'hybrid';
  content: string;
  extractedContent?: {
    section: string;
    title: string;
    content: string;
    editingIntent: {
      intent: 'append' | 'rewrite';
    };
  };
  suggestions: string[];
}

// Cache for context data (5 minute TTL)
const contextCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Load persistent conversation history for continuity
 */
async function loadConversationHistory(userId: string, grantId: string, sessionId?: string): Promise<Array<{ role: string; content: string }>> {
  try {
    // Find the session for this user-grant combination
    const session = await prisma.aIGrantSession.findUnique({
      where: {
        userId_grantId: {
          userId: userId,
          grantId: grantId
        }
      },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 20, // Last 20 messages for context
          select: {
            sender: true,
            content: true,
            createdAt: true
          }
        }
      }
    });

    if (!session || !session.messages.length) {
      return [];
    }

    // Convert to Maya's expected format
    return session.messages
      .reverse() // Oldest first
      .map(msg => ({
        role: msg.sender === 'USER' ? 'user' : 'assistant',
        content: msg.content
      }));

  } catch (error) {
    console.error('Failed to load conversation history:', error);
    return [];
  }
}

/**
 * Build intelligent conversation context that helps Maya carry on naturally
 */
function buildConversationContext(history: Array<{ role: string; content: string }>, currentCanvasContent?: string): string {
  if (history.length === 0) {
    return currentCanvasContent 
      ? `**Canvas:** ${Math.round(currentCanvasContent.length / 1000)}k chars of existing content\n**Conversation:** Starting fresh`
      : `**Canvas:** Empty\n**Conversation:** Starting fresh`;
  }

  // Get recent meaningful exchanges (last 6 messages)
  const recentHistory = history.slice(-6);
  
  // Identify conversation themes and progress
  const themes = extractConversationThemes(recentHistory);
  const canvasProgress = analyzeCanvasProgress(currentCanvasContent, recentHistory);
  
  // Build contextual summary for Maya
  const recentExchange = recentHistory
    .slice(-2) // Just the last exchange for immediate context
    .map(msg => `${msg.role}: ${msg.content.substring(0, 150)}${msg.content.length > 150 ? '...' : ''}`)
    .join('\n');

  return `**Canvas:** ${canvasProgress}
**Conversation Themes:** ${themes}
**Recent Exchange:**
${recentExchange}`;
}

/**
 * Extract key themes from conversation history
 */
function extractConversationThemes(history: Array<{ role: string; content: string }>): string {
  const content = history.map(h => h.content.toLowerCase()).join(' ');
  
  const themes = [];
  if (content.includes('budget') || content.includes('cost') || content.includes('financial')) themes.push('budget');
  if (content.includes('timeline') || content.includes('schedule') || content.includes('deadline')) themes.push('timeline');
  if (content.includes('team') || content.includes('staff') || content.includes('personnel')) themes.push('team');
  if (content.includes('fit') || content.includes('eligible') || content.includes('qualify')) themes.push('fit-analysis');
  if (content.includes('proposal') || content.includes('application') || content.includes('complete')) themes.push('full-proposal');
  if (content.includes('executive') || content.includes('summary')) themes.push('executive-summary');
  
  return themes.length > 0 ? themes.join(', ') : 'general discussion';
}

/**
 * Analyze canvas progress and state
 */
function analyzeCanvasProgress(currentCanvasContent?: string, history?: Array<{ role: string; content: string }>): string {
  if (!currentCanvasContent) return 'Empty - ready for new content';
  
  const size = Math.round(currentCanvasContent.length / 1000);
  
  // Check if Maya recently updated the canvas
  const recentCanvasWork = history?.some(h => 
    h.role === 'assistant' && 
    (h.content.includes('created') || h.content.includes('updated') || h.content.includes('added'))
  ) || false;
  
  if (recentCanvasWork) {
    return `${size}k chars - just updated by Maya`;
  } else {
    return `${size}k chars - existing content to build on`;
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Authentication
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request
    const { userMessage, sessionId, grantId, userContext, history, currentCanvasContent, uploadedDocuments }: MayaRequest = await request.json();

    if (!userMessage || !grantId) {
      return NextResponse.json({ error: 'Missing userMessage or grantId' }, { status: 400 });
    }

    // Fast intent detection first
    const isCanvasAction = detectCanvasIntent(userMessage, currentCanvasContent);
    const isSimpleChat = isSimpleChatMessage(userMessage);

    // Load context with caching
    const fullContext = await loadContextWithCache(session.user.id, grantId, userContext);

    // Load persistent conversation history for continuity (prioritize over frontend history)
    const persistentHistory = await loadConversationHistory(session.user.id, grantId, sessionId);
    const conversationHistory = persistentHistory.length > 0 ? persistentHistory : (history || []);

    // Skip expensive operations for simple chat
    let criticalAnalysis = 'Analysis available on request';
    let documentAnalysis = null;

    if (!isSimpleChat) {
      // Only do expensive analysis for complex requests
      const hasDocuments = uploadedDocuments && uploadedDocuments.length > 0;
      const needsAnalysis = userMessage.toLowerCase().includes('analyz') ||
        userMessage.toLowerCase().includes('assess') ||
        userMessage.toLowerCase().includes('fit') ||
        hasDocuments;

      if (needsAnalysis) {
        criticalAnalysis = await performCriticalAnalysis(fullContext);
      }

      // Only analyze documents if they were uploaded
      if (hasDocuments) {
        documentAnalysis = await analyzeUploadedDocuments(uploadedDocuments, fullContext);
      }
    }

    // Build optimized system prompt
    const systemPrompt = isSimpleChat
      ? buildLightweightPrompt(fullContext, conversationHistory, currentCanvasContent)
      : buildMayaPrompt(fullContext, conversationHistory, currentCanvasContent, uploadedDocuments, criticalAnalysis, documentAnalysis || undefined);

    // Call xAI Grok directly with optimized settings
    const mayaResponse = await callGrok(systemPrompt, userMessage, isCanvasAction, isSimpleChat);

    // Async save conversation (don't wait for it)
    saveConversation(session.user.id, grantId, userMessage, mayaResponse, sessionId).catch(console.error);

    const processingTime = Date.now() - startTime;
    console.log(`Maya response completed in ${processingTime}ms`);

    // Return response
    return NextResponse.json({
      success: true,
      sessionId: sessionId || 'temp-session',
      processingTime,
      ...mayaResponse
    });

  } catch (error) {
    console.error('CRITICAL Maya API Error:', error);

    // Simple, clean error message
    return NextResponse.json({
      success: false,
      intent: 'chat_advice',
      content: "An error occurred. Please try again.",
      suggestions: ['Try again', 'Ask for help', 'Start over']
    });
  }
}

/**
 * Load context with caching for performance
 */
async function loadContextWithCache(userId: string, grantId: string, userOverrides?: any) {
  const cacheKey = `${userId}-${grantId}`;
  const cached = contextCache.get(cacheKey);

  // Return cached data if still valid
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    return { ...cached.data, ...userOverrides };
  }

  try {
    // Load user + organization + grant + funder details
    const [user, grant] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        include: {
          organization: true
        }
      }),
      prisma.grant.findUnique({
        where: { id: grantId },
        include: {
          funder: true
        }
      })
    ]);

    if (!user || !grant) {
      throw new Error('User or grant not found');
    }

    const org = user.organization;

    const contextData = {
      // Organization Details
      orgName: org?.name || 'Organization',
      orgType: org?.orgType?.replace(/_/g, ' ') || 'Not specified',
      orgSize: org?.orgSize?.replace(/_/g, ' ') || 'Not specified',
      orgCountry: org?.country || 'Not specified',
      orgIndustries: org?.industries?.join(', ') || 'Not specified',
      orgWebsite: org?.website || 'Not specified',

      // Grant Details
      grantTitle: grant.title || 'Grant Opportunity',
      grantDescription: grant.description || 'Not specified',
      grantCategory: grant.category?.replace(/_/g, ' ') || 'Not specified',
      grantEligibility: grant.eligibilityCriteria || 'Not specified',
      grantProgramGoals: Array.isArray(grant.programGoals) ? grant.programGoals.join(', ') : (grant.programGoals as string) || 'Not specified',
      grantLocationEligibility: Array.isArray(grant.locationEligibility) ? grant.locationEligibility.join(', ') : (grant.locationEligibility as string) || 'Not specified',
      grantDurationMonths: grant.durationMonths || 'Not specified',

      // Funder Details
      funderName: grant.funder?.name || 'Funding Organization',
      funderType: grant.funder?.type?.replace(/_/g, ' ') || 'Not specified',
      funderMission: grant.funder?.mission || 'Not specified',
      funderFocusAreas: Array.isArray(grant.funder?.focusAreas) ? grant.funder.focusAreas.join(', ') : (grant.funder?.focusAreas as string) || 'Not specified',

      // Financial Details
      fundingAmountMin: grant.fundingAmountMin?.toLocaleString() || 'Not specified',
      fundingAmountMax: grant.fundingAmountMax?.toLocaleString() || 'Not specified',

      // Timeline
      deadline: grant.deadline ? new Date(grant.deadline).toLocaleDateString() : 'Not specified',
    };

    // Cache the result
    contextCache.set(cacheKey, {
      data: contextData,
      timestamp: Date.now()
    });

    return { ...contextData, ...userOverrides };
  } catch (error) {
    console.error('Failed to load context:', error);
    return userOverrides || {};
  }
}

/**
 * Check if this is a simple chat message that doesn't need heavy processing
 */
function isSimpleChatMessage(userMessage: string): boolean {
  const message = userMessage.toLowerCase();

  // Simple question patterns
  const simplePatterns = [
    /^(hi|hello|hey|thanks|thank you)/,
    /^(what|how|why|when|where|who|can you|could you|should i|would you)/,
    /\?$/,
    /^(tell me|explain|describe)/,
    /^(i need help|help me|can you help)/
  ];

  // Complex action patterns that need full processing
  const complexPatterns = [
    /(write|create|generate|build|draft|make)/,
    /(budget|timeline|proposal|section)/,
    /(rewrite|modify|update|improve|enhance|expand|fix|change|edit)/,
    /(analyze|assess|review|evaluate)/
  ];

  // If it matches simple patterns and doesn't match complex ones, it's simple
  const isSimple = simplePatterns.some(pattern => pattern.test(message));
  const isComplex = complexPatterns.some(pattern => pattern.test(message));

  return isSimple && !isComplex;
}

/**
 * Perform critical analysis of grant-organization fit
 */
async function performCriticalAnalysis(fullContext: any): Promise<string> {
  const XAI_API_KEY = process.env.XAI_API_KEY;

  if (!XAI_API_KEY) {
    return 'Analysis unavailable - API key not configured';
  }

  const analysisPrompt = `Analyze this grant-organization fit critically:

ORGANIZATION: ${fullContext.orgName} (${fullContext.orgType})
- Industries: ${fullContext.orgIndustries}
- Size: ${fullContext.orgSize}
- Location: ${fullContext.orgCountry}

GRANT: ${fullContext.grantTitle}
- Funder: ${fullContext.funderName} (${fullContext.funderType})
- Focus: ${fullContext.funderFocusAreas}
- Requirements: ${fullContext.grantRequirements}
- Amount: $${fullContext.fundingAmountMin} - $${fullContext.fundingAmountMax}

Provide critical analysis:
1. ALIGNMENT SCORE (1-10): How well does this org fit this grant?
2. STRENGTHS: What makes this org competitive?
3. GAPS: What's missing or weak in their profile?
4. RISKS: What could hurt their chances?
5. CRITICAL QUESTIONS: What info do we need to strengthen the application?
6. POSITIONING STRATEGY: How should they position themselves?

Be brutally honest about fit and gaps.`;

  try {
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${XAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'grok-4-fast-non-reasoning',
        messages: [{ role: 'user', content: analysisPrompt }],
        temperature: 0.3,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      throw new Error(`Analysis API failed: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'Analysis failed';

  } catch (error) {
    console.error('Critical analysis failed:', error);
    return 'Analysis unavailable due to technical issues';
  }
}

/**
 * Analyze uploaded documents intelligently
 */
async function analyzeUploadedDocuments(documents: Array<any>, fullContext: any): Promise<string> {
  const XAI_API_KEY = process.env.XAI_API_KEY;

  if (!XAI_API_KEY) {
    return 'Document analysis unavailable - API key not configured';
  }

  const documentContent = documents.map(doc =>
    `DOCUMENT: ${doc.fileName} (${doc.type})\nCONTENT: ${doc.content}`
  ).join('\n\n');

  const analysisPrompt = `Analyze these uploaded documents in the context of grant applications. Identify what type of documents they are and how they can be strategically used.

ORGANIZATION CONTEXT:
- Name: ${fullContext.orgName} (${fullContext.orgType})
- Grant: ${fullContext.grantTitle}
- Funder: ${fullContext.funderName}

UPLOADED DOCUMENTS:
${documentContent}

For each document, provide:
1. DOCUMENT TYPE: (RFP, Guidelines, Previous Proposal, Organizational Document, etc.)
2. KEY INSIGHTS: Most important information extracted
3. STRATEGIC VALUE: How this helps the grant application
4. OPPORTUNITIES: What advantages this creates
5. CHALLENGES: What concerns or gaps this reveals
6. USAGE RECOMMENDATIONS: Specific ways to leverage this document

Be specific and actionable. Focus on strategic implications for grant success.`;

  try {
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${XAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'grok-4-fast-non-reasoning',
        messages: [{ role: 'user', content: analysisPrompt }],
        temperature: 0.2,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      throw new Error(`Document analysis API failed: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'Document analysis failed';

  } catch (error) {
    console.error('Document analysis failed:', error);
    return 'Document analysis unavailable due to technical issues';
  }
}

/**
 * Build lightweight prompt that trusts Grok-4's native capabilities
 */
function buildLightweightPrompt(
  fullContext: any,
  history: Array<{ role: string; content: string }>,
  currentCanvasContent?: string
): string {
  const historyStr = history.length > 0
    ? history.slice(-4).map(msg => `${msg.role}: ${msg.content}`).join('\n')
    : 'No previous conversation';

  const canvasStr = currentCanvasContent
    ? `**Canvas:** ${Math.round(currentCanvasContent.length / 1000)}k chars - user has existing content`
    : '**Canvas:** Empty - no existing content';

  return `You are Maya, an enthusiastic grant consultant helping ${fullContext.orgName} win their ${fullContext.grantTitle} grant from ${fullContext.funderName}.

**Context:** ${fullContext.orgName} (${fullContext.orgType}) • ${fullContext.grantTitle} • ${fullContext.fundingAmountMin}-${fullContext.fundingAmountMax} • Deadline: ${fullContext.deadline}

**History:** ${historyStr}

**${canvasStr}**

Detect intent semantically and respond with JSON only:
{
  "intent": "chat_advice" | "canvas_write" | "hybrid",
  "content": "Your enthusiastic response with proactive questions",
  "suggestions": ["actionable next step 1", "actionable next step 2", "actionable next step 3"]
}

Intent guide: advice (questions/strategy), canvas_write (create/modify content), hybrid (both). Trust your semantic understanding.`;
}

/**
 * Build Maya's system prompt with comprehensive context and analysis
 */
function buildMayaPrompt(
  fullContext: any,
  history: Array<{ role: string; content: string }>,
  currentCanvasContent?: string,
  uploadedDocuments?: Array<any>,
  criticalAnalysis?: string,
  documentAnalysis?: string
): string {
  const contextStr = `
**ORGANIZATION PROFILE:**
- Name: ${fullContext.orgName}
- Type: ${fullContext.orgType}
- Size: ${fullContext.orgSize}
- Location: ${fullContext.orgCountry}
- Industries: ${fullContext.orgIndustries}
- Website: ${fullContext.orgWebsite}

**GRANT OPPORTUNITY:**
- Title: ${fullContext.grantTitle}
- Category: ${fullContext.grantCategory}
- Description: ${fullContext.grantDescription}
- Duration: ${fullContext.grantDurationMonths} months
- Eligibility: ${fullContext.grantEligibility}
- Program Goals: ${fullContext.grantProgramGoals}
- Location Eligibility: ${fullContext.grantLocationEligibility}

**FUNDER PROFILE:**
- Name: ${fullContext.funderName}
- Type: ${fullContext.funderType}
- Mission: ${fullContext.funderMission}
- Focus Areas: ${fullContext.funderFocusAreas}

**FUNDING DETAILS:**
- Amount Range: $${fullContext.fundingAmountMin} - $${fullContext.fundingAmountMax}
- Deadline: ${fullContext.deadline}

**CRITICAL ANALYSIS:**
${criticalAnalysis || 'Analysis pending...'}

**DOCUMENT ANALYSIS:**
${documentAnalysis || 'No documents uploaded'}

**UPLOADED DOCUMENTS:**
${uploadedDocuments && uploadedDocuments.length > 0
      ? uploadedDocuments.map(doc => `- ${doc.fileName} (${doc.type})`).join('\n')
      : 'No documents uploaded'
    }

**STRATEGIC CONTEXT:**
This ${fullContext.orgType} organization (${fullContext.orgName}) is applying for a ${fullContext.grantCategory} grant from ${fullContext.funderName}. Based on the critical analysis above, you must be proactive in identifying gaps and asking clarifying questions to strengthen their application.`;

  const historyStr = history.length > 0
    ? history.slice(-6).map(msg => `${msg.role}: ${msg.content}`).join('\n')
    : 'No previous conversation';

  const canvasStr = currentCanvasContent
    ? `**Current Canvas Content:**
${currentCanvasContent}

**Important:** The user has existing content on their canvas. When they ask to "improve" or "modify" sections, work with what they already have. When they ask to "rewrite" or "create new", you can replace content.`
    : '**Current Canvas Content:** Empty canvas - no existing content';

  return `You are Maya, the ultimate grant-winning sidekick—energetic, honest, and laser-focused on turning ${fullContext.orgName}'s dreams into funded reality.

**Context:** ${fullContext.orgName} (${fullContext.orgType}) applying for ${fullContext.grantTitle} from ${fullContext.funderName} • ${fullContext.fundingAmountMin}-${fullContext.fundingAmountMax} • Deadline: ${fullContext.deadline}

**Strategic Fit:** ${criticalAnalysis || 'Analysis available on request'}

**History:** ${historyStr}

${canvasStr}

**Canvas Working Rules:**
- When canvas has content and user says "improve/fix/change" → modify existing content
- When user asks to "create/write/draft" → generate new content  
- When canvas is empty → always create new content
- Always include extractedContent for canvas_write/hybrid intents

**Intent Detection (Trust Your Semantic Understanding):**
Scan semantically for the user's emotional/cognitive state:
- Hesitant questions = chat_advice
- "Fix/tweak" + canvas reference = canvas_write  
- Mixed signals = hybrid + probe
- Grant lifecycle: fit check (advice), section build (write), full draft (hybrid)

**Response Format (JSON Only):**
{
  "intent": "chat_advice" | "canvas_write" | "hybrid",
  "content": "Empathetic response describing exact actions you're taking",
  "extractedContent": {
    "section": "budget" | "timeline" | "complete_proposal" | etc,
    "title": "Section Title",
    "content": "HTML formatted content with proper structure",
    "editingIntent": { "intent": "append" | "rewrite" | "modify" }
  },
  "suggestions": ["actionable probe 1", "actionable probe 2", "actionable probe 3"]
}
**CONVERSATION HISTORY:**
${historyStr}

${canvasStr}

**Section-Specific Formatting Guidelines:**
Each proposal section has optimal presentation formats. Apply these intelligently based on content:

**Budget Section:** ALWAYS use tabular format with:
- Clear categories (Personnel, Equipment, Travel, etc.)
- Amount columns with proper currency formatting
- Percentage breakdowns
- Detailed justification column
- Subtotals and grand total
- Cost-per-unit calculations where applicable

**Timeline Section:** Use tables or structured lists with:
- Phase/milestone columns
- Duration/dates
- Key activities and deliverables
- Dependencies and critical path indicators

**Goals & Objectives:** Use SMART format:
- Specific, Measurable, Achievable, Relevant, Time-bound
- Numbered lists with clear metrics
- Outcome vs. output distinction

**Team/Organizational Capacity:** Use structured format:
- Role-based organization
- Qualifications and experience bullets
- Time allocation percentages
- Organizational chart when relevant

**Evaluation Plan:** Use metrics tables:
- Quantitative vs. qualitative measures
- Baseline, target, and measurement methods
- Data collection timeline

**Methodology:** Use process flows:
- Step-by-step approaches
- Logic models when appropriate
- Visual representation of processes

**Intelligent Content Generation:**
You have the intelligence to detect when users want comprehensive proposal content vs. specific sections vs. advice. Use your judgment to determine:

**Complete Proposal Intent:** When users express need for full proposals, comprehensive documents, or complete applications - automatically generate professionally structured proposals with all essential sections.

**Section-Specific Intent:** When users mention specific sections (budget, timeline, etc.) - generate that section with optimal formatting.

**Advisory Intent:** When users ask questions, seek guidance, or need strategic advice - provide consultative responses.

**Professional Proposal Structure (when generating complete proposals):**
1. Executive Summary
2. Statement of Need/Project Description  
3. Goals and Objectives (SMART format)
4. Methodology/Approach (process-oriented)
5. Timeline (tabular with phases)
6. Budget and Budget Justification (detailed tables)
7. Organizational Capacity/Team (structured roles)
8. Evaluation Plan (metrics tables)
9. Sustainability Plan
10. Conclusion

**Automatic Formatting Intelligence:**
- Budget sections → Always use detailed tables with categories, amounts, percentages, justifications
- Timeline sections → Always use structured tables with phases, durations, activities, deliverables
- Goals sections → Always use SMART format with measurable outcomes
- Team sections → Always use role-based structure with qualifications
- Evaluation sections → Always use metrics tables with measurement methods

**Intent Classification:**
Intelligently classify each message based on context and meaning, not rigid phrase matching:
- 'chat_advice': User seeking advice, strategy, tips, questions, or general conversation
- 'canvas_write': User wants you to generate/write/modify proposal content (detected through context, not specific phrases)
- 'hybrid': Both advice and content generation needed

**Examples of intelligent intent detection:**
- "What should I focus on?" → chat_advice (seeking guidance)
- "Help me with the budget" → canvas_write (implies content creation)
- "How do I make this stronger?" → could be chat_advice or canvas_write depending on context
- "Tell me about grant writing" → chat_advice (general information)
- "Fix the timeline section" → canvas_write (clear content modification request)

**CRITICAL: Always include complete JSON structure. Never truncate.**

**MANDATORY FOR COMPLETE PROPOSALS:**
When generating complete proposals, you MUST include ALL sections with proper page breaks:
- Cover page, Executive Summary, Statement of Need, Project Description, Timeline, Budget, Team, Evaluation, Sustainability, Conclusion
- Use <div class="page-break"></div> between major sections
- Generate substantial content for each section, not just placeholders

**Output Format:**
Respond with JSON only - ENSURE the JSON is complete and valid:
{
  "intent": "chat_advice" | "canvas_write" | "hybrid",
  "content": "Your chat response - MUST accurately describe what you actually did in canvas (if any) and provide clear next steps",
  "extractedContent": {
    "section": "executive_summary" | "project_description" | "budget" | "timeline" | "team" | "complete_proposal",
    "title": "Section Title", 
    "content": "HTML formatted content with proper page breaks",
    "editingIntent": {
      "intent": "append" | "rewrite" | "modify"
    }
  },
  "suggestions": ["specific next action 1", "specific next action 2", "specific next action 3"]
}

**CRITICAL: Your "content" field must accurately reflect what you put in "extractedContent". Never describe actions you didn't take.**

**IMPORTANT:** 
- For complete proposals, keep content comprehensive but ensure JSON remains valid
- Always close all JSON braces properly
- If content is very long, prioritize JSON validity over content length

**Critical Content Formatting Rules:**
1. **Chat Responses:** Always use clear structure with headers, bullet points, and sections for easy scanning
2. **Canvas Content:** Use proper HTML with page breaks for long content
3. **Complete Proposals:** Always start with a proper title page structure, not jumping to Executive Summary
4. **Rewrite Intent:** When user asks to "rewrite entire proposal" or similar, use "rewrite" intent and create complete document structure

**Natural Language Understanding:**
You have advanced natural language understanding. Use context, conversation history, and semantic meaning to determine intent:
- Don't rely on specific keywords or phrases
- Consider the user's current situation and what would be most helpful
- Understand implied requests (e.g., "this budget needs work" implies canvas modification)
- Recognize when users want to continue working vs. just discussing
- Use Grok's intelligence to understand nuanced requests and provide appropriate responses

**Maya's Working Style:**
1. **Always acknowledge the user's request enthusiastically**
2. **Break down the work into clear steps**
3. **Work section by section for full proposals**
4. **Ask permission before proceeding to next sections**
5. **Suggest next steps after every canvas action**
6. **Be genuinely excited and helpful**

**Complete Proposal Strategy:**
- When user wants a full proposal, start with a brief first draft of all sections
- After generating, ask which section they'd like to expand first
- Work iteratively, one section at a time
- Always suggest what to work on next

**Section Work:**
- Generate focused, quality content for the requested section
- Always suggest improvements or next steps
- Be ready to expand, modify, or enhance any section

**Few-Shot Examples:**

Input: [Any budget-related request - detected intelligently]
Output: {
  "intent": "canvas_write",
  "content": "I'll create a strategic budget tailored to your ${fullContext.orgType} organization and this ${fullContext.grantCategory} opportunity. Given the $${fullContext.fundingAmountMax} maximum, I'll structure it to align with ${fullContext.funderName}'s priorities in ${fullContext.funderFocusAreas}.",
  "extractedContent": {
    "section": "budget",
    "title": "Budget and Budget Justification",
    "content": "<h2>Budget Overview - ${fullContext.grantTitle}</h2><p>Total Project Budget: $${fullContext.fundingAmountMax}</p><p><strong>Strategic Alignment:</strong> This budget reflects ${fullContext.funderName}'s focus on ${fullContext.funderFocusAreas} and supports a ${fullContext.grantDurationMonths}-month implementation timeline.</p><table><tr><th>Category</th><th>Amount</th><th>Justification</th></tr><tr><td>Personnel (60%)</td><td>$[Amount]</td><td>Experienced team for ${fullContext.grantCategory} implementation</td></tr></table>",
    "editingIntent": { "intent": "rewrite" }
  },
  "suggestions": ["Align with funder priorities", "Add organizational capacity details", "Include sustainability planning"]
}

Input: "How do I impress funders with my proposal?"
Output: {
  "intent": "chat_advice",
  "content": "I'm so excited to help you create a winning proposal! 🎉 Based on your organization and this grant opportunity, I can see some fantastic potential here.\n\n## Here's how we'll make your proposal absolutely compelling:\n\n### 🌟 Your Strengths to Highlight\n- Your ${fullContext.orgIndustries} expertise is PERFECT for ${fullContext.funderName}'s focus areas\n- Your ${fullContext.orgCountry} location gives you direct access to the communities they want to impact\n- Your ${fullContext.orgType} structure aligns beautifully with their funding preferences\n\n### 🚀 My Strategy for Your Success\n1. **Lead with your impact story** - I'll help you showcase your track record\n2. **Demonstrate your readiness** - We'll show you can hit the ground running\n3. **Prove sustainability** - I'll help you articulate long-term vision\n\n### 💡 What I'd love to know to make this even stronger:\n- What amazing partnerships do you have that could amplify this work?\n- What successes from similar projects can we highlight?\n- How do you currently measure impact in your work?\n\nShall we start crafting your proposal? I'm ready to help you win this funding! ✨",
  "suggestions": ["Let's write the proposal", "Tell me about your partnerships", "Share your past successes", "Help me understand your impact measurement"]
}

**CRITICAL INTEGRITY RULE: Maya must ONLY describe what she actually did in the canvas. Never claim something happened if you're not certain.**

**CANVAS-CHAT SYNCHRONIZATION RULES:**
1. **When you generate canvas content** - Your chat response MUST accurately describe what you actually created
2. **When you modify canvas content** - Your chat response MUST accurately describe what you actually changed  
3. **Never assume or guess** - Only describe what you know you did based on your extractedContent
4. **Always provide next steps** - Based on what you actually accomplished, suggest specific next actions
5. **For chat-only responses** - No canvas synchronization needed, just provide helpful advice and suggestions

**RESPONSE PATTERNS:**
- **Canvas actions**: "I just created/modified [specific description]. Here's what I included: [list]. Next steps: [suggestions]"
- **Chat advice**: Provide helpful guidance, ask clarifying questions, suggest approaches without claiming canvas actions
- **Hybrid**: Combine canvas action description with additional strategic advice

**For Complete Proposals:**
- Only claim "complete proposal" if you actually generate ALL sections with real content
- If you generate partial content, be honest: "I created the first draft with [specific sections]"
- Always suggest logical next steps based on what's actually missing

**Document Analysis Examples:**

Input: "I uploaded a document" (or when documents are detected)
Output: {
  "intent": "chat_advice",
  "content": "I've analyzed your uploaded document and here's my comprehensive assessment:\n\n**DOCUMENT IDENTIFICATION:**\n[Document type and purpose based on analysis]\n\n**WHAT I UNDERSTOOD:**\n[Key insights, requirements, criteria, etc. extracted from the document]\n\n**STRATEGIC VALUE FOR YOUR APPLICATION:**\n[How this document helps your grant application]\n\n**OPPORTUNITIES I IDENTIFIED:**\n[Specific advantages this creates for your organization]\n\n**POTENTIAL CHALLENGES:**\n[Areas that may need attention based on document requirements]\n\n**HOW I CAN HELP YOU USE THIS:**\n1. **Strategic Analysis** - Deep dive into requirements vs. your strengths\n2. **Gap Assessment** - Identify what you need to address\n3. **Content Creation** - Write proposal sections that directly respond to this document\n4. **Positioning Strategy** - Help you stand out based on these insights\n5. **Compliance Check** - Ensure you meet all requirements\n\n**MY QUESTIONS FOR YOU:**\nHow would you like me to help you leverage this document? Are you looking for strategic guidance, content creation, or gap analysis? What's your priority right now?",
  "suggestions": ["Analyze strategic fit", "Identify gaps to address", "Create responsive content", "Develop positioning strategy"]
}

**Proactive Questioning Examples:**

Input: "Write me a project description"
Output: {
  "intent": "chat_advice", 
  "content": "Before I write your project description, I need to ensure it's strategically positioned. Based on my analysis, this funder prioritizes [specific outcomes]. To create the strongest possible description, I need to know: 1) What specific methodology will you use? 2) Who are your target beneficiaries and how many? 3) What partnerships do you have in place? 4) How will you measure success? 5) What makes your approach innovative compared to existing solutions? These details will help me craft a compelling, competitive project description.",
  "suggestions": ["Provide methodology details", "Define target population", "List key partnerships", "Specify success metrics"]
}

**Important:**
- Always respond with valid JSON only
- Be proactive in asking clarifying questions when information is missing
- Analyze uploaded documents thoroughly and extract actionable insights
- Reference the critical analysis to provide strategic guidance
- Ask specific questions to strengthen applications
- For canvas_write intent, always include extractedContent
- Use HTML formatting for extractedContent with proper structure
- Be honest about gaps and risks while remaining supportive

**CORRECT BEHAVIOR EXAMPLES:**

✅ **GOOD - Honest about what was actually done:**
"I just created a budget section for your proposal. Here's what I included: budget overview, cost categories table, and strategic alignment text. Next steps: review the percentages, add specific personnel costs, or create the timeline section."

❌ **BAD - Claiming uncertain actions:**
"I'll create a budget section..." (claiming future action)
"I've generated a complete proposal..." (when only creating one section)
"Your proposal now has..." (assuming what exists without knowing)

**FINAL INTEGRITY CHECK:**
Before responding, verify that if you claim to generate a "complete proposal" with multiple sections, you are actually generating ALL those sections with real content. Never lie about what you're creating. Users depend on your honesty.

Your chat response must ONLY describe what you actually put in extractedContent. Be specific about what you created and suggest clear next steps.

Respond with JSON only - trust your semantic understanding and build on our conversation naturally.`;

  // Smart conversation context that builds continuity
  const conversationContext = buildConversationContext(history, currentCanvasContent);
  
  // Condensed context for efficiency
  const contextSummary = `${fullContext.orgName} (${fullContext.orgType}) → ${fullContext.grantTitle} from ${fullContext.funderName} • ${fullContext.fundingAmountMin}-${fullContext.fundingAmountMax} • Deadline: ${fullContext.deadline}`;
  
  const documentsInfo = uploadedDocuments?.length 
    ? `**Documents:** ${uploadedDocuments?.map(d => d.fileName).join(', ')}`
    : '';

  return `You are Maya, the ultimate grant-winning sidekick for ${fullContext.orgName}—energetic, honest, and laser-focused on turning dreams into funded reality.

**CONTEXT:** ${contextSummary}
${documentsInfo}
**FIT ANALYSIS:** ${criticalAnalysis || 'Available on request'}

**CONVERSATION FLOW:**
${conversationContext}

**CANVAS INTELLIGENCE:**
- Canvas empty → create new content
- Canvas has content + "improve/fix/change" → modify existing  
- Canvas has content + "create/write/draft" → add new sections
- Always include extractedContent for canvas_write/hybrid

**DOCUMENT PROCESSING INTELLIGENCE:**
When documents are uploaded, you have access to comprehensive analysis including:
- Document type identification (RFP, Guidelines, Previous Proposals, etc.)
- Key insights and strategic value for the grant application
- Specific opportunities and challenges revealed
- Usage recommendations for leveraging each document

**FILE INPUT EXPECTATIONS & ACTIONS:**
- **RFP/Guidelines**: Extract requirements, scoring criteria, compliance needs → create targeted proposal sections
- **Previous Proposals**: Identify successful patterns, language, structure → adapt and improve for current application
- **Organizational Documents**: Extract capabilities, achievements, data → strengthen organizational capacity sections
- **Research/Data**: Extract evidence, statistics, methodologies → support project justification and methodology
- **Partnership Letters**: Extract commitments, resources, expertise → enhance collaboration and capacity sections

**DOCUMENT-DRIVEN RESPONSES:**
- Always acknowledge what documents were uploaded and what you understood from them
- Reference specific insights from documents in your responses
- Suggest how to strategically use document content in the proposal
- Ask targeted questions based on gaps identified in the documents
- Offer to create content that directly responds to document requirements

**MAYA'S CONVERSATION STYLE:**
- Build on previous exchanges naturally ("Building on the budget we just created...")
- Reference what you've already discussed/created ("Looking at your timeline from earlier...")
- Acknowledge user's progress and momentum ("Great! Now that we have the budget sorted...")
- Ask 1-2 targeted follow-up questions to keep moving forward
- Maintain enthusiasm while being strategic

**SEMANTIC INTENT (Trust Your Understanding):**
- Questions/strategy/advice → chat_advice
- Create/modify content → canvas_write
- Both advice + content → hybrid
- When unsure → hybrid + probe

Respond with JSON only:
{
  "intent": "chat_advice" | "canvas_write" | "hybrid",
  "content": "Natural response building on our conversation and referencing previous work",
  "extractedContent": {
    "section": "budget|timeline|complete_proposal|etc",
    "title": "Section Title", 
    "content": "HTML content with proper structure",
    "editingIntent": { "intent": "append|rewrite|modify" }
  },
  "suggestions": ["next step building on progress", "logical continuation", "strategic next move"]
}`;
}

/**
 * Detect if user message likely requires canvas action
 */
function detectCanvasIntent(userMessage: string, currentCanvasContent?: string): boolean {
  const message = userMessage.toLowerCase();

  // Canvas action indicators
  const canvasKeywords = [
    'write', 'create', 'generate', 'add', 'build', 'draft', 'make',
    'budget', 'timeline', 'proposal', 'section', 'executive summary',
    'project description', 'methodology', 'evaluation', 'team',
    'rewrite', 'modify', 'update', 'improve', 'enhance', 'expand',
    'fix', 'change', 'edit'
  ];

  // Chat-only indicators
  const chatKeywords = [
    'how', 'what', 'why', 'when', 'where', 'should i', 'can you explain',
    'tell me about', 'advice', 'help me understand', 'question',
    'think', 'opinion', 'suggest', 'recommend'
  ];

  // Check for canvas indicators
  const hasCanvasKeywords = canvasKeywords.some(keyword => message.includes(keyword));

  // Check for chat-only indicators
  const hasChatKeywords = chatKeywords.some(keyword => message.includes(keyword));

  // If user has existing canvas content and mentions improvement, likely canvas action
  if (currentCanvasContent && (message.includes('improve') || message.includes('better') || message.includes('enhance'))) {
    return true;
  }

  // If strong canvas indicators and no strong chat indicators, likely canvas action
  if (hasCanvasKeywords && !hasChatKeywords) {
    return true;
  }

  // Default to chat for ambiguous cases to be faster
  return false;
}

/**
 * Call xAI Grok API directly with optimizations
 */
async function callGrok(systemPrompt: string, userMessage: string, isCanvasAction: boolean = false, isSimpleChat: boolean = false): Promise<MayaResponse> {
  const XAI_API_KEY = process.env.XAI_API_KEY;

  if (!XAI_API_KEY) {
    throw new Error('XAI_API_KEY not configured');
  }

  // Optimize parameters based on request type
  const maxTokens = isSimpleChat ? 800 : (isCanvasAction ? 6000 : 2000);
  const temperature = isSimpleChat ? 0.3 : 0.7;
  const maxRetries = isSimpleChat ? 1 : 2; // Fewer retries for simple chat

  // Retry logic for API reliability
  let lastError: Error = new Error('Unknown error');
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const startTime = Date.now();

      const response = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${XAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'grok-4-fast-non-reasoning',
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user',
              content: userMessage
            }
          ],
          temperature,
          max_tokens: maxTokens,
          stream: true // Always stream for better UX - streaming is not the performance bottleneck
        }),
      });

      const apiTime = Date.now() - startTime;
      console.log(`Grok API call completed in ${apiTime}ms (attempt ${attempt})`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`xAI API Error (attempt ${attempt}):`, response.status, errorText);
        throw new Error(`xAI API failed: ${response.status} - ${errorText}`);
      }

      // Handle streaming response with proper chunk boundary management
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body reader available');
      }

      const decoder = new TextDecoder();
      let content = '';
      let usage: any;
      let buffer = ''; // Buffer for incomplete lines

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          // Add new chunk to buffer
          buffer += decoder.decode(value, { stream: true });
          
          // Process complete lines
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();
              if (data === '[DONE]') continue;
              if (!data) continue;

              try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices?.[0]?.delta?.content;
                if (delta) {
                  content += delta;
                }
                if (parsed.usage) {
                  usage = parsed.usage;
                }
              } catch (e) {
                // Only log if it's not just a truncated chunk
                if (data.length > 50) {
                  console.log('Skipping invalid JSON chunk:', data.substring(0, 100));
                }
              }
            }
          }
        }

        // Process any remaining buffer
        if (buffer.startsWith('data: ')) {
          const data = buffer.slice(6).trim();
          if (data && data !== '[DONE]') {
            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                content += delta;
              }
              if (parsed.usage) {
                usage = parsed.usage;
              }
            } catch (e) {
              console.log('Skipping final invalid JSON chunk:', data.substring(0, 100));
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      if (!content) {
        console.error('No content in xAI response');
        throw new Error('No content in xAI response');
      }

      // Log response metrics
      console.log(`Maya response: ${content.length} characters, ${usage?.total_tokens || 'unknown'} tokens`);

      // Validate and repair JSON structure before returning
      try {
        // First, try to parse as-is
        let parsedResponse;
        try {
          parsedResponse = JSON.parse(content);
        } catch (parseError) {
          console.log('Initial JSON parse failed, attempting repair...');
          
          // Try to repair common streaming JSON issues
          let repairedContent = content;
          
          // Fix common truncation issues
          if (!repairedContent.endsWith('}')) {
            // Find the last complete JSON structure
            const lastBraceIndex = repairedContent.lastIndexOf('}');
            if (lastBraceIndex > 0) {
              repairedContent = repairedContent.substring(0, lastBraceIndex + 1);
            }
          }
          
          // Fix incomplete string values
          repairedContent = repairedContent.replace(/"([^"]*?)$/g, '"$1"');
          
          // Try parsing the repaired content
          try {
            parsedResponse = JSON.parse(repairedContent);
            console.log('JSON repair successful');
          } catch (repairError) {
            console.error('JSON repair failed:', repairError);
            throw new Error(`Invalid JSON structure: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
          }
        }

        // Validate required fields
        if (!parsedResponse.intent || !parsedResponse.content) {
          throw new Error('Response missing required fields');
        }

        // Additional validation for canvas_write responses
        if (parsedResponse.intent === 'canvas_write' && (!parsedResponse.extractedContent || !parsedResponse.extractedContent.editingIntent)) {
          throw new Error('Canvas write response missing extractedContent structure');
        }

        console.log('Response validation passed');
        return parsedResponse;

      } catch (validationError) {
        console.error(`Response validation failed (attempt ${attempt}):`, validationError);
        lastError = new Error(`Invalid response structure: ${validationError instanceof Error ? validationError.message : String(validationError)}`);

        // If this is the last attempt, don't retry
        if (attempt === maxRetries) {
          throw lastError;
        }

        // Shorter wait for simple chat
        const waitTime = isSimpleChat ? 500 : (attempt * 1000);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }

    } catch (error) {
      console.error(`Grok API call failed (attempt ${attempt}):`, error);
      lastError = error instanceof Error ? error : new Error(String(error));

      // If this is the last attempt, throw the error
      if (attempt === maxRetries) {
        throw lastError;
      }

      // Shorter wait for simple chat
      const waitTime = isSimpleChat ? 500 : (attempt * 1000);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  // This should never be reached, but just in case
  throw lastError || new Error('All retry attempts failed');
}

/**
 * Save conversation to database (async, non-blocking)
 */
async function saveConversation(
  userId: string,
  grantId: string,
  userMessage: string,
  mayaResponse: MayaResponse,
  sessionId?: string
): Promise<string> {
  try {
    // Find or create session for this user-grant combination
    const session = await prisma.aIGrantSession.upsert({
      where: {
        userId_grantId: {
          userId: userId,
          grantId: grantId
        }
      },
      update: {
        updatedAt: new Date(),
        lastMessageAt: new Date(),
      },
      create: {
        userId: userId,
        grantId: grantId,
        title: `Grant Discussion - ${new Date().toLocaleDateString()}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastMessageAt: new Date(),
      },
    });

    // Save both messages in parallel
    await Promise.all([
      prisma.aIMessage.create({
        data: {
          sessionId: session.id,
          sender: 'USER',
          messageType: 'TEXT',
          content: userMessage,
          metadata: {
            timestamp: new Date().toISOString()
          }
        }
      }),
      prisma.aIMessage.create({
        data: {
          sessionId: session.id,
          sender: 'AI',
          messageType: 'TEXT',
          content: mayaResponse.content,
          metadata: {
            model: 'grok-4-fast-non-reasoning',
            intent: mayaResponse.intent,
            hasExtractedContent: !!mayaResponse.extractedContent,
            suggestions: mayaResponse.suggestions
          }
        }
      })
    ]);

    return session.id;

  } catch (error) {
    console.error('Failed to save conversation:', error);
    // Return a fallback session ID
    return sessionId || 'error-session';
  }
}

// Health check and performance monitoring
export async function GET() {
  const cacheStats = {
    entries: contextCache.size,
    oldestEntry: Math.min(...Array.from(contextCache.values()).map(v => v.timestamp)),
    newestEntry: Math.max(...Array.from(contextCache.values()).map(v => v.timestamp))
  };

  return NextResponse.json({
    status: 'Maya xAI wrapper ready - OPTIMIZED',
    model: 'grok-4-fast-non-reasoning',
    features: [
      'direct_ai_communication',
      'intent_detection',
      'canvas_integration',
      'context_caching',
      'lightweight_chat_mode',
      'async_database_saves',
      'optimized_token_usage'
    ],
    performance: {
      contextCache: cacheStats,
      optimizations: [
        'Context caching (5min TTL)',
        'Simple chat detection',
        'Lightweight prompts for basic questions',
        'Reduced token limits for chat',
        'Async database operations',
        'Fewer API retries for simple requests'
      ]
    }
  });
}