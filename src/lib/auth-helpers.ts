import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
}

/**
 * Check if user is authenticated and has required role
 */
export async function requireAuth(
  request: NextRequest, 
  requiredRole?: UserRole
): Promise<{ user: AuthenticatedUser } | NextResponse> {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user with role from database
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { 
        id: true,
        email: true, 
        name: true,
        role: true 
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    // Check role if required
    if (requiredRole && user.role !== requiredRole) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    return { user: user as AuthenticatedUser };
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}

/**
 * Require admin role
 */
export async function requireAdmin(request: NextRequest) {
  return requireAuth(request, UserRole.ADMIN);
}