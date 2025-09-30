import { NextRequest } from 'next/server';
import { randomBytes, createHash } from 'crypto';

/**
 * CSRF Protection utilities
 */

const CSRF_TOKEN_LENGTH = 32;
const CSRF_SECRET = process.env.CSRF_SECRET || 'default-csrf-secret-change-in-production';

// Generate a CSRF token
export function generateCSRFToken(): string {
  const token = randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
  return token;
}

// Create CSRF token hash for verification
export function createCSRFHash(token: string, sessionId: string): string {
  return createHash('sha256')
    .update(`${token}:${sessionId}:${CSRF_SECRET}`)
    .digest('hex');
}

// Verify CSRF token
export function verifyCSRFToken(
  token: string, 
  sessionId: string, 
  providedHash: string
): boolean {
  const expectedHash = createCSRFHash(token, sessionId);
  return expectedHash === providedHash;
}

// Extract CSRF token from request headers
export function getCSRFTokenFromRequest(request: NextRequest): string | null {
  // Check X-CSRF-Token header first
  const headerToken = request.headers.get('X-CSRF-Token');
  if (headerToken) return headerToken;
  
  // Check form data for _csrf field
  const contentType = request.headers.get('content-type');
  if (contentType?.includes('application/x-www-form-urlencoded')) {
    // This would need to be handled in the route handler after parsing form data
    return null;
  }
  
  return null;
}

// Validate request origin for CSRF protection
export function validateRequestOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const host = request.headers.get('host');
  
  if (!host) return false;
  
  const allowedOrigins = [
    `https://${host}`,
    `http://${host}`, // Allow HTTP in development
  ];
  
  // Add environment-specific allowed origins
  if (process.env.NODE_ENV === 'development') {
    allowedOrigins.push('http://localhost:3000');
  }
  
  // Check origin header
  if (origin && !allowedOrigins.includes(origin)) {
    return false;
  }
  
  // Check referer header as fallback
  if (!origin && referer) {
    const refererUrl = new URL(referer);
    const refererOrigin = `${refererUrl.protocol}//${refererUrl.host}`;
    return allowedOrigins.includes(refererOrigin);
  }
  
  return true;
}

// Security headers for responses
export function getSecurityHeaders(): Record<string, string> {
  return {
    // Prevent clickjacking
    'X-Frame-Options': 'DENY',
    
    // Prevent MIME type sniffing
    'X-Content-Type-Options': 'nosniff',
    
    // XSS protection
    'X-XSS-Protection': '1; mode=block',
    
    // Referrer policy
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    
    // Content Security Policy
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Needed for Next.js
      "style-src 'self' 'unsafe-inline'", // Needed for Tailwind
      "img-src 'self' data: https:",
      "font-src 'self' https://fonts.gstatic.com",
      "connect-src 'self' https://api.dodopayments.com",
      "frame-ancestors 'none'",
    ].join('; '),
    
    // Strict Transport Security (HTTPS only)
    ...(process.env.NODE_ENV === 'production' && {
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    }),
  };
}

// Session security configuration
export const sessionSecurityConfig = {
  // Session cookie settings
  cookie: {
    name: 'benefitiary-session',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: '/',
  },
  
  // Session rotation settings
  rotateSessionOnAuth: true,
  maxSessionAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  sessionUpdateInterval: 24 * 60 * 60 * 1000, // Update session daily
};