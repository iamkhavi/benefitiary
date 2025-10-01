import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if user has completed each onboarding step
    const [organization, userWithRole, preferences] = await Promise.all([
      // Check if user has an organization
      prisma.organization.findFirst({
        where: { userId: session.user.id }
      }),
      
      // Check if user has a role set (from the user table)
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true }
      }),
      
      // Check if user has preferences set
      prisma.userPreferences.findFirst({
        where: { userId: session.user.id }
      })
    ]);

    const hasOrganization = !!organization;
    const hasRole = !!(userWithRole?.role && userWithRole.role !== 'SEEKER'); // Default role is SEEKER
    const hasPreferences = !!preferences;
    
    const isOnboardingComplete = hasOrganization && hasRole && hasPreferences;

    const onboardingStatus = {
      hasOrganization,
      hasRole,
      hasPreferences,
      isComplete: isOnboardingComplete,
      nextStep: !hasOrganization 
        ? '/onboarding/organization'
        : !hasRole 
        ? '/onboarding/role'
        : !hasPreferences 
        ? '/onboarding/preferences'
        : '/dashboard'
    };

    return NextResponse.json(onboardingStatus);
  } catch (error) {
    console.error("Error checking onboarding status:", error);
    return NextResponse.json(
      { error: "Failed to check onboarding status" },
      { status: 500 }
    );
  }
}