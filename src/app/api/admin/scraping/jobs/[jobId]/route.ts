import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: {
    jobId: string;
  };
}

/**
 * GET /api/admin/scraping/jobs/[jobId]
 * Get detailed information about a specific scraping job
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await requireAdmin(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { jobId } = params;

    const job = await prisma.scrapeJob.findUnique({
      where: { id: jobId },
      include: {
        source: true,
      },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Parse the log if it exists
    let parsedLog = null;
    if (job.log) {
      try {
        parsedLog = JSON.parse(job.log);
      } catch (error) {
        // If log is not valid JSON, treat it as plain text
        parsedLog = { message: job.log };
      }
    }

    return NextResponse.json({
      ...job,
      parsedLog,
    });
  } catch (error) {
    console.error('Error fetching job details:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/scraping/jobs/[jobId]
 * Cancel a running scraping job
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await requireAdmin(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { jobId } = params;

    const job = await prisma.scrapeJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Only allow cancellation of pending or running jobs
    if (job.status !== 'PENDING' && job.status !== 'RUNNING') {
      return NextResponse.json(
        { error: 'Can only cancel pending or running jobs' },
        { status: 400 }
      );
    }

    const updatedJob = await prisma.scrapeJob.update({
      where: { id: jobId },
      data: {
        status: 'CANCELLED',
        finishedAt: new Date(),
        log: JSON.stringify({
          message: 'Job cancelled by admin',
          cancelledBy: authResult.user.id,
          cancelledAt: new Date().toISOString(),
        }),
      },
    });

    return NextResponse.json({
      message: 'Job cancelled successfully',
      job: updatedJob,
    });
  } catch (error) {
    console.error('Error cancelling job:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}