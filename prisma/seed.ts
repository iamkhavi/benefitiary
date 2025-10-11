import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create scraping sources
  const sources = [
    {
      url: 'https://www.gatesfoundation.org/about/committed-grants',
      type: 'FOUNDATION' as const,
      category: 'Global Health & Development',
      region: 'Global',
      notes: 'Gates Foundation committed grants - scraper needs real implementation',
      frequency: 'WEEKLY' as const,
      status: 'INACTIVE' as const // Set to INACTIVE until real scraper is implemented
    },
    {
      url: 'https://www.grants.gov/web/grants/search-grants.html',
      type: 'GOV' as const,
      category: 'Government Grants',
      region: 'United States',
      notes: 'US Government grants portal - needs API integration',
      frequency: 'DAILY' as const,
      status: 'INACTIVE' as const // Set to INACTIVE until API integration is implemented
    },
    {
      url: 'https://www.fordfoundation.org/work/our-grants/',
      type: 'FOUNDATION' as const,
      category: 'Social Justice & Human Rights',
      region: 'Global',
      notes: 'Ford Foundation grants - scraper needs real implementation',
      frequency: 'WEEKLY' as const,
      status: 'INACTIVE' as const // Set to INACTIVE until real scraper is implemented
    },
    {
      url: 'https://www.rockefellerfoundation.org/grants/',
      type: 'FOUNDATION' as const,
      category: 'Innovation & Resilience',
      region: 'Global',
      notes: 'Rockefeller Foundation - scraper needs real implementation',
      frequency: 'WEEKLY' as const,
      status: 'INACTIVE' as const // Set to INACTIVE until real scraper is implemented
    },
    {
      url: 'https://www.globalgiving.org/projects/',
      type: 'NGO' as const,
      category: 'Community Development',
      region: 'Global',
      notes: 'GlobalGiving platform - grassroots projects (scraper not yet implemented)',
      frequency: 'WEEKLY' as const,
      status: 'INACTIVE' as const // Set to INACTIVE until real scraper is implemented
    }
  ];

  for (const source of sources) {
    await prisma.scrapedSource.upsert({
      where: { url: source.url },
      update: source,
      create: source
    });
  }

  console.log('✅ Created scraping sources');

  // Create some sample funders
  const funders = [
    {
      name: 'Bill & Melinda Gates Foundation',
      type: 'PRIVATE_FOUNDATION' as const,
      website: 'https://www.gatesfoundation.org',
      contactEmail: 'info@gatesfoundation.org'
    },
    {
      name: 'Ford Foundation',
      type: 'PRIVATE_FOUNDATION' as const,
      website: 'https://www.fordfoundation.org',
      contactEmail: 'office-secretary@fordfoundation.org'
    },
    {
      name: 'Rockefeller Foundation',
      type: 'PRIVATE_FOUNDATION' as const,
      website: 'https://www.rockefellerfoundation.org',
      contactEmail: 'info@rockfound.org'
    },
    {
      name: 'US Department of Health and Human Services',
      type: 'GOVERNMENT' as const,
      website: 'https://www.hhs.gov',
      contactEmail: 'info@hhs.gov'
    }
  ];

  for (const funder of funders) {
    const existingFunder = await prisma.funder.findFirst({
      where: { name: funder.name }
    });
    
    if (!existingFunder) {
      await prisma.funder.create({
        data: funder
      });
    }
  }

  console.log('✅ Created funders');

  console.log('🎉 Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });