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
    const { name, website, orgType, orgSize, industries, country, grantSizeRange, fundingNeeds } = body;

    // Validate required fields
    if (!name || !orgType || !orgSize || !industries || industries.length === 0 || !country) {
      return NextResponse.json(
        { error: "Missing required fields: name, orgType, orgSize, industries, and country are required" },
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
        orgSize: orgSize as any,
        industries: industries as any,
        country,
        grantSizeRange: grantSizeRange as any || null,
        fundingNeeds: fundingNeeds as any || [],
      },
      create: {
        userId: session.user.id,
        name,
        website: website || null,
        orgType: orgType as any,
        orgSize: orgSize as any,
        industries: industries as any,
        country,
        grantSizeRange: grantSizeRange as any || null,
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