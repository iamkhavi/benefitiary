import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    // Check if user is authenticated
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized. Authentication required.' },
        { status: 401 }
      );
    }

    // TODO: Add proper admin role check once auth types are updated

    // Get all users with their organization info
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        lastLoginAt: true,
        onboardingCompleted: true,
        organization: {
          select: {
            name: true,
            orgType: true,
            orgSize: true
          }
        },
        _count: {
          select: {
            submissions: true,
            grantMatches: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Transform the data for the frontend
    const transformedUsers = users.map(user => ({
      id: user.id,
      name: user.name || 'Unknown',
      email: user.email,
      role: user.role,
      status: user.onboardingCompleted ? 'active' : 'pending',
      createdAt: user.createdAt.toISOString().split('T')[0],
      lastLogin: user.lastLoginAt ? user.lastLoginAt.toISOString().split('T')[0] : 'Never',
      organization: user.organization?.name || 'No organization',
      applications: user._count.submissions,
      matches: user._count.grantMatches
    }));

    return NextResponse.json({
      success: true,
      users: transformedUsers,
      total: users.length
    });

  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}