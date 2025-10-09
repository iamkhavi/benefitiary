import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { grantId, message, sessionId } = await request.json();

    if (!grantId || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get or create AI session
    let aiSession;
    if (sessionId) {
      aiSession = await prisma.aIGrantSession.findUnique({
        where: { id: sessionId },
        include: {
          messages: { orderBy: { createdAt: 'desc' }, take: 20 },
          grant: { include: { funder: true } },
          user: { include: { organization: true } }
        }
      });
    }
    
    if (!aiSession) {
      aiSession = await prisma.aIGrantSession.upsert({
        where: {
          userId_grantId: {
            userId: session.user.id,
            grantId: grantId
          }
        },
        create: {
          userId: session.user.id,
          grantId: grantId,
          title: `AI Workspace - ${new Date().toLocaleDateString()}`,
          contextSummary: 'New AI session started for grant application assistance.',
          isActive: true
        },
        update: {
          lastMessageAt: new Date(),
          isActive: true
        },
        include: {
          messages: { orderBy: { createdAt: 'desc' }, take: 20 },
          grant: { include: { funder: true } },
          user: { include: { organization: true } }
        }
      });
    }

    // Store user message
    const userMessage = await prisma.aIMessage.create({
      data: {
        sessionId: aiSession.id,
        sender: 'USER',
        messageType: 'TEXT',
        content: message,
        metadata: {
          timestamp: new Date().toISOString(),
          userAgent: request.headers.get('user-agent')
        }
      }
    });

    // Generate AI response (placeholder - integrate with your AI service)
    const aiResponse = await generateAIResponse(message);

    // Store AI message
    const aiMessage = await prisma.aIMessage.create({
      data: {
        sessionId: aiSession.id,
        sender: 'AI',
        messageType: 'TEXT',
        content: aiResponse.content,
        metadata: {
          model: aiResponse.model,
          tokensUsed: aiResponse.tokensUsed,
          confidence: aiResponse.confidence,
          processingTime: aiResponse.processingTime
        }
      }
    });

    // Track AI usage
    await prisma.aIUsage.create({
      data: {
        userId: session.user.id,
        taskType: 'GRANT_ANALYSIS',
        tokensUsed: aiResponse.tokensUsed,
        costUsd: calculateCost(aiResponse.tokensUsed)
      }
    });

    // Update session
    await prisma.aIGrantSession.update({
      where: { id: aiSession.id },
      data: {
        lastMessageAt: new Date(),
        contextSummary: await updateContextSummary(aiSession.id)
      }
    });

    return NextResponse.json({
      sessionId: aiSession.id,
      userMessage,
      aiMessage,
      tokensUsed: aiResponse.tokensUsed
    });

  } catch (error) {
    console.error('AI Chat API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function generateAIResponse(userMessage: string) {
  // Placeholder AI response generation
  // In production, integrate with OpenAI, Claude, or your preferred AI service
  
  const responses = [
    {
      content: `Based on your question about "${userMessage}", I've analyzed the grant requirements and your organization profile. Here's my assessment:

**Key Findings:**
- Your organization shows strong alignment with the grant objectives
- Consider highlighting your community partnerships
- Budget allocation should emphasize sustainability

**Next Steps:**
1. Prepare detailed impact metrics
2. Gather partnership letters
3. Draft concept note outline

Would you like me to help with any specific section?`,
      model: 'gpt-4',
      tokensUsed: 156,
      confidence: 0.92,
      processingTime: 1240
    }
  ];

  return responses[0];
}

function calculateCost(tokens: number): number {
  // Example pricing: $0.03 per 1K tokens
  return (tokens / 1000) * 0.03;
}

async function updateContextSummary(sessionId: string): Promise<string> {
  const messages = await prisma.aIMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'desc' },
    take: 10
  });

  // Generate summary from recent messages
  const recentContext = messages
    .map((m: any) => `${m.sender}: ${m.content.substring(0, 100)}...`)
    .join('\n');

  return `Recent discussion: ${recentContext.substring(0, 500)}...`;
}