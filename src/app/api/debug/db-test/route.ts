import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 DB Test: Starting database connection test');
    
    // Test basic connection
    const userCount = await prisma.user.count();
    console.log('✅ DB Test: User count:', userCount);
    
    // Test enum values
    const enumTest = await prisma.$queryRaw`
      SELECT unnest(enum_range(NULL::organization_type)) as org_type;
    `;
    console.log('✅ DB Test: Organization types:', enumTest);
    
    return NextResponse.json({
      success: true,
      userCount,
      enumTest,
      message: 'Database connection successful'
    });
  } catch (error) {
    console.error('❌ DB Test error:', error);
    
    return NextResponse.json(
      { 
        error: 'Database connection failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}