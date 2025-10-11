import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Admin routes protection - check for any BetterAuth session cookie
  if (pathname.startsWith('/admin')) {
    // Look for BetterAuth session cookies (they typically start with better-auth)
    const allCookies = request.cookies.getAll();
    const hasBetterAuthSession = allCookies.some(cookie => 
      cookie.name.startsWith('better-auth') && cookie.value
    );
    
    if (!hasBetterAuthSession) {
      console.log('No BetterAuth session cookie found, redirecting to login');
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