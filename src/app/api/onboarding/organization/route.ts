import { NextRequest, NextResponse } from 'next/server';
import { organizationSchema } from '@/lib/validations/onboarding';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { 
  sanitizedOrganizationSchema, 
  validateRequestSize, 
  validateUserAgent 
} from '@/lib/security/input-sanitization';
import { onboardingRateLimit, createRateLimitResponse } from '@/lib/security/rate-limiting';
import { validateRequestOrigin, getSecurityHeaders } from '@/lib/security/csrf-protection';
import { encryptOrganizationData, maskSensitiveData } from '@/lib/security/encryption';

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
    if (!validateRequestSize(body, 10)) {
      return NextResponse.json(
        { error: 'Request too large', code: 'VALIDATION_ERROR' },
        { status: 413 }
      );
    }
    
    // Security: Enhanced validation with sanitization
    const validationResult = sanitizedOrganizationSchema.safeParse(body);
    
    if (!validationResult.success) {
      console.warn('Organization validation failed:', maskSensitiveData({
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

    const { name, orgType, size, country, region } = validationResult.data;

    // Security: Encrypt sensitive organization data
    const encryptedData = await encryptOrganizationData({
      name,
      country,
      region: region || undefined,
    });

    // Check if organization already exists for this user
    const existingOrg = await prisma.organization.findFirst({
      where: { userId: session.user.id }
    });

    let organization;
    
    if (existingOrg) {
      // Update existing organization
      organization = await prisma.organization.update({
        where: { id: existingOrg.id },
        data: {
          name: encryptedData.name,
          orgType: mapOrgTypeToEnum(orgType) as any,
          size: mapSizeToEnum(size) as any,
          country: encryptedData.country,
          region: encryptedData.region || null,
          updatedAt: new Date(),
        }
      });
    } else {
      // Create new organization
      organization = await prisma.organization.create({
        data: {
          userId: session.user.id,
          name: encryptedData.name,
          orgType: mapOrgTypeToEnum(orgType) as any,
          size: mapSizeToEnum(size) as any,
          country: encryptedData.country,
          region: encryptedData.region || null,
        }
      });
    }

    // Log successful operation (with masked data)
    console.info('Organization created/updated:', maskSensitiveData({
      userId: session.user.id,
      organizationId: organization.id,
      orgType,
      size,
    }));

    const { headers: rateLimitHeaders } = createRateLimitResponse(rateLimitResult);

    return NextResponse.json({
      success: true,
      organization: {
        id: organization.id,
        name, // Return original unencrypted name for UI
        orgType,
        size,
        country,
        region: region || null,
      }
    }, {
      headers: {
        ...getSecurityHeaders(),
        ...rateLimitHeaders,
      }
    });

  } catch (error) {
    console.error('Organization creation error:', maskSensitiveData(error));
    return NextResponse.json(
      { error: 'Internal server error', code: 'DATABASE_ERROR' },
      { status: 500, headers: getSecurityHeaders() }
    );
  }
}

// Helper functions to map form values to database enum values
function mapOrgTypeToEnum(orgType: string): string {
  const mapping: Record<string, string> = {
    'SME': 'SME',
    'Nonprofit': 'NONPROFIT',
    'Academic': 'ACADEMIC',
    'Healthcare': 'HEALTHCARE',
    'Other': 'OTHER'
  };
  return mapping[orgType] || 'OTHER';
}

function mapSizeToEnum(size: string): string {
  const mapping: Record<string, string> = {
    'Solo': 'SOLO',
    'Micro': 'MICRO',
    'Small': 'SMALL',
    'Medium': 'MEDIUM',
    'Large': 'LARGE'
  };
  return mapping[size] || 'SMALL';
}