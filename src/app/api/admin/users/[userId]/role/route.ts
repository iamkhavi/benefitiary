import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // Require admin access
    await requireAdmin();

    // Get current user for audit trail
    const currentUser = await prisma.user.findUnique({
      where: { id: params.userId },
      select: { role: true }
    });

    if (!currentUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const { role } = await request.json();

    // Validate role
    const validRoles = ['SEEKER', 'WRITER', 'FUNDER', 'ADMIN'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role specified' },
        { status: 400 }
      );
    }

    // Update user role
    const updatedUser = await prisma.user.update({
      where: { id: params.userId },
      data: { role },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        updatedAt: true
      }
    });

    // Create audit log (optional, don't fail if audit table doesn't exist)
    try {
      await prisma.auditLog.create({
        data: {
          action: 'PROFILE_UPDATED',
          entityType: 'user',
          entityId: params.userId,
          metadata: {
            oldRole: currentUser.role,
            newRole: role,
            updatedBy: 'admin'
          }
        }
      });
    } catch (auditError) {
      console.warn('Failed to create audit log:', auditError);
    }

    return NextResponse.json({
      success: true,
      message: `User role updated from ${currentUser.role} to ${role}`,
      user: updatedUser
    });

  } catch (error) {
    console.error('Error updating user role:', error);
    
    if ((error as any).code === 'P2025') {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update user role' },
      { status: 500 }
    );
  }
}