import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Check if user exists in database
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        name: true,
        onboardingCompleted: true,
      }
    });

    if (existingUser) {
      return NextResponse.json({
        exists: true,
        user: {
          email: existingUser.email,
          name: existingUser.name,
          onboardingCompleted: existingUser.onboardingCompleted
        }
      });
    }

    return NextResponse.json({ exists: false });
  } catch (error) {
    console.error("Email check error:", error);
    return NextResponse.json(
      { error: "Failed to check email" },
      { status: 500 }
    );
  }
}