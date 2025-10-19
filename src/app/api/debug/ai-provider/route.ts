/**
 * Debug endpoint to check AI provider configuration
 */

import { NextResponse } from 'next/server';
import { LLMFactory } from '@/lib/ai/llm-factory';

export async function GET() {
  try {
    const providerInfo = LLMFactory.getProviderInfo();
    
    // Test basic LLM creation
    const llm = LLMFactory.createLLM();
    
    return NextResponse.json({
      status: 'success',
      provider: providerInfo,
      environment: {
        PRIMARY_AI_PROVIDER: process.env.PRIMARY_AI_PROVIDER,
        hasXaiKey: !!process.env.XAI_API_KEY,
        hasOpenAiKey: !!process.env.OPENAI_API_KEY,
        xaiKeyLength: process.env.XAI_API_KEY?.length || 0,
      },
      llmCreated: !!llm,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('AI Provider debug error:', error);
    
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      environment: {
        PRIMARY_AI_PROVIDER: process.env.PRIMARY_AI_PROVIDER,
        hasXaiKey: !!process.env.XAI_API_KEY,
        hasOpenAiKey: !!process.env.OPENAI_API_KEY,
      }
    }, { status: 500 });
  }
}