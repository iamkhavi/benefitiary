---
inclusion: always
---

# AI Workspace Implementation Guide

This document defines the complete AI workspace functionality for Benefitiary, where each grant becomes a contextual AI-powered workspace for proposal development.

## 🎯 **Core Concept**

When a user clicks on a matched grant, they enter a **dedicated AI workspace** where:
- The grant becomes a "product" with its own AI co-pilot
- AI has full context of grant requirements and user/organization profile
- Chat history is persistent and grant-specific
- Users can upload files and get contextual assistance

## 🧠 **AI Context Architecture**

### **Automatic Context Loading**
When entering a grant workspace, AI automatically loads:

```javascript
const aiContext = {
  // Grant Information
  grant: {
    title: grant.title,
    description: grant.description,
    eligibilityCriteria: grant.eligibilityCriteria,
    fundingAmountMin: grant.fundingAmountMin,
    fundingAmountMax: grant.fundingAmountMax,
    deadline: grant.deadline,
    applicationMethod: grant.applicationMethod,
    requiredDocuments: grant.requiredDocuments,
    locationEligibility: grant.locationEligibility,
    sector: grant.sector,
    subCategory: grant.subCategory,
    applicantType: grant.applicantType
  },
  
  // Funder Information
  funder: {
    name: funder.name,
    type: funder.type,
    website: funder.website,
    contactEmail: funder.contactEmail
  },
  
  // Organization Profile
  organization: {
    name: org.name,
    type: org.orgType,
    size: org.orgSize,
    industries: org.industries,
    country: org.country,
    fundingNeeds: org.fundingNeeds,
    grantSizeRange: org.grantSizeRange
  },
  
  // User Profile
  user: {
    name: user.name,
    role: user.role,
    email: user.email
  },
  
  // Previous Context
  contextSummary: session.contextSummary,
  chatHistory: messages.slice(-20), // Last 20 messages
  uploadedFiles: contextFiles
};
```

### **System Prompt Template**
```
You are Benefitiary AI, a specialized grant proposal assistant. You are helping {user.name} from {organization.name}, a {organization.size} {organization.type} based in {organization.country} working in {organization.industries}.

They are exploring the grant "{grant.title}" by {funder.name}.

GRANT CONTEXT:
- Funding Range: ${grant.fundingAmountMin} - ${grant.fundingAmountMax}
- Deadline: {grant.deadline}
- Eligible Locations: {grant.locationEligibility}
- Target Applicants: {grant.applicantType}
- Required Documents: {grant.requiredDocuments}

ELIGIBILITY CRITERIA:
{grant.eligibilityCriteria}

ORGANIZATION PROFILE:
- Type: {organization.type}
- Size: {organization.size}
- Industries: {organization.industries}
- Funding Needs: {organization.fundingNeeds}

PREVIOUS CONTEXT:
{session.contextSummary}

Your role is to:
1. Analyze alignment between the organization and grant requirements
2. Provide proposal guidance and drafting assistance
3. Identify potential gaps or concerns
4. Help with application strategy and document preparation
5. Maintain context across conversations

Be specific, actionable, and reference the grant requirements directly.
```

## 📊 **Database Tables for AI Workspace**

### **AIGrantSession** - Core workspace management
```sql
-- Create or retrieve AI session for grant
INSERT INTO ai_grant_sessions (
  id, user_id, grant_id, title, context_summary, 
  last_message_at, is_active, created_at, updated_at
) VALUES (
  'session_user123_grant456',
  'user_123',
  'grant_456',
  'Maternal Health Innovation Challenge Discussion',
  'User exploring eligibility for Gates Foundation maternal health grant. Organization is Kenya-based NGO with 3 years experience.',
  NOW(),
  true,
  NOW(),
  NOW()
) ON CONFLICT (user_id, grant_id) 
DO UPDATE SET 
  last_message_at = NOW(),
  is_active = true;
```

