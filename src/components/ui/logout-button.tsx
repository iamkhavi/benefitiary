"use client";

import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';

interface LogoutButtonProps {
  className?: string;
  children?: React.ReactNode;
}

export function LogoutButton({ className, children }: LogoutButtonProps) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      // Sign out using the auth client
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            // Clear any local storage or session storage if needed
            localStorage.clear();
            sessionStorage.clear();
            
            // Redirect to login page
            router.push('/auth/login');
            
            // Force a page refresh to clear any cached state
            window.location.href = '/auth/login';
          },
          onError: (ctx) => {
            console.error('Logout error:', ctx.error);
            // Even on error, redirect to login
            router.push('/auth/login');
            window.location.href = '/auth/login';
          }
        }
      });
    } catch (error) {
      console.error('Logout error:', error);
      // Fallback: redirect to logout route
      window.location.href = '/auth/logout';
    }
  };

  return (
    <button
      onClick={handleLogout}
      className={className}
    >
      {children || (
        <div className="flex items-center space-x-3">
          <LogOut className="h-5 w-5" />
          <span>Log out</span>
        </div>
      )}
    </button>
  );
}