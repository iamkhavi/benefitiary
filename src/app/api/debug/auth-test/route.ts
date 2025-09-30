import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { action, email, password, name } = await request.json();

    if (action === "signup") {
      // Test signup
      const result = await auth.api.signUpEmail({
        body: {
          email,
          password,
          name,
        },
      });

      return NextResponse.json({
        success: true,
        action: "signup",
        result: result ? "User created successfully" : "Signup failed",
      });
    }

    if (action === "signin") {
      // Test signin
      const result = await auth.api.signInEmail({
        body: {
          email,
          password,
        },
      });

      return NextResponse.json({
        success: true,
        action: "signin",
        result: result ? "Login successful" : "Login failed",
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Auth test error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}