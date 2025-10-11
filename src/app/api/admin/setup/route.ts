import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { email, role } = await request.json();

    if (!email || !role) {
      return NextResponse.json(
        { error: 'Email and role are required' },
        { status: 400 }
      );
    }

    // Update the user role
    const updatedUser = await prisma.user.update({
      where: { email },
      data: { role },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        updatedAt: true
      }
    });

    return NextResponse.json({
      success: true,
      message: `User ${email} role updated to ${role}`,
      user: updatedUser
    });

  } catch (error: any) {
    console.error('Error updating user role:', error);
    
    if (error.code === 'P2025') {
      // Try to find all users to help debug
      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          role: true
        }
      });

      return NextResponse.json({
        error: 'User not found',
        availableUsers: users
      }, { status: 404 });
    }

    return NextResponse.json(
      { error: 'Failed to update user role' },
      { status: 500 }
    );
  }
}