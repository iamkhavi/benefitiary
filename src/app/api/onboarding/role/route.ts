import { NextRequest, NextResponse } from 'next/server';
import { roleSchema } from '@/lib/validations/onboarding';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { 
  sanitizedRoleSchema, 
  validateRequestSize, 
  validateUserAgent 
} from '@/lib/security/input-sanitization';
import { onboardingRateLimit, createRateLimitResponse } from '@/lib/security/rate-limiting';
import { validateRequestOrigin, getSecurityHeaders } from '@/lib/security/csrf-protection';
import { maskSensitiveData } from '@/lib/security/encryption';

export async function PATCH(request: NextRequest) {
  try {
    // Security: Rate limiting
    const rateLimitResult = onboardingRateLimit(request);
    if (!rateLimitResult.success) {
      const { headers: rateLimitHeaders } = createRateLimitResponse(rateLimitResult);
      return NextResponse.json(
        { error: 'Too many requests', code: 'RATE_LIMIT_ERROR' },
        { status: 429, headers: rateLimitHeaders }
      );
    }

    // Security: Validate request origin (CSRF protection)
    if (!validateRequestOrigin(request)) {
      return NextResponse.json(
        { error: 'Invalid request origin', code: 'CSRF_ERROR' },
        { status: 403 }
      );
    }

    // Security: Validate User-Agent
    const userAgent = request.headers.get('user-agent') || '';
    if (!validateUserAgent(userAgent)) {
      return NextResponse.json(
        { error: 'Invalid request', code: 'SECURITY_ERROR' },
        { status: 400 }
      );
    }

    // Get the session from BetterAuth
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_ERROR' },
        { status: 401, headers: getSecurityHeaders() }
      );
    }

    const body = await request.json();
    
    // Security: Validate request size
    if (!validateRequestSize(body, 5)) {
      return NextResponse.json(
        { error: 'Request too large', code: 'VALIDATION_ERROR' },
        { status: 413 }
      );
    }
    
    // Security: Enhanced validation with sanitization
    const validationResult = sanitizedRoleSchema.safeParse(body);
    
    if (!validationResult.success) {
      console.warn('Role validation failed:', maskSensitiveData({
        userId: session.user.id,
        errors: validationResult.error.flatten().fieldErrors,
        userAgent,
      }));
      
      return NextResponse.json(
        {
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400, headers: getSecurityHeaders() }
      );
    }

    const { role } = validationResult.data;

    // Map form role to Prisma enum
    const roleMapping: Record<string, string> = {
      'seeker': 'SEEKER',
      'writer': 'WRITER',
      'funder': 'FUNDER'
    };

    // Update user role in the database
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        role: roleMapping[role] as any,
        updatedAt: new Date(),
      }
    });

    // Log successful operation
    console.info('User role updated:', maskSensitiveData({
      userId: session.user.id,
      newRole: role,
    }));

    const { headers: rateLimitHeaders } = createRateLimitResponse(rateLimitResult);

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        role: updatedUser.role,
      }
    }, {
      headers: {
        ...getSecurityHeaders(),
        ...rateLimitHeaders,
      }
    });

  } catch (error) {
    console.error('Role update error:', maskSensitiveData(error));
    return NextResponse.json(
      { error: 'Internal server error', code: 'DATABASE_ERROR' },
      { status: 500, headers: getSecurityHeaders() }
    );
  }
}