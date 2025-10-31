import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUserWithRole } from '@/lib/auth-helpers';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUserWithRole();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const organization = await prisma.organization.findUnique({
      where: { userId: user.id }
    });

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      organization
    });

  } catch (error) {
    console.error('❌ Error fetching business details:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch business details',
        details: error instanceof Error ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUserWithRole();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, website, orgType, orgSize, industries, country, grantSizeRange, fundingNeeds } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: 'Organization name is required' },
        { status: 400 }
      );
    }

    // Update organization
    const updatedOrganization = await prisma.organization.update({
      where: { userId: user.id },
      data: {
        name: name.trim(),
        website: website?.trim() || null,
        orgType: orgType || undefined,
        orgSize: orgSize || undefined,
        industries: industries || undefined,
        country: country || undefined,
        grantSizeRange: grantSizeRange || undefined,
        fundingNeeds: fundingNeeds || undefined,
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Business details updated successfully',
      organization: updatedOrganization
    });

  } catch (error) {
    console.error('❌ Error updating business details:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update business details',
        details: error instanceof Error ? error.message : undefined
      },
      { status: 500 }
    );
  }
}