import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-helpers';
import { scrapingService } from '@/lib/scraping/scraping-service';

export async function GET() {
  try {
    await requireAdmin();

    const status = await scrapingService.getScrapingStatus();
    
    return NextResponse.json({
      success: true,
      data: status
    });

  } catch (error) {
    console.error('Failed to get scraping status:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get scraping status' },
      { status: 500 }
    );
  }
}