### **AIMessage** - Chat persistence
```sql
-- Store user message
INSERT INTO ai_messages (
  id, session_id, sender, message_type, content, metadata, created_at
) VALUES (
  'msg_001',
  'session_user123_grant456',
  'USER',
  'TEXT',
  'Can you help me understand if my organization qualifies for this grant?',
  '{"timestamp": "2025-01-09T10:30:00Z", "user_agent": "Mozilla/5.0..."}',
  NOW()
);

-- Store AI response
INSERT INTO ai_messages (
  id, session_id, sender, message_type, content, metadata, created_at
) VALUES (
  'msg_002',
  'session_user123_grant456',
  'AI',
  'TEXT',
  'Based on your organization profile, you appear to meet several key eligibility criteria for the Maternal Health Innovation Challenge:\n\n✅ **Location**: Your Kenya-based organization aligns with the Sub-Saharan Africa focus\n✅ **Sector**: Your healthcare work matches the maternal health focus\n✅ **Organization Type**: NGOs are explicitly eligible\n\n⚠️ **Potential Gap**: The grant requires 3+ years of maternal health experience. Can you provide more details about your specific maternal health programs?',
  '{"model": "gpt-4", "tokens_used": 156, "confidence": 0.92, "processing_time_ms": 1240}',
  NOW()
);
```

### **AIContextFile** - File uploads
```sql
-- Store uploaded RFP or proposal document
INSERT INTO ai_context_files (
  id, session_id, file_name, file_url, mime_type, 
  size_bytes, uploaded_by, extracted_text, summary, created_at
) VALUES (
  'file_001',
  'session_user123_grant456',
  'previous_proposal_2024.pdf',
  'https://storage.benefitiary.com/files/user123/previous_proposal_2024.pdf',
  'application/pdf',
  2048576,
  'user_123',
  'EXTRACTED TEXT: Our organization, HealthCare Kenya, has been working in maternal health since 2021...',
  'Previous proposal for USAID maternal health program showing 2 years of relevant experience and strong community partnerships.',
  NOW()
);
```

## 🔄 **AI Workspace Flow**

### **1. Session Initialization**
```javascript
// When user clicks "Open AI Workspace" on a grant
async function initializeAIWorkspace(userId, grantId) {
  // Get or create session
  const session = await prisma.aIGrantSession.upsert({
    where: { userId_grantId: { userId, grantId } },
    create: {
      userId,
      grantId,
      title: `${grant.title} - AI Workspace`,
      contextSummary: generateInitialContext(user, organization, grant),
      isActive: true
    },
    update: {
      lastMessageAt: new Date(),
      isActive: true
    },
    include: {
      messages: { orderBy: { createdAt: 'desc' }, take: 20 },
      files: true,
      grant: { include: { funder: true } },
      user: { include: { organization: true } }
    }
  });

  return session;
}
```

### **2. Message Processing**
```javascript
async function processAIMessage(sessionId, userMessage, files = []) {
  // Store user message
  const userMsg = await prisma.aIMessage.create({
    data: {
      sessionId,
      sender: 'USER',
      messageType: files.length > 0 ? 'FILE' : 'TEXT',
      content: userMessage,
      metadata: { timestamp: new Date(), files: files.map(f => f.id) }
    }
  });

  // Process any uploaded files
  for (const file of files) {
    const extractedText = await extractTextFromFile(file);
    await prisma.aIContextFile.create({
      data: {
        sessionId,
        fileName: file.name,
        fileUrl: file.url,
        mimeType: file.type,
        sizeBytes: file.size,
        uploadedBy: session.userId,
        extractedText,
        summary: await generateFileSummary(extractedText)
      }
    });
  }

  // Generate AI response with full context
  const aiResponse = await generateAIResponse(sessionId, userMessage);
  
  // Store AI response
  const aiMsg = await prisma.aIMessage.create({
    data: {
      sessionId,
      sender: 'AI',
      messageType: 'TEXT',
      content: aiResponse.content,
      metadata: {
        model: aiResponse.model,
        tokensUsed: aiResponse.tokensUsed,
        confidence: aiResponse.confidence,
        processingTimeMs: aiResponse.processingTime
      }
    }
  });

  // Update session context summary
  await updateContextSummary(sessionId);
  
  // Track AI usage
  await prisma.aIUsage.create({
    data: {
      userId: session.userId,
      taskType: 'GRANT_ANALYSIS',
      tokensUsed: aiResponse.tokensUsed,
      costUsd: calculateCost(aiResponse.tokensUsed)
    }
  });

  return aiMsg;
}
```

