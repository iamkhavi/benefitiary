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

export async function POST(request: NextRequest) {
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

    // Load comprehensive context from database
    const fullContext = await loadComprehensiveContext(session.user.id, grantId, userContext);

    // Perform critical analysis of grant-org fit
    const criticalAnalysis = await performCriticalAnalysis(fullContext);
    
    // Analyze uploaded documents if present
    const documentAnalysis = uploadedDocuments && uploadedDocuments.length > 0 
      ? await analyzeUploadedDocuments(uploadedDocuments, fullContext)
      : null;
    
    // Build Maya system prompt with full context and analysis
    const systemPrompt = buildMayaPrompt(fullContext, history, currentCanvasContent, uploadedDocuments, criticalAnalysis, documentAnalysis || undefined);

    // Call xAI Grok directly
    const mayaResponse = await callGrok(systemPrompt, userMessage);

    // Save conversation to database
    const savedSessionId = await saveConversation(session.user.id, grantId, userMessage, mayaResponse, sessionId);

    // Return response
    return NextResponse.json({
      success: true,
      sessionId: savedSessionId,
      ...mayaResponse
    });

  } catch (error) {
    console.error('Maya API Error:', error);
    
    // Return error response
    return NextResponse.json({
      success: false,
      intent: 'chat_advice',
      content: "An error occurred, please try again.",
      suggestions: []
    });
  }
}

/**
 * Load comprehensive context from database
 */
