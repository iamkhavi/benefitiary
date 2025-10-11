import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../jobs/route';

// Mock dependencies
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    scrapeJob: {
      findMany: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
      groupBy: vi.fn(),
    },
  },
}));

const { auth } = await import('@/lib/auth');
const { prisma } = await import('@/lib/prisma');

describe('/api/admin/scraping/jobs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET', () => {
    it('should return 401 if user is not authenticated', async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/admin/scraping/jobs');
      const response = await GET(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 401 if user is not admin', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: '1', role: 'SEEKER' },
      } as any);

      const request = new NextRequest('http://localhost:3000/api/admin/scraping/jobs');
      const response = await GET(request);

      expect(response.status).toBe(401);
    });

    it('should return jobs with summary for admin user', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: '1', role: 'ADMIN' },
      } as any);

      const mockJobs = [
        {
          id: 'job1',
          sourceId: 'source1',
          status: 'SUCCESS',
          totalFound: 10,
          totalInserted: 5,
          startedAt: new Date(),
          source: {
            id: 'source1',
            url: 'https://example.com',
            type: 'FOUNDATION',
            status: 'ACTIVE',
          },
        },
      ];

      const mockSummary = {
        _count: { id: 1 },
        _sum: {
          totalFound: 10,
          totalInserted: 5,
          totalUpdated: 3,
          totalSkipped: 2,
          duration: 30000,
        },
        _avg: {
          duration: 30000,
          totalFound: 10,
        },
      };

      const mockStatusCounts = [
        { status: 'SUCCESS', _count: { id: 1 } },
      ];

      vi.mocked(prisma.scrapeJob.findMany).mockResolvedValue(mockJobs as any);
      vi.mocked(prisma.scrapeJob.count).mockResolvedValue(1);
      vi.mocked(prisma.scrapeJob.aggregate).mockResolvedValue(mockSummary as any);
      vi.mocked(prisma.scrapeJob.groupBy).mockResolvedValue(mockStatusCounts as any);

      const request = new NextRequest('http://localhost:3000/api/admin/scraping/jobs');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.jobs).toHaveLength(1);
      expect(data.jobs[0].id).toBe('job1');
      expect(data.summary).toBeDefined();
      expect(data.summary.totalJobs).toBe(1);
      expect(data.summary.totalGrantsFound).toBe(10);
      expect(data.summary.statusBreakdown.SUCCESS).toBe(1);
      expect(data.pagination).toBeDefined();
    });

    it('should handle filtering by status', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: '1', role: 'ADMIN' },
      } as any);

      vi.mocked(prisma.scrapeJob.findMany).mockResolvedValue([]);
      vi.mocked(prisma.scrapeJob.count).mockResolvedValue(0);
      vi.mocked(prisma.scrapeJob.aggregate).mockResolvedValue({
        _count: { id: 0 },
        _sum: {},
        _avg: {},
      } as any);
      vi.mocked(prisma.scrapeJob.groupBy).mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/admin/scraping/jobs?status=SUCCESS');
      await GET(request);

      expect(prisma.scrapeJob.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'SUCCESS' },
        })
      );
    });

    it('should handle filtering by sourceId', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: '1', role: 'ADMIN' },
      } as any);

      vi.mocked(prisma.scrapeJob.findMany).mockResolvedValue([]);
      vi.mocked(prisma.scrapeJob.count).mockResolvedValue(0);
      vi.mocked(prisma.scrapeJob.aggregate).mockResolvedValue({
        _count: { id: 0 },
        _sum: {},
        _avg: {},
      } as any);
      vi.mocked(prisma.scrapeJob.groupBy).mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/admin/scraping/jobs?sourceId=source1');
      await GET(request);

      expect(prisma.scrapeJob.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { sourceId: 'source1' },
        })
      );
    });

    it('should handle pagination parameters', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: '1', role: 'ADMIN' },
      } as any);

      vi.mocked(prisma.scrapeJob.findMany).mockResolvedValue([]);
      vi.mocked(prisma.scrapeJob.count).mockResolvedValue(0);
      vi.mocked(prisma.scrapeJob.aggregate).mockResolvedValue({
        _count: { id: 0 },
        _sum: {},
        _avg: {},
      } as any);
      vi.mocked(prisma.scrapeJob.groupBy).mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/admin/scraping/jobs?page=2&limit=10');
      await GET(request);

      expect(prisma.scrapeJob.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        })
      );
    });

    it('should handle sorting parameters', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: '1', role: 'ADMIN' },
      } as any);

      vi.mocked(prisma.scrapeJob.findMany).mockResolvedValue([]);
      vi.mocked(prisma.scrapeJob.count).mockResolvedValue(0);
      vi.mocked(prisma.scrapeJob.aggregate).mockResolvedValue({
        _count: { id: 0 },
        _sum: {},
        _avg: {},
      } as any);
      vi.mocked(prisma.scrapeJob.groupBy).mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/admin/scraping/jobs?sortBy=duration&sortOrder=asc');
      await GET(request);

      expect(prisma.scrapeJob.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { duration: 'asc' },
        })
      );
    });

    it('should use default sorting if not specified', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: '1', role: 'ADMIN' },
      } as any);

      vi.mocked(prisma.scrapeJob.findMany).mockResolvedValue([]);
      vi.mocked(prisma.scrapeJob.count).mockResolvedValue(0);
      vi.mocked(prisma.scrapeJob.aggregate).mockResolvedValue({
        _count: { id: 0 },
        _sum: {},
        _avg: {},
      } as any);
      vi.mocked(prisma.scrapeJob.groupBy).mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/admin/scraping/jobs');
      await GET(request);

      expect(prisma.scrapeJob.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { startedAt: 'desc' },
        })
      );
    });
  });
});