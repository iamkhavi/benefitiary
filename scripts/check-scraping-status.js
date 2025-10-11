const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkScrapingStatus() {
  try {
    console.log('🔍 Checking scraping system status...\n');

    // Check scraping sources
    const sources = await prisma.scrapedSource.findMany();
    console.log(`📊 Scraping Sources: ${sources.length} configured`);
    sources.forEach(source => {
      console.log(`  - ${source.category || 'Unknown'}: ${source.url}`);
      console.log(`    Status: ${source.status}, Last scraped: ${source.lastScrapedAt || 'Never'}`);
    });

    // Check scraping jobs
    const jobs = await prisma.scrapeJob.findMany({
      orderBy: { startedAt: 'desc' },
      take: 5
    });
    console.log(`\n🔄 Recent Scraping Jobs: ${jobs.length} found`);
    jobs.forEach(job => {
      console.log(`  - Job ${job.id}: ${job.status} (${job.startedAt})`);
      if (job.totalFound) console.log(`    Found: ${job.totalFound} grants`);
    });

    // Check grants
    const grantCount = await prisma.grant.count();
    console.log(`\n📋 Total Grants in Database: ${grantCount}`);

    // Check recent grants
    const recentGrants = await prisma.grant.findMany({
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: {
        title: true,
        funder: { select: { name: true } },
        createdAt: true,
        scrapedFrom: true
      }
    });
    
    if (recentGrants.length > 0) {
      console.log('\n📝 Recent Grants:');
      recentGrants.forEach(grant => {
        console.log(`  - ${grant.title}`);
        console.log(`    Funder: ${grant.funder?.name || 'Unknown'}`);
        console.log(`    Source: ${grant.scrapedFrom || 'Unknown'}`);
      });
    }

  } catch (error) {
    console.error('❌ Error checking scraping status:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkScrapingStatus();