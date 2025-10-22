/**
 * AI Chat Route - Redirects to Maya API
 * This maintains backward compatibility with existing frontend calls
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Get the request body
    const body = await request.json();
    
    // Forward the request to the Maya API
    const mayaUrl = new URL('/api/maya', request.url);
    
    const mayaResponse = await fetch(mayaUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Forward authentication headers
        'Authorization': request.headers.get('Authorization') || '',
        'Cookie': request.headers.get('Cookie') || '',
      },
      body: JSON.stringify(body),
    });

    if (!mayaResponse.ok) {
      const errorText = await mayaResponse.text();
      console.error('Maya API Error:', mayaResponse.status, errorText);
      return NextResponse.json(
        { error: 'Failed to get AI response' }, 
        { status: mayaResponse.status }
      );
    }

    const data = await mayaResponse.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('AI Chat Route Error:', error);
    return NextResponse.json(
      { error: 'Failed to get AI response' }, 
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'AI Chat endpoint active',
    redirectsTo: '/api/maya'
  });
}