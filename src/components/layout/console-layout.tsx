"use client";

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { DashboardShell } from './dashboard-shell';

// Pages that should use the console layout
const CONSOLE_PAGES = [
  '/', // Root page for app subdomain should be dashboard
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
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAppSubdomain, setIsAppSubdomain] = useState(false);

  // Check if we're on app subdomain
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsAppSubdomain(window.location.hostname.startsWith('app.'));
    }
  }, []);

  // Check if current page should use console layout
  const isConsolePage = isAppSubdomain || CONSOLE_PAGES.some(page => pathname?.startsWith(page));

  useEffect(() => {
    // For app subdomain, always try to authenticate
    if (isConsolePage) {
      // Use a simple approach - check if user is logged in via document.cookie or localStorage
      // For now, let's create a mock user for testing
      setTimeout(() => {
        const mockUser = {
          id: '1',
          name: 'Steve Khavi',
          email: 'steve@example.com',
          image: null
        };
        setUser(mockUser);
        setLoading(false);
      }, 500);
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

  // Use console layout for console pages (app subdomain or specific console routes)
  if (isConsolePage) {
    // If on app subdomain root, show dashboard content
    if (pathname === '/' && isAppSubdomain) {
      return (
        <DashboardShell user={user}>
          <div className="p-6">
            <div className="max-w-7xl mx-auto">
              <div className="mb-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-medium text-gray-900 mb-1">
                      Welcome back Steve Khavi
                    </h2>
                    <p className="text-sm text-gray-600">
                      Monitor and control what happens with your grants today for funding success.
                    </p>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <span>Wed, Oct 1, 2025</span>
                  </div>
                </div>
              </div>
              <div className="text-center py-20">
                <h1 className="text-3xl font-bold text-gray-900 mb-4">Dashboard</h1>
                <p className="text-gray-600">Your grant management dashboard</p>
              </div>
            </div>
          </div>
        </DashboardShell>
      );
    }

    return (
      <DashboardShell user={user}>
        {children}
      </DashboardShell>
    );
  }

  // Regular layout for non-console pages
  return <>{children}</>;
}