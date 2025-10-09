import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Organization API: Starting request processing');
    
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      console.log('❌ Organization API: No session found');
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log('✅ Organization API: User authenticated:', session.user.id);

    const body = await request.json();
    console.log('📝 Organization API: Request body:', JSON.stringify(body, null, 2));
    
    const { name, website, orgType, orgSize, industries, country, grantSizeRange, fundingNeeds } = body;

    // Validate required fields
    if (!name || !orgType || !orgSize || !industries || industries.length === 0 || !country) {
      console.log('❌ Organization API: Missing required fields');
      return NextResponse.json(
        { error: "Missing required fields: name, orgType, orgSize, industries, and country are required" },
        { status: 400 }
      );
    }

    // Map frontend values to database enum values
    const grantSizeRangeMapping: Record<string, string> = {
      'UNDER_10K': 'UNDER_10K',
      '10K_25K': 'TEN_TO_50K',
      '25K_50K': 'TEN_TO_50K',
      'TEN_TO_50K': 'TEN_TO_50K',
      'FIFTY_TO_100K': 'FIFTY_TO_100K',
      'HUNDRED_TO_500K': 'HUNDRED_TO_500K',
      'FIVE_HUNDRED_K_TO_1M': 'FIVE_HUNDRED_K_TO_1M',
      'OVER_1M': 'OVER_1M'
    };

    const mappedGrantSizeRange = grantSizeRange ? grantSizeRangeMapping[grantSizeRange] || grantSizeRange : null;
    
    console.log('✅ Organization API: Validation passed, saving to database');
    console.log('📝 Organization API: Mapped grantSizeRange:', grantSizeRange, '->', mappedGrantSizeRange);

    // Save organization data to database
    const organization = await prisma.organization.upsert({
      where: { userId: session.user.id },
      update: {
        name,
        website: website || null,
        orgType,
        orgSize,
        industries,
        country,
        grantSizeRange: mappedGrantSizeRange,
        fundingNeeds: fundingNeeds || [],
      },
      create: {
        userId: session.user.id,
        name,
        website: website || null,
        orgType,
        orgSize,
        industries,
        country,
        grantSizeRange: mappedGrantSizeRange,
        fundingNeeds: fundingNeeds || [],
      }
    });

    console.log('✅ Organization API: Organization saved:', organization.id);

    // Mark onboarding as completed
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        onboardingCompleted: true,
      }
    });

    console.log('✅ Organization API: Onboarding marked as completed');

    return NextResponse.json({ 
      success: true,
      message: "Organization data saved successfully",
      organizationId: organization.id
    });
  } catch (error) {
    console.error("❌ Organization save error:", error);
    
    // More detailed error logging
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    
    return NextResponse.json(
      { 
        error: "Failed to save organization data",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}