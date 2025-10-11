import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { ScrapedSourceType, ScrapingFrequency, ScrapedSourceStatus } from '@/lib/scraping/types';

interface RouteParams {
  params: {
    sourceId: string;
  };
}

/**
 * GET /api/admin/scraping/sources/[sourceId]
 * Get detailed information about a specific scraping source
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await requireAdmin(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { sourceId } = params;

    const source = await prisma.scrapedSource.findUnique({
      where: { id: sourceId },
      include: {
        scrapeJobs: {
          orderBy: { startedAt: 'desc' },
          take: 50, // Get more detailed history
        },
        _count: {
          select: {
            scrapeJobs: true,
          },
        },
      },
    });

    if (!source) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }

    // Calculate detailed metrics
    const jobStats = await prisma.scrapeJob.aggregate({
      where: { sourceId },
      _count: { id: true },
      _sum: {
        totalFound: true,
        totalInserted: true,
        totalUpdated: true,
        totalSkipped: true,
      },
      _avg: {
        duration: true,
        totalFound: true,
      },
    });

    const statusCounts = await prisma.scrapeJob.groupBy({
      by: ['status'],
      where: { sourceId },
      _count: { id: true },
    });

    const recentPerformance = await prisma.scrapeJob.findMany({
      where: { sourceId },
      orderBy: { startedAt: 'desc' },
      take: 10,
      select: {
        startedAt: true,
        status: true,
        totalFound: true,
        duration: true,
      },
    });

    const metrics = {
      totalJobs: jobStats._count.id,
      totalGrantsFound: jobStats._sum.totalFound || 0,
      totalGrantsInserted: jobStats._sum.totalInserted || 0,
      totalGrantsUpdated: jobStats._sum.totalUpdated || 0,
      totalGrantsSkipped: jobStats._sum.totalSkipped || 0,
      averageDuration: jobStats._avg.duration || 0,
      averageGrantsFound: jobStats._avg.totalFound || 0,
      statusBreakdown: statusCounts.reduce((acc, item) => {
        acc[item.status] = item._count.id;
        return acc;
      }, {} as Record<string, number>),
      recentPerformance,
    };

    return NextResponse.json({
      ...source,
      metrics,
    });
  } catch (error) {
    console.error('Error fetching source details:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/scraping/sources/[sourceId]
 * Update a scraping source configuration
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await requireAdmin(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { sourceId } = params;
    const body = await request.json();

    const {
      url,
      type,
      frequency,
      status,
      category,
      region,
      notes,
    } = body;

    // Check if source exists
    const existingSource = await prisma.scrapedSource.findUnique({
      where: { id: sourceId },
    });

    if (!existingSource) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }

    // If URL is being changed, check for conflicts
    if (url && url !== existingSource.url) {
      const conflictingSource = await prisma.scrapedSource.findUnique({
        where: { url },
      });

      if (conflictingSource) {
        return NextResponse.json(
          { error: 'Another source with this URL already exists' },
          { status: 409 }
        );
      }
    }

    const updatedSource = await prisma.scrapedSource.update({
      where: { id: sourceId },
      data: {
        ...(url && { url }),
        ...(type && { type }),
        ...(frequency && { frequency }),
        ...(status && { status }),
        ...(category !== undefined && { category }),
        ...(region !== undefined && { region }),
        ...(notes !== undefined && { notes }),
      },
    });

    return NextResponse.json(updatedSource);
  } catch (error) {
    console.error('Error updating source:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/scraping/sources/[sourceId]
 * Delete a scraping source (soft delete by setting status to INACTIVE)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await requireAdmin(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { sourceId } = params;

    // Check if source exists
    const existingSource = await prisma.scrapedSource.findUnique({
      where: { id: sourceId },
    });

    if (!existingSource) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }

    // Soft delete by setting status to INACTIVE
    const updatedSource = await prisma.scrapedSource.update({
      where: { id: sourceId },
      data: {
        status: ScrapedSourceStatus.INACTIVE,
      },
    });

    return NextResponse.json({
      message: 'Source deactivated successfully',
      source: updatedSource,
    });
  } catch (error) {
    console.error('Error deleting source:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}