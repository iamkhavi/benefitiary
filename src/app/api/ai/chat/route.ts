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
      // Regular chat message - let the intelligent agent handle everything
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
          // Send initial metadata
          const initialData = {
            type: 'metadata',
            sessionId: newSessionId,
            messageId: messageId,
            contentType: mayaResponse.contentType,
            extractedContent: mayaResponse.extractedContent,
            confidence: mayaResponse.confidence,
            suggestions: mayaResponse.suggestions,
            reasoning: mayaResponse.reasoning
          };

          controller.enqueue(encoder.encode(`data: ${JSON.stringify(initialData)}\n\n`));

          // Stream the content character by character
          const content = mayaResponse.content;
          let currentIndex = 0;

          const streamContent = () => {
            if (currentIndex < content.length) {
              // Send next chunk (word by word for better UX)
              const words = (content || '').split(' ');
              let wordIndex = 0;
              let charIndex = 0;

              // Find current word
              for (let i = 0; i < words.length; i++) {
                const wordEnd = charIndex + words[i].length + (i > 0 ? 1 : 0); // +1 for space
                if (currentIndex < wordEnd) {
                  wordIndex = i;
                  break;
                }
                charIndex = wordEnd;
              }

              // Send current word
              const currentWord = words[wordIndex];
              const wordWithSpace = wordIndex > 0 ? ' ' + currentWord : currentWord;

              const chunkData = {
                type: 'content',
                chunk: wordWithSpace,
                isComplete: false
              };

              controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunkData)}\n\n`));

              currentIndex = charIndex + currentWord.length + (wordIndex > 0 ? 1 : 0);

              // Continue streaming with delay
              setTimeout(streamContent, Math.random() * 100 + 50); // 50-150ms delay
            } else {
              // Send completion signal with response content
              const completeData = {
                type: 'complete',
                isComplete: true,
                response: mayaResponse.content
              };

              controller.enqueue(encoder.encode(`data: ${JSON.stringify(completeData)}\n\n`));
              controller.close();
            }
          };

          // Start streaming after a brief delay
          setTimeout(streamContent, 300);
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