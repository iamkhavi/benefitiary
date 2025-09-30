import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { preferencesSchema } from '@/lib/validations/onboarding';
import { 
  sanitizedPreferencesSchema, 
  validateRequestSize, 
  validateUserAgent 
} from '@/lib/security/input-sanitization';
import { onboardingRateLimit, createRateLimitResponse } from '@/lib/security/rate-limiting';
import { validateRequestOrigin, getSecurityHeaders } from '@/lib/security/csrf-protection';
import { maskSensitiveData } from '@/lib/security/encryption';

export async function POST(request: NextRequest) {
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

    // Get the current session
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: getSecurityHeaders() }
      );
    }

    // Parse and validate the request body
    const body = await request.json();
    
    // Security: Validate request size
    if (!validateRequestSize(body, 5)) {
      return NextResponse.json(
        { error: 'Request too large', code: 'VALIDATION_ERROR' },
        { status: 413 }
      );
    }
    
    // Security: Enhanced validation with sanitization
    const validationResult = sanitizedPreferencesSchema.safeParse(body);
    
    if (!validationResult.success) {
      console.warn('Preferences validation failed:', maskSensitiveData({
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
    
    const validatedData = validationResult.data;

    // Check if user preferences already exist
    const existingPreferences = await prisma.userPreferences.findUnique({
      where: { userId: session.user.id },
    });

    let preferences;
    if (existingPreferences) {
      // Update existing preferences
      preferences = await prisma.userPreferences.update({
        where: { userId: session.user.id },
        data: {
          categories: validatedData.categories,
          updatedAt: new Date(),
        },
      });
    } else {
      // Create new preferences
      preferences = await prisma.userPreferences.create({
        data: {
          userId: session.user.id,
          categories: validatedData.categories,
        },
      });
    }

    // Mark onboarding as completed
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        onboardingCompleted: true,
        onboardingStep: 3,
      },
    });

    // Log successful operation
    console.info('User preferences saved:', maskSensitiveData({
      userId: session.user.id,
      categoriesCount: preferences.categories.length,
    }));

    const { headers: rateLimitHeaders } = createRateLimitResponse(rateLimitResult);

    return NextResponse.json({
      success: true,
      preferences: {
        id: preferences.id,
        categories: preferences.categories,
      },
    }, {
      headers: {
        ...getSecurityHeaders(),
        ...rateLimitHeaders,
      }
    });
  } catch (error) {
    console.error('Error saving preferences:', maskSensitiveData(error));

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid data provided', details: error.message },
        { status: 400, headers: getSecurityHeaders() }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: getSecurityHeaders() }
    );
  }
}