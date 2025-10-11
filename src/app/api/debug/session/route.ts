import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({
        authenticated: false,
        session: null,
        user: null,
        cookies: 'No session found'
      });
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        onboardingCompleted: true,
        onboardingStep: true,
        createdAt: true
      }
    });

    return NextResponse.json({
      authenticated: true,
      session: {
        userId: session.user.id,
        email: session.user.email,
        name: session.user.name
      },
      user: user,
      hasRole: !!user?.role,
      isAdmin: user?.role === 'ADMIN'
    });

  } catch (error) {
    console.error('Session debug error:', error);
    return NextResponse.json({
      authenticated: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      session: null,
      user: null
    });
  }
}