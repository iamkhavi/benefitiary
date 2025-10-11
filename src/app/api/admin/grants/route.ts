import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { user } = await requireAdmin();

    // Get all grants with funder information
    const grants = await prisma.grant.findMany({
      include: {
        funder: {
          select: {
            name: true,
            type: true,
            website: true
          }
        },
        _count: {
          select: {
            matches: true,
            submissions: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Transform data for frontend
    const transformedGrants = grants.map(grant => ({
      id: grant.id,
      title: grant.title,
      description: grant.description,
      funder: grant.funder?.name || 'Unknown Funder',
      category: grant.category,
      fundingAmountMin: grant.fundingAmountMin,
      fundingAmountMax: grant.fundingAmountMax,
      deadline: grant.deadline,
      status: grant.status || 'active',
      source: grant.scrapedFrom ? 'scraped' : 'manual',
      applications: grant._count.submissions,
      matches: grant._count.matches,
      createdAt: grant.createdAt,
      updatedAt: grant.updatedAt
    }));

    return NextResponse.json({
      success: true,
      grants: transformedGrants,
      total: grants.length
    });

  } catch (error) {
    console.error('Error fetching grants:', error);
    return NextResponse.json(
      { error: 'Failed to fetch grants' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user } = await requireAdmin();
    const data = await request.json();

    // Create or find funder
    let funder = null;
    if (data.funderName) {
      // First try to find existing funder
      funder = await prisma.funder.findFirst({
        where: { name: data.funderName }
      });

      // If not found, create new funder
      if (!funder) {
        funder = await prisma.funder.create({
          data: {
            name: data.funderName,
            type: data.funderType || 'PRIVATE_FOUNDATION',
            website: data.funderWebsite,
            contactEmail: data.funderContactEmail
          }
        });
      }
    }

    // Create grant
    const grant = await prisma.grant.create({
      data: {
        title: data.title,
        description: data.description,
        eligibilityCriteria: data.eligibilityCriteria,
        deadline: data.deadline ? new Date(data.deadline) : null,
        fundingAmountMin: data.fundingAmountMin ? parseFloat(data.fundingAmountMin) : null,
        fundingAmountMax: data.fundingAmountMax ? parseFloat(data.fundingAmountMax) : null,
        source: data.source,
        category: data.category,
        locationEligibility: data.locationEligibility ? data.locationEligibility.split(',').map((s: string) => s.trim()) : undefined,
        applicationMethod: data.applicationMethod,
        applicationUrl: data.applicationUrl,
        requiredDocuments: data.requiredDocuments ? data.requiredDocuments.split(',').map((s: string) => s.trim()) : undefined,
        contactEmail: data.contactEmail,
        fundingCycle: data.fundingCycle,
        regionFocus: data.regionFocus,
        funderId: funder?.id,
        status: 'ACTIVE',
        scrapedFrom: null // This is a manual entry
      }
    });

    return NextResponse.json({
      success: true,
      grant: {
        id: grant.id,
        title: grant.title,
        funder: funder?.name || 'Unknown Funder'
      }
    });

  } catch (error) {
    console.error('Error creating grant:', error);
    return NextResponse.json(
      { error: 'Failed to create grant' },
      { status: 500 }
    );
  }
}