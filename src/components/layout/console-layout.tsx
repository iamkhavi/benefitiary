"use client";

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { DashboardShell } from './dashboard-shell';

// Pages that should use the console layout
const CONSOLE_PAGES = [
  '/dashboard',
  '/grants', 
  '/applications',
  '/matches',
  '/ai-assistant',
  '/analytics', 
  '/billing',
  '/feedback',
  '/settings',
  '/help'
];

interface ConsoleLayoutProps {
  children: React.ReactNode;
}

export function ConsoleLayout({ children }: ConsoleLayoutProps) {
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if current page should use console layout
  const isConsolePage = CONSOLE_PAGES.some(page => pathname?.startsWith(page));

  useEffect(() => {
    // Fetch user session for console pages
    if (isConsolePage) {
      fetch('/api/auth/session')
        .then(res => res.json())
        .then(data => {
          setUser(data.user);
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
          // Redirect to login if not authenticated
          window.location.href = '/auth/login';
        });
    } else {
      setLoading(false);
    }
  }, [isConsolePage]);

  // Show loading for console pages while checking auth
  if (isConsolePage && loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Use console layout for authenticated console pages
  if (isConsolePage && user) {
    return (
      <DashboardShell user={user}>
        {children}
      </DashboardShell>
    );
  }

  // Regular layout for non-console pages
  return <>{children}</>;
}