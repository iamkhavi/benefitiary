import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { ScrapeJobStatus } from '@prisma/client';
import { SchedulerService } from '@/lib/scraping/core/scheduler';
import { ScrapingOrchestrator } from '@/lib/scraping/core/orchestrator';
import { SourceManager } from '@/lib/scraping/core/source-manager';
import { ScrapingFrequency } from '@/lib/scraping/types';

interface RouteParams {
  params: {
    sourceId: string;
  };
}

/**
 * POST /api/admin/scraping/sources/[sourceId]/trigger
 * Manually trigger scraping for a specific source
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await requireAdmin(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { sourceId } = params;
    const body = await request.json();
    const { priority = 1, force = false } = body;

    // Check if source exists and is active
    const source = await prisma.scrapedSource.findUnique({
      where: { id: sourceId },
    });

    if (!source) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }

    if (source.status !== 'ACTIVE' && !force) {
      return NextResponse.json(
        { error: 'Source is not active. Use force=true to override.' },
        { status: 400 }
      );
    }

    // Check if there's already a running job for this source
    const runningJob = await prisma.scrapeJob.findFirst({
      where: {
        sourceId,
        status: {
          in: [ScrapeJobStatus.PENDING, ScrapeJobStatus.RUNNING],
        },
      },
    });

    if (runningJob && !force) {
      return NextResponse.json(
        { 
          error: 'A scraping job is already running for this source',
          jobId: runningJob.id,
          status: runningJob.status,
        },
        { status: 409 }
      );
    }

    // Create a new scrape job
    const scrapeJob = await prisma.scrapeJob.create({
      data: {
        sourceId,
        status: ScrapeJobStatus.PENDING,
        startedAt: new Date(),
        metadata: {
          triggeredBy: authResult.user.id,
          triggerType: 'manual',
          priority,
          force,
        },
      },
    });

    // Initialize the scheduler and orchestrator
    const schedulerConfig = {
      defaultFrequency: 'WEEKLY' as ScrapingFrequency,
      maxConcurrentJobs: 5,
      retryAttempts: 3,
      healthCheckInterval: 60000
    };
    const scheduler = new SchedulerService(schedulerConfig);
    const sourceManager = new SourceManager();
    const orchestrator = new ScrapingOrchestrator(sourceManager);

    // Execute the scraping job asynchronously
    // Note: In a production environment, this should be handled by a job queue
    setImmediate(async () => {
      try {
        // Update job status to running
        await prisma.scrapeJob.update({
          where: { id: scrapeJob.id },
          data: { status: ScrapeJobStatus.RUNNING },
        });

        // Execute the scraping
        const jobData = {
          id: scrapeJob.id,
          sourceId: scrapeJob.sourceId,
          status: scrapeJob.status as any,
          totalFound: scrapeJob.totalFound || undefined,
          totalInserted: scrapeJob.totalInserted || undefined,
          totalUpdated: scrapeJob.totalUpdated || undefined,
          totalSkipped: scrapeJob.totalSkipped || undefined,
          startedAt: scrapeJob.startedAt,
          finishedAt: scrapeJob.finishedAt || undefined,
          duration: scrapeJob.duration || undefined,
          log: scrapeJob.log || undefined,
          scheduledAt: scrapeJob.startedAt,
          priority,
          metadata: {
            triggeredBy: authResult.user.id,
            triggerType: 'manual',
            priority,
            sourceId: params.sourceId,
            timestamp: new Date().toISOString()
          }
        };
        
        const result = await orchestrator.executeScrapeJob(jobData);

        // Update job with results
        await prisma.scrapeJob.update({
          where: { id: scrapeJob.id },
          data: {
            status: ScrapeJobStatus.SUCCESS,
            finishedAt: new Date(),
            totalFound: result.totalFound,
            totalInserted: result.totalInserted,
            totalUpdated: result.totalUpdated,
            totalSkipped: result.totalSkipped,
            duration: result.duration,
            log: JSON.stringify({
              message: 'Scraping completed successfully',
              errors: result.errors,
              metadata: result.metadata,
            }),
          },
        });

        // Update source metrics
        await prisma.scrapedSource.update({
          where: { id: sourceId },
          data: {
            lastScrapedAt: new Date(),
            successRate: source.successRate 
              ? ((Number(source.successRate) * (source.failCount || 0) + 100) / ((source.failCount || 0) + 1))
              : 100,
          },
        });

      } catch (error) {
        console.error('Scraping job failed:', error);
        
        // Update job with failure
        await prisma.scrapeJob.update({
          where: { id: scrapeJob.id },
          data: {
            status: ScrapeJobStatus.FAILED,
            finishedAt: new Date(),
            log: JSON.stringify({
              message: 'Scraping failed',
              error: error instanceof Error ? error.message : 'Unknown error',
              stack: error instanceof Error ? error.stack : undefined,
            }),
          },
        });

        // Update source failure metrics
        await prisma.scrapedSource.update({
          where: { id: sourceId },
          data: {
            failCount: (source.failCount || 0) + 1,
            lastError: error instanceof Error ? error.message : 'Unknown error',
            successRate: source.successRate 
              ? ((Number(source.successRate) * (source.failCount || 0)) / ((source.failCount || 0) + 1))
              : 0,
          },
        });
      }
    });

    return NextResponse.json({
      message: 'Scraping job triggered successfully',
      jobId: scrapeJob.id,
      status: scrapeJob.status,
      estimatedDuration: source.avgParseTime || 60000, // Default 1 minute
    }, { status: 202 });

  } catch (error) {
    console.error('Error triggering scraping job:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}