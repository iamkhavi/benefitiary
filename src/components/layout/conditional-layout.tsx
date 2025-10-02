"use client";

import { usePathname } from 'next/navigation';
import { DashboardShell } from './dashboard-shell';

// Mock user for console app
const mockUser = {
  id: '1',
  name: 'Steve Khavi',
  email: 'steve@example.com',
  image: null
};

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Routes that should NOT have the dashboard shell
  const noShellRoutes = ['/auth', '/onboarding'];
  const shouldShowShell = !noShellRoutes.some(route => pathname.startsWith(route));

  if (shouldShowShell) {
    return (
      <DashboardShell user={mockUser}>
        {children}
      </DashboardShell>
    );
  }

  // Auth and onboarding pages without shell
  return <>{children}</>;
}