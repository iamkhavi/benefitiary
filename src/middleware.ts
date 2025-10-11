import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Admin routes protection - check for session cookie
  if (pathname.startsWith('/admin')) {
    const sessionCookie = request.cookies.get('better-auth.session_token');
    
    if (!sessionCookie) {
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }

    // Let the page handle the detailed role check
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