import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const preferences = await prisma.userPreferences.findUnique({
      where: { userId: session.user.id }
    });

    if (!preferences) {
      return NextResponse.json({ error: "Preferences not found" }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true,
      preferences
    });
  } catch (error) {
    console.error("Preferences fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch preferences" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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