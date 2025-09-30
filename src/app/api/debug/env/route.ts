import { NextResponse } from "next/server";

export async function GET() {
  // Only allow in development or with a debug key
  if (process.env.NODE_ENV === 'production' && !process.env.DEBUG_KEY) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  return NextResponse.json({
    nodeEnv: process.env.NODE_ENV,
    hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
    hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
    hasAuthSecret: !!process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL,
    googleClientIdPrefix: process.env.GOOGLE_CLIENT_ID?.substring(0, 10) + "...",
  });
}