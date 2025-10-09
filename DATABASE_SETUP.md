# Benefitiary Database Setup Guide

This guide ensures your database is fully equipped for all Benefitiary functionality without future migration issues.

## 🎯 What This Schema Supports

Your database is designed to handle:

- ✅ **Grant Scraping & Classification** - Automated data ingestion from 100+ sources
- ✅ **AI-Powered Proposal Assistance** - Context-aware chat sessions per grant
- ✅ **Multi-Channel Notifications** - Email, WhatsApp, and in-app alerts
- ✅ **Advanced User Matching** - ML-ready recommendation system
- ✅ **Document Management** - RFP uploads and AI processing
- ✅ **Comprehensive Audit Trails** - Full system activity tracking
- ✅ **Analytics & Feedback** - User behavior and system performance
- ✅ **Payment Integration** - DodoPayments sync and AI usage tracking

## 🚀 Quick Setup

### 1. Apply the Complete Schema

```bash
# Generate and apply Prisma migration
npx prisma db push

# Or run the SQL migration directly
psql $DATABASE_URL -f prisma/migrations/001_complete_benefitiary_schema.sql
```

### 2. Seed Initial Data

```bash
# Load seed data (funders, sources, sample grants)
psql $DATABASE_URL -f prisma/seed.sql
```

### 3. Validate Setup

```bash
# Run validation script
node scripts/validate-schema.js
```

## 📊 Database Architecture

### Core Tables

| Table | Purpose | Key Features |
|-------|---------|--------------|
| `grants` | Grant opportunities | Enhanced with AI fields, location eligibility, confidence scores |
| `funders` | Grant-making organizations | Normalized funder data with contact info |
| `users` | User accounts | BetterAuth integration with onboarding tracking |
| `organizations` | User organizations | Detailed profiles for matching |

### AI & Document Management

| Table | Purpose | Key Features |
|-------|---------|--------------|
| `ai_grant_sessions` | Persistent AI chats | One session per user per grant |
| `ai_messages` | Chat history | Threaded conversations with metadata |
| `grant_rfp` | RFP documents | PDF uploads with AI text extraction |
| `ai_context_files` | Session files | Document uploads within chat |

### Scraping & Data Pipeline

| Table | Purpose | Key Features |
|-------|---------|--------------|
| `scraped_sources` | Source URLs | 100+ seed sources with scheduling |
| `scrape_jobs` | Job audit trail | Success rates, timing, error logs |
| `grant_tags` | Multi-tag classification | Flexible tagging for better matching |

### Notifications & Communication

| Table | Purpose | Key Features |
|-------|---------|--------------|
| `notifications` | Multi-channel alerts | Email, WhatsApp, in-app support |
| `user_preferences` | Notification settings | Granular control per channel |

### Analytics & Quality

| Table | Purpose | Key Features |
|-------|---------|--------------|
| `feedback` | User feedback | Match quality and grant accuracy |
| `audit_log` | System events | Compliance and debugging |
| `match_analytics` | Matching performance | ML training data |
| `user_activity` | Behavior tracking | Personalization insights |

## 🔧 Key Enhancements Made

### 1. Enhanced Grant Model
- **Location eligibility** (JSON array of countries/regions)
- **Application methods** and direct URLs
- **Required documents** (structured JSON)
- **AI confidence scores** for extraction quality
- **Content hashing** for change detection
- **Multi-language support**

### 2. AI Integration Ready
- **Persistent chat sessions** per grant
- **File upload support** within conversations
- **Context summarization** for long chats
- **Token usage tracking** for cost management

### 3. Advanced Matching
- **Multi-tag classification** system
- **User preference granularity** 
- **Match score analytics** for ML training
- **Feedback loops** for continuous improvement

### 4. Operational Excellence
- **Comprehensive indexing** for performance
- **Audit trails** for compliance
- **Error tracking** and monitoring
- **System configuration** management

## 📈 Performance Optimizations

### Critical Indexes Created
```sql
-- Grant search and filtering
CREATE INDEX idx_grants_category ON grants(category);
CREATE INDEX idx_grants_deadline ON grants(deadline);
CREATE INDEX idx_grants_funding_range ON grants(funding_amount_min, funding_amount_max);

-- User matching
CREATE INDEX idx_grant_matches_user_status ON grant_matches(user_id, status);
CREATE INDEX idx_grant_matches_score ON grant_matches(match_score DESC);

-- AI sessions
CREATE INDEX idx_ai_sessions_user_grant ON ai_grant_sessions(user_id, grant_id);
CREATE INDEX idx_ai_messages_session ON ai_messages(session_id, created_at);

-- Full-text search
CREATE INDEX idx_grants_title_search ON grants USING gin(to_tsvector('english', title));
CREATE INDEX idx_grants_description_search ON grants USING gin(to_tsvector('english', description));
```

### Triggers and Constraints
- **Automatic timestamp updates** on record changes
- **Data validation** for emails, funding amounts, scores
- **Referential integrity** with proper cascading

## 🌱 Seed Data Included

### Funders (10 major organizations)
- Bill & Melinda Gates Foundation
- Wellcome Trust
- World Health Organization
- USAID
- Green Climate Fund
- Mastercard Foundation
- Ford Foundation
- Rockefeller Foundation
- National Institutes of Health
- National Science Foundation

### Scraped Sources (20 high-value sources)
- Government portals (WHO, USAID, NIH, NSF)
- Foundation websites (Gates, Wellcome, Ford)
- Corporate CSR pages (Microsoft, Pfizer)
- Multilateral organizations (World Bank, UN agencies)

### Sample Grants (5 diverse examples)
- Global Health Innovation Challenge
- Climate Resilience for Smallholder Farmers
- Young Africa Works Initiative
- Innovative Biomedical Research Program
- Human Rights Defenders Support Fund

## 🔍 Validation Checklist

Run the validation script to ensure everything is working:

```bash
node scripts/validate-schema.js
```

This checks:
- ✅ All tables are accessible
- ✅ Critical indexes exist
- ✅ Seed data is loaded
- ✅ Enum values are complete
- ✅ Relationships work correctly

## 🚨 Migration Safety

This schema is designed to be **migration-safe**:

1. **Comprehensive from start** - No major structural changes needed
2. **Extensible design** - Easy to add new fields without breaking changes
3. **Backward compatible** - Existing functionality preserved
4. **Performance optimized** - Indexes created upfront
5. **Data integrity** - Proper constraints and validations

## 🔮 Future-Ready Features

The schema includes provisions for:
- **Vector embeddings** (vectorReady flags)
- **Multi-language support** (language fields)
- **Advanced analytics** (comprehensive tracking)
- **Scalable notifications** (multi-channel support)
- **ML/AI integration** (metadata and scoring fields)

## 📞 Support

If you encounter any issues:
1. Run the validation script first
2. Check the audit_log table for system events
3. Review the scrape_jobs table for data ingestion issues
4. Verify system_settings for configuration

Your database is now **production-ready** for the complete Benefitiary platform! 🎉