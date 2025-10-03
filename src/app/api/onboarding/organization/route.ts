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
    const { name, orgType, size, position, country, website, region } = body;

    // Validate required fields
    if (!name || !orgType || !size || !position || !country) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Save organization data to database
    await prisma.organization.upsert({
      where: { userId: session.user.id },
      update: {
        name,
        orgType: orgType as any,
        size: size as any,
        position: position as any,
        country,
        website: website || null,
        region: region || null,
      },
      create: {
        userId: session.user.id,
        name,
        orgType: orgType as any,
        size: size as any,
        position: position as any,
        country,
        website: website || null,
        region: region || null,
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