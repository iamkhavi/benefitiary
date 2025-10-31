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
    console.log('🚀 Creating new grant via API...');
    const { user } = await requireAdmin();
    const data = await request.json();
    
    console.log('📝 Received grant data:', {
      title: data.title,
      funderName: data.funderName,
      category: data.category,
      fundingAmountMin: data.fundingAmountMin,
      fundingAmountMax: data.fundingAmountMax
    });

    // Validate required fields
    if (!data.title?.trim()) {
      return NextResponse.json(
        { error: 'Grant title is required' },
        { status: 400 }
      );
    }

    if (!data.category) {
      return NextResponse.json(
        { error: 'Grant category is required' },
        { status: 400 }
      );
    }

    // Create or find funder
    let funder = null;
    if (data.funderName?.trim()) {
      console.log('🔍 Looking for existing funder:', data.funderName);
      
      // First try to find existing funder (case insensitive)
      funder = await prisma.funder.findFirst({
        where: { 
          name: { 
            equals: data.funderName.trim(), 
            mode: 'insensitive' 
          } 
        }
      });

      // If not found, create new funder
      if (!funder) {
        console.log('➕ Creating new funder:', data.funderName);
        funder = await prisma.funder.create({
          data: {
            name: data.funderName.trim(),
            type: data.funderType || 'PRIVATE_FOUNDATION',
            website: data.funderWebsite?.trim() || null,
            contactEmail: data.funderContactEmail?.trim() || null
          }
        });
        console.log('✅ Funder created:', funder.id);
      } else {
        console.log('✅ Found existing funder:', funder.id);
      }
    }

    // Prepare grant data with proper type conversions
    const grantData = {
      title: data.title.trim(),
      description: data.description?.trim() || null,
      eligibilityCriteria: data.eligibilityCriteria?.trim() || null,
      deadline: data.deadline ? new Date(data.deadline) : null,
      fundingAmountMin: data.fundingAmountMin ? Number(data.fundingAmountMin) : null,
      fundingAmountMax: data.fundingAmountMax ? Number(data.fundingAmountMax) : null,
      source: data.source?.trim() || 'Manual Entry',
      category: data.category,
      // Handle JSON fields properly
      locationEligibility: data.locationEligibility ? 
        (typeof data.locationEligibility === 'string' ? 
          data.locationEligibility.split(',').map((s: string) => s.trim()).filter(Boolean) :
          data.locationEligibility) : 
        null,
      applicationMethod: data.applicationMethod?.trim() || null,
      applicationUrl: data.applicationUrl?.trim() || null,
      requiredDocuments: data.requiredDocuments ? 
        (typeof data.requiredDocuments === 'string' ? 
          data.requiredDocuments.split(',').map((s: string) => s.trim()).filter(Boolean) :
          data.requiredDocuments) : 
        null,
      contactEmail: data.contactEmail?.trim() || null,
      fundingCycle: data.fundingCycle?.trim() || null,
      regionFocus: data.regionFocus?.trim() || null,
      funderId: funder?.id || null,
      status: 'ACTIVE',
      scrapedFrom: null, // This is a manual entry
      // Add additional fields that might be useful
      applicantType: data.applicantType?.trim() || null,
      fundingType: data.fundingType || 'GRANT',
      durationMonths: data.durationMonths ? Number(data.durationMonths) : null,
      // PRESERVE ORIGINAL RAW CONTENT
      rawContent: data.rawContent?.trim() || null,
      contentSource: data.contentSource?.trim() || null,
      originalFileName: data.originalFileName?.trim() || null
    };

    console.log('💾 Creating grant with data:', grantData);

    // Create grant
    const grant = await prisma.grant.create({
      data: grantData,
      include: {
        funder: {
          select: {
            id: true,
            name: true,
            type: true
          }
        }
      }
    });

    console.log('✅ Grant created successfully:', grant.id);

    return NextResponse.json({
      success: true,
      grant: {
        id: grant.id,
        title: grant.title,
        funder: grant.funder?.name || 'Unknown Funder',
        category: grant.category,
        fundingAmountMin: grant.fundingAmountMin,
        fundingAmountMax: grant.fundingAmountMax,
        deadline: grant.deadline,
        createdAt: grant.createdAt
      }
    });

  } catch (error) {
    console.error('❌ Error creating grant:', error);
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('Unique constraint')) {
        return NextResponse.json(
          { error: 'A grant with this title already exists' },
          { status: 409 }
        );
      }
      if (error.message.includes('Invalid enum value')) {
        return NextResponse.json(
          { error: 'Invalid category value provided' },
          { status: 400 }
        );
      }
      if (error.message.includes('Foreign key constraint')) {
        return NextResponse.json(
          { error: 'Invalid funder reference' },
          { status: 400 }
        );
      }
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to create grant',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}