/**
 * Maya xAI Wrapper - Clean Implementation Following Guide
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
  }>;
  stream?: boolean; // Enable streaming status updates
}

interface MayaResponse {
  intent: 'chat_advice' | 'canvas_write' | 'hybrid';
  content: string;
  extractedContent?: {
    section: string;
    title: string;
    content: string;
    editingIntent: {
      intent: 'append' | 'rewrite' | 'modify';
    };
  };
  suggestions: string[];
}

interface StreamingStatus {
  type: 'status' | 'final';
  status?: string;
  progress?: number;
  data?: MayaResponse;
}

// Cache for context data with invalidation support
const contextCache = new Map<string, { data: any; timestamp: number; version: string }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Streaming helper function
function createStreamingResponse() {
  const encoder = new TextEncoder();
  let controller: ReadableStreamDefaultController<Uint8Array>;

  const stream = new ReadableStream({
    start(ctrl) {
      controller = ctrl;
    }
  });

  const sendStatus = (status: string, progress?: number) => {
    const statusUpdate: StreamingStatus = {
      type: 'status',
      status,
      progress
    };
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(statusUpdate)}\n\n`));
  };

  const sendFinal = (data: MayaResponse) => {
    const finalUpdate: StreamingStatus = {
      type: 'final',
      data
    };
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(finalUpdate)}\n\n`));
    controller.close();
  };

  return { stream, sendStatus, sendFinal };
}

// Cache invalidation helpers
function invalidateUserCache(userId: string) {
  const keysToDelete = Array.from(contextCache.keys()).filter(key => key.startsWith(`${userId}-`));
  keysToDelete.forEach(key => contextCache.delete(key));
  console.log(`Invalidated ${keysToDelete.length} cache entries for user ${userId}`);
}

function invalidateGrantCache(grantId: string) {
  const keysToDelete = Array.from(contextCache.keys()).filter(key => key.endsWith(`-${grantId}`));
  keysToDelete.forEach(key => contextCache.delete(key));
  console.log(`Invalidated ${keysToDelete.length} cache entries for grant ${grantId}`);
}

function generateCacheVersion(user: any, grant: any): string {
  // Create a version hash based on updatedAt timestamps
  const userVersion = user?.updatedAt?.getTime() || 0;
  const orgVersion = user?.organization?.updatedAt?.getTime() || 0;
  const grantVersion = grant?.updatedAt?.getTime() || 0;
  const funderVersion = grant?.funder?.updatedAt?.getTime() || 0;

  return `${userVersion}-${orgVersion}-${grantVersion}-${funderVersion}`;
}

// Streaming request handler with real-time status updates
async function handleStreamingRequest(
  request: NextRequest,
  session: any,
  userMessage: string,
  sessionId: string | undefined,
  grantId: string,
  userContext: any,
  history: Array<{ role: 'user' | 'assistant'; content: string }> | undefined,
  currentCanvasContent: string | undefined,
  uploadedDocuments: Array<any> | undefined
) {
  const { stream, sendStatus, sendFinal } = createStreamingResponse();

  // Run the processing in the background
  (async () => {
    try {
      // Fast intent detection first
      const isCanvasAction = detectCanvasIntent(userMessage, currentCanvasContent);
      const hasDocuments = uploadedDocuments && uploadedDocuments.length > 0;
      const isSimpleChat = isSimpleChatMessage(userMessage) && !hasDocuments;
      const isCompleteProposal = isCompleteProposalRequest(userMessage, currentCanvasContent);

      // Show initial thinking status
      sendStatus("💭 Thinking...", 30);

      // Load context with caching (fast, cached)
      const fullContext = await loadContextWithCache(session.user.id, grantId, userContext);

      // Load persistent conversation history for continuity (fast, cached)
      const persistentHistory = await loadConversationHistory(session.user.id, grantId, sessionId);
      const conversationHistory = persistentHistory.length > 0 ? persistentHistory : (history || []);

      // Skip expensive operations for simple chat
      let criticalAnalysis = 'Analysis available on request';
      let documentAnalysis = null;

      if (!isSimpleChat) {
        // Only do expensive analysis for complex requests
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

      // Build optimized system prompt with persistent conversation context
      const systemPrompt = isSimpleChat
        ? buildLightweightPrompt(fullContext, conversationHistory, currentCanvasContent)
        : buildMayaPrompt(fullContext, conversationHistory, currentCanvasContent, uploadedDocuments, criticalAnalysis, documentAnalysis || undefined, isCompleteProposal);

      // Now actually working on the response
      sendStatus("✍️ Working...", 70);

      // Call xAI Grok directly with optimized settings
      const mayaResponse = await callGrok(systemPrompt, userMessage, isCanvasAction, isSimpleChat, isCompleteProposal);

      // Save conversation and wait for completion to ensure persistence
      await saveConversation(session.user.id, grantId, userMessage, mayaResponse, sessionId);

      // Send final response
      sendFinal({
        success: true,
        sessionId: sessionId || 'temp-session',
        processingTime: Date.now() - Date.now(),
        ...mayaResponse
      } as any);

    } catch (error) {
      console.error('Streaming Maya API Error:', error);
      sendFinal({
        success: false,
        intent: 'chat_advice',
        content: "An error occurred. Please try again.",
        suggestions: ['Try again', 'Ask for help', 'Start over']
      } as any);
    }
  })();

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
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
    const { userMessage, sessionId, grantId, userContext, history, currentCanvasContent, uploadedDocuments, stream }: MayaRequest = await request.json();

    if (!userMessage || !grantId) {
      return NextResponse.json({ error: 'Missing userMessage or grantId' }, { status: 400 });
    }

    // Check if streaming is requested
    if (stream) {
      return handleStreamingRequest(request, session, userMessage, sessionId, grantId, userContext, history, currentCanvasContent, uploadedDocuments);
    }

    // Fast intent detection first
    const isCanvasAction = detectCanvasIntent(userMessage, currentCanvasContent);
    const hasDocuments = uploadedDocuments && uploadedDocuments.length > 0;
    const isSimpleChat = isSimpleChatMessage(userMessage) && !hasDocuments; // Never lightweight if documents uploaded
    const isCompleteProposal = isCompleteProposalRequest(userMessage, currentCanvasContent);

    // Load context with caching
    const fullContext = await loadContextWithCache(session.user.id, grantId, userContext);

    // Load persistent conversation history for continuity
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

    // Build optimized system prompt with persistent conversation context
    const systemPrompt = isSimpleChat
      ? buildLightweightPrompt(fullContext, conversationHistory, currentCanvasContent)
      : buildMayaPrompt(fullContext, conversationHistory, currentCanvasContent, uploadedDocuments, criticalAnalysis, documentAnalysis || undefined, isCompleteProposal);

    // Call xAI Grok directly with optimized settings
    const mayaResponse = await callGrok(systemPrompt, userMessage, isCanvasAction, isSimpleChat, isCompleteProposal);

    // Save conversation and wait for completion to ensure persistence
    await saveConversation(session.user.id, grantId, userMessage, mayaResponse, sessionId);

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

  try {
    // Handle general chat case
    if (grantId === 'general-chat') {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          organization: true
        }
      });

      if (!user) {
        throw new Error('User not found');
      }

      const org = user.organization;
      return {
        // Organization Details only for general chat
        orgName: org?.name || 'Organization',
        orgType: org?.orgType?.replace(/_/g, ' ') || 'Not specified',
        orgSize: org?.orgSize?.replace(/_/g, ' ') || 'Not specified',
        orgCountry: org?.country || 'Not specified',
        orgIndustries: org?.industries?.join(', ') || 'Not specified',
        orgWebsite: org?.website || 'Not specified',
        
        // General context
        grantTitle: 'General Grant Consultation',
        grantDescription: 'General funding and grant guidance',
        funderName: 'Various Funders',
        ...userOverrides
      };
    }

    // Always load fresh data to check versions for specific grants
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

    const currentVersion = generateCacheVersion(user, grant);

    // Return cached data if still valid AND version matches
    if (cached &&
      (Date.now() - cached.timestamp) < CACHE_TTL &&
      cached.version === currentVersion) {
      console.log(`Cache hit for ${cacheKey}`);
      return { ...cached.data, ...userOverrides };
    }

    // Cache miss or stale data - rebuild context
    console.log(`Cache miss/stale for ${cacheKey}, rebuilding...`);

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

    // Cache the result with version
    contextCache.set(cacheKey, {
      data: contextData,
      timestamp: Date.now(),
      version: currentVersion
    });

    return { ...contextData, ...userOverrides };
  } catch (error) {
    console.error('Failed to load context:', error);
    return userOverrides || {};
  }
}

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
 * Detect if user is requesting a complete proposal document
 */
