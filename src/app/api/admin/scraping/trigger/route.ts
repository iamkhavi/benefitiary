import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-helpers';
import { scrapingService } from '@/lib/scraping/scraping-service';

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const { sourceId, triggerAll } = body;

    if (triggerAll) {
      // Trigger all active sources
      const jobIds = await scrapingService.triggerAllActiveSources();
      
      return NextResponse.json({
        success: true,
        message: `Started ${jobIds.length} scraping jobs`,
        jobIds
      });
    } else if (sourceId) {
      // Trigger specific source
      const jobId = await scrapingService.startScrapingJob(sourceId);
      
      return NextResponse.json({
        success: true,
        message: 'Scraping job started',
        jobId
      });
    } else {
      return NextResponse.json(
        { error: 'Either sourceId or triggerAll must be provided' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Scraping trigger failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to trigger scraping' },
      { status: 500 }
    );
  }
}