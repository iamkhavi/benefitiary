import { NextRequest } from 'next/server';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST } from '../route';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Mock dependencies
vi.mock('@/lib/auth');
vi.mock('@/lib/prisma', () => ({
  prisma: {
    userPreferences: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    user: {
      update: vi.fn(),
    },
  },
}));

const mockAuth = auth as any;
const mockPrisma = prisma as any;

describe('/api/onboarding/preferences', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST', () => {
    it('creates new preferences for authenticated user', async () => {
      const mockSession = {
        user: { id: 'user-123', email: 'test@example.com' },
      };

      mockAuth.api.getSession.mockResolvedValue(mockSession);
      mockPrisma.userPreferences.findUnique.mockResolvedValue(null);
      mockPrisma.userPreferences.create.mockResolvedValue({
        id: 'pref-123',
        userId: 'user-123',
        categories: ['HEALTHCARE_PUBLIC_HEALTH', 'EDUCATION_TRAINING'],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockPrisma.user.update.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost:3000/api/onboarding/preferences', {
        method: 'POST',
        body: JSON.stringify({
          categories: ['HEALTHCARE_PUBLIC_HEALTH', 'EDUCATION_TRAINING'],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.preferences.categories).toEqual(['HEALTHCARE_PUBLIC_HEALTH', 'EDUCATION_TRAINING']);

      expect(mockPrisma.userPreferences.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          categories: ['HEALTHCARE_PUBLIC_HEALTH', 'EDUCATION_TRAINING'],
        },
      });

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          onboardingCompleted: true,
          onboardingStep: 3,
        },
      });
    });

    it('updates existing preferences for authenticated user', async () => {
      const mockSession = {
        user: { id: 'user-123', email: 'test@example.com' },
      };

      const existingPreferences = {
        id: 'pref-123',
        userId: 'user-123',
        categories: ['HEALTHCARE_PUBLIC_HEALTH'],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockAuth.api.getSession.mockResolvedValue(mockSession);
      mockPrisma.userPreferences.findUnique.mockResolvedValue(existingPreferences);
      mockPrisma.userPreferences.update.mockResolvedValue({
        ...existingPreferences,
        categories: ['HEALTHCARE_PUBLIC_HEALTH', 'EDUCATION_TRAINING'],
        updatedAt: new Date(),
      });
      mockPrisma.user.update.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost:3000/api/onboarding/preferences', {
        method: 'POST',
        body: JSON.stringify({
          categories: ['HEALTHCARE_PUBLIC_HEALTH', 'EDUCATION_TRAINING'],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      expect(mockPrisma.userPreferences.update).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        data: {
          categories: ['HEALTHCARE_PUBLIC_HEALTH', 'EDUCATION_TRAINING'],
          updatedAt: expect.any(Date),
        },
      });
    });

    it('returns 401 for unauthenticated user', async () => {
      mockAuth.api.getSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/onboarding/preferences', {
        method: 'POST',
        body: JSON.stringify({
          categories: ['HEALTHCARE_PUBLIC_HEALTH'],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('returns 400 for invalid data', async () => {
      const mockSession = {
        user: { id: 'user-123', email: 'test@example.com' },
      };

      mockAuth.api.getSession.mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost:3000/api/onboarding/preferences', {
        method: 'POST',
        body: JSON.stringify({
          categories: [], // Empty array should fail validation
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid data provided');
    });

    it('returns 400 for invalid category values', async () => {
      const mockSession = {
        user: { id: 'user-123', email: 'test@example.com' },
      };

      mockAuth.api.getSession.mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost:3000/api/onboarding/preferences', {
        method: 'POST',
        body: JSON.stringify({
          categories: ['INVALID_CATEGORY'],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid data provided');
    });

    it('handles database errors gracefully', async () => {
      const mockSession = {
        user: { id: 'user-123', email: 'test@example.com' },
      };

      mockAuth.api.getSession.mockResolvedValue(mockSession);
      mockPrisma.userPreferences.findUnique.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/onboarding/preferences', {
        method: 'POST',
        body: JSON.stringify({
          categories: ['HEALTHCARE_PUBLIC_HEALTH'],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });

    it('validates maximum number of categories', async () => {
      const mockSession = {
        user: { id: 'user-123', email: 'test@example.com' },
      };

      mockAuth.api.getSession.mockResolvedValue(mockSession);

      const tooManyCategories = [
        'HEALTHCARE_PUBLIC_HEALTH',
        'EDUCATION_TRAINING',
        'AGRICULTURE_FOOD_SECURITY',
        'CLIMATE_ENVIRONMENT',
        'TECHNOLOGY_INNOVATION',
        'WOMEN_YOUTH_EMPOWERMENT',
        'ARTS_CULTURE',
        'COMMUNITY_DEVELOPMENT',
        'HUMAN_RIGHTS_GOVERNANCE',
        'SME_BUSINESS_GROWTH',
        'EXTRA_CATEGORY', // This would be 11 categories
      ];

      const request = new NextRequest('http://localhost:3000/api/onboarding/preferences', {
        method: 'POST',
        body: JSON.stringify({
          categories: tooManyCategories,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid data provided');
    });
  });
});