### **3. Context Summary Updates**
```javascript
async function updateContextSummary(sessionId) {
  const session = await prisma.aIGrantSession.findUnique({
    where: { id: sessionId },
    include: {
      messages: { orderBy: { createdAt: 'desc' }, take: 10 },
      files: true
    }
  });

  const recentContext = session.messages.map(m => 
    `${m.sender}: ${m.content.substring(0, 200)}...`
  ).join('\n');

  const newSummary = await generateContextSummary(recentContext, session.files);

  await prisma.aIGrantSession.update({
    where: { id: sessionId },
    data: { 
      contextSummary: newSummary,
      lastMessageAt: new Date()
    }
  });
}
```

## 🎯 **Key Features Implementation**

### **1. Eligibility Analysis**
```javascript
async function analyzeEligibility(organizationProfile, grantRequirements) {
  const analysis = {
    matches: [],
    gaps: [],
    recommendations: []
  };

  // Location eligibility
  if (grantRequirements.locationEligibility.includes(organizationProfile.country)) {
    analysis.matches.push("Geographic eligibility confirmed");
  } else {
    analysis.gaps.push("Organization location not in eligible regions");
  }

  // Organization type matching
  if (grantRequirements.applicantType.includes(organizationProfile.type)) {
    analysis.matches.push("Organization type is eligible");
  } else {
    analysis.gaps.push("Organization type may not be eligible");
  }

  // Funding range alignment
  if (organizationProfile.grantSizeRange) {
    const alignment = checkFundingAlignment(
      organizationProfile.grantSizeRange, 
      grantRequirements.fundingRange
    );
    analysis.matches.push(`Funding range alignment: ${alignment}`);
  }

  return analysis;
}
```

### **2. Proposal Guidance**
```javascript
async function generateProposalGuidance(grantRequirements, organizationProfile, chatHistory) {
  const guidance = {
    keyPoints: extractKeyRequirements(grantRequirements),
    organizationStrengths: identifyStrengths(organizationProfile, grantRequirements),
    suggestedStructure: generateProposalStructure(grantRequirements),
    timeline: createApplicationTimeline(grantRequirements.deadline),
    requiredDocuments: grantRequirements.requiredDocuments,
    tips: generateSpecificTips(grantRequirements, organizationProfile)
  };

  return guidance;
}
```

### **3. File Context Integration**
```javascript
async function integrateFileContext(sessionId, newMessage) {
  const contextFiles = await prisma.aIContextFile.findMany({
    where: { sessionId }
  });

  const relevantContext = contextFiles
    .filter(file => isRelevantToMessage(file.extractedText, newMessage))
    .map(file => ({
      fileName: file.fileName,
      summary: file.summary,
      relevantExcerpts: extractRelevantExcerpts(file.extractedText, newMessage)
    }));

  return relevantContext;
}
```

## 📈 **Performance & Optimization**

### **Context Management**
- Keep last 20 messages in active memory
- Summarize older conversations into `contextSummary`
- Cache frequently accessed grant/organization data
- Use file summaries instead of full text for context

### **Token Optimization**
- Compress context for older messages
- Use structured summaries for uploaded files
- Implement smart context pruning based on relevance
- Track token usage per session for cost management

### **Real-time Features**
- WebSocket connections for live chat
- Typing indicators during AI processing
- File upload progress tracking
- Auto-save draft messages

## 🔒 **Security & Privacy**

### **Data Access Control**
- Users can only access their own AI sessions
- Organization members can share sessions (future feature)
- Admin users can view sessions for support purposes
- All file uploads are scanned for security

### **Data Retention**
- Chat history retained for 2 years
- Uploaded files retained for 1 year after session end
- Context summaries retained indefinitely
- User can request data deletion

This AI workspace creates a truly contextual, persistent, and intelligent grant application assistant that learns and adapts to each user's specific needs and organizational profile.