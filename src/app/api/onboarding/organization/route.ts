import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, website, orgType, industries, country, grantSizeMin, grantSizeMax, fundingNeeds } = body;

    // Validate required fields
    if (!name || !orgType || !industries || industries.length === 0 || !country) {
      return NextResponse.json(
        { error: "Missing required fields: name, orgType, industries, and country are required" },
        { status: 400 }
      );
    }

    // Save organization data to database
    await prisma.organization.upsert({
      where: { userId: session.user.id },
      update: {
        name,
        website: website || null,
        orgType: orgType as any,
        industries: industries as any,
        country,
        grantSizeMin: grantSizeMin || null,
        grantSizeMax: grantSizeMax || null,
        fundingNeeds: fundingNeeds as any || [],
      },
      create: {
        userId: session.user.id,
        name,
        website: website || null,
        orgType: orgType as any,
        industries: industries as any,
        country,
        grantSizeMin: grantSizeMin || null,
        grantSizeMax: grantSizeMax || null,
        fundingNeeds: fundingNeeds as any || [],
      }
    });

    // Mark onboarding as completed
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        onboardingCompleted: true,
      }
    });

    return NextResponse.json({ 
      success: true,
      message: "Organization data saved successfully" 
    });
  } catch (error) {
    console.error("Organization save error:", error);
    return NextResponse.json(
      { error: "Failed to save organization data" },
      { status: 500 }
    );
  }
}