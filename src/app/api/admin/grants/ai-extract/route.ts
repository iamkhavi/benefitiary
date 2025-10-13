import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import OpenAI from 'openai';
const pdf = require('pdf-parse');

// Check if OpenAI API key is configured
if (!process.env.OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY environment variable is not set');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

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

    // For large documents, we might need to chunk the content
    const maxChunkSize = 12000; // Leave room for prompt and response
    let processedText = grantText;
    
    if (grantText.length > maxChunkSize) {
      console.log(`📄 Large document detected (${grantText.length} chars), processing in chunks...`);
      // Take the first chunk for initial extraction, but store complete content
      processedText = grantText.substring(0, maxChunkSize) + "\n\n[DOCUMENT TRUNCATED FOR PROCESSING - FULL CONTENT STORED]";
    }

    // Use OpenAI to extract structured grant information
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are an expert grant information extraction specialist with deep knowledge of non-repayable funding opportunities, grant structures, and funder requirements. You focus specifically on GRANTS, FELLOWSHIPS, AWARDS, and PRIZES - NOT loans or debt financing. Your task is to analyze grant announcements and extract comprehensive, structured information.

EXTRACTION GUIDELINES:
1. FOCUS ONLY ON NON-REPAYABLE FUNDING: Extract information only from grants, fellowships, awards, prizes, and similar non-repayable funding opportunities
2. EXCLUDE LOANS: Do not process loan applications, debt financing, or any repayable funding mechanisms
3. HANDLE LARGE DOCUMENTS: If document appears truncated, extract what's available and note incomplete sections
4. Be thorough and accurate - extract all available information for eligible funding types
5. Infer reasonable values when information is implied but not explicitly stated
6. Use consistent formatting and terminology
7. If information is missing, use null rather than making assumptions

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

IMPORTANT: Return ONLY valid JSON without markdown formatting, comments, or explanations. Ensure all arrays contain strings and all numbers are properly formatted.`
        },
        {
          role: "user",
          content: `Extract grant information from this ${contentSource.toUpperCase()} content:\n\n${processedText}`
        }
      ],
      temperature: 0.1,
      max_tokens: 3000 // Increased for more comprehensive extraction
    });

    const extractedData = JSON.parse(completion.choices[0].message.content || '{}');
    
    console.log('✅ Grant information extracted successfully');

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
        databaseAvailable: false
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
        wasChunked: grantText.length > maxChunkSize
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