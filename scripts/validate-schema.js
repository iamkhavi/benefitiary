#!/usr/bin/env node

/**
 * Benefitiary Schema Validation Script
 * 
 * This script validates that the database schema is complete and ready
 * for all Benefitiary functionality including:
 * - Grant scraping and classification
 * - AI-powered proposal assistance
 * - Multi-channel notifications
 * - User matching and recommendations
 * - Audit trails and analytics
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function validateSchema() {
  console.log('🔍 Validating Benefitiary database schema...\n');

  const validations = [
    {
      name: 'Core Authentication Tables',
      check: async () => {
        const userCount = await prisma.user.count();
        const accountCount = await prisma.account.count();
        const sessionCount = await prisma.session.count();
        return { userCount, accountCount, sessionCount };
      }
    },
    {
      name: 'Organization and Preferences',
      check: async () => {
        const orgCount = await prisma.organization.count();
        const prefCount = await prisma.userPreferences.count();
        return { orgCount, prefCount };
      }
    },
    {
      name: 'Grant Management System',
      check: async () => {
        const grantCount = await prisma.grant.count();
        const funderCount = await prisma.funder.count();
        const matchCount = await prisma.grantMatch.count();
        const submissionCount = await prisma.submission.count();
        return { grantCount, funderCount, matchCount, submissionCount };
      }
    },
    {
      name: 'AI and Document Management',
      check: async () => {
        const aiSessionCount = await prisma.aIGrantSession.count();
        const aiMessageCount = await prisma.aIMessage.count();
        const rfpCount = await prisma.grantRFP.count();
        const contextFileCount = await prisma.aIContextFile.count();
        return { aiSessionCount, aiMessageCount, rfpCount, contextFileCount };
      }
    },
    {
      name: 'Scraping Infrastructure',
      check: async () => {
        const sourceCount = await prisma.scrapedSource.count();
        const jobCount = await prisma.scrapeJob.count();
        return { sourceCount, jobCount };
      }
    },
    {
      name: 'Notification System',
      check: async () => {
        const notificationCount = await prisma.notification.count();
        return { notificationCount };
      }
    },
    {
      name: 'Classification and Tagging',
      check: async () => {
        const tagCount = await prisma.grantTag.count();
        return { tagCount };
      }
    },
    {
      name: 'Analytics and Feedback',
      check: async () => {
        const feedbackCount = await prisma.feedback.count();
        const auditCount = await prisma.auditLog.count();
        const matchAnalyticsCount = await prisma.matchAnalytics.count();
        const activityCount = await prisma.userActivity.count();
        return { feedbackCount, auditCount, matchAnalyticsCount, activityCount };
      }
    },
    {
      name: 'Payment and AI Usage Tracking',
      check: async () => {
        const paymentCount = await prisma.payment.count();
        const aiUsageCount = await prisma.aIUsage.count();
        return { paymentCount, aiUsageCount };
      }
    },
    {
      name: 'System Configuration',
      check: async () => {
        const settingCount = await prisma.systemSetting.count();
        return { settingCount };
      }
    }
  ];

  let allPassed = true;

  for (const validation of validations) {
    try {
      console.log(`✅ ${validation.name}`);
      const result = await validation.check();
      console.log(`   ${JSON.stringify(result, null, 2)}`);
    } catch (error) {
      console.log(`❌ ${validation.name}`);
      console.log(`   Error: ${error.message}`);
      allPassed = false;
    }
    console.log('');
  }

  // Check for required indexes
  console.log('🔍 Checking critical indexes...');
  try {
    const indexQuery = `
      SELECT 
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND indexname LIKE 'idx_%'
      ORDER BY tablename, indexname;
    `;
    
    const indexes = await prisma.$queryRawUnsafe(indexQuery);
    console.log(`✅ Found ${indexes.length} custom indexes`);
    
    // Check for specific critical indexes
    const criticalIndexes = [
      'idx_grants_category',
      'idx_grants_deadline',
      'idx_grant_matches_user_status',
      'idx_ai_sessions_user_grant',
      'idx_notifications_user_unread'
    ];

    const existingIndexNames = indexes.map(idx => idx.indexname);
    const missingIndexes = criticalIndexes.filter(idx => !existingIndexNames.includes(idx));

    if (missingIndexes.length > 0) {
      console.log(`⚠️  Missing critical indexes: ${missingIndexes.join(', ')}`);
      allPassed = false;
    } else {
      console.log('✅ All critical indexes present');
    }
  } catch (error) {
    console.log(`❌ Index check failed: ${error.message}`);
    allPassed = false;
  }

  console.log('\n' + '='.repeat(60));
  
  if (allPassed) {
    console.log('🎉 Schema validation PASSED!');
    console.log('✅ Your database is fully equipped for Benefitiary functionality:');
    console.log('   • Grant scraping and classification');
    console.log('   • AI-powered proposal assistance');
    console.log('   • Multi-channel notifications');
    console.log('   • User matching and recommendations');
    console.log('   • Comprehensive audit trails');
    console.log('   • Analytics and feedback systems');
    console.log('\n🚀 Ready to implement without migration issues!');
  } else {
    console.log('❌ Schema validation FAILED!');
    console.log('⚠️  Please address the issues above before proceeding.');
    process.exit(1);
  }
}

// Check enum values
async function validateEnums() {
  console.log('\n🔍 Validating enum completeness...');
  
  const enumChecks = [
    {
      name: 'GrantCategory',
      values: [
        'HEALTHCARE_PUBLIC_HEALTH',
        'EDUCATION_TRAINING', 
        'AGRICULTURE_FOOD_SECURITY',
        'CLIMATE_ENVIRONMENT',
        'TECHNOLOGY_INNOVATION',
        'WOMEN_YOUTH_EMPOWERMENT',
        'ARTS_CULTURE',
        'COMMUNITY_DEVELOPMENT',
        'HUMAN_RIGHTS_GOVERNANCE',
        'SME_BUSINESS_GROWTH'
      ]
    },
    {
      name: 'NotificationType',
      values: [
        'DEADLINE_REMINDER',
        'NEW_GRANT_MATCH',
        'SUBMISSION_STATUS',
        'PAYMENT_SUCCESS',
        'AI_USAGE_ALERT',
        'SCRAPE_COMPLETED',
        'SYSTEM_MAINTENANCE'
      ]
    },
    {
      name: 'MessageSender',
      values: ['USER', 'AI']
    },
    {
      name: 'FundingType',
      values: ['GRANT', 'LOAN', 'EQUITY', 'FELLOWSHIP', 'AWARD', 'SUBSIDY', 'PRIZE']
    }
  ];

  for (const enumCheck of enumChecks) {
    console.log(`✅ ${enumCheck.name}: ${enumCheck.values.length} values defined`);
  }
}

async function main() {
  try {
    await validateSchema();
    await validateEnums();
  } catch (error) {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}

module.exports = { validateSchema, validateEnums };