import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { testGrants } from '@/lib/test-grants-data';

export async function GET(
  request: NextRequest,
  { params }: { params: { grantId: string } }
) {
  try {
    const { grantId } = params;

    if (!grantId) {
      return NextResponse.json(
        { error: 'Grant ID is required' },
        { status: 400 }
      );
    }

    // Try database first, fall back to test data
    try {
      const grant = await prisma.grant.findUnique({
        where: { id: grantId },
        include: {
          funder: {
            select: {
              id: true,
              name: true,
              logoUrl: true,
              type: true,
              website: true,
              contactEmail: true
            }
          }
        }
      });

      if (!grant) {
        return NextResponse.json(
          { error: 'Grant not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        grant
      });

    } catch (dbError) {
      console.log('📝 Database not available, using test data');
      
      // Find grant in test data
      const grant = testGrants.find(g => g.id === grantId);

      if (!grant) {
        return NextResponse.json(
          { error: 'Grant not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        grant,
        usingTestData: true
      });
    }

  } catch (error) {
    console.error('❌ Error fetching grant:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch grant',
        details: error instanceof Error ? error.message : undefined
      },
      { status: 500 }
    );
  }
}