import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (session?.user) {
      // Sign out the user
      await auth.api.signOut({
        headers: await headers(),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Failed to logout' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (session?.user) {
      // Sign out the user
      await auth.api.signOut({
        headers: await headers(),
      });
    }

    // Create a response that redirects to login
    const response = NextResponse.redirect(new URL('/auth/login', request.url));
    
    // Clear any client-side cookies
    response.cookies.delete('better-auth.session_token');
    response.cookies.delete('better-auth.csrf_token');
    
    return response;
  } catch (error) {
    console.error('Logout error:', error);
    const response = NextResponse.redirect(new URL('/auth/login', request.url));
    
    // Clear cookies even on error
    response.cookies.delete('better-auth.session_token');
    response.cookies.delete('better-auth.csrf_token');
    
    return response;
  }
}