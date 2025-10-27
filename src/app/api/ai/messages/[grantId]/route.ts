import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { grantId: string } }
) {
  try {
    // Get authenticated user
    const session = await auth.api.getSession({
      headers: request.headers,
    });
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const { grantId } = await params;

    // Find existing session for this user and grant
    const aiSession = await prisma.aIGrantSession.findUnique({
      where: {
        userId_grantId: {
          userId,
          grantId
        }
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 50 // Load last 50 messages
        }
      }
    });

    if (!aiSession) {
      // No existing session, return empty
      return NextResponse.json({
        session: null,
        messages: []
      });
    }

    return NextResponse.json({
      session: {
        id: aiSession.id,
        title: aiSession.title,
        lastMessageAt: aiSession.lastMessageAt
      },
      messages: aiSession.messages
    });

  } catch (error) {
    console.error('Error loading conversation history:', error);
    return NextResponse.json(
      { error: 'Failed to load conversation history' },
      { status: 500 }
    );
  }
}