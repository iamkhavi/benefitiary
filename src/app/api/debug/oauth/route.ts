import { NextResponse } from "next/server";

export async function GET() {
  const baseURL = process.env.BETTER_AUTH_URL || 'http://localhost:3000';
  
  return NextResponse.json({
    expectedCallbackURL: `${baseURL}/api/auth/callback/google`,
    currentBaseURL: baseURL,
    googleClientId: process.env.GOOGLE_CLIENT_ID?.substring(0, 20) + "...",
    instructions: {
      googleConsole: "In Google Cloud Console, add this as an authorized redirect URI:",
      redirectURI: `${baseURL}/api/auth/callback/google`,
      authorizedOrigins: [baseURL]
    }
  });
}