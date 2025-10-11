import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { ScrapedSourceType, ScrapingFrequency, ScrapedSourceStatus } from '@/lib/scraping/types';

/**
 * GET /api/admin/scraping/sources
 * Retrieve all scraping sources with their performance metrics
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAdmin(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as ScrapedSourceStatus | null;
    const type = searchParams.get('type') as ScrapedSourceType | null;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (type) where.type = type;

    const [sources, total] = await Promise.all([
      prisma.scrapedSource.findMany({
        where,
        include: {
          scrapeJobs: {
            orderBy: { startedAt: 'desc' },
            take: 5,
          },
          _count: {
            select: {
              scrapeJobs: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.scrapedSource.count({ where }),
    ]);

    // Calculate performance metrics for each source
    const sourcesWithMetrics = await Promise.all(
      sources.map(async (source) => {
        const jobStats = await prisma.scrapeJob.aggregate({
          where: { sourceId: source.id },
          _count: { id: true },
          _avg: {
            duration: true,
            totalFound: true,
          },
        });

        const successfulJobs = await prisma.scrapeJob.count({
          where: {
            sourceId: source.id,
            status: 'SUCCESS',
          },
        });

        const successRate = jobStats._count.id > 0 
          ? (successfulJobs / jobStats._count.id) * 100 
          : 0;

        return {
          ...source,
          metrics: {
            totalJobs: jobStats._count.id,
            successfulJobs,
            successRate: Math.round(successRate * 100) / 100,
            averageDuration: jobStats._avg.duration || 0,
            averageGrantsFound: jobStats._avg.totalFound || 0,
          },
        };
      })
    );

    return NextResponse.json({
      sources: sourcesWithMetrics,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching scraping sources:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/scraping/sources
 * Create a new scraping source
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAdmin(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const body = await request.json();
    const {
      url,
      type,
      frequency = ScrapingFrequency.WEEKLY,
      status = ScrapedSourceStatus.ACTIVE,
      category,
      region,
      notes,
    } = body;

    // Validate required fields
    if (!url || !type) {
      return NextResponse.json(
        { error: 'URL and type are required' },
        { status: 400 }
      );
    }

    // Check if source already exists
    const existingSource = await prisma.scrapedSource.findUnique({
      where: { url },
    });

    if (existingSource) {
      return NextResponse.json(
        { error: 'Source with this URL already exists' },
        { status: 409 }
      );
    }

    const source = await prisma.scrapedSource.create({
      data: {
        url,
        type,
        frequency,
        status,
        category,
        region,
        notes,
      },
    });

    return NextResponse.json(source, { status: 201 });
  } catch (error) {
    console.error('Error creating scraping source:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}