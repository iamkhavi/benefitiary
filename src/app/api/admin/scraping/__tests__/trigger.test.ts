import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../sources/[sourceId]/trigger/route';

// Mock dependencies
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    scrapedSource: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    scrapeJob: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('@/lib/scraping/core/scheduler', () => ({
  SchedulerService: vi.fn().mockImplementation(() => ({})),
}));

vi.mock('@/lib/scraping/core/orchestrator', () => ({
  ScrapingOrchestrator: vi.fn().mockImplementation(() => ({
    executeScrapeJob: vi.fn().mockResolvedValue({
      totalFound: 10,
      totalInserted: 5,
      totalUpdated: 3,
      totalSkipped: 2,
      duration: 30000,
      errors: [],
      metadata: {},
    }),
  })),
}));

const { auth } = await import('@/lib/auth');
const { prisma } = await import('@/lib/prisma');

describe('/api/admin/scraping/sources/[sourceId]/trigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST', () => {
    it('should return 401 if user is not authenticated', async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/admin/scraping/sources/1/trigger', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request, { params: { sourceId: '1' } });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 401 if user is not admin', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: '1', role: 'SEEKER' },
      } as any);

      const request = new NextRequest('http://localhost:3000/api/admin/scraping/sources/1/trigger', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request, { params: { sourceId: '1' } });

      expect(response.status).toBe(401);
    });

    it('should return 404 if source not found', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: '1', role: 'ADMIN' },
      } as any);

      vi.mocked(prisma.scrapedSource.findUnique).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/admin/scraping/sources/1/trigger', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request, { params: { sourceId: '1' } });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Source not found');
    });

    it('should return 400 if source is inactive and force is false', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: '1', role: 'ADMIN' },
      } as any);

      vi.mocked(prisma.scrapedSource.findUnique).mockResolvedValue({
        id: '1',
        status: 'INACTIVE',
        failCount: 0,
        successRate: null,
      } as any);

      const request = new NextRequest('http://localhost:3000/api/admin/scraping/sources/1/trigger', {
        method: 'POST',
        body: JSON.stringify({ force: false }),
      });

      const response = await POST(request, { params: { sourceId: '1' } });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Source is not active. Use force=true to override.');
    });

    it('should return 409 if job is already running and force is false', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: '1', role: 'ADMIN' },
      } as any);

      vi.mocked(prisma.scrapedSource.findUnique).mockResolvedValue({
        id: '1',
        status: 'ACTIVE',
        failCount: 0,
        successRate: null,
      } as any);

      vi.mocked(prisma.scrapeJob.findFirst).mockResolvedValue({
        id: 'job1',
        status: 'RUNNING',
      } as any);

      const request = new NextRequest('http://localhost:3000/api/admin/scraping/sources/1/trigger', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request, { params: { sourceId: '1' } });

      expect(response.status).toBe(409);
      const data = await response.json();
      expect(data.error).toBe('A scraping job is already running for this source');
      expect(data.jobId).toBe('job1');
    });

    it('should create and trigger scraping job successfully', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: 'admin1', role: 'ADMIN' },
      } as any);

      vi.mocked(prisma.scrapedSource.findUnique).mockResolvedValue({
        id: '1',
        status: 'ACTIVE',
        failCount: 0,
        successRate: null,
        avgParseTime: 45000,
      } as any);

      vi.mocked(prisma.scrapeJob.findFirst).mockResolvedValue(null);

      const mockCreatedJob = {
        id: 'job1',
        sourceId: '1',
        status: 'PENDING',
        startedAt: new Date(),
        metadata: {
          triggeredBy: 'admin1',
          triggerType: 'manual',
          priority: 1,
          force: false,
        },
      };

      vi.mocked(prisma.scrapeJob.create).mockResolvedValue(mockCreatedJob as any);

      const request = new NextRequest('http://localhost:3000/api/admin/scraping/sources/1/trigger', {
        method: 'POST',
        body: JSON.stringify({ priority: 1 }),
      });

      const response = await POST(request, { params: { sourceId: '1' } });

      expect(response.status).toBe(202);
      const data = await response.json();
      expect(data.message).toBe('Scraping job triggered successfully');
      expect(data.jobId).toBe('job1');
      expect(data.estimatedDuration).toBe(45000);

      expect(prisma.scrapeJob.create).toHaveBeenCalledWith({
        data: {
          sourceId: '1',
          status: 'PENDING',
          startedAt: expect.any(Date),
          metadata: {
            triggeredBy: 'admin1',
            triggerType: 'manual',
            priority: 1,
            force: false,
          },
        },
      });
    });

    it('should handle force parameter correctly', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: 'admin1', role: 'ADMIN' },
      } as any);

      vi.mocked(prisma.scrapedSource.findUnique).mockResolvedValue({
        id: '1',
        status: 'INACTIVE',
        failCount: 0,
        successRate: null,
      } as any);

      vi.mocked(prisma.scrapeJob.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.scrapeJob.create).mockResolvedValue({
        id: 'job1',
        sourceId: '1',
        status: 'PENDING',
        startedAt: new Date(),
        metadata: {},
      } as any);

      const request = new NextRequest('http://localhost:3000/api/admin/scraping/sources/1/trigger', {
        method: 'POST',
        body: JSON.stringify({ force: true }),
      });

      const response = await POST(request, { params: { sourceId: '1' } });

      expect(response.status).toBe(202);
      
      expect(prisma.scrapeJob.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          metadata: expect.objectContaining({
            force: true,
          }),
        }),
      });
    });
  });
});