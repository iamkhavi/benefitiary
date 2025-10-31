import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUserWithRole } from '@/lib/auth-helpers';
import { GrantCategory } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUserWithRole();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const minMatch = parseInt(searchParams.get('minMatch') || '70');
    const search = searchParams.get('search');

    // Get user profile data for matching
    const [userPreferences, organization] = await Promise.all([
      prisma.userPreferences.findUnique({
        where: { userId: user.id }
      }),
      prisma.organization.findUnique({
        where: { userId: user.id }
      })
    ]);

    console.log('🔍 User preferences:', userPreferences);
    console.log('🔍 Organization data:', organization);

    const skip = (page - 1) * limit;

    // Build where clause for grants
    const where: any = {
      status: 'ACTIVE',
      OR: [
        {
          deadline: {
            gte: new Date() // Future deadlines
          }
        },
        {
          deadline: null // No deadline specified
        }
      ]
    };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { funder: { name: { contains: search, mode: 'insensitive' } } }
      ];
    }

    // Filter by user preferences if available
    if (userPreferences?.categories && userPreferences.categories.length > 0) {
      where.category = {
        in: userPreferences.categories
      };
    }

    // Filter by funding range if specified
    if (userPreferences?.preferredFundingMin || userPreferences?.preferredFundingMax) {
      where.AND = [];
      
      if (userPreferences.preferredFundingMin) {
        where.AND.push({
          OR: [
            { fundingAmountMax: { gte: userPreferences.preferredFundingMin } },
            { fundingAmountMax: null }
          ]
        });
      }
      
      if (userPreferences.preferredFundingMax) {
        where.AND.push({
          OR: [
            { fundingAmountMin: { lte: userPreferences.preferredFundingMax } },
            { fundingAmountMin: null }
          ]
        });
      }
    }

    // Exclude funders that user has marked to exclude
    if (userPreferences?.excludedFunders && userPreferences.excludedFunders.length > 0) {
      where.funder = {
        name: {
          notIn: userPreferences.excludedFunders
        }
      };
    }

    const [grants, total] = await Promise.all([
      prisma.grant.findMany({
        where,
        include: {
          funder: {
            select: {
              id: true,
              name: true,
              logoUrl: true,
              type: true,
              website: true
            }
          }
        },
        orderBy: [
          { deadline: 'asc' },
          { createdAt: 'desc' }
        ],
        skip,
        take: limit
      }),
      prisma.grant.count({ where })
    ]);

    // Calculate match scores and transform grants
    const matches = await Promise.all(grants.map(async (grant) => {
      const matchScore = calculateMatchScore(grant, userPreferences, organization);
      
      // Only include grants that meet minimum match threshold
      if (matchScore < minMatch) {
        return null;
      }

      // Check if user has saved this grant
      const savedMatch = await prisma.grantMatch.findFirst({
        where: {
          userId: user.id,
          grantId: grant.id,
          status: 'SAVED'
        }
      });

      const daysLeft = grant.deadline 
        ? Math.ceil((grant.deadline.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
        : null;

      // Skip grants that have already expired
      if (daysLeft !== null && daysLeft < 0) {
        return null;
      }

      return {
        id: grant.id,
        title: grant.title,
        funder: grant.funder?.name || 'Unknown Funder',
        amount: grant.fundingAmountMin && grant.fundingAmountMax 
          ? `$${grant.fundingAmountMin.toLocaleString()} - $${grant.fundingAmountMax.toLocaleString()}`
          : grant.fundingAmountMin 
          ? `Up to $${grant.fundingAmountMin.toLocaleString()}`
          : 'Amount not specified',
        deadline: grant.deadline 
          ? new Date(grant.deadline).toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'short', 
              day: 'numeric' 
            })
          : 'No deadline',
        location: Array.isArray(grant.locationEligibility) 
          ? grant.locationEligibility.slice(0, 2).join(', ') + (grant.locationEligibility.length > 2 ? '...' : '')
          : grant.locationEligibility || 'Global',
        category: grant.category,
        match: matchScore,
        reasons: getMatchReasons(grant, userPreferences, organization),
        description: grant.description || 'No description available',
        saved: !!savedMatch,
        daysLeft
      };
    }));

    // Filter out null matches and sort by match score
    const validMatches = matches
      .filter(match => match !== null)
      .sort((a, b) => b!.match - a!.match);

    // Calculate match quality stats
    const stats = calculateMatchStats(validMatches);

    return NextResponse.json({
      success: true,
      matches: validMatches,
      stats,
      pagination: {
        page,
        limit,
        total: validMatches.length,
        pages: Math.ceil(validMatches.length / limit)
      }
    });

  } catch (error) {
    console.error('❌ Error fetching matches:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch matches',
        details: error instanceof Error ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

function calculateMatchScore(
  grant: any, 
  preferences: any, 
  organization: any
): number {
  let score = 0;

  // Category match (50% weight) - Most important factor
  if (preferences?.categories?.includes(grant.category)) {
    score += 50;
  } else {
    score += 15; // Some base score for any grant
  }

  // Organization type alignment (20% weight)
  if (organization?.orgType && grant.applicantType) {
    const typeMatch = checkOrgTypeAlignment(organization.orgType, grant.applicantType);
    score += typeMatch ? 20 : 5;
  } else {
    score += 10; // Neutral score
  }

  // Organization size match (15% weight)
  if (organization?.orgSize && grant.applicantType) {
    const sizeMatch = checkSizeAlignment(organization.orgSize, grant.applicantType);
    score += sizeMatch ? 15 : 5;
  } else {
    score += 10; // Neutral score
  }

  // Geographic eligibility (15% weight)
  if (organization?.country && grant.locationEligibility) {
    const geoMatch = checkGeographicMatch(organization.country, grant.locationEligibility);
    score += geoMatch ? 15 : 3;
  } else {
    score += 10; // Assume global eligibility
  }

  return Math.min(Math.round(score), 100);
}

function checkOrgTypeAlignment(orgType: string, grantApplicantType: string): boolean {
  if (!grantApplicantType) return true; // If no specific type required, all match
  
  const applicantTypeLower = grantApplicantType.toLowerCase();
  
  const typeMatches: Record<string, string[]> = {
    'SME': ['sme', 'small business', 'business', 'enterprise', 'startup'],
    'Nonprofit': ['ngo', 'nonprofit', 'non-profit', 'charity', 'foundation'],
    'Academic': ['academic', 'university', 'research', 'institution', 'school'],
    'Healthcare': ['healthcare', 'health', 'medical', 'hospital', 'clinic'],
    'Other': [] // Other matches everything
  };
  
  const matchTerms = typeMatches[orgType] || [];
  return matchTerms.some(term => applicantTypeLower.includes(term)) || orgType === 'Other';
}

function checkSizeAlignment(orgSize: string, applicantType: string): boolean {
  if (!applicantType) return true; // If no size requirement, all match
  
  const applicantTypeLower = applicantType.toLowerCase();
  
  const sizeMatches: Record<string, string[]> = {
    'Solo': ['solo', 'individual', 'freelancer'],
    'Micro': ['micro', 'small', 'sme', 'startup'],
    'Small': ['small', 'sme', 'medium'],
    'Medium': ['medium', 'large'],
    'Large': ['large', 'enterprise', 'corporation']
  };
  
  const matchTerms = sizeMatches[orgSize] || [];
  return matchTerms.some(term => applicantTypeLower.includes(term));
}



function checkGeographicMatch(userCountry: string, grantEligibility: any): boolean {
  if (!grantEligibility) return true; // Assume global if not specified
  
  if (typeof grantEligibility === 'string') {
    return grantEligibility.toLowerCase().includes(userCountry.toLowerCase()) ||
           grantEligibility.toLowerCase().includes('global') ||
           grantEligibility.toLowerCase().includes('worldwide');
  }
  
  if (Array.isArray(grantEligibility)) {
    return grantEligibility.some(location => 
      location.toLowerCase().includes(userCountry.toLowerCase()) ||
      location.toLowerCase().includes('global') ||
      location.toLowerCase().includes('worldwide')
    );
  }
  
  return true;
}

function getMatchReasons(grant: any, preferences: any, organization: any): string[] {
  const reasons: string[] = [];
  
  if (preferences?.categories?.includes(grant.category)) {
    reasons.push('Category match');
  }
  
  if (organization?.orgType) {
    const typeMatch = checkOrgTypeAlignment(organization.orgType, grant.applicantType);
    if (typeMatch) {
      reasons.push('Organization type fit');
    }
  }
  
  if (organization?.orgSize) {
    const sizeMatch = checkSizeAlignment(organization.orgSize, grant.applicantType);
    if (sizeMatch) {
      reasons.push('Organization size fit');
    }
  }
  
  if (organization?.country && grant.locationEligibility) {
    const geoMatch = checkGeographicMatch(organization.country, grant.locationEligibility);
    if (geoMatch) {
      reasons.push('Geographic eligibility');
    }
  }
  
  // Add funding amount as a reason if it's in a reasonable range
  if (grant.fundingAmountMin && grant.fundingAmountMax) {
    if (grant.fundingAmountMin <= 100000) {
      reasons.push('Accessible funding range');
    }
  }
  
  return reasons.length > 0 ? reasons : ['General eligibility'];
}

function calculateMatchStats(matches: any[]) {
  const perfectMatches = matches.filter(m => m.match >= 90).length;
  const goodMatches = matches.filter(m => m.match >= 70 && m.match < 90).length;
  const savedMatches = matches.filter(m => m.saved).length;
  
  return {
    perfectMatches,
    goodMatches,
    savedMatches
  };
}