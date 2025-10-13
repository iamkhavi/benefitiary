import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { grantId: string } }
) {
  try {
    const { user } = await requireAdmin();
    const { grantId } = params;

    const grant = await prisma.grant.findUnique({
      where: { id: grantId },
      include: {
        funder: {
          select: {
            name: true,
            type: true,
            website: true,
            contactEmail: true
          }
        },
        _count: {
          select: {
            matches: true,
            submissions: true
          }
        }
      }
    });

    if (!grant) {
      return NextResponse.json(
        { error: 'Grant not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      grant: {
        id: grant.id,
        title: grant.title,
        description: grant.description,
        eligibilityCriteria: grant.eligibilityCriteria,
        deadline: grant.deadline,
        fundingAmountMin: grant.fundingAmountMin,
        fundingAmountMax: grant.fundingAmountMax,
        applicationUrl: grant.applicationUrl,
        contactEmail: grant.contactEmail,
        category: grant.category,
        status: grant.status,
        locationEligibility: grant.locationEligibility,
        requiredDocuments: grant.requiredDocuments,
        funder: grant.funder,
        applications: grant._count.submissions,
        matches: grant._count.matches,
        createdAt: grant.createdAt,
        updatedAt: grant.updatedAt
      }
    });

  } catch (error) {
    console.error('Error fetching grant:', error);
    return NextResponse.json(
      { error: 'Failed to fetch grant' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { grantId: string } }
) {
  try {
    const { user } = await requireAdmin();
    const { grantId } = params;

    // Check if grant exists
    const existingGrant = await prisma.grant.findUnique({
      where: { id: grantId },
      select: { id: true, title: true }
    });

    if (!existingGrant) {
      return NextResponse.json(
        { error: 'Grant not found' },
        { status: 404 }
      );
    }

    // Delete the grant (this will cascade delete related records due to foreign key constraints)
    await prisma.grant.delete({
      where: { id: grantId }
    });

    console.log(`✅ Grant deleted: ${existingGrant.title} (ID: ${grantId})`);

    return NextResponse.json({
      success: true,
      message: `Grant "${existingGrant.title}" deleted successfully`
    });

  } catch (error) {
    console.error('Error deleting grant:', error);
    return NextResponse.json(
      { error: 'Failed to delete grant' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { grantId: string } }
) {
  try {
    const { user } = await requireAdmin();
    const { grantId } = params;
    const data = await request.json();

    // Check if grant exists
    const existingGrant = await prisma.grant.findUnique({
      where: { id: grantId }
    });

    if (!existingGrant) {
      return NextResponse.json(
        { error: 'Grant not found' },
        { status: 404 }
      );
    }

    // Handle funder update if provided
    let funderId = existingGrant.funderId;
    if (data.funderName && data.funderName !== existingGrant.funderId) {
      // Find or create funder
      let funder = await prisma.funder.findFirst({
        where: { name: data.funderName }
      });

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
      funderId = funder.id;
    }

    // Update grant
    const updatedGrant = await prisma.grant.update({
      where: { id: grantId },
      data: {
        title: data.title,
        description: data.description,
        eligibilityCriteria: data.eligibilityCriteria,
        deadline: data.deadline ? new Date(data.deadline) : null,
        fundingAmountMin: data.fundingAmountMin ? parseFloat(data.fundingAmountMin) : null,
        fundingAmountMax: data.fundingAmountMax ? parseFloat(data.fundingAmountMax) : null,
        applicationUrl: data.applicationUrl,
        contactEmail: data.contactEmail,
        category: data.category,
        locationEligibility: data.locationEligibility,
        requiredDocuments: data.requiredDocuments,
        funderId: funderId,
        updatedAt: new Date()
      },
      include: {
        funder: {
          select: {
            name: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      grant: {
        id: updatedGrant.id,
        title: updatedGrant.title,
        funder: updatedGrant.funder?.name || 'Unknown Funder'
      }
    });

  } catch (error) {
    console.error('Error updating grant:', error);
    return NextResponse.json(
      { error: 'Failed to update grant' },
      { status: 500 }
    );
  }
}