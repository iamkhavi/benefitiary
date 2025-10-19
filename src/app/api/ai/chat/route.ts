/**
 * Simple AI Chat API - Maya Grant Consultant
 * Clean implementation without over-engineering
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { MayaAgent } from '@/lib/ai/maya-agent';
import { prisma } from '@/lib/prisma';

/**
 * Save conversation to database
 */
async function saveConversation(
  userId: string, 
  grantId: string, 
  sessionId: string | undefined, 
  userMessage: string, 
  mayaResponse: any
): Promise<{ sessionId: string; messageId: string }> {
  const session = await prisma.aIGrantSession.upsert({
    where: {
      userId_grantId: {
        userId: userId,
        grantId: grantId,
      },
    },
    update: {
      updatedAt: new Date(),
    },
    create: {
      userId: userId,
      grantId: grantId,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  const message = await prisma.aIMessage.create({
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

  await prisma.aIMessage.create({
    data: {
      sessionId: session.id,
      sender: 'AI',
      messageType: 'TEXT',
      content: mayaResponse.content,
      metadata: {
        model: 'gpt-4-agent',
        confidence: mayaResponse.confidence,
        reasoning: mayaResponse.reasoning,
        suggestions: mayaResponse.suggestions
      }
    }
  });

  return {
    sessionId: session.id,
    messageId: message.id,
  };
}

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
    const { grantId, message, sessionId, action, fileData, topic, stream = false } = await request.json();

    if (!grantId || (!message && action !== 'analyze_file' && action !== 'clarify')) {
      return NextResponse.json({
        error: 'Missing required fields: grantId and message (or action)'
      }, { status: 400 });
    }

    // Create Maya agent with context
    const maya = new MayaAgent();
    await maya.initialize(session.user.id, grantId, sessionId);

    let mayaResponse;
    let userMessage = message;

    // Handle different types of requests
    if (action === 'analyze_file' && fileData) {
      // File analysis request - let the agent handle it intelligently
      userMessage = `I uploaded a file called "${fileData.fileName}". Please analyze it: ${fileData.content.substring(0, 1000)}...`;
      mayaResponse = await maya.chat(userMessage);
    } else if (action === 'clarify' && topic) {
      // Clarifying questions request
      userMessage = `Please provide clarifying questions about: ${topic}`;
      mayaResponse = await maya.chat(userMessage);
    } else {
      // Regular chat message - let the intelligent agent handle everything (no timeout)
      mayaResponse = await maya.chat(message);
    }

    // Debug logging to see what Maya is actually returning
    console.log('=== MAYA RESPONSE DEBUG ===');
    console.log('User Message:', message);
    console.log('Content Type:', mayaResponse.contentType);
    console.log('Has Extracted Content:', !!mayaResponse.extractedContent);
    console.log('Extracted Content:', mayaResponse.extractedContent);
    console.log('Response Length:', mayaResponse.content?.length || 0);
    console.log('========================');

    // Save conversation to database
    const { sessionId: newSessionId, messageId } = await saveConversation(
      session.user.id, 
      grantId, 
      sessionId, 
      userMessage, 
      mayaResponse
    );

    // Check if streaming is requested
    if (stream) {
      // Return streaming response
      const encoder = new TextEncoder();

      const stream = new ReadableStream({
        start(controller) {
          try {
            // Send initial metadata - simplified to avoid JSON issues
            const initialData = {
              type: 'metadata',
              sessionId: newSessionId,
              messageId: messageId,
              contentType: mayaResponse.contentType || 'chat'
            };

            controller.enqueue(encoder.encode(`data: ${JSON.stringify(initialData)}\n\n`));

            // Send the complete content at once instead of streaming word by word
            // This avoids JSON parsing issues with complex content
            const content = mayaResponse.content || '';
            
            // Clean the content to prevent JSON issues
            const cleanContent = content
              .replace(/[\r\n]/g, ' ')
              .replace(/"/g, '\\"')
              .replace(/\\/g, '\\\\');

            const contentData = {
              type: 'content',
              chunk: cleanContent,
              isComplete: false
            };

            controller.enqueue(encoder.encode(`data: ${JSON.stringify(contentData)}\n\n`));

            // Send completion with extracted content if available
            const completeData = {
              type: 'complete',
              isComplete: true,
              response: content,
              extractedContent: mayaResponse.extractedContent || null,
              confidence: mayaResponse.confidence || 0.8,
              suggestions: mayaResponse.suggestions || []
            };

            controller.enqueue(encoder.encode(`data: ${JSON.stringify(completeData)}\n\n`));
            controller.close();

          } catch (error) {
            console.error('Streaming error:', error);
            // Send error and close
            const errorData = {
              type: 'error',
              error: 'Streaming failed'
            };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorData)}\n\n`));
            controller.close();
          }
        }
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // Return regular JSON response for non-streaming requests
    return NextResponse.json({
      sessionId: newSessionId,
      messageId: messageId,
      response: mayaResponse.content,
      confidence: mayaResponse.confidence,
      suggestions: mayaResponse.suggestions,
      reasoning: mayaResponse.reasoning,
      contentType: mayaResponse.contentType,
      extractedContent: mayaResponse.extractedContent
    });

  } catch (error) {
    console.error('AI Chat API Error:', error);

    // Return a more helpful error response
    return NextResponse.json({
      error: 'Maya is having trouble right now. Please try asking for something specific like "write a proposal" or "generate an executive summary".',
      fallback: true,
      suggestions: [
        'Try asking: "Write a complete proposal"',
        'Try asking: "Generate an executive summary"',
        'Try asking: "Create a project timeline"'
      ]
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