/**
 * Simple AI Chat API - Maya Grant Consultant
 * Clean implementation without over-engineering
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createMayaAgent } from '@/lib/ai/maya-agent';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request
    const { grantId, message, sessionId, action, fileData, topic } = await request.json();

    if (!grantId || (!message && action !== 'analyze_file' && action !== 'clarify')) {
      return NextResponse.json({ 
        error: 'Missing required fields: grantId and message (or action)' 
      }, { status: 400 });
    }

    // Create Maya agent with context
    const maya = await createMayaAgent(session.user.id, grantId, sessionId);

    let mayaResponse;
    let userMessage = message;

    // Handle different types of requests
    if (action === 'analyze_file' && fileData) {
      // File analysis request
      mayaResponse = await maya.analyzeUploadedFile(
        fileData.fileName, 
        fileData.content, 
        fileData.fileType
      );
      userMessage = `Uploaded file: ${fileData.fileName}`;
    } else if (action === 'clarify' && topic) {
      // Clarifying questions request
      mayaResponse = await maya.generateClarifyingQuestions(topic);
      userMessage = `Asked for clarification about: ${topic}`;
    } else {
      // Regular chat message
      mayaResponse = await maya.chat(message);
    }

    // Save conversation to database
    const { sessionId: newSessionId, messageId } = await maya.saveConversation(userMessage, mayaResponse);

    // Return response
    return NextResponse.json({
      sessionId: newSessionId,
      messageId: messageId,
      response: mayaResponse.content,
      confidence: mayaResponse.confidence,
      suggestions: mayaResponse.suggestions,
      reasoning: mayaResponse.reasoning
    });

  } catch (error) {
    console.error('AI Chat API Error:', error);

    // Simple error response
    return NextResponse.json({
      error: 'I apologize, but I\'m having trouble right now. Please try again in a moment.',
      fallback: true
    }, { status: 500 });
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({ 
    status: 'Maya is ready to help with grant consultation',
    model: 'gpt-4',
    features: ['conversation_memory', 'context_awareness', 'expert_advice']
  });
}