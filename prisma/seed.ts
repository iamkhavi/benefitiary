import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create scraping sources - CORRECTED URLs for actual grant opportunities
  const sources = [
    {
      url: 'https://www.grants.gov/web/grants/search-grants.html',
      type: 'GOV' as const,
      category: 'Government Grants',
      region: 'United States',
      notes: 'US Government grants portal - live funding opportunities via API',
      frequency: 'DAILY' as const,
      status: 'ACTIVE' as const // Grants.gov API is implemented
    },
    {
      url: 'https://www.fordfoundation.org/work/funding-opportunities/',
      type: 'FOUNDATION' as const,
      category: 'Social Justice & Human Rights',
      region: 'Global',
      notes: 'Ford Foundation funding opportunities - open applications and RFPs',
      frequency: 'WEEKLY' as const,
      status: 'ACTIVE' as const
    },
    {
      url: 'https://www.macfound.org/programs/',
      type: 'FOUNDATION' as const,
      category: 'Research & Innovation',
      region: 'Global',
      notes: 'MacArthur Foundation programs and fellowship opportunities',
      frequency: 'WEEKLY' as const,
      status: 'ACTIVE' as const
    },
    {
      url: 'https://www.rwjf.org/en/grants/funding-opportunities.html',
      type: 'FOUNDATION' as const,
      category: 'Health & Healthcare',
      region: 'United States',
      notes: 'Robert Wood Johnson Foundation - health-focused funding opportunities',
      frequency: 'WEEKLY' as const,
      status: 'ACTIVE' as const
    },
    {
      url: 'https://www.nsf.gov/funding/',
      type: 'GOV' as const,
      category: 'Science & Research',
      region: 'United States',
      notes: 'National Science Foundation funding opportunities and solicitations',
      frequency: 'WEEKLY' as const,
      status: 'ACTIVE' as const
    },
    {
      url: 'https://wellcome.org/grant-funding',
      type: 'FOUNDATION' as const,
      category: 'Health & Medical Research',
      region: 'Global',
      notes: 'Wellcome Trust funding schemes - health and medical research',
      frequency: 'WEEKLY' as const,
      status: 'ACTIVE' as const
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

  // Create funders matching the corrected sources
  const funders = [
    {
      name: 'US Government',
      type: 'GOVERNMENT' as const,
      website: 'https://www.grants.gov',
      contactEmail: 'support@grants.gov'
    },
    {
      name: 'Ford Foundation',
      type: 'PRIVATE_FOUNDATION' as const,
      website: 'https://www.fordfoundation.org',
      contactEmail: 'office-secretary@fordfoundation.org'
    },
    {
      name: 'MacArthur Foundation',
      type: 'PRIVATE_FOUNDATION' as const,
      website: 'https://www.macfound.org',
      contactEmail: 'info@macfound.org'
    },
    {
      name: 'Robert Wood Johnson Foundation',
      type: 'PRIVATE_FOUNDATION' as const,
      website: 'https://www.rwjf.org',
      contactEmail: 'mail@rwjf.org'
    },
    {
      name: 'National Science Foundation',
      type: 'GOVERNMENT' as const,
      website: 'https://www.nsf.gov',
      contactEmail: 'info@nsf.gov'
    },
    {
      name: 'Wellcome Trust',
      type: 'PRIVATE_FOUNDATION' as const,
      website: 'https://wellcome.org',
      contactEmail: 'contact@wellcome.org'
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