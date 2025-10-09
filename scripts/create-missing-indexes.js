#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createMissingIndexes() {
  console.log('🔧 Creating missing critical indexes...\n');

  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_grant_matches_user_status ON grant_matches("userId", status);',
    'CREATE INDEX IF NOT EXISTS idx_ai_sessions_user_grant ON ai_grant_sessions("userId", "grantId");',
    'CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications("userId", read);'
  ];

  let successCount = 0;

  for (const indexSql of indexes) {
    try {
      await prisma.$executeRawUnsafe(indexSql);
      const indexName = indexSql.match(/idx_[a-z_]+/)?.[0] || 'unknown';
      console.log(`✅ Created index: ${indexName}`);
      successCount++;
    } catch (error) {
      console.log(`❌ Failed to create index: ${error.message}`);
    }
  }

  console.log(`\n📊 Created ${successCount} missing indexes successfully!`);
}

async function main() {
  try {
    await createMissingIndexes();
  } catch (error) {
    console.error('❌ Index creation failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();