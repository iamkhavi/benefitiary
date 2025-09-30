import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { detectOrganizationFromEmail, suggestOrganizationSize, suggestCountryFromDomain } from "@/lib/utils/email-organization-detector";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Handle OAuth callback and create organization data based on email
 * This runs after successful OAuth authentication
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "No authenticated user found" }, { status: 401 });
    }

    // Check if user already has an organization
    const existingOrg = await prisma.organization.findFirst({
      where: { user_id: session.user.id }
    });

    if (existingOrg) {
      return NextResponse.json({ message: "Organization already exists" });
    }

    // Detect organization info from email
    const orgInfo = detectOrganizationFromEmail(session.user.email);
    const suggestedSize = suggestOrganizationSize(orgInfo.domain);
    const suggestedCountry = suggestCountryFromDomain(orgInfo.domain);

    // Create organization record with detected information
    const organization = await prisma.organization.create({
      data: {
        user_id: session.user.id,
        name: orgInfo.name,
        industry: orgInfo.type,
        size: suggestedSize,
        location: suggestedCountry,
      }
    });

    // Store the organization info in session or return it for the frontend
    return NextResponse.json({
      message: "Organization created successfully",
      organization: {
        id: organization.id,
        name: organization.name,
        industry: organization.industry,
        size: organization.size,
        location: organization.location,
        isWorkEmail: orgInfo.isWorkEmail,
        detectedFromEmail: true
      }
    });

  } catch (error) {
    console.error("OAuth callback error:", error);
    return NextResponse.json(
      { error: "Failed to process OAuth callback" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // Handle GET requests for OAuth callback URL
  return NextResponse.redirect(new URL("/onboarding/organization", request.url));
}