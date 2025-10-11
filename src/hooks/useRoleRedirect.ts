'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSession } from '@/lib/auth-client';

interface UseRoleRedirectOptions {
  requiredRole?: 'ADMIN' | 'SEEKER' | 'WRITER' | 'FUNDER';
  redirectTo?: string;
  allowedRoles?: ('ADMIN' | 'SEEKER' | 'WRITER' | 'FUNDER')[];
}

export function useRoleRedirect(options: UseRoleRedirectOptions = {}) {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const { requiredRole, redirectTo, allowedRoles } = options;

  useEffect(() => {
    if (isPending) return; // Wait for session to load

    // If no session, redirect to login
    if (!session?.user) {
      router.push('/auth/login');
      return;
    }

    // Fetch user role from API
    const checkUserRole = async () => {
      try {
        const response = await fetch(`/api/user/role?userId=${session.user.id}`);
        if (!response.ok) return;

        const data = await response.json();
        const userRole = data.role || 'SEEKER';

        // Check if user has required role
        if (requiredRole && userRole !== requiredRole) {
          const defaultRedirect = getRoleBasedRedirect(userRole);
          router.push(redirectTo || defaultRedirect);
          return;
        }

        // Check if user role is in allowed roles
        if (allowedRoles && !allowedRoles.includes(userRole)) {
          const defaultRedirect = getRoleBasedRedirect(userRole);
          router.push(redirectTo || defaultRedirect);
          return;
        }

        // Handle admin-specific routing
        if (pathname.startsWith('/admin') && userRole !== 'ADMIN') {
          const defaultRedirect = getRoleBasedRedirect(userRole);
          router.push(defaultRedirect);
          return;
        }

      } catch (error) {
        console.error('Error checking user role:', error);
        // On error, redirect to default dashboard
        router.push('/');
      }
    };

    checkUserRole();
  }, [session, isPending, requiredRole, allowedRoles, redirectTo, router, pathname]);

  return { session, isPending };
}

function getRoleBasedRedirect(role: string): string {
  switch (role) {
    case 'ADMIN':
      return '/admin/users'; // Admin goes to user management
    case 'WRITER':
      return '/dashboard/writer';
    case 'FUNDER':
      return '/dashboard/funder';
    case 'SEEKER':
    default:
      return '/dashboard/seeker'; // Default dashboard for seekers
  }
}