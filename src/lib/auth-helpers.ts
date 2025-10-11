import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

export async function getCurrentUserWithRole() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return null;
    }

    // Fetch user with role from database
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        role: true,
        onboardingCompleted: true,
        onboardingStep: true,
        createdAt: true
      }
    });

    if (!user) {
      return null;
    }

    return {
      ...session.user,
      role: user.role,
      onboardingCompleted: user.onboardingCompleted,
      onboardingStep: user.onboardingStep
    };
  } catch (error) {
    console.error('Error fetching current user with role:', error);
    return null;
  }
}

export async function requireAdmin(request?: any): Promise<{ user: any }> {
  const user = await getCurrentUserWithRole();
  
  if (!user || user.role !== 'ADMIN') {
    if (request) {
      // Return NextResponse for API routes
      throw new Error('Admin access required');
    } else {
      // Throw error for page components
      throw new Error('Admin access required');
    }
  }
  
  // Return user wrapped in an object to match existing API expectations
  return { user };
}

export async function requireAuth() {
  const user = await getCurrentUserWithRole();
  
  if (!user) {
    throw new Error('Authentication required');
  }
  
  return user;
}