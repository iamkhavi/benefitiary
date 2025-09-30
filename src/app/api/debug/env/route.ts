import { NextResponse } from "next/server";

export async function GET() {
  // Temporarily allow in production for debugging OAuth issues
  // TODO: Remove this after fixing OAuth

  return NextResponse.json({
    nodeEnv: process.env.NODE_ENV,
    hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
    hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
    hasAuthSecret: !!process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL,
    googleClientIdPrefix: process.env.GOOGLE_CLIENT_ID?.substring(0, 10) + "...",
  });
}