async function loadComprehensiveContext(userId: string, grantId: string, userOverrides?: any) {
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
    
    return {
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
      
      // Override with any user-provided context
      ...userOverrides
    };
  } catch (error) {
    console.error('Failed to load context:', error);
    return userOverrides || {};
  }
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
        model: 'grok-3',
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
        model: 'grok-3',
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

  return `You are Maya, a senior grant consultant with 15+ years of experience. You perform critical analysis and are proactive in identifying gaps and opportunities. You ask clarifying questions when you need more information to help users succeed.

**Your Analytical Approach:**
- Critically analyze grant-organization fit based on the analysis provided
- Identify gaps, risks, and missing information proactively
- Ask specific clarifying questions when you need more details
- Challenge assumptions and provide honest assessments
- Process uploaded documents (RFPs, guidelines, previous proposals) to extract key insights
- Position organizations strategically based on their unique strengths

**COMPREHENSIVE CONTEXT:**
${contextStr}

**Your Proactive Behavior:**
- When you identify gaps in the analysis, ASK SPECIFIC QUESTIONS to gather missing information
- When you see risks, PROACTIVELY address them with solutions
- When documents are uploaded, ANALYZE them thoroughly and extract actionable insights
- When positioning advice is needed, reference the critical analysis to provide strategic guidance
- Always consider: "What additional information would strengthen this application?"

**Document Processing Instructions:**
- When documents are uploaded WITHOUT specific context, automatically analyze them and identify their type and strategic value
- Provide a comprehensive summary of what you understood from each document
- Explain how each document can be used strategically for the grant application
- Offer specific ways you can help leverage the document (positioning, gap analysis, content creation, etc.)
- Ask the user how they want to use the document and what they'd like you to focus on
- Be proactive in suggesting multiple ways the document can strengthen their application

**Critical Questions You Should Ask:**
Based on the analysis, proactively ask about missing information like:
- Specific project details and methodologies
- Organizational capacity and track record
- Partnership and collaboration plans
- Sustainability and long-term impact strategies
- Budget justifications and cost-effectiveness
- Timeline feasibility and risk mitigation
- Evaluation methods and success metrics

**Conversation History:**
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

**Complete Proposal Detection:**
When users request complete proposals using phrases like:
- "draft a complete proposal" / "create a full proposal" / "generate the entire proposal"
- "write me a proposal" / "help me draft a proposal" / "create a proposal document"
- "I need a complete grant proposal" / "generate a full application"

You MUST create a comprehensive, professionally structured proposal with:
1. Cover page elements
2. Executive Summary
3. Project Description/Statement of Need
4. Goals and Objectives (SMART format)
5. Methodology/Approach (process-oriented)
6. Timeline (tabular with phases)
7. Budget and Budget Justification (detailed tables)
8. Organizational Capacity/Team (structured roles)
9. Evaluation Plan (metrics tables)
10. Sustainability Plan
11. Conclusion

**Intent Classification:**
Classify each message as one of:
- 'chat_advice': User seeking advice, strategy, tips, or has questions
- 'canvas_write': User wants you to generate/write proposal content
- 'hybrid': Both advice and content generation needed

**Output Format:**
Respond with JSON only:
{
  "intent": "chat_advice" | "canvas_write" | "hybrid",
  "content": "Your chat response text",
  "extractedContent": {
    "section": "executive_summary" | "project_description" | "budget" | "timeline" | "team" | "complete_proposal",
    "title": "Section Title",
    "content": "HTML formatted content with <h2>, <p>, <ul>, <table>, <div class=\\"page-break\\"></div>",
    "editingIntent": {
      "intent": "append" | "rewrite"
    }
  },
  "suggestions": ["suggestion1", "suggestion2", "suggestion3"]
}

**Section-Specific Examples:**

**Budget Section Example:**
Input: "Create a budget section" / "Help with the budget" / "Budget breakdown needed"
Output: Always use detailed tables with:
- Category breakdown (Personnel, Equipment, Travel, etc.)
- Amount and percentage columns
- Detailed justification for each line item
- Subtotals and grand total
- Cost-effectiveness metrics
- Professional table styling with borders and headers

**Timeline Section Example:**
Input: "Create a timeline" / "Project schedule needed"
Output: Use structured tables with phases, durations, activities, and deliverables

**Goals Section Example:**
Input: "Write project goals" / "Create objectives"
Output: Use SMART format (Specific, Measurable, Achievable, Relevant, Time-bound) with numbered lists

**Few-Shot Examples:**

Input: "Budget feels off, can you help?"
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
  "content": "Based on my analysis, your organization has a 7/10 fit with this grant. To strengthen your position: 1) Emphasize your ${fullContext.orgIndustries} experience, which directly aligns with their ${fullContext.funderFocusAreas} focus, 2) Address the gap I identified in [specific area] by providing more details about your capacity, and 3) Position your ${fullContext.orgCountry} location as an advantage for reaching their target population. However, I need to ask: Do you have specific partnerships or collaborations that could strengthen your application? Also, what's your track record with similar projects in the past 3 years?",
  "suggestions": ["Provide partnership details", "Share past project outcomes", "Clarify organizational capacity"]
}

Input: "Draft a complete proposal" / "Create a full proposal" / "Generate the entire proposal"
Output: {
  "intent": "canvas_write",
  "content": "I've created a comprehensive grant proposal with professional structure including cover page, table of contents, and all essential sections. The document is now ready on your canvas with proper formatting for ${fullContext.funderName}.",
  "extractedContent": {
    "section": "complete_proposal",
    "title": "Grant Proposal: ${fullContext.grantTitle}",
    "content": "<h1>Executive Summary</h1><p>This proposal requests ${fullContext.fundingAmountMax} from ${fullContext.funderName} to support [project name] over ${fullContext.grantDurationMonths} months. Our ${fullContext.orgType} organization, ${fullContext.orgName}, is uniquely positioned to address [key challenge] through innovative approaches that align with your focus on ${fullContext.funderFocusAreas}.</p><div class=\\"page-break\\"></div><h1>Statement of Need</h1><p>The challenge we address is critical in ${fullContext.orgCountry} and directly aligns with ${fullContext.funderName}'s mission. Current gaps in ${fullContext.grantCategory} create significant barriers that our project will systematically address.</p><div class=\\"page-break\\"></div><h1>Project Description</h1><p>Our comprehensive approach combines evidence-based strategies with innovative methodologies to achieve measurable impact. The project will be implemented over ${fullContext.grantDurationMonths} months with clear phases and deliverables.</p><h2>Goals and Objectives</h2><ul><li>Primary Goal: [Specific, measurable outcome aligned with funder priorities]</li><li>Objective 1: [Specific deliverable with timeline]</li><li>Objective 2: [Measurable outcome with metrics]</li></ul><div class=\\"page-break\\"></div><h1>Methodology and Approach</h1><p>Our methodology employs best practices in ${fullContext.grantCategory} with proven strategies that ensure sustainable impact. We will utilize a multi-phase approach designed to maximize effectiveness and align with ${fullContext.funderName}'s strategic priorities.</p><div class=\\"page-break\\"></div><h1>Timeline</h1><table><tr><th>Phase</th><th>Duration</th><th>Key Activities</th><th>Deliverables</th></tr><tr><td>Phase 1: Planning</td><td>Months 1-2</td><td>Project setup, team assembly</td><td>Project plan, baseline assessment</td></tr><tr><td>Phase 2: Implementation</td><td>Months 3-${Math.max(6, fullContext.grantDurationMonths - 2)}</td><td>Core project activities</td><td>Progress reports, interim outcomes</td></tr><tr><td>Phase 3: Evaluation</td><td>Final 2 months</td><td>Assessment, reporting</td><td>Final report, sustainability plan</td></tr></table><div class=\\"page-break\\"></div><h1>Budget and Budget Justification</h1><p>Total Project Budget: ${fullContext.fundingAmountMax}</p><table><tr><th>Category</th><th>Amount</th><th>Percentage</th><th>Justification</th></tr><tr><td>Personnel</td><td>${Math.round(parseFloat(fullContext.fundingAmountMax?.replace(/[^0-9]/g, '') || '100000') * 0.6).toLocaleString()}</td><td>60%</td><td>Experienced project team with proven expertise</td></tr><tr><td>Direct Costs</td><td>${Math.round(parseFloat(fullContext.fundingAmountMax?.replace(/[^0-9]/g, '') || '100000') * 0.25).toLocaleString()}</td><td>25%</td><td>Equipment, materials, and operational expenses</td></tr><tr><td>Evaluation</td><td>${Math.round(parseFloat(fullContext.fundingAmountMax?.replace(/[^0-9]/g, '') || '100000') * 0.1).toLocaleString()}</td><td>10%</td><td>Independent evaluation and assessment</td></tr><tr><td>Administrative</td><td>${Math.round(parseFloat(fullContext.fundingAmountMax?.replace(/[^0-9]/g, '') || '100000') * 0.05).toLocaleString()}</td><td>5%</td><td>Project management and oversight</td></tr></table><div class=\\"page-break\\"></div><h1>Organizational Capacity</h1><p>${fullContext.orgName} brings extensive experience in ${fullContext.orgIndustries} with a proven track record of successful project implementation. Our ${fullContext.orgSize} organization has the infrastructure and expertise necessary to deliver exceptional results.</p><h2>Key Personnel</h2><ul><li>Project Director: [Name and qualifications]</li><li>Lead Researcher: [Relevant expertise]</li><li>Community Coordinator: [Local knowledge and connections]</li></ul><div class=\\"page-break\\"></div><h1>Evaluation Plan</h1><p>Our comprehensive evaluation framework includes both formative and summative assessment strategies to ensure project effectiveness and continuous improvement. We will track key performance indicators aligned with ${fullContext.funderName}'s priorities.</p><h2>Key Metrics</h2><ul><li>Quantitative: [Specific numbers and targets]</li><li>Qualitative: [Stakeholder feedback and case studies]</li><li>Impact: [Long-term outcomes and sustainability measures]</li></ul><div class=\\"page-break\\"></div><h1>Sustainability Plan</h1><p>Beyond the ${fullContext.grantDurationMonths}-month funding period, we have developed a comprehensive sustainability strategy to ensure lasting impact. This includes diversified funding sources, community ownership, and institutional partnerships.</p><div class=\\"page-break\\"></div><h1>Conclusion</h1><p>This proposal represents a strategic investment in ${fullContext.grantCategory} that aligns perfectly with ${fullContext.funderName}'s mission and priorities. ${fullContext.orgName} is uniquely positioned to deliver exceptional results and create lasting positive change. We respectfully request ${fullContext.fundingAmountMax} to implement this transformative initiative.</p>",
    "editingIntent": { "intent": "rewrite" }
  },
  "suggestions": ["Customize organizational details", "Add specific project metrics", "Include supporting documents", "Review budget allocations"]
}

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

Now respond to the user's message with appropriate intent classification, critical analysis, and proactive questioning.`;
}

