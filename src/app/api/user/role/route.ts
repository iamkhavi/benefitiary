import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || session.user.id;

    // Fetch user role from database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        role: true,
        onboardingCompleted: true,
        onboardingStep: true 
      }
    });

    if (!user) {
      // If user not found in database but has session, create user record
      const newUser = await prisma.user.create({
        data: {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name,
          image: session.user.image,
          role: 'SEEKER', // Default role
          onboardingCompleted: false,
          onboardingStep: 0
        },
        select: {
          role: true,
          onboardingCompleted: true,
          onboardingStep: true
        }
      });

      return NextResponse.json({
        role: newUser.role,
        onboardingCompleted: newUser.onboardingCompleted,
        onboardingStep: newUser.onboardingStep
      });
    }

    return NextResponse.json({
      role: user.role || 'SEEKER',
      onboardingCompleted: user.onboardingCompleted,
      onboardingStep: user.onboardingStep
    });

  } catch (error) {
    console.error('Error fetching user role:', error);
    return NextResponse.json(
      { role: 'SEEKER', onboardingCompleted: false, onboardingStep: 0 }
    );
  }
}