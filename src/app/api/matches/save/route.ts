import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUserWithRole } from '@/lib/auth-helpers';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUserWithRole();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { grantId, action } = await request.json();

    if (!grantId || !action) {
      return NextResponse.json(
        { error: 'Grant ID and action are required' },
        { status: 400 }
      );
    }

    if (action === 'save') {
      // Check if match already exists
      const existingMatch = await prisma.grantMatch.findFirst({
        where: {
          userId: user.id,
          grantId: grantId
        }
      });

      if (existingMatch) {
        // Update existing match
        await prisma.grantMatch.update({
          where: { id: existingMatch.id },
          data: { status: 'SAVED' }
        });
      } else {
        // Create new match
        await prisma.grantMatch.create({
          data: {
            userId: user.id,
            grantId: grantId,
            status: 'SAVED',
            matchScore: 0 // Will be calculated later
          }
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Grant saved successfully'
      });

    } else if (action === 'unsave') {
      // Delete the grant match
      await prisma.grantMatch.deleteMany({
        where: {
          userId: user.id,
          grantId: grantId,
          status: 'SAVED'
        }
      });

      return NextResponse.json({
        success: true,
        message: 'Grant unsaved successfully'
      });

    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "save" or "unsave"' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('❌ Error saving/unsaving match:', error);
    return NextResponse.json(
      { 
        error: 'Failed to save/unsave match',
        details: error instanceof Error ? error.message : undefined
      },
      { status: 500 }
    );
  }
}