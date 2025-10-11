const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const scrapingSources = [
  {
    id: 'source_gates_foundation',
    url: 'https://www.gatesfoundation.org/about/committed-grants',
    type: 'FOUNDATION',
    category: 'Healthcare',
    region: 'Global',
    frequency: 'WEEKLY',
    status: 'ACTIVE',
    notes: 'Bill & Melinda Gates Foundation - Global health and development grants'
  },
  {
    id: 'source_grants_gov',
    url: 'https://www.grants.gov/search-grants',
    type: 'GOV',
    category: 'Government',
    region: 'United States',
    frequency: 'DAILY',
    status: 'ACTIVE',
    notes: 'US Government grants portal - All federal funding opportunities'
  },
  {
    id: 'source_ford_foundation',
    url: 'https://www.fordfoundation.org/work/our-grants/',
    type: 'FOUNDATION',
    category: 'Social Justice',
    region: 'Global',
    frequency: 'WEEKLY',
    status: 'ACTIVE',
    notes: 'Ford Foundation - Social justice and human rights grants'
  },
  {
    id: 'source_rockefeller_foundation',
    url: 'https://www.rockefellerfoundation.org/grants/',
    type: 'FOUNDATION',
    category: 'Innovation',
    region: 'Global',
    frequency: 'WEEKLY',
    status: 'ACTIVE',
    notes: 'Rockefeller Foundation - Innovation and resilience grants'
  },
  {
    id: 'source_world_bank',
    url: 'https://www.worldbank.org/en/projects-operations/procurement/opportunities',
    type: 'NGO',
    category: 'Development',
    region: 'Global',
    frequency: 'WEEKLY',
    status: 'ACTIVE',
    notes: 'World Bank - Development and infrastructure funding'
  },
  {
    id: 'source_globalgiving',
    url: 'https://www.globalgiving.org/projects/',
    type: 'NGO',
    category: 'Humanitarian',
    region: 'Global',
    frequency: 'DAILY',
    status: 'ACTIVE',
    notes: 'GlobalGiving - Crowdfunding for nonprofits worldwide'
  },
  {
    id: 'source_wellcome_trust',
    url: 'https://wellcome.org/grant-funding',
    type: 'FOUNDATION',
    category: 'Healthcare',
    region: 'Global',
    frequency: 'WEEKLY',
    status: 'ACTIVE',
    notes: 'Wellcome Trust - Biomedical research and health innovation'
  },
  {
    id: 'source_usaid',
    url: 'https://www.usaid.gov/work-with-us/funding-opportunities',
    type: 'GOV',
    category: 'Development',
    region: 'Global',
    frequency: 'WEEKLY',
    status: 'ACTIVE',
    notes: 'USAID - International development and humanitarian assistance'
  }
];

async function initializeScrapingSources() {
  try {
    console.log('🚀 Initializing scraping sources...');

    for (const source of scrapingSources) {
      const existingSource = await prisma.scrapedSource.findUnique({
        where: { id: source.id }
      });

      if (existingSource) {
        console.log(`⚠️  Source already exists: ${source.notes}`);
        continue;
      }

      await prisma.scrapedSource.create({
        data: {
          ...source,
          successRate: 0.0,
          avgParseTime: null,
          failCount: 0,
          lastError: null,
          lastScrapedAt: null
        }
      });

      console.log(`✅ Created source: ${source.notes}`);
    }

    // Get summary
    const totalSources = await prisma.scrapedSource.count();
    const activeSources = await prisma.scrapedSource.count({
      where: { status: 'ACTIVE' }
    });

    console.log('\n📊 Scraping Sources Summary:');
    console.log(`Total Sources: ${totalSources}`);
    console.log(`Active Sources: ${activeSources}`);
    console.log(`Inactive Sources: ${totalSources - activeSources}`);

    // Show sources by type
    const sourcesByType = await prisma.scrapedSource.groupBy({
      by: ['type'],
      _count: {
        id: true
      }
    });

    console.log('\n📋 Sources by Type:');
    sourcesByType.forEach(group => {
      console.log(`${group.type}: ${group._count.id}`);
    });

    console.log('\n🎯 Ready to start scraping! Use the admin dashboard to monitor progress.');

  } catch (error) {
    console.error('❌ Error initializing scraping sources:', error);
  } finally {
    await prisma.$disconnect();
  }
}

initializeScrapingSources();