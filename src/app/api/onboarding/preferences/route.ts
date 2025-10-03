import { NextRequest, NextResponse } from "next/server";
import { authClient } from "@/lib/auth-client";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const sessionResult = await authClient.getSession();

    if (!sessionResult?.data?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = sessionResult.data;

    const body = await request.json();
    const { categories } = body;

    // Validate required fields
    if (!categories || !Array.isArray(categories)) {
      return NextResponse.json(
        { error: "Categories must be an array" },
        { status: 400 }
      );
    }

    // Save preferences and mark onboarding as completed
    await prisma.userPreferences.upsert({
      where: { userId: session.user.id },
      update: {
        categories: categories as any,
      },
      create: {
        userId: session.user.id,
        categories: categories as any,
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
      message: "Preferences saved successfully" 
    });
  } catch (error) {
    console.error("Preferences save error:", error);
    return NextResponse.json(
      { error: "Failed to save preferences" },
      { status: 500 }
    );
  }
}