"use client";

import { usePathname, useRouter } from 'next/navigation';
import { useSession } from '@/lib/auth-client';
import { DashboardShell } from './dashboard-shell';
import { OnboardingProvider } from '../onboarding/onboarding-provider';
import { useEffect } from 'react';

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, isPending } = useSession();
  
  // Routes that should NOT have the dashboard shell
  const noShellRoutes = ['/auth', '/onboarding'];
  const shouldShowShell = !noShellRoutes.some(route => pathname.startsWith(route));

  // Handle logout redirect
  useEffect(() => {
    if (!isPending && !session?.user && shouldShowShell) {
      router.push('/auth/login');
    }
  }, [session, isPending, shouldShowShell, router]);

  // Show loading while checking session
  if (isPending) {
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
    return (
      <OnboardingProvider>
        <DashboardShell user={session.user}>
          {children}
        </DashboardShell>
      </OnboardingProvider>
    );
  }

  // Auth and onboarding pages without shell
  return <>{children}</>;
}