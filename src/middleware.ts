import { NextRequest, NextResponse } from "next/server";
import { getDashboardPath } from "@/lib/utils/dashboard-utils";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for API routes, static files, and auth routes
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/auth/") ||
    pathname === "/favicon.ico" ||
    pathname === "/" ||
    pathname.startsWith("/privacy") ||
    pathname.startsWith("/terms")
  ) {
    return NextResponse.next();
  }

  try {
    // For now, let the individual pages handle authentication
    // This avoids the Edge Runtime issue with BetterAuth
    return NextResponse.next();
  } catch (error) {
    console.error("Middleware error:", error);
    return NextResponse.next();
  }
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
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};