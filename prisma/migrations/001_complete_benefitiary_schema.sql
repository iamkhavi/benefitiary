-- ============================================================================
-- BENEFITIARY COMPLETE DATABASE SCHEMA MIGRATION
-- This migration creates all tables, indexes, and constraints needed for
-- the full Benefitiary platform functionality
-- ============================================================================

-- Enable necessary PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For fuzzy text search
CREATE EXTENSION IF NOT EXISTS "btree_gin"; -- For composite indexes

-- ============================================================================
-- PERFORMANCE INDEXES
-- ============================================================================

-- Core grant search and filtering indexes
CREATE INDEX IF NOT EXISTS idx_grants_category ON grants(category);
CREATE INDEX IF NOT EXISTS idx_grants_deadline ON grants(deadline);
CREATE INDEX IF NOT EXISTS idx_grants_funding_range ON grants(funding_amount_min, funding_amount_max);
CREATE INDEX IF NOT EXISTS idx_grants_location_eligibility ON grants USING gin(location_eligibility);
CREATE INDEX IF NOT EXISTS idx_grants_confidence_score ON grants(confidence_score);
CREATE INDEX IF NOT EXISTS idx_grants_content_hash ON grants(content_hash);
CREATE INDEX IF NOT EXISTS idx_grants_featured ON grants(is_featured);
CREATE INDEX IF NOT EXISTS idx_grants_created_at ON grants(created_at);
CREATE INDEX IF NOT EXISTS idx_grants_funder_id ON grants(funder_id);

-- Grant matching and recommendations
CREATE INDEX IF NOT EXISTS idx_grant_matches_user_status ON grant_matches(user_id, status);
CREATE INDEX IF NOT EXISTS idx_grant_matches_score ON grant_matches(match_score DESC);
CREATE INDEX IF NOT EXISTS idx_grant_matches_created_at ON grant_matches(created_at DESC);

-- Grant tags for multi-tag search
CREATE INDEX IF NOT EXISTS idx_grant_tags_tag ON grant_tags(tag);
CREATE INDEX IF NOT EXISTS idx_grant_tags_grant_id ON grant_tags(grant_id);
CREATE INDEX IF NOT EXISTS idx_grant_tags_composite ON grant_tags(grant_id, tag);

-- User and organization indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON "user"(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON "user"(role);
CREATE INDEX IF NOT EXISTS idx_users_onboarding ON "user"(onboarding_completed);
CREATE INDEX IF NOT EXISTS idx_organizations_country ON organizations(country);
CREATE INDEX IF NOT EXISTS idx_organizations_type ON organizations(org_type);
CREATE INDEX IF NOT EXISTS idx_organizations_size ON organizations(org_size);

-- AI and chat indexes
CREATE INDEX IF NOT EXISTS idx_ai_sessions_user_grant ON ai_grant_sessions(user_id, grant_id);
CREATE INDEX IF NOT EXISTS idx_ai_sessions_active ON ai_grant_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_ai_messages_session ON ai_messages(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ai_messages_sender ON ai_messages(sender);

-- Notification indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Scraping and job monitoring indexes
CREATE INDEX IF NOT EXISTS idx_scraped_sources_status ON scraped_sources(status);
CREATE INDEX IF NOT EXISTS idx_scraped_sources_frequency ON scraped_sources(frequency);
CREATE INDEX IF NOT EXISTS idx_scraped_sources_last_scraped ON scraped_sources(last_scraped_at);
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_status ON scrape_jobs(status);
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_source_started ON scrape_jobs(source_id, started_at DESC);

-- Audit and analytics indexes
CREATE INDEX IF NOT EXISTS idx_audit_log_user_action ON audit_log(user_id, action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_user_action ON user_activity(user_id, action);

-- Full-text search indexes for grants
CREATE INDEX IF NOT EXISTS idx_grants_title_search ON grants USING gin(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_grants_description_search ON grants USING gin(to_tsvector('english', description));
CREATE INDEX IF NOT EXISTS idx_grants_eligibility_search ON grants USING gin(to_tsvector('english', eligibility_criteria));

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_grants_category_deadline ON grants(category, deadline);
CREATE INDEX IF NOT EXISTS idx_grants_funding_deadline ON grants(funding_amount_min, deadline);
CREATE INDEX IF NOT EXISTS idx_user_preferences_categories ON user_preferences USING gin(categories);

-- ============================================================================
-- TRIGGERS AND FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to relevant tables
DROP TRIGGER IF EXISTS update_grants_modtime ON grants;
CREATE TRIGGER update_grants_modtime
  BEFORE UPDATE ON grants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_organizations_modtime ON organizations;
CREATE TRIGGER update_organizations_modtime
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_preferences_modtime ON user_preferences;
CREATE TRIGGER update_user_preferences_modtime
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_scraped_sources_modtime ON scraped_sources;
CREATE TRIGGER update_scraped_sources_modtime
  BEFORE UPDATE ON scraped_sources
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically update grant match scores
CREATE OR REPLACE FUNCTION update_grant_match_score()
RETURNS TRIGGER AS $$
BEGIN
  -- Simple scoring algorithm (can be enhanced later)
  NEW.match_score = CASE
    WHEN NEW.status = 'APPLIED' THEN 100
    WHEN NEW.status = 'SAVED' THEN 80
    ELSE 50
  END;
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_match_score ON grant_matches;
CREATE TRIGGER update_match_score
  BEFORE INSERT OR UPDATE ON grant_matches
  FOR EACH ROW
  EXECUTE FUNCTION update_grant_match_score();

-- ============================================================================
-- CONSTRAINTS AND VALIDATIONS
-- ============================================================================

-- Ensure valid email formats
ALTER TABLE "user" ADD CONSTRAINT valid_email 
  CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Ensure positive funding amounts
ALTER TABLE grants ADD CONSTRAINT positive_funding_min 
  CHECK (funding_amount_min IS NULL OR funding_amount_min >= 0);
ALTER TABLE grants ADD CONSTRAINT positive_funding_max 
  CHECK (funding_amount_max IS NULL OR funding_amount_max >= 0);
ALTER TABLE grants ADD CONSTRAINT funding_range_valid 
  CHECK (funding_amount_min IS NULL OR funding_amount_max IS NULL OR funding_amount_min <= funding_amount_max);

-- Ensure valid confidence scores
ALTER TABLE grants ADD CONSTRAINT valid_confidence_score 
  CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1));

-- Ensure valid match scores
ALTER TABLE grant_matches ADD CONSTRAINT valid_match_score 
  CHECK (match_score IS NULL OR (match_score >= 0 AND match_score <= 100));

-- Ensure valid ratings in feedback
ALTER TABLE feedback ADD CONSTRAINT valid_rating 
  CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5));