function isCompleteProposalRequest(userMessage: string, currentCanvasContent?: string): boolean {
  const message = userMessage.toLowerCase();

  // Complete proposal indicators - expanded for better detection
  const completeProposalKeywords = [
    'full proposal', 'complete proposal', 'entire proposal', 'whole proposal',
    'draft proposal', 'new proposal', 'proposal from scratch', 'start proposal',
    'write proposal', 'create proposal', 'generate proposal', 'write the proposal',
    'create the proposal', 'draft the proposal', 'build the proposal',
    '10 page', '15 page', '20 page', 'comprehensive proposal', 'detailed proposal',
    'professional proposal', 'grant proposal', 'funding proposal'
  ];

  // If canvas is empty and user asks for proposal content, assume complete
  const isEmptyCanvas = !currentCanvasContent || currentCanvasContent.trim().length < 500;
  const mentionsProposal = message.includes('proposal');

  // Enhanced detection for empty canvas
  if (isEmptyCanvas && mentionsProposal && !message.includes('section') && !message.includes('part')) {
    return true;
  }

  // Direct keyword matching
  if (completeProposalKeywords.some(keyword => message.includes(keyword))) {
    return true;
  }

  // Context-based detection
  if (isEmptyCanvas && (message.includes('write') || message.includes('create') || message.includes('generate'))) {
    return true;
  }

  return false;
}

