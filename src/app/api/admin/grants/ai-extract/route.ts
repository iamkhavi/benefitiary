import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import OpenAI from 'openai';
const pdf = require('pdf-parse');

// Smart content chunking for large documents
function smartChunkContent(content: string, maxSize: number): string[] {
  // Priority keywords that indicate important grant information
  const priorityKeywords = [
    'eligibility', 'eligible', 'requirements', 'criteria',
    'deadline', 'due date', 'application', 'apply',
    'funding', 'amount', 'budget', 'award',
    'evaluation', 'selection', 'review',
    'documents', 'required', 'submission',
    'contact', 'email', 'phone',
    'program goals', 'objectives', 'outcomes'
  ];

  // Split content into paragraphs
  const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  
  // Score paragraphs based on grant-relevant content
  const scoredParagraphs = paragraphs.map(paragraph => {
    const lowerParagraph = paragraph.toLowerCase();
    let score = 0;
    
    // Score based on priority keywords
    priorityKeywords.forEach(keyword => {
      const matches = (lowerParagraph.match(new RegExp(keyword, 'g')) || []).length;
      score += matches * 10;
    });
    
    // Bonus for paragraphs with numbers (likely funding amounts, dates)
    const numberMatches = (paragraph.match(/\$[\d,]+|\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}/g) || []).length;
    score += numberMatches * 15;
    
    // Bonus for structured content (lists, bullets)
    if (paragraph.includes('•') || paragraph.includes('-') || /^\d+\./.test(paragraph.trim())) {
      score += 5;
    }
    
    return { paragraph, score, length: paragraph.length };
  });

  // Sort by score (highest first)
  scoredParagraphs.sort((a, b) => b.score - a.score);
  
  // Select top paragraphs that fit within size limit
  const selectedParagraphs: string[] = [];
  let currentSize = 0;
  
  for (const item of scoredParagraphs) {
    if (currentSize + item.length <= maxSize) {
      selectedParagraphs.push(item.paragraph);
      currentSize += item.length;
    } else {
      // Try to fit a truncated version if it's high-scoring
      if (item.score > 20 && selectedParagraphs.length < 3) {
        const remainingSpace = maxSize - currentSize - 100; // Leave some buffer
        if (remainingSpace > 200) {
          const truncated = item.paragraph.substring(0, remainingSpace) + '... [TRUNCATED]';
          selectedParagraphs.push(truncated);
          break;
        }
      }
    }
  }
  
  // If we have very few paragraphs, add some context from the beginning
  if (selectedParagraphs.length < 3) {
    const beginningText = content.substring(0, Math.min(2000, maxSize - currentSize));
    if (!selectedParagraphs.some(p => p.includes(beginningText.substring(0, 100)))) {
      selectedParagraphs.unshift(beginningText + (beginningText.length < content.length ? '... [TRUNCATED]' : ''));
    }
  }
  
  return selectedParagraphs;
}

