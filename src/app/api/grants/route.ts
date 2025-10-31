import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { testGrants } from '@/lib/test-grants-data';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const category = searchParams.get('category');
    const search = searchParams.get('search');

    // Try to use database first, fall back to test data
    try {
      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = {
        status: 'ACTIVE',
        OR: [
          {
            deadline: {
              gte: new Date() // Future deadlines
            }
          },
          {
            deadline: null // No deadline specified
          }
        ]
      };

      if (category) {
        where.category = category;
      }

      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { funder: { name: { contains: search, mode: 'insensitive' } } }
        ];
      }

      const [grants, total] = await Promise.all([
        prisma.grant.findMany({
          where,
          include: {
            funder: {
              select: {
                id: true,
                name: true,
                logoUrl: true,
                type: true,
                website: true,
                contactEmail: true
              }
            }
          },
          orderBy: [
            { deadline: 'asc' },
            { createdAt: 'desc' }
          ],
          skip,
          take: limit
        }),
        prisma.grant.count({ where })
      ]);

      return NextResponse.json({
        success: true,
        grants,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });

    } catch (dbError) {
      console.log('📝 Database not available, using test data');
      
      // Filter test data based on search and category
      let filteredGrants = testGrants;

      if (category) {
        filteredGrants = filteredGrants.filter(grant => grant.category === category);
      }

      if (search) {
        const searchLower = search.toLowerCase();
        filteredGrants = filteredGrants.filter(grant =>
          grant.title.toLowerCase().includes(searchLower) ||
          grant.description?.toLowerCase().includes(searchLower) ||
          grant.funder?.name.toLowerCase().includes(searchLower)
        );
      }

      // Apply pagination
      const skip = (page - 1) * limit;
      const paginatedGrants = filteredGrants.slice(skip, skip + limit);

      return NextResponse.json({
        success: true,
        grants: paginatedGrants,
        pagination: {
          page,
          limit,
          total: filteredGrants.length,
          pages: Math.ceil(filteredGrants.length / limit)
        },
        usingTestData: true
      });
    }

  } catch (error) {
    console.error('❌ Error fetching grants:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch grants',
        details: error instanceof Error ? error.message : undefined
      },
      { status: 500 }
    );
  }
}