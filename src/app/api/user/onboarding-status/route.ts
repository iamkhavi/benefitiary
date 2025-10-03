import { NextRequest, NextResponse } from "next/server";
import { authClient } from "@/lib/auth-client";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const sessionResult = await authClient.getSession();

    if (!sessionResult?.data?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = sessionResult.data;

    // Check if user has completed onboarding by looking at database
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        onboardingCompleted: true,
      }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const needsOnboarding = !user.onboardingCompleted;

    return NextResponse.json({
      needsOnboarding,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    });
  } catch (error) {
    console.error("Onboarding status check error:", error);
    return NextResponse.json(
      { error: "Failed to check onboarding status" },
      { status: 500 }
    );
  }
}