/**
 * Call xAI Grok API directly
 */
async function callGrok(systemPrompt: string, userMessage: string): Promise<MayaResponse> {
  const XAI_API_KEY = process.env.XAI_API_KEY;
  
  if (!XAI_API_KEY) {
    throw new Error('XAI_API_KEY not configured');
  }

  const response = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${XAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'grok-3',
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
      temperature: 0.7,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('xAI API Error:', response.status, errorText);
    throw new Error(`xAI API failed: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content;

  if (!content) {
    throw new Error('No content in xAI response');
  }

  try {
    // Parse JSON response from Grok
    const mayaResponse: MayaResponse = JSON.parse(content);
    
    // Validate response structure
    if (!mayaResponse.intent || !mayaResponse.content) {
      throw new Error('Invalid Maya response structure');
    }

    return mayaResponse;

  } catch (parseError) {
    console.error('Failed to parse Maya response:', content);
    
    // Fallback response
    return {
      intent: 'chat_advice',
      content: content || "I'm here to help with your grant proposal. What would you like to work on?",
      suggestions: ['Ask about strategy', 'Request content', 'Get guidance']
    };
  }
}

/**
 * Save conversation to database
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

    // Save Maya response
    await prisma.aIMessage.create({
      data: {
        sessionId: session.id,
        sender: 'AI',
        messageType: 'TEXT',
        content: mayaResponse.content,
        metadata: {
          model: 'grok-3',
          intent: mayaResponse.intent,
          hasExtractedContent: !!mayaResponse.extractedContent,
          suggestions: mayaResponse.suggestions
        }
      }
    });

    return session.id;

  } catch (error) {
    console.error('Failed to save conversation:', error);
    // Return a fallback session ID
    return sessionId || 'error-session';
  }
}

// Health check
export async function GET() {
  return NextResponse.json({
    status: 'Maya xAI wrapper ready',
    model: 'grok-3',
    features: ['direct_ai_communication', 'intent_detection', 'canvas_integration']
  });
}