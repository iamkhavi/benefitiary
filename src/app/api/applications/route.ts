import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUserWithRole } from '@/lib/auth-helpers';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUserWithRole();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const skip = (page - 1) * limit;

    // Build where clause for user's submissions
    const where: any = {
      userId: user.id
    };

    if (status) {
      where.status = status.toUpperCase();
    }

    if (search) {
      where.grant = {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { funder: { name: { contains: search, mode: 'insensitive' } } }
        ]
      };
    }

    const [submissions, total] = await Promise.all([
      prisma.submission.findMany({
        where,
        include: {
          grant: {
            include: {
              funder: {
                select: {
                  id: true,
                  name: true,
                  logoUrl: true,
                  type: true
                }
              }
            }
          }
        },
        orderBy: [
          { createdAt: 'desc' }
        ],
        skip,
        take: limit
      }),
      prisma.submission.count({ where })
    ]);

    // Filter out applications for expired grants unless user has already applied
    const validSubmissions = submissions.filter(submission => {
      const grant = submission.grant;
      // Show if no deadline, deadline is in future, or user has already applied (submission exists)
      return !grant.deadline || 
             grant.deadline >= new Date() || 
             submission.status !== 'DRAFT'; // If not draft, user has already applied
    });

    // Transform valid submissions to match the expected format
    const applications = validSubmissions.map(submission => ({
      id: submission.id,
      title: submission.grant.title,
      funder: submission.grant.funder?.name || 'Unknown Funder',
      amount: submission.grant.fundingAmountMin && submission.grant.fundingAmountMax 
        ? `$${submission.grant.fundingAmountMin.toLocaleString()} - $${submission.grant.fundingAmountMax.toLocaleString()}`
        : submission.grant.fundingAmountMin 
        ? `Up to $${submission.grant.fundingAmountMin.toLocaleString()}`
        : submission.grant.fundingAmountMax
        ? `Up to $${submission.grant.fundingAmountMax.toLocaleString()}`
        : 'Amount not specified',
      status: submission.status.toLowerCase(),
      progress: submission.status === 'DRAFT' ? Math.floor(Math.random() * 40) + 30 : 100, // Random progress for drafts between 30-70%
      deadline: submission.grant.deadline 
        ? new Date(submission.grant.deadline).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
          })
        : 'No deadline',
      lastUpdated: getRelativeTime(submission.createdAt),
      grantId: submission.grant.id,
      submittedAt: submission.submittedAt,
      resultDate: submission.resultDate
    }));

    // Calculate stats
    const stats = await getApplicationStats(user.id);

    return NextResponse.json({
      success: true,
      applications,
      stats,
      pagination: {
        page,
        limit,
        total: validSubmissions.length,
        pages: Math.ceil(validSubmissions.length / limit)
      }
    });

  } catch (error) {
    console.error('❌ Error fetching applications:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch applications',
        details: error instanceof Error ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

async function getApplicationStats(userId: string) {
  const [total, inProgress, submitted, approved] = await Promise.all([
    prisma.submission.count({ where: { userId } }),
    prisma.submission.count({ where: { userId, status: 'DRAFT' } }),
    prisma.submission.count({ where: { userId, status: 'SUBMITTED' } }),
    prisma.submission.count({ where: { userId, status: 'WON' } })
  ]);

  const successRate = total > 0 ? Math.round((approved / total) * 100) : 0;

  return {
    total,
    inProgress,
    submitted,
    approved,
    successRate
  };
}

function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
  return `${Math.floor(diffInSeconds / 604800)} weeks ago`;
}