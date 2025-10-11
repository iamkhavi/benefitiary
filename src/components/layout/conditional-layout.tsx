"use client";

import { usePathname, useRouter } from 'next/navigation';
import { useSession } from '@/lib/auth-client';
import { DashboardShell } from './dashboard-shell';
import { OnboardingProvider } from '../onboarding/onboarding-provider';
import { useEffect, useState } from 'react';

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);
  
  // Routes that should NOT have the dashboard shell
  const noShellRoutes = ['/auth', '/onboarding'];
  const shouldShowShell = !noShellRoutes.some(route => pathname.startsWith(route));

  // Fetch user role from database
  useEffect(() => {
    async function fetchUserRole() {
      if (!session?.user?.id) {
        setRoleLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/user/role?userId=${session.user.id}`);
        if (response.ok) {
          const data = await response.json();
          setUserRole(data.role);
        } else {
          // If API fails, default to SEEKER
          setUserRole('SEEKER');
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
        // Default to SEEKER on error
        setUserRole('SEEKER');
      } finally {
        setRoleLoading(false);
      }
    }

    if (session?.user && shouldShowShell) {
      fetchUserRole();
    } else {
      setRoleLoading(false);
    }
  }, [session?.user, shouldShowShell]);

  // Handle logout redirect
  useEffect(() => {
    if (!isPending && !session?.user && shouldShowShell) {
      router.push('/auth/login');
    }
  }, [session, isPending, shouldShowShell, router]);

  // Show loading while checking session or fetching role
  if (isPending || (shouldShowShell && roleLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If user is not authenticated and trying to access protected routes, show loading
  // (the useEffect above will handle the redirect)
  if (!session?.user && shouldShowShell) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (shouldShowShell && session?.user) {
    // Create enhanced user object with role
    const enhancedUser = {
      ...session.user,
      role: userRole || 'SEEKER' // Default to SEEKER if role not found
    };

    return (
      <OnboardingProvider>
        <DashboardShell user={enhancedUser}>
          {children}
        </DashboardShell>
      </OnboardingProvider>
    );
  }

  // Auth and onboarding pages without shell
  return <>{children}</>;
}