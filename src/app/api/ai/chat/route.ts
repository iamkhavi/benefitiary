/**
 * AI Chat Route - Redirects to Maya API
 * This maintains backward compatibility with existing frontend calls
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Get the request body
    const body = await request.json();
    
    // Transform the request format to match Maya's expected format
    const mayaRequestBody = {
      userMessage: body.message || body.userMessage || '', // Handle both formats
      sessionId: body.sessionId,
      grantId: body.grantId,
      userContext: body.userContext,
      history: body.history || [],
      currentCanvasContent: body.currentCanvasContent,
      uploadedDocuments: body.uploadedDocuments || body.fileData ? [body.fileData] : undefined
    };

    // Ensure required fields are present
    if (!mayaRequestBody.userMessage || !mayaRequestBody.grantId) {
      return NextResponse.json(
        { error: 'Missing required fields: userMessage and grantId are required' }, 
        { status: 400 }
      );
    }
    
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
      body: JSON.stringify(mayaRequestBody),
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
    
    // Transform Maya response to match what the AI workspace expects
    const transformedResponse = {
      success: data.success,
      response: data.content, // Map content to response
      sessionId: data.sessionId,
      messageId: data.messageId,
      contentType: data.extractedContent ? 'proposal_section' : 'chat',
      extractedContent: data.extractedContent,
      suggestions: data.suggestions
    };
    
    return NextResponse.json(transformedResponse);

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