/**
 * Check if this is a simple chat message that doesn't need heavy processing
 * Lightweight = greetings, advice, clarification questions (NO document processing or content generation)
 */
function isSimpleChatMessage(userMessage: string): boolean {
  const message = userMessage.toLowerCase();

  // ALWAYS use full prompt for any content generation or document processing
  const alwaysFullPromptPatterns = [
    /(write|create|generate|build|draft|make)/,
    /(budget|timeline|proposal|section)/,
    /(rewrite|modify|update|improve|enhance|expand|fix|change|edit)/,
    /(analyze|assess|review|evaluate)/,
    /upload|document|file|rfp|sample/
  ];

  // If it requires content generation or document processing, NOT simple
  if (alwaysFullPromptPatterns.some(pattern => pattern.test(message))) {
    return false;
  }

  // True lightweight patterns - advice, greetings, clarification only
  const lightweightPatterns = [
    /^(hi|hello|hey|thanks|thank you|good morning|good afternoon)/,
    /^(what do you think|what are my chances|should i apply|is this competitive)/,
    /^(any tips|any advice|what should i focus on|what matters most)/,
    /^(tell me about|explain|describe|what does.*mean|what is)/,
    /^(how competitive|what are the odds|what do funders look for)/,
    /\?$/ // Questions that end with ? (but not content generation questions)
  ];

  // Only lightweight if it matches lightweight patterns AND doesn't involve content creation
  return lightweightPatterns.some(pattern => pattern.test(message));
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
    ? `Canvas: ${Math.round(currentCanvasContent.length / 1000)}k chars of existing content.`
    : 'Canvas: Empty - ready for complete proposal generation.';

  const orgType = fullContext.orgType || 'organization';
  const grantCategory = fullContext.grantCategory || 'grant';

  return `You are Maya, a seasoned funding consultant with 15+ years of experience helping organizations secure grants. You're working with ${fullContext.orgName} on their ${fullContext.grantTitle} opportunity from ${fullContext.funderName} (${fullContext.fundingAmountMin}-${fullContext.fundingAmountMax}, deadline ${fullContext.deadline}).

CONVERSATION CONTEXT: ${historyStr}
CURRENT WORK: ${canvasStr}

YOUR EXPERTISE: You understand funder psychology, grant review processes, and what makes proposals win. You leverage actual grant details and organization information - never make up details. You seek clarification when information is missing that could impact success.

RESPONSE APPROACH:
- Start conversationally, acknowledging the specific context
- Provide expert insights based on actual grant and organization details
- Be dynamically aware of what's already been done (check conversation history and canvas)
- Structure information when helpful, but maintain advisory flow
- Always provide context-appropriate next steps (don't suggest creating a proposal if one exists)
- Ask for clarification when missing critical information
- Position the organization for maximum competitive advantage

CRITICAL: Be contextually intelligent - your next steps should reflect current conversation state and what's already been accomplished. If a proposal exists, focus on refinement, strategy, or submission preparation.

Respond with valid JSON only. Adapt your response structure to the specific context and conversation stage.

{
  "intent": "chat_advice" | "canvas_write" | "hybrid",
  "content": "[Context-aware response that reflects current conversation state and provides expert guidance]",
  "suggestions": ["Context-appropriate action 1", "Context-appropriate action 2", "Context-appropriate action 3"]
}`;
}

