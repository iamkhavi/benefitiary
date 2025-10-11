import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '../sources/route';

// Mock dependencies
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    scrapedSource: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    scrapeJob: {
      aggregate: vi.fn(),
      count: vi.fn(),
    },
  },
}));

const { auth } = await import('@/lib/auth');
const { prisma } = await import('@/lib/prisma');

describe('/api/admin/scraping/sources', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET', () => {
    it('should return 401 if user is not authenticated', async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/admin/scraping/sources');
      const response = await GET(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 401 if user is not admin', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: '1', role: 'SEEKER' },
      } as any);

      const request = new NextRequest('http://localhost:3000/api/admin/scraping/sources');
      const response = await GET(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('should return sources with metrics for admin user', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: '1', role: 'ADMIN' },
      } as any);

      const mockSources = [
        {
          id: '1',
          url: 'https://example.com',
          type: 'FOUNDATION',
          status: 'ACTIVE',
          scrapeJobs: [],
          _count: { scrapeJobs: 5 },
        },
      ];

      vi.mocked(prisma.scrapedSource.findMany).mockResolvedValue(mockSources as any);
      vi.mocked(prisma.scrapedSource.count).mockResolvedValue(1);
      vi.mocked(prisma.scrapeJob.aggregate).mockResolvedValue({
        _count: { id: 5 },
        _avg: { duration: 30000, totalFound: 10 },
      } as any);
      vi.mocked(prisma.scrapeJob.count).mockResolvedValue(4);

      const request = new NextRequest('http://localhost:3000/api/admin/scraping/sources');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.sources).toHaveLength(1);
      expect(data.sources[0].metrics).toBeDefined();
      expect(data.sources[0].metrics.successRate).toBe(80);
    });

    it('should handle pagination parameters', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: '1', role: 'ADMIN' },
      } as any);

      vi.mocked(prisma.scrapedSource.findMany).mockResolvedValue([]);
      vi.mocked(prisma.scrapedSource.count).mockResolvedValue(0);

      const request = new NextRequest('http://localhost:3000/api/admin/scraping/sources?page=2&limit=10');
      await GET(request);

      expect(prisma.scrapedSource.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        })
      );
    });

    it('should handle status and type filters', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: '1', role: 'ADMIN' },
      } as any);

      vi.mocked(prisma.scrapedSource.findMany).mockResolvedValue([]);
      vi.mocked(prisma.scrapedSource.count).mockResolvedValue(0);

      const request = new NextRequest('http://localhost:3000/api/admin/scraping/sources?status=ACTIVE&type=FOUNDATION');
      await GET(request);

      expect(prisma.scrapedSource.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: 'ACTIVE',
            type: 'FOUNDATION',
          },
        })
      );
    });
  });

  describe('POST', () => {
    it('should return 401 if user is not authenticated', async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/admin/scraping/sources', {
        method: 'POST',
        body: JSON.stringify({
          url: 'https://example.com',
          type: 'FOUNDATION',
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(401);
    });

    it('should return 400 if required fields are missing', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: '1', role: 'ADMIN' },
      } as any);

      const request = new NextRequest('http://localhost:3000/api/admin/scraping/sources', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('URL and type are required');
    });

    it('should return 409 if source already exists', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: '1', role: 'ADMIN' },
      } as any);

      vi.mocked(prisma.scrapedSource.findUnique).mockResolvedValue({
        id: '1',
        url: 'https://example.com',
      } as any);

      const request = new NextRequest('http://localhost:3000/api/admin/scraping/sources', {
        method: 'POST',
        body: JSON.stringify({
          url: 'https://example.com',
          type: 'FOUNDATION',
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(409);
      const data = await response.json();
      expect(data.error).toBe('Source with this URL already exists');
    });

    it('should create new source successfully', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: '1', role: 'ADMIN' },
      } as any);

      vi.mocked(prisma.scrapedSource.findUnique).mockResolvedValue(null);
      
      const mockCreatedSource = {
        id: '1',
        url: 'https://example.com',
        type: 'FOUNDATION',
        status: 'ACTIVE',
        frequency: 'WEEKLY',
      };

      vi.mocked(prisma.scrapedSource.create).mockResolvedValue(mockCreatedSource as any);

      const request = new NextRequest('http://localhost:3000/api/admin/scraping/sources', {
        method: 'POST',
        body: JSON.stringify({
          url: 'https://example.com',
          type: 'FOUNDATION',
          category: 'Healthcare',
          notes: 'Test source',
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.url).toBe('https://example.com');
      expect(prisma.scrapedSource.create).toHaveBeenCalledWith({
        data: {
          url: 'https://example.com',
          type: 'FOUNDATION',
          frequency: 'WEEKLY',
          status: 'ACTIVE',
          category: 'Healthcare',
          region: undefined,
          notes: 'Test source',
        },
      });
    });
  });
});