-- ============================================================================
-- INITIAL DATA SETUP
-- ============================================================================

-- Insert default system settings
INSERT INTO system_settings (key, value, type, category) VALUES
  ('scraping_enabled', 'true', 'boolean', 'scraping'),
  ('max_scrape_concurrent', '5', 'number', 'scraping'),
  ('notification_batch_size', '100', 'number', 'notifications'),
  ('ai_default_model', 'gpt-4', 'string', 'ai'),
  ('max_file_upload_size', '10485760', 'number', 'files'), -- 10MB
  ('supported_file_types', '["pdf","docx","txt","doc"]', 'json', 'files')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

-- View for active grants with funder information
CREATE OR REPLACE VIEW active_grants_with_funders AS
SELECT 
  g.*,
  f.name as funder_name,
  f.type as funder_type,
  f.website as funder_website
FROM grants g
LEFT JOIN funders f ON g.funder_id = f.id
WHERE g.deadline IS NULL OR g.deadline > NOW();

-- View for user grant matches with grant details
CREATE OR REPLACE VIEW user_grant_matches_detailed AS
SELECT 
  gm.*,
  g.title as grant_title,
  g.deadline as grant_deadline,
  g.funding_amount_min,
  g.funding_amount_max,
  g.category as grant_category,
  f.name as funder_name
FROM grant_matches gm
JOIN grants g ON gm.grant_id = g.id
LEFT JOIN funders f ON g.funder_id = f.id;

-- View for scraping statistics
CREATE OR REPLACE VIEW scraping_stats AS
SELECT 
  ss.id,
  ss.url,
  ss.type,
  ss.status,
  ss.last_scraped_at,
  COUNT(sj.id) as total_jobs,
  COUNT(CASE WHEN sj.status = 'SUCCESS' THEN 1 END) as successful_jobs,
  COUNT(CASE WHEN sj.status = 'FAILED' THEN 1 END) as failed_jobs,
  AVG(sj.duration) as avg_duration,
  MAX(sj.finished_at) as last_successful_scrape
FROM scraped_sources ss
LEFT JOIN scrape_jobs sj ON ss.id = sj.source_id
GROUP BY ss.id, ss.url, ss.type, ss.status, ss.last_scraped_at;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE grants IS 'Core grants table with enhanced fields for AI processing and scraping';
COMMENT ON TABLE ai_grant_sessions IS 'Persistent AI chat sessions per user per grant';
COMMENT ON TABLE grant_rfp IS 'Uploaded or scraped RFP documents for AI context';
COMMENT ON TABLE notifications IS 'Multi-channel notification system (email, WhatsApp, in-app)';
COMMENT ON TABLE scrape_jobs IS 'Audit trail for all scraping operations';
COMMENT ON TABLE grant_tags IS 'Multi-tag classification system for grants';
COMMENT ON TABLE feedback IS 'User feedback for improving matching and grant quality';
COMMENT ON TABLE audit_log IS 'System audit trail for compliance and debugging';

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Benefitiary database schema migration completed successfully!';
  RAISE NOTICE 'Created % tables with comprehensive indexes and constraints', 
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public');
END $$;