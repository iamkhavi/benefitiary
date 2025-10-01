import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { NextRequest, NextResponse } from "next/server";

const handlers = toNextJsHandler(auth);

export async function GET(request: NextRequest) {
  try {
    return await handlers.GET(request);
  } catch (error) {
    console.error("BetterAuth GET Error:", error);
    return NextResponse.json(
      { error: "Authentication error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Debug logging for origin issues
    const origin = request.headers.get('origin');
    const referer = request.headers.get('referer');
    const host = request.headers.get('host');
    
    console.log('BetterAuth POST Debug:', {
      origin,
      referer,
      host,
      url: request.url,
      pathname: request.nextUrl.pathname
    });
    
    return await handlers.POST(request);
  } catch (error) {
    console.error("BetterAuth POST Error:", error);
    return NextResponse.json(
      { error: "Authentication error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}