/**
 * Build Maya's system prompt - following guide exactly
 */
function buildMayaPrompt(
  fullContext: any,
  history: Array<{ role: string; content: string }>,
  currentCanvasContent?: string,
  uploadedDocuments?: Array<any>,
  criticalAnalysis?: string,
  documentAnalysis?: string,
  isCompleteProposal?: boolean
): string {
  // Condensed context (no repetition)
  const contextSummary = `Org: ${fullContext.orgName} (${fullContext.orgType}, ${fullContext.orgIndustries}, ${fullContext.orgCountry}).
Grant: ${fullContext.grantTitle} (${fullContext.grantCategory}, ${fullContext.grantDescription?.substring(0, 200) || 'Grant opportunity'}...).
Funder: ${fullContext.funderName} (focus: ${fullContext.funderFocusAreas}).
Funding: ${fullContext.fundingAmountMin}-${fullContext.fundingAmountMax}, ${fullContext.grantDurationMonths} months, deadline ${fullContext.deadline}.
Eligibility: ${fullContext.grantEligibility}. Goals: ${fullContext.grantProgramGoals}.`;

  const historyStr = history.length > 0
    ? history.slice(-6).map(msg => `${msg.role}: ${msg.content.substring(0, 200)}${msg.content.length > 200 ? '...' : ''}`).join('\n')
    : 'No history.';

  const canvasStr = currentCanvasContent
    ? `Canvas: ${Math.round(currentCanvasContent.length / 1000)}k chars existing. Modify on "improve/fix"; create new on "write/draft".`
    : 'Canvas: Empty—create fresh.';

  const docsStr = (uploadedDocuments?.length ? `Docs: ${uploadedDocuments.map(d => `${d.fileName} (${d.type})`).join(', ')}. Analysis: ${documentAnalysis || 'Pending'}.` : 'No docs.');

  const analysisStr = criticalAnalysis || 'Fit analysis on request.';



  return `You are Maya: Senior funding consultant with 15+ years experience helping organizations win grants. You're working with ${fullContext.orgName} on their ${fullContext.grantTitle} opportunity from ${fullContext.funderName}.

CURRENT CONTEXT:
Organization: ${contextSummary}
Grant Analysis: ${analysisStr}
Documents: ${docsStr}
Conversation: ${historyStr}
Current Work: ${canvasStr}

YOUR EXPERTISE: You understand funder priorities, review processes, and winning strategies. You leverage ACTUAL details from grant requirements and organization information - never fabricate. You're contextually aware of conversation progress and what's already been accomplished.

SMART OBJECTIVES REQUIREMENT: All objectives must be:
- Specific: Clear, well-defined outcomes
- Measurable: Quantifiable metrics (numbers, percentages, timeframes)
- Achievable: Realistic based on organizational capacity
- Relevant: Aligned with funder priorities and organizational mission
- Time-bound: Clear deadlines and milestones

Example: "Increase women's access to microfinance by training 200 women in financial literacy and facilitating $50,000 in loans to 150 participants within 18 months, resulting in 80% loan repayment rate and 60% increase in household income."

DOCUMENT GENERATION CAPABILITY:
${isCompleteProposal ? `
COMPREHENSIVE PROPOSAL GENERATION:
- Generate complete 10-20 page professional proposals using actual grant and organization details
- STRICT PAGE STRUCTURE:
  * Page 1: COVER PAGE ONLY - Title, Organization, Funder, Date, Amount (minimal content)
  * Page 2: Executive Summary (300-400 words maximum)
  * Pages 3-4: Statement of Need with data and evidence
  * Page 5: SMART Objectives (Specific, Measurable, Achievable, Relevant, Time-bound)
  * Pages 6-10: Project Description with detailed methodology
  * Page 11: Timeline (complete tables that don't break across pages)
  * Pages 12-13: Budget (complete tables with proper page breaks)
  * Page 14: Evaluation Plan with clear metrics
  * Pages 15-16: Organizational Capacity
- Use <div class="page-break"></div> BEFORE each major section
- Ensure tables are complete on single pages - add page breaks before large tables
- Use single, clear titles (avoid redundant "Title/Title" or "Section/Section" formats)
- Generate SMART objectives with specific, measurable outcomes
- COVER PAGE CONTENT: Only title, organization name, funder name, date, and requested amount
- TABLE FORMATTING: Use class="proposal-table" and ensure complete tables per page
` : `
SECTION DEVELOPMENT:
- Create detailed, substantive content for specific proposal sections
- Use actual organizational data and grant requirements
- Maintain professional formatting with proper structure
- Ensure content aligns with funder priorities and review criteria
`}

RESPONSE INTELLIGENCE:
- Be contextually aware: If proposal exists, don't suggest creating one
- Adapt next steps based on conversation progress and current canvas state
- Ask for clarification when missing critical information that impacts competitiveness
- Provide strategic insights based on actual funder patterns and requirements
- Structure responses naturally - use headers/bullets when they enhance clarity
- Always ground advice in actual grant details and organizational strengths

CRITICAL: Be dynamically intelligent. Your responses should reflect current conversation state, what's been accomplished, and what's actually needed next. Leverage real details, seek clarification when needed, and position the organization for maximum competitive advantage.

Output JSON with context-appropriate content and next steps:

{
  "intent": "chat_advice" | "canvas_write" | "hybrid",
  "content": "[Context-aware expert guidance based on actual situation and conversation progress]",
  "extractedContent": {
    "section": "section_type",
    "title": "Document Title",
    "content": "Professional HTML content using actual organizational and grant details",
    "editingIntent": {"intent": "append" | "rewrite" | "modify"}
  },
  "suggestions": ["Context-appropriate next action", "Strategic follow-up", "Competitive advantage step"]
}

Respond as an experienced consultant who understands the current situation and provides intelligent, context-aware guidance.`;
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

  // Complete proposal indicators (should trigger full document creation)
  const completeProposalKeywords = [
    'full proposal', 'complete proposal', 'entire proposal', 'whole proposal',
    'draft proposal', 'new proposal', 'proposal from scratch', 'start proposal',
    'write proposal', 'create proposal', 'generate proposal'
  ];

  // Chat-only indicators
  const chatKeywords = [
    'how', 'what', 'why', 'when', 'where', 'should i', 'can you explain',
    'tell me about', 'advice', 'help me understand', 'question',
    'think', 'opinion', 'suggest', 'recommend'
  ];

  // Check for complete proposal requests (highest priority)
  const isCompleteProposal = completeProposalKeywords.some(keyword => message.includes(keyword));
  if (isCompleteProposal) {
    return true;
  }

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
async function callGrok(systemPrompt: string, userMessage: string, isCanvasAction: boolean = false, isSimpleChat: boolean = false, isCompleteProposal: boolean = false): Promise<MayaResponse> {
  const XAI_API_KEY = process.env.XAI_API_KEY;

  if (!XAI_API_KEY) {
    throw new Error('XAI_API_KEY not configured');
  }

  // Optimize parameters based on request type - leveraging Grok-4's 2M token capacity
  const maxTokens = isCompleteProposal ? 15000 : 
                   (isCanvasAction ? 8000 : 
                   (isSimpleChat ? 1500 : 4000));
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
          model: 'grok-4', // Full reasoning helps JSON adherence
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
          temperature: 0.2, // Less drift for better JSON
          max_tokens: maxTokens, // Prevent overflow
          stream: false // Reliable JSON responses
        }),
      });

      const apiTime = Date.now() - startTime;
      console.log(`Grok API call completed in ${apiTime}ms (attempt ${attempt})`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`xAI API Error (attempt ${attempt}):`, response.status, errorText);
        throw new Error(`xAI API failed: ${response.status} - ${errorText}`);
      }

      // Simple, reliable JSON response
      const data = await response.json();
      const content = data.choices[0]?.message?.content;
      const usage = data.usage;

      if (!content) {
        throw new Error('No content in response');
      }

      // Log response metrics
      console.log(`Maya response: ${content.length} characters, ${usage?.total_tokens || 'unknown'} tokens`);

      // Simple, reliable JSON validation
      const parsedResponse = JSON.parse(content);

      if (!parsedResponse.intent || !parsedResponse.content) {
        throw new Error('Response missing required fields');
      }

      if (parsedResponse.intent === 'canvas_write' && (!parsedResponse.extractedContent || !parsedResponse.extractedContent.editingIntent)) {
        throw new Error('Canvas write response missing extractedContent structure');
      }

      console.log('Response validation passed');
      return parsedResponse;

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
- Requirements: ${fullContext.grantEligibility}
- Amount: ${fullContext.fundingAmountMin} - ${fullContext.fundingAmountMax}

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
            model: 'grok-4',
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
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const userId = searchParams.get('userId');
  const grantId = searchParams.get('grantId');

  // Handle cache management actions
  if (action === 'invalidate-user' && userId) {
    invalidateUserCache(userId);
    return NextResponse.json({ success: true, message: `Cache invalidated for user ${userId}` });
  }

  if (action === 'invalidate-grant' && grantId) {
    invalidateGrantCache(grantId);
    return NextResponse.json({ success: true, message: `Cache invalidated for grant ${grantId}` });
  }

  if (action === 'clear-cache') {
    const entriesCleared = contextCache.size;
    contextCache.clear();
    return NextResponse.json({ success: true, message: `Cleared ${entriesCleared} cache entries` });
  }

  // Default health check
  const cacheStats = {
    entries: contextCache.size,
    oldestEntry: contextCache.size > 0 ? Math.min(...Array.from(contextCache.values()).map(v => v.timestamp)) : 0,
    newestEntry: contextCache.size > 0 ? Math.max(...Array.from(contextCache.values()).map(v => v.timestamp)) : 0,
    cacheKeys: Array.from(contextCache.keys())
  };

  return NextResponse.json({
    status: 'Maya xAI wrapper ready - CLEAN IMPLEMENTATION WITH CACHE INVALIDATION',
    model: 'grok-4',
    features: [
      'direct_ai_communication',
      'intent_detection',
      'canvas_integration',
      'context_caching_with_invalidation',
      'version_based_cache_validation',
      'lightweight_chat_mode',
      'async_database_saves',
      'optimized_token_usage',
      'clean_prompts_following_guide'
    ],
    performance: {
      contextCache: cacheStats,
      optimizations: [
        'Context caching with version-based invalidation',
        'Automatic cache invalidation on data updates',
        'Simple chat detection',
        'Lightweight prompts for basic questions',
        'Reduced token limits for chat',
        'Async database operations',
        'Clean implementation following guide'
      ]
    },
    cacheManagement: {
      endpoints: {
        invalidateUser: '?action=invalidate-user&userId=USER_ID',
        invalidateGrant: '?action=invalidate-grant&grantId=GRANT_ID',
        clearAll: '?action=clear-cache'
      }
    }
  });
}