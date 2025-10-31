import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUserWithRole } from '@/lib/auth-helpers';
import { GrantCategory } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUserWithRole();
    
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Get grant counts by category (only active, non-expired grants)
    const categoryStats = await prisma.grant.groupBy({
      by: ['category'],
      where: {
        status: 'ACTIVE',
        OR: [
          {
            deadline: {
              gte: new Date()
            }
          },
          {
            deadline: null
          }
        ]
      },
      _count: {
        category: true
      },
      orderBy: {
        _count: {
          category: 'desc'
        }
      }
    });

    // Get total active grants count (non-expired)
    const totalGrants = await prisma.grant.count({
      where: {
        status: 'ACTIVE',
        OR: [
          {
            deadline: {
              gte: new Date()
            }
          },
          {
            deadline: null
          }
        ]
      }
    });

    // Get active grants count (non-expired)
    const activeGrants = await prisma.grant.count({
      where: {
        status: 'ACTIVE',
        OR: [
          {
            deadline: {
              gte: new Date()
            }
          },
          {
            deadline: null
          }
        ]
      }
    });

    // Transform category stats to include percentages and readable names
    const categoryMapping: Record<GrantCategory, string> = {
      'HEALTHCARE_PUBLIC_HEALTH': 'Healthcare & Public Health',
      'EDUCATION_TRAINING': 'Education & Training',
      'AGRICULTURE_FOOD_SECURITY': 'Agriculture & Food Security',
      'CLIMATE_ENVIRONMENT': 'Climate & Environment',
      'TECHNOLOGY_INNOVATION': 'Technology & Innovation',
      'WOMEN_YOUTH_EMPOWERMENT': 'Women & Youth Empowerment',
      'ARTS_CULTURE': 'Arts & Culture',
      'COMMUNITY_DEVELOPMENT': 'Community Development',
      'HUMAN_RIGHTS_GOVERNANCE': 'Human Rights & Governance',
      'SME_BUSINESS_GROWTH': 'SME / Business Growth'
    };

    const formattedStats = categoryStats.map(stat => ({
      category: stat.category,
      categoryName: categoryMapping[stat.category] || stat.category,
      count: stat._count.category,
      percentage: totalGrants > 0 ? Math.round((stat._count.category / totalGrants) * 100) : 0
    }));

    // Identify categories with no grants
    const allCategories = Object.keys(categoryMapping) as GrantCategory[];
    const categoriesWithGrants = categoryStats.map(stat => stat.category);
    const emptyCategoriesStats = allCategories
      .filter(cat => !categoriesWithGrants.includes(cat))
      .map(cat => ({
        category: cat,
        categoryName: categoryMapping[cat],
        count: 0,
        percentage: 0
      }));

    const allCategoryStats = [...formattedStats, ...emptyCategoriesStats]
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({
      success: true,
      stats: {
        totalGrants,
        activeGrants,
        categoryStats: allCategoryStats
      }
    });

  } catch (error) {
    console.error('❌ Error fetching grant stats:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch grant statistics',
        details: error instanceof Error ? error.message : undefined
      },
      { status: 500 }
    );
  }
}