import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for API routes - they handle their own auth
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Admin routes protection - check for any BetterAuth session cookie
  if (pathname.startsWith('/admin')) {
    // Look for BetterAuth session cookies with more comprehensive check
    const allCookies = request.cookies.getAll();
    const hasBetterAuthSession = allCookies.some(cookie => 
      (cookie.name.includes('better-auth') || 
       cookie.name.includes('session') || 
       cookie.name.includes('auth')) && 
      cookie.value && 
      cookie.value.length > 10 // Ensure it's not just an empty or minimal value
    );
    
    // Debug logging
    console.log('Admin route accessed:', pathname);
    console.log('Available cookies:', allCookies.map(c => ({ name: c.name, hasValue: !!c.value, length: c.value?.length || 0 })));
    console.log('Session cookie found:', hasBetterAuthSession);
    
    if (!hasBetterAuthSession) {
      console.log('No valid session cookie found, redirecting to login');
      // Prevent redirect loops - don't redirect if already on auth pages
      if (pathname.startsWith('/auth/')) {
        return NextResponse.next();
      }
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }

    // Let the page handle the detailed session validation and role check
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};