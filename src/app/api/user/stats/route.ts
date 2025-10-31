import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUserWithRole } from '@/lib/auth-helpers';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 User stats API called');
    const user = await getCurrentUserWithRole();

    if (!user) {
      console.log('❌ No user found in stats API');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    console.log('✅ User found in stats API:', user.id);

    // Get user's applications count
    const applicationsCount = await prisma.submission.count({
      where: { userId: user.id }
    });

    // Get user's saved matches count
    const savedMatchesCount = await prisma.grantMatch.count({
      where: {
        userId: user.id,
        status: 'SAVED'
      }
    });

    // Get available matches count (grants that match user's profile)
    const [userPreferences, organization] = await Promise.all([
      prisma.userPreferences.findUnique({
        where: { userId: user.id }
      }),
      prisma.organization.findUnique({
        where: { userId: user.id }
      })
    ]);

    // Count grants that match user's categories and are not expired
    let availableMatchesCount = 0;
    if (userPreferences?.categories && userPreferences.categories.length > 0) {
      availableMatchesCount = await prisma.grant.count({
        where: {
          status: 'ACTIVE',
          category: {
            in: userPreferences.categories
          },
          OR: [
            {
              deadline: {
                gte: new Date()
              }
            },
            {
              deadline: null
            }
          ]
        }
      });
    } else {
      // If no preferences set, count all active grants
      availableMatchesCount = await prisma.grant.count({
        where: {
          status: 'ACTIVE',
          OR: [
            {
              deadline: {
                gte: new Date()
              }
            },
            {
              deadline: null
            }
          ]
        }
      });
    }

    // Get analytics count (could be notifications, activities, etc.)
    const analyticsCount = await prisma.notification.count({
      where: {
        userId: user.id,
        read: false
      }
    });

    const statsData = {
      applications: applicationsCount,
      matches: availableMatchesCount,
      savedMatches: savedMatchesCount,
      analytics: analyticsCount
    };

    console.log('📊 Returning stats data:', statsData);

    return NextResponse.json({
      success: true,
      stats: statsData
    });

  } catch (error) {
    console.error('❌ Error fetching user stats:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch user statistics',
        details: error instanceof Error ? error.message : undefined
      },
      { status: 500 }
    );
  }
}