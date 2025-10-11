import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { DashboardDataProvider } from '@/lib/scraping/monitoring/dashboard-data-provider';

/**
 * GET /api/admin/scraping/dashboard
 * Get comprehensive dashboard data for scraping administration
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAdmin(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || '24h'; // 24h, 7d, 30d

    // Calculate time range
    const now = new Date();
    let startDate: Date;
    
    switch (timeRange) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default: // 24h
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    // Get dashboard data using the monitoring service
    const dashboardProvider = new DashboardDataProvider();
    const dashboardData = await dashboardProvider.getDashboardData();

    // Get additional real-time metrics
    const [
      activeSources,
      recentJobs,
      systemHealth,
      topPerformingSources,
      recentErrors,
    ] = await Promise.all([
      // Active sources count
      prisma.scrapedSource.count({
        where: { status: 'ACTIVE' },
      }),

      // Recent jobs (last 10)
      prisma.scrapeJob.findMany({
        where: {
          startedAt: { gte: startDate },
        },
        include: {
          source: {
            select: {
              url: true,
              type: true,
            },
          },
        },
        orderBy: { startedAt: 'desc' },
        take: 10,
      }),

      // System health indicators
      prisma.scrapeJob.aggregate({
        where: {
          startedAt: { gte: startDate },
        },
        _count: { id: true },
        _avg: { duration: true },
      }),

      // Top performing sources
      prisma.$queryRaw`
        SELECT 
          s.id,
          s.url,
          s.type,
          COUNT(j.id) as total_jobs,
          COUNT(CASE WHEN j.status = 'SUCCESS' THEN 1 END) as successful_jobs,
          AVG(j.total_found) as avg_grants_found,
          AVG(j.duration) as avg_duration
        FROM scraped_sources s
        LEFT JOIN scrape_jobs j ON s.id = j.source_id 
          AND j.started_at >= ${startDate}
        WHERE s.status = 'ACTIVE'
        GROUP BY s.id, s.url, s.type
        HAVING COUNT(j.id) > 0
        ORDER BY (COUNT(CASE WHEN j.status = 'SUCCESS' THEN 1 END)::float / COUNT(j.id)) DESC
        LIMIT 5
      `,

      // Recent errors
      prisma.scrapeJob.findMany({
        where: {
          status: 'FAILED',
          startedAt: { gte: startDate },
        },
        include: {
          source: {
            select: {
              url: true,
              type: true,
            },
          },
        },
        orderBy: { startedAt: 'desc' },
        take: 5,
      }),
    ]);

    // Calculate success rate
    const totalJobs = systemHealth._count.id;
    const successfulJobs = await prisma.scrapeJob.count({
      where: {
        status: 'SUCCESS',
        startedAt: { gte: startDate },
      },
    });
    const successRate = totalJobs > 0 ? (successfulJobs / totalJobs) * 100 : 0;

    // Get grants scraped in time range
    const grantsScraped = await prisma.scrapeJob.aggregate({
      where: {
        startedAt: { gte: startDate },
        status: 'SUCCESS',
      },
      _sum: {
        totalInserted: true,
        totalUpdated: true,
      },
    });

    const response = {
      ...dashboardData,
      realTimeMetrics: {
        activeSources,
        totalJobs,
        successfulJobs,
        successRate: Math.round(successRate * 100) / 100,
        averageDuration: systemHealth._avg.duration || 0,
        grantsScraped: (grantsScraped._sum.totalInserted || 0) + (grantsScraped._sum.totalUpdated || 0),
        newGrants: grantsScraped._sum.totalInserted || 0,
        updatedGrants: grantsScraped._sum.totalUpdated || 0,
      },
      recentActivity: {
        jobs: recentJobs,
        errors: recentErrors,
      },
      topPerformingSources: topPerformingSources as any[],
      timeRange,
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}