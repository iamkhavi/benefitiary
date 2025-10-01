import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { NextRequest, NextResponse } from "next/server";

const handlers = toNextJsHandler(auth);

// Handle CORS for auth requests
function handleCors(request: NextRequest, response: Response): Response {
  const origin = request.headers.get('origin');
  const allowedOrigins = [
    'https://app.benefitiary.com',
    'https://benefitiary.com',
    ...(process.env.NODE_ENV !== 'production' ? ['http://localhost:3000'] : [])
  ];
  
  // Create a new response with CORS headers
  const corsResponse = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: new Headers(response.headers)
  });
  
  if (origin && allowedOrigins.includes(origin)) {
    corsResponse.headers.set('Access-Control-Allow-Origin', origin);
  }
  
  corsResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  corsResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  corsResponse.headers.set('Access-Control-Allow-Credentials', 'true');
  
  return corsResponse;
}

export async function OPTIONS(request: NextRequest) {
  const response = new Response(null, { status: 200 });
  return handleCors(request, response);
}

export async function GET(request: NextRequest) {
  try {
    const response = await handlers.GET(request);
    return handleCors(request, response);
  } catch (error) {
    console.error("BetterAuth GET Error:", error);
    const errorResponse = NextResponse.json(
      { error: "Authentication error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
    return handleCors(request, errorResponse);
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
    
    const response = await handlers.POST(request);
    return handleCors(request, response);
  } catch (error) {
    console.error("BetterAuth POST Error:", error);
    const errorResponse = NextResponse.json(
      { error: "Authentication error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
    return handleCors(request, errorResponse);
  }
}