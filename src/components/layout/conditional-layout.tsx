"use client";

import { usePathname } from 'next/navigation';
import { useSession } from '@/lib/auth-client';
import { DashboardShell } from './dashboard-shell';
import { OnboardingProvider } from '../onboarding/onboarding-provider';
import { redirect } from 'next/navigation';

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session, isPending } = useSession();
  
  // Routes that should NOT have the dashboard shell
  const noShellRoutes = ['/auth', '/onboarding'];
  const shouldShowShell = !noShellRoutes.some(route => pathname.startsWith(route));

  // Show loading while checking session
  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Redirect to auth if not authenticated and trying to access protected routes
  if (!session?.user && shouldShowShell) {
    redirect('/auth/login');
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