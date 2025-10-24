/**
 * Maya Performance Test Endpoint
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { testType = 'simple' } = await request.json();
    
    // Simulate different types of requests
    const testMessages = {
      simple: "Hi Maya, how are you?",
      complex: "Create a comprehensive budget section for my grant proposal",
      analysis: "Analyze the fit between my organization and this grant opportunity"
    };

    const testMessage = testMessages[testType as keyof typeof testMessages] || testMessages.simple;

    // Make actual API call to Maya
    const response = await fetch(`${request.nextUrl.origin}/api/maya`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('Authorization') || '',
        'Cookie': request.headers.get('Cookie') || ''
      },
      body: JSON.stringify({
        userMessage: testMessage,
        grantId: 'test-grant-id',
        userContext: {
          orgName: 'Test Organization',
          grantTitle: 'Test Grant'
        },
        history: []
      })
    });

    const endTime = Date.now();
    const totalTime = endTime - startTime;

    const data = await response.json();

    return NextResponse.json({
      testType,
      testMessage,
      processingTime: totalTime,
      apiProcessingTime: data.processingTime,
      success: data.success,
      intent: data.intent,
      responseLength: data.content?.length || 0,
      performance: {
        total: `${totalTime}ms`,
        api: `${data.processingTime || 'unknown'}ms`,
        overhead: `${totalTime - (data.processingTime || 0)}ms`
      }
    });

  } catch (error) {
    const endTime = Date.now();
    const totalTime = endTime - startTime;

    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime: totalTime,
      success: false
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Maya Performance Test Endpoint',
    usage: 'POST with { "testType": "simple" | "complex" | "analysis" }',
    testTypes: {
      simple: 'Basic chat message - should be very fast',
      complex: 'Canvas content generation - moderate speed',
      analysis: 'Full analysis with context - slower but comprehensive'
    }
  });
}