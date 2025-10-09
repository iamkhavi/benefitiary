#!/usr/bin/env node

/**
 * Create database indexes for Benefitiary
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createIndexes() {
  console.log('🔧 Creating database indexes...\n');

  const indexes = [
    // Grant search and filtering indexes
    'CREATE INDEX IF NOT EXISTS idx_grants_category ON grants(category);',
    'CREATE INDEX IF NOT EXISTS idx_grants_deadline ON grants(deadline);',
    'CREATE INDEX IF NOT EXISTS idx_grants_funding_range ON grants(funding_amount_min, funding_amount_max);',
    'CREATE INDEX IF NOT EXISTS idx_grants_confidence_score ON grants(confidence_score);',
    'CREATE INDEX IF NOT EXISTS idx_grants_content_hash ON grants(content_hash);',
    'CREATE INDEX IF NOT EXISTS idx_grants_featured ON grants(is_featured);',
    'CREATE INDEX IF NOT EXISTS idx_grants_created_at ON grants(created_at);',
    'CREATE INDEX IF NOT EXISTS idx_grants_funder_id ON grants(funder_id);',

    // Grant matching and recommendations
    'CREATE INDEX IF NOT EXISTS idx_grant_matches_user_status ON grant_matches(user_id, status);',
    'CREATE INDEX IF NOT EXISTS idx_grant_matches_score ON grant_matches(match_score DESC);',
    'CREATE INDEX IF NOT EXISTS idx_grant_matches_created_at ON grant_matches(created_at DESC);',

    // Grant tags for multi-tag search
    'CREATE INDEX IF NOT EXISTS idx_grant_tags_tag ON grant_tags(tag);',
    'CREATE INDEX IF NOT EXISTS idx_grant_tags_grant_id ON grant_tags(grant_id);',
    'CREATE INDEX IF NOT EXISTS idx_grant_tags_composite ON grant_tags(grant_id, tag);',

    // User and organization indexes
    'CREATE INDEX IF NOT EXISTS idx_users_email ON "user"(email);',
    'CREATE INDEX IF NOT EXISTS idx_users_role ON "user"(role);',
    'CREATE INDEX IF NOT EXISTS idx_users_onboarding ON "user"(onboarding_completed);',
    'CREATE INDEX IF NOT EXISTS idx_organizations_country ON organizations(country);',
    'CREATE INDEX IF NOT EXISTS idx_organizations_type ON organizations(org_type);',
    'CREATE INDEX IF NOT EXISTS idx_organizations_size ON organizations(org_size);',

    // AI and chat indexes
    'CREATE INDEX IF NOT EXISTS idx_ai_sessions_user_grant ON ai_grant_sessions(user_id, grant_id);',
    'CREATE INDEX IF NOT EXISTS idx_ai_sessions_active ON ai_grant_sessions(is_active);',
    'CREATE INDEX IF NOT EXISTS idx_ai_messages_session ON ai_messages(session_id, created_at);',
    'CREATE INDEX IF NOT EXISTS idx_ai_messages_sender ON ai_messages(sender);',

    // Notification indexes
    'CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, read);',
    'CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);',
    'CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);',

    // Scraping and job monitoring indexes
    'CREATE INDEX IF NOT EXISTS idx_scraped_sources_status ON scraped_sources(status);',
    'CREATE INDEX IF NOT EXISTS idx_scraped_sources_frequency ON scraped_sources(frequency);',
    'CREATE INDEX IF NOT EXISTS idx_scraped_sources_last_scraped ON scraped_sources(last_scraped_at);',
    'CREATE INDEX IF NOT EXISTS idx_scrape_jobs_status ON scrape_jobs(status);',
    'CREATE INDEX IF NOT EXISTS idx_scrape_jobs_source_started ON scrape_jobs(source_id, started_at DESC);',

    // Audit and analytics indexes
    'CREATE INDEX IF NOT EXISTS idx_audit_log_user_action ON audit_log(user_id, action);',
    'CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);',
    'CREATE INDEX IF NOT EXISTS idx_user_activity_user_action ON user_activity(user_id, action);'
  ];

  let successCount = 0;
  let errorCount = 0;

  for (const indexSql of indexes) {
    try {
      await prisma.$executeRawUnsafe(indexSql);
      const indexName = indexSql.match(/idx_[a-z_]+/)?.[0] || 'unknown';
      console.log(`✅ Created index: ${indexName}`);
      successCount++;
    } catch (error) {
      console.log(`❌ Failed to create index: ${error.message}`);
      errorCount++;
    }
  }

  console.log(`\n📊 Index creation summary:`);
  console.log(`✅ Successfully created: ${successCount} indexes`);
  console.log(`❌ Failed: ${errorCount} indexes`);

  if (errorCount === 0) {
    console.log('\n🎉 All indexes created successfully!');
  }
}

async function main() {
  try {
    await createIndexes();
  } catch (error) {
    console.error('❌ Index creation failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}

module.exports = { createIndexes };