// Check if OpenAI API key is configured
if (!process.env.OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY environment variable is not set');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Test endpoint to verify route is working
export async function GET() {
  return NextResponse.json({ 
    message: 'AI Grant Extraction API is working',
    methods: ['POST'],
    timestamp: new Date().toISOString()
  });
}

export async function POST(request: NextRequest) {
  console.log('🚀 AI Grant Extraction API called');
  console.log('📝 Request method:', request.method);
  console.log('📝 Request URL:', request.url);
  
  try {
    console.log('🔐 Checking admin access...');
    await requireAdmin();
    console.log('✅ Admin access verified');

    // OpenAI API key is configured in environment

    const contentType = request.headers.get('content-type');
    let grantText = '';
    let contentSource = 'text';
    let originalFileName = '';

    if (contentType?.includes('multipart/form-data')) {
      // Handle file upload (PDF)
      const formData = await request.formData();
      const file = formData.get('file') as File;
      const textContent = formData.get('grantText') as string;

      if (file && file.type === 'application/pdf') {
        console.log('📄 Processing PDF file:', file.name);
        const buffer = Buffer.from(await file.arrayBuffer());
        const pdfData = await pdf(buffer);
        grantText = pdfData.text;
        contentSource = 'pdf';
        originalFileName = file.name;
        console.log(`✅ Extracted ${pdfData.text.length} characters from PDF`);
      } else if (textContent) {
        grantText = textContent;
        contentSource = 'text';
      }
    } else {
      // Handle JSON request (text content)
      const body = await request.json();
      grantText = body.grantText;
      contentSource = 'text';
    }

    if (!grantText || grantText.trim().length === 0) {
      return NextResponse.json(
        { error: 'Grant content is required (text or PDF)' },
        { status: 400 }
      );
    }

    console.log(`🤖 Extracting grant information from ${contentSource} (${grantText.length} characters)...`);

    // Smart chunking strategy for large documents
    const maxInputTokens = 8000; // Conservative limit for GPT-4 (leaves room for prompt + response)
    const avgCharsPerToken = 4; // Rough estimate: 1 token ≈ 4 characters
    const maxChunkSize = maxInputTokens * avgCharsPerToken; // ~32,000 characters
    
    let processedText = grantText;
    let isChunked = false;
    
    if (grantText.length > maxChunkSize) {
      console.log(`📄 Large document detected (${grantText.length} chars), implementing smart chunking...`);
      isChunked = true;
      
      // Smart chunking: prioritize sections likely to contain grant information
      const sections = smartChunkContent(grantText, maxChunkSize);
      processedText = sections.join('\n\n--- SECTION BREAK ---\n\n');
      
      console.log(`📄 Chunked into ${sections.length} priority sections, total: ${processedText.length} chars`);
    }

    // Use OpenAI to extract structured grant information
    console.log(`🤖 Sending ${processedText.length} characters to OpenAI for processing...`);
    
    let completion: any;
    try {
      completion = await Promise.race([
        openai.chat.completions.create({
          model: "gpt-4",
          messages: [
            {
              role: "system",
              content: `You are an expert grant information extraction specialist with deep knowledge of non-repayable funding opportunities, grant structures, and funder requirements. You focus specifically on GRANTS, FELLOWSHIPS, AWARDS, and PRIZES - NOT loans or debt financing. Your task is to analyze grant announcements and extract comprehensive, structured information.

EXTRACTION GUIDELINES:
1. FOCUS ONLY ON NON-REPAYABLE FUNDING: Extract information only from grants, fellowships, awards, prizes, and similar non-repayable funding opportunities
2. EXCLUDE LOANS: Do not process loan applications, debt financing, or any repayable funding mechanisms
3. HANDLE LARGE DOCUMENTS: This content may be chunked from a larger document. Extract all available information and note if sections appear incomplete
4. PRIORITIZE COMPLETE INFORMATION: Focus on extracting complete, actionable information rather than partial details
5. Be thorough and accurate - extract all available information for eligible funding types
6. Infer reasonable values when information is implied but not explicitly stated
7. Use consistent formatting and terminology
8. If information is missing, use null rather than making assumptions
9. If content appears chunked (contains "SECTION BREAK" or "TRUNCATED"), extract from all available sections

REQUIRED FIELDS TO EXTRACT:

BASIC INFORMATION:
- title: Complete grant program title (string)
- funderName: Full organization name offering the grant (string)
- description: Comprehensive program description, including objectives and scope (string, extract as much detail as available)
- eligibilityCriteria: Detailed eligibility requirements including organization types, geographic restrictions, and qualifications (string)

FINANCIAL & TIMELINE:
- deadline: Application deadline in ISO 8601 format (YYYY-MM-DD) or null if rolling
- fundingAmountMin: Minimum funding amount as number (no currency symbols)
- fundingAmountMax: Maximum funding amount as number (no currency symbols)
- durationMonths: Project duration in months as integer

CLASSIFICATION (choose most appropriate):
- category: Select ONE from: HEALTHCARE_PUBLIC_HEALTH, EDUCATION_TRAINING, AGRICULTURE_FOOD_SECURITY, CLIMATE_ENVIRONMENT, TECHNOLOGY_INNOVATION, WOMEN_YOUTH_EMPOWERMENT, ARTS_CULTURE, COMMUNITY_DEVELOPMENT, HUMAN_RIGHTS_GOVERNANCE, SME_BUSINESS_GROWTH
- applicantType: Primary eligible applicant types (e.g., "NGO, Academic Institution, Social Enterprise")
- fundingType: Type of funding mechanism (GRANT, FELLOWSHIP, AWARD, PRIZE, SUBSIDY) - DO NOT classify as LOAN

PROGRAM DETAILS:
- applicationUrl: Direct application link if provided (string or null)
- locationEligibility: Array of eligible countries/regions (e.g., ["Kenya", "Nigeria", "Sub-Saharan Africa"])
- requiredDocuments: Array of required application documents
- evaluationCriteria: Array of evaluation criteria and scoring factors
- programGoals: Array of specific program objectives and goals
- expectedOutcomes: Array of anticipated results and impact metrics

RFP SPECIFIC INFORMATION (if available):
- rfpNumber: Official RFP/FOA number if mentioned
- budgetRequirements: Budget requirements and restrictions
- proposalSections: Required proposal sections
- reportingSchedule: Required reporting schedule
- performanceMetrics: Required performance metrics/KPIs

ADDITIONAL CONTEXT:
- website: Funder's main website URL if mentioned
- contactEmail: Program contact email if provided

FIELD COMPLETENESS ANALYSIS:
Also include a "fieldCompleteness" object that analyzes what information was found vs missing:
- requiredFieldsMissing: Array of critical fields that are missing (title, funderName, description)
- optionalFieldsMissing: Array of optional fields that could not be extracted
- confidenceScore: Overall confidence in extraction quality (0-100)
- missingInfoSuggestions: Array of suggestions for finding missing information

EXTERNAL REFERENCE ANALYSIS:
Also include a "externalReferences" object that analyzes if referenced links contain critical grant information:
- criticalLinks: Array of URLs that likely contain essential grant information (eligibility, application process, requirements)
- nonCriticalLinks: Array of URLs that are likely not essential for grant writing (general info, organization pages)
- missingCriticalInfo: Array of specific grant-essential information that appears to be in external links
- userAction: Specific instruction for user on what to do next
- reasoning: Brief explanation of why certain links are considered critical vs non-critical

CRITICAL JSON FORMATTING REQUIREMENTS:
1. Return ONLY valid JSON - no markdown, no code blocks, no explanations
2. Start with { and end with }
3. Use double quotes for all strings
4. Ensure all arrays contain strings only
5. Use null for missing values, not undefined or empty strings
6. Numbers should be actual numbers, not strings
7. Do not include any text before or after the JSON object

Example format:
{
  "title": "Grant Title Here",
  "funderName": "Funder Name",
  "description": "Description text...",
  "deadline": "2025-12-31",
  "fundingAmountMin": 10000,
  "fundingAmountMax": 50000,
  "locationEligibility": ["Country1", "Country2"],
  "fieldCompleteness": {
    "confidenceScore": 85,
    "missingInfoSuggestions": ["suggestion1", "suggestion2"]
  }
}`
        },
        {
          role: "user",
          content: `Extract grant information from this ${contentSource.toUpperCase()} content:\n\n${processedText}`
        }
          ],
          temperature: 0.1,
          max_tokens: 3000 // Increased for more comprehensive extraction
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('OpenAI API timeout after 60 seconds')), 60000)
        )
      ]);
    } catch (openaiError) {
      console.error('❌ OpenAI API call failed:', openaiError);
      return NextResponse.json(
        { 
          error: 'OpenAI API call failed',
          details: openaiError instanceof Error ? openaiError.message : 'Unknown OpenAI error'
        },
        { status: 500 }
      );
    }

    if (!completion || !completion.choices || completion.choices.length === 0) {
      console.error('❌ OpenAI returned empty response');
      return NextResponse.json(
        { 
          error: 'OpenAI returned empty response',
          details: 'No completion choices returned from OpenAI API'
        },
        { status: 500 }
      );
    }

    const rawResponse = completion.choices[0].message.content || '{}';
    console.log('🤖 Raw OpenAI response length:', rawResponse.length);
    console.log('🤖 Raw OpenAI response preview:', rawResponse.substring(0, 200) + '...');
    
    if (rawResponse.length === 0 || rawResponse === '{}') {
      console.error('❌ OpenAI returned empty content');
      return NextResponse.json(
        { 
          error: 'OpenAI returned empty content',
          details: 'The AI was unable to extract any information from the provided content'
        },
        { status: 500 }
      );
    }
    
    let extractedData;
    try {
      extractedData = JSON.parse(rawResponse);
      console.log('✅ Grant information extracted successfully');
    } catch (parseError) {
      console.error('❌ JSON parsing failed:', parseError);
      console.error('❌ Raw response that failed to parse:', rawResponse);
      
      // Try to clean the response and parse again
      const cleanedResponse = rawResponse
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .replace(/^\s*[\r\n]/gm, '')
        .trim();
      
      try {
        extractedData = JSON.parse(cleanedResponse);
        console.log('✅ Grant information extracted after cleaning');
      } catch (secondParseError) {
        console.error('❌ Second JSON parsing attempt failed:', secondParseError);
        return NextResponse.json(
          { 
            error: 'Failed to parse AI response as JSON',
            details: `OpenAI returned invalid JSON. Raw response: ${rawResponse.substring(0, 500)}...`,
            parseError: parseError instanceof Error ? parseError.message : 'Unknown parse error'
          },
          { status: 500 }
        );
      }
    }

    // Try to save to database, fall back to returning extracted data only
    let grant = null;
    let funder = null;

    try {
      // Get or create funder
      funder = await prisma.funder.findFirst({
        where: { name: extractedData.funderName }
      });

      if (!funder && extractedData.funderName) {
        funder = await prisma.funder.create({
          data: {
            name: extractedData.funderName,
            type: 'PRIVATE_FOUNDATION', // Default, can be updated later
            website: extractedData.website || null,
            contactEmail: extractedData.contactEmail || null,
            logoUrl: null // Will be populated later
          }
        });
        console.log(`✅ Created new funder: ${funder.name}`);
      }

      // Create the grant with complete information
      grant = await prisma.grant.create({
        data: {
          title: extractedData.title || 'Untitled Grant',
          description: extractedData.description,
          eligibilityCriteria: extractedData.eligibilityCriteria,
          deadline: extractedData.deadline ? new Date(extractedData.deadline) : null,
          fundingAmountMin: extractedData.fundingAmountMin || null,
          fundingAmountMax: extractedData.fundingAmountMax || null,
          applicationUrl: extractedData.applicationUrl,
          locationEligibility: extractedData.locationEligibility || [],
          category: extractedData.category || 'COMMUNITY_DEVELOPMENT',
          applicantType: extractedData.applicantType,
          fundingType: (extractedData.fundingType && extractedData.fundingType !== 'LOAN') ? extractedData.fundingType : 'GRANT',
          durationMonths: extractedData.durationMonths,
          requiredDocuments: extractedData.requiredDocuments || [],
          evaluationCriteria: extractedData.evaluationCriteria || [],
          programGoals: extractedData.programGoals || [],
          expectedOutcomes: extractedData.expectedOutcomes || [],
          
          // Store complete raw content and metadata
          rawContent: grantText, // Store the COMPLETE original content
          contentSource: contentSource,
          originalFileName: originalFileName || null,
          
          // Additional RFP fields if extracted
          rfpNumber: extractedData.rfpNumber || null,
          budgetRequirements: extractedData.budgetRequirements || null,
          proposalSections: extractedData.proposalSections || [],
          reportingSchedule: extractedData.reportingSchedule || [],
          performanceMetrics: extractedData.performanceMetrics || [],
          
          funderId: funder?.id,
          source: 'admin_input',
          scrapedFrom: 'admin_ai_extraction',
          contentHash: Buffer.from((extractedData.title || 'untitled') + (extractedData.funderName || 'unknown')).toString('base64'),
          status: 'ACTIVE',
          aiSummary: `AI-extracted grant: ${extractedData.title} from ${extractedData.funderName}`,
          contactEmail: extractedData.contactEmail || null
        }
      });

      console.log(`✅ Created grant: ${grant.title}`);

    } catch (dbError) {
      console.log('⚠️ Database not available, returning extracted data only');
      console.error('Database error:', dbError);
      
      // Return extracted data even if we can't save to database
      return NextResponse.json({
        success: true,
        message: 'Grant information extracted successfully (database not available)',
        grant: {
          id: 'temp_' + Date.now(),
          title: extractedData.title,
          funderName: extractedData.funderName,
          category: extractedData.category,
          fundingAmountMin: extractedData.fundingAmountMin,
          fundingAmountMax: extractedData.fundingAmountMax
        },
        extractedData,
        databaseAvailable: false,
        contentInfo: {
          source: contentSource,
          originalLength: grantText.length,
          fileName: originalFileName,
          processedLength: processedText.length,
          wasChunked: isChunked,
          chunkingStrategy: isChunked ? 'smart_priority' : 'none'
        }
      });
    }

    // Analyze field completeness
    const requiredFields = ['title', 'funderName', 'description'];
    const missingRequired = requiredFields.filter(field => !extractedData[field]);
    const hasAllRequired = missingRequired.length === 0;
    
    // Check for critical external references
    const hasCriticalRefs = extractedData.externalReferences?.criticalLinks?.length > 0;
    const hasMissingCriticalInfo = extractedData.externalReferences?.missingCriticalInfo?.length > 0;

    let message = 'Grant extracted and saved successfully';
    if (!hasAllRequired && hasCriticalRefs) {
      message = 'Grant extracted with missing information - critical details may be in external links';
    } else if (!hasAllRequired) {
      message = 'Grant extracted with some missing information';
    } else if (hasCriticalRefs) {
      message = 'Grant extracted successfully - some critical details may be in external links';
    }

    return NextResponse.json({
      success: true,
      message,
      grant: {
        id: grant.id,
        title: grant.title,
        funderName: funder?.name,
        category: grant.category,
        fundingAmountMin: grant.fundingAmountMin,
        fundingAmountMax: grant.fundingAmountMax
      },
      extractedData,
      fieldAnalysis: {
        hasAllRequired,
        missingRequired,
        hasCriticalReferences: hasCriticalRefs,
        hasMissingCriticalInfo: hasMissingCriticalInfo,
        completeness: extractedData.fieldCompleteness || null,
        externalReferences: extractedData.externalReferences || null
      },
      contentInfo: {
        source: contentSource,
        originalLength: grantText.length,
        fileName: originalFileName,
        processedLength: processedText.length,
        wasChunked: isChunked,
        chunkingStrategy: isChunked ? 'smart_priority' : 'none'
      }
    });

  } catch (error) {
    console.error('❌ Grant extraction failed:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to extract grant information',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}