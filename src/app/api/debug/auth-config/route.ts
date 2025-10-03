import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    // Only allow this in development or with proper auth
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: "Not available in production" }, { status: 403 });
    }

    const config = {
      hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
      hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
      hasAuthSecret: !!process.env.BETTER_AUTH_SECRET,
      baseURL: process.env.BETTER_AUTH_URL,
      nodeEnv: process.env.NODE_ENV,
      googleClientIdLength: process.env.GOOGLE_CLIENT_ID?.length || 0,
      googleClientSecretLength: process.env.GOOGLE_CLIENT_SECRET?.length || 0,
    };

    return NextResponse.json(config);
  } catch (error) {
    console.error("Auth config debug error:", error);
    return NextResponse.json(
      { error: "Failed to get auth config" },
      { status: 500 }
    );
  }
}