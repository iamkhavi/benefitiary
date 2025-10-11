import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { ScrapeJobStatus } from '@/lib/scraping/types';

/**
 * GET /api/admin/scraping/jobs
 * Retrieve scraping job history with filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAdmin(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as ScrapeJobStatus | null;
    const sourceId = searchParams.get('sourceId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const sortBy = searchParams.get('sortBy') || 'startedAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const offset = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (sourceId) where.sourceId = sourceId;

    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    const [jobs, total] = await Promise.all([
      prisma.scrapeJob.findMany({
        where,
        include: {
          source: {
            select: {
              id: true,
              url: true,
              type: true,
              status: true,
            },
          },
        },
        orderBy,
        skip: offset,
        take: limit,
      }),
      prisma.scrapeJob.count({ where }),
    ]);

    // Calculate summary statistics
    const summaryStats = await prisma.scrapeJob.aggregate({
      where,
      _count: { id: true },
      _sum: {
        totalFound: true,
        totalInserted: true,
        totalUpdated: true,
        totalSkipped: true,
        duration: true,
      },
      _avg: {
        duration: true,
        totalFound: true,
      },
    });

    const statusCounts = await prisma.scrapeJob.groupBy({
      by: ['status'],
      where,
      _count: { id: true },
    });

    return NextResponse.json({
      jobs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary: {
        totalJobs: summaryStats._count.id,
        totalGrantsFound: summaryStats._sum.totalFound || 0,
        totalGrantsInserted: summaryStats._sum.totalInserted || 0,
        totalGrantsUpdated: summaryStats._sum.totalUpdated || 0,
        totalGrantsSkipped: summaryStats._sum.totalSkipped || 0,
        totalDuration: summaryStats._sum.duration || 0,
        averageDuration: summaryStats._avg.duration || 0,
        averageGrantsFound: summaryStats._avg.totalFound || 0,
        statusBreakdown: statusCounts.reduce((acc, item) => {
          acc[item.status] = item._count.id;
          return acc;
        }, {} as Record<string, number>),
      },
    });
  } catch (error) {
    console.error('Error fetching scraping jobs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}