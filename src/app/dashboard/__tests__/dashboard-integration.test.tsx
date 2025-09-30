import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { redirect } from 'next/navigation';
import SeekerDashboard from '../seeker/page';
import WriterDashboard from '../writer/page';
import FunderDashboard from '../funder/page';
import DashboardPage from '../page';

// Mock Next.js modules
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

vi.mock('next/headers', () => ({
  headers: vi.fn(() => Promise.resolve(new Headers())),
}));

// Mock auth
vi.mock('@/lib/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

const mockAuth = vi.mocked(await import('@/lib/auth'));
const mockRedirect = vi.mocked(redirect);

describe('Dashboard Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Main Dashboard Page', () => {
    it('redirects unauthenticated users to login', async () => {
      mockAuth.auth.api.getSession.mockResolvedValue(null);

      await DashboardPage();

      expect(mockRedirect).toHaveBeenCalledWith('/auth/login');
    });

    it('redirects users who haven\'t completed onboarding', async () => {
      mockAuth.auth.api.getSession.mockResolvedValue({
        user: {
          id: '1',
          name: 'Test User',
          email: 'test@example.com',
          role: 'SEEKER',
          onboardingCompleted: false,
        },
      });

      await DashboardPage();

      expect(mockRedirect).toHaveBeenCalledWith('/onboarding/organization');
    });

    it('redirects seeker to seeker dashboard', async () => {
      mockAuth.auth.api.getSession.mockResolvedValue({
        user: {
          id: '1',
          name: 'Test User',
          email: 'test@example.com',
          role: 'SEEKER',
          onboardingCompleted: true,
        },
      });

      await DashboardPage();

      expect(mockRedirect).toHaveBeenCalledWith('/dashboard/seeker');
    });

    it('redirects writer to writer dashboard', async () => {
      mockAuth.auth.api.getSession.mockResolvedValue({
        user: {
          id: '1',
          name: 'Test User',
          email: 'test@example.com',
          role: 'WRITER',
          onboardingCompleted: true,
        },
      });

      await DashboardPage();

      expect(mockRedirect).toHaveBeenCalledWith('/dashboard/writer');
    });

    it('redirects funder to funder dashboard', async () => {
      mockAuth.auth.api.getSession.mockResolvedValue({
        user: {
          id: '1',
          name: 'Test User',
          email: 'test@example.com',
          role: 'FUNDER',
          onboardingCompleted: true,
        },
      });

      await DashboardPage();

      expect(mockRedirect).toHaveBeenCalledWith('/dashboard/funder');
    });

    it('defaults to seeker dashboard for unknown roles', async () => {
      mockAuth.auth.api.getSession.mockResolvedValue({
        user: {
          id: '1',
          name: 'Test User',
          email: 'test@example.com',
          role: 'UNKNOWN',
          onboardingCompleted: true,
        },
      });

      await DashboardPage();

      expect(mockRedirect).toHaveBeenCalledWith('/dashboard/seeker');
    });
  });

  describe('Role-Specific Dashboards', () => {
    describe('Seeker Dashboard', () => {
      it('redirects non-seeker users', async () => {
        mockAuth.auth.api.getSession.mockResolvedValue({
          user: {
            id: '1',
            name: 'Test User',
            email: 'test@example.com',
            role: 'WRITER',
            onboardingCompleted: true,
          },
        });

        await SeekerDashboard();

        expect(mockRedirect).toHaveBeenCalledWith('/dashboard');
      });

      it('renders seeker dashboard for seeker users', async () => {
        mockAuth.auth.api.getSession.mockResolvedValue({
          user: {
            id: '1',
            name: 'Test User',
            email: 'test@example.com',
            role: 'SEEKER',
            onboardingCompleted: true,
          },
        });

        const result = await SeekerDashboard();
        
        // Since this is a server component, we can't render it directly
        // but we can check that it doesn't redirect
        expect(mockRedirect).not.toHaveBeenCalled();
      });
    });

    describe('Writer Dashboard', () => {
      it('redirects non-writer users', async () => {
        mockAuth.auth.api.getSession.mockResolvedValue({
          user: {
            id: '1',
            name: 'Test User',
            email: 'test@example.com',
            role: 'SEEKER',
            onboardingCompleted: true,
          },
        });

        await WriterDashboard();

        expect(mockRedirect).toHaveBeenCalledWith('/dashboard');
      });

      it('renders writer dashboard for writer users', async () => {
        mockAuth.auth.api.getSession.mockResolvedValue({
          user: {
            id: '1',
            name: 'Test User',
            email: 'test@example.com',
            role: 'WRITER',
            onboardingCompleted: true,
          },
        });

        const result = await WriterDashboard();
        
        expect(mockRedirect).not.toHaveBeenCalled();
      });
    });

    describe('Funder Dashboard', () => {
      it('redirects non-funder users', async () => {
        mockAuth.auth.api.getSession.mockResolvedValue({
          user: {
            id: '1',
            name: 'Test User',
            email: 'test@example.com',
            role: 'SEEKER',
            onboardingCompleted: true,
          },
        });

        await FunderDashboard();

        expect(mockRedirect).toHaveBeenCalledWith('/dashboard');
      });

      it('renders funder dashboard for funder users', async () => {
        mockAuth.auth.api.getSession.mockResolvedValue({
          user: {
            id: '1',
            name: 'Test User',
            email: 'test@example.com',
            role: 'FUNDER',
            onboardingCompleted: true,
          },
        });

        const result = await FunderDashboard();
        
        expect(mockRedirect).not.toHaveBeenCalled();
      });
    });
  });
});