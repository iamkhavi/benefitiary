-- ============================================================================
-- BENEFITIARY SEED DATA
-- Initial data to bootstrap the Benefitiary platform
-- ============================================================================

-- ============================================================================
-- FUNDERS (Major grant-making organizations)
-- ============================================================================

INSERT INTO funders (id, name, type, website, contact_email) VALUES
  ('funder_gates', 'Bill & Melinda Gates Foundation', 'PRIVATE_FOUNDATION', 'https://www.gatesfoundation.org', 'info@gatesfoundation.org'),
  ('funder_wellcome', 'Wellcome Trust', 'PRIVATE_FOUNDATION', 'https://wellcome.org', 'grants@wellcome.org'),
  ('funder_who', 'World Health Organization', 'GOVERNMENT', 'https://www.who.int', 'funding@who.int'),
  ('funder_usaid', 'USAID', 'GOVERNMENT', 'https://www.usaid.gov', 'funding@usaid.gov'),
  ('funder_gcf', 'Green Climate Fund', 'GOVERNMENT', 'https://www.greenclimate.fund', 'info@gcf.int'),
  ('funder_mastercard', 'Mastercard Foundation', 'PRIVATE_FOUNDATION', 'https://mastercardfdn.org', 'info@mastercardfdn.org'),
  ('funder_ford', 'Ford Foundation', 'PRIVATE_FOUNDATION', 'https://www.fordfoundation.org', 'grants@fordfoundation.org'),
  ('funder_rockefeller', 'Rockefeller Foundation', 'PRIVATE_FOUNDATION', 'https://www.rockefellerfoundation.org', 'info@rockefellerfoundation.org'),
  ('funder_nih', 'National Institutes of Health', 'GOVERNMENT', 'https://www.nih.gov', 'grants@nih.gov'),
  ('funder_nsf', 'National Science Foundation', 'GOVERNMENT', 'https://www.nsf.gov', 'info@nsf.gov')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- SCRAPED SOURCES (Initial seed sources for scraping)
-- ============================================================================

INSERT INTO scraped_sources (id, url, type, frequency, status, category, region, notes) VALUES
  ('source_who_calls', 'https://www.who.int/calls-for-proposals', 'GOV', 'WEEKLY', 'ACTIVE', 'healthcare', 'Global', 'WHO global health calls'),
  ('source_usaid', 'https://www.usaid.gov/work-usaid', 'GOV', 'DAILY', 'ACTIVE', 'healthcare', 'Global', 'USAID funding opportunities'),
  ('source_gates', 'https://www.gatesfoundation.org/how-we-work/grant-opportunities', 'FOUNDATION', 'WEEKLY', 'ACTIVE', 'healthcare', 'Global', 'Gates Foundation opportunities'),
  ('source_wellcome', 'https://wellcome.org/grant-funding', 'FOUNDATION', 'WEEKLY', 'ACTIVE', 'research', 'Global', 'Wellcome Trust calls'),
  ('source_nih', 'https://grants.nih.gov/grants', 'GOV', 'WEEKLY', 'ACTIVE', 'research', 'US', 'NIH funding'),
  ('source_nsf', 'https://www.nsf.gov/funding', 'GOV', 'WEEKLY', 'ACTIVE', 'research', 'US', 'NSF programs'),
  ('source_gcf', 'https://www.greenclimate.fund/get-involved/funding', 'GOV', 'DAILY', 'ACTIVE', 'climate', 'Global', 'Green Climate Fund'),
  ('source_fao', 'https://www.fao.org/calls/en/', 'GOV', 'WEEKLY', 'ACTIVE', 'agriculture', 'Global', 'FAO funding calls'),
  ('source_worldbank', 'https://www.worldbank.org/en/projects-operations/products-and-services/financing', 'GOV', 'WEEKLY', 'ACTIVE', 'climate', 'Global', 'World Bank financing projects'),
  ('source_globalfund_women', 'https://www.globalfundforwomen.org/grants', 'FOUNDATION', 'WEEKLY', 'ACTIVE', 'gender', 'Global', 'Global Fund for Women'),
  ('source_ford', 'https://www.fordfoundation.org/work/our-grants', 'FOUNDATION', 'WEEKLY', 'ACTIVE', 'human_rights', 'Global', 'Ford Foundation'),
  ('source_mastercard', 'https://mastercardfdn.org/', 'FOUNDATION', 'WEEKLY', 'ACTIVE', 'sme', 'Africa', 'Mastercard Foundation programs'),
  ('source_grants_gov', 'https://grants.gov', 'GOV', 'DAILY', 'ACTIVE', 'small_business', 'US', 'US Federal grant listings'),
  ('source_cordis', 'https://cordis.europa.eu/en/opportunities', 'GOV', 'WEEKLY', 'ACTIVE', 'research', 'EU', 'EU CORDIS'),
  ('source_pfizer', 'https://pfizer.com/science/grants', 'CORPORATE', 'WEEKLY', 'ACTIVE', 'healthcare', 'Global', 'Pfizer Global Medical Grants'),
  ('source_unwomen', 'https://www.unwomen.org/en/funding', 'GOV', 'WEEKLY', 'ACTIVE', 'gender', 'Global', 'UN Women funding'),
  ('source_unep', 'https://www.unep.org/funding', 'GOV', 'WEEKLY', 'ACTIVE', 'climate', 'Global', 'UNEP environmental calls'),
  ('source_microsoft', 'https://about.microsoft.com/en-us/corporate-responsibility/', 'CORPORATE', 'MONTHLY', 'ACTIVE', 'sme', 'Global', 'Microsoft CSR'),
  ('source_cocacola', 'https://www.coca-colacompany.com/shared-value', 'CORPORATE', 'MONTHLY', 'ACTIVE', 'csr', 'Global', 'Coca-Cola Foundation programs'),
  ('source_rockefeller', 'https://www.rockefellerfoundation.org/grants/', 'FOUNDATION', 'WEEKLY', 'ACTIVE', 'agriculture', 'Global', 'Rockefeller Foundation calls')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- SAMPLE GRANTS (For testing and demonstration)
-- ============================================================================

INSERT INTO grants (id, funder_id, title, description, eligibility_criteria, deadline, funding_amount_min, funding_amount_max, category, application_url, sector, applicant_type, funding_type, language) VALUES
  (
    'grant_gates_health_1',
    'funder_gates',
    'Global Health Innovation Challenge',
    'Supporting innovative solutions to improve health outcomes in low-resource settings. Focus areas include maternal health, infectious diseases, and health system strengthening.',
    'Organizations working in Sub-Saharan Africa or South Asia with demonstrated experience in health innovation. Must be registered nonprofit or social enterprise.',
    '2025-03-15'::date,
    50000,
    500000,
    'HEALTHCARE_PUBLIC_HEALTH',
    'https://www.gatesfoundation.org/apply/health-innovation',
    'Healthcare',
    'NGO',
    'GRANT',
    'en'
  ),
  (
    'grant_gcf_climate_1',
    'funder_gcf',
    'Climate Resilience for Smallholder Farmers',
    'Building climate resilience among smallholder farmers through innovative agricultural practices and technology solutions.',
    'Agricultural organizations, cooperatives, or NGOs working directly with smallholder farmers in climate-vulnerable regions.',
    '2025-04-30'::date,
    100000,
    2000000,
    'CLIMATE_ENVIRONMENT',
    'https://www.greenclimate.fund/apply/agriculture',
    'Agriculture',
    'NGO',
    'GRANT',
    'en'
  ),
  (
    'grant_mastercard_youth_1',
    'funder_mastercard',
    'Young Africa Works Initiative',
    'Creating economic opportunities for young people in Africa through skills development, entrepreneurship support, and job creation programs.',
    'Organizations based in Africa working on youth employment, skills development, or entrepreneurship. Must demonstrate measurable impact.',
    '2025-02-28'::date,
    25000,
    1000000,
    'WOMEN_YOUTH_EMPOWERMENT',
    'https://mastercardfdn.org/apply/youth-employment',
    'Education',
    'NGO',
    'GRANT',
    'en'
  ),
  (
    'grant_nih_research_1',
    'funder_nih',
    'Innovative Biomedical Research Program',
    'Supporting early-stage biomedical research with potential for significant health impact. Open to novel approaches in disease prevention, diagnosis, and treatment.',
    'Academic institutions, research organizations, and qualified investigators with relevant expertise in biomedical sciences.',
    '2025-05-15'::date,
    75000,
    750000,
    'HEALTHCARE_PUBLIC_HEALTH',
    'https://grants.nih.gov/apply/biomedical-innovation',
    'Research',
    'Academic',
    'GRANT',
    'en'
  ),
  (
    'grant_ford_rights_1',
    'funder_ford',
    'Human Rights Defenders Support Fund',
    'Strengthening the capacity and security of human rights defenders working in challenging environments worldwide.',
    'Human rights organizations, civil society groups, and individual defenders facing persecution or working in high-risk environments.',
    '2025-06-01'::date,
    10000,
    200000,
    'HUMAN_RIGHTS_GOVERNANCE',
    'https://www.fordfoundation.org/apply/human-rights',
    'Human Rights',
    'NGO',
    'GRANT',
    'en'
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- GRANT TAGS (Multi-tag classification)
-- ============================================================================

INSERT INTO grant_tags (grant_id, tag, source) VALUES
  ('grant_gates_health_1', 'maternal-health', 'system'),
  ('grant_gates_health_1', 'infectious-diseases', 'system'),
  ('grant_gates_health_1', 'health-systems', 'system'),
  ('grant_gates_health_1', 'innovation', 'system'),
  ('grant_gates_health_1', 'africa', 'system'),
  ('grant_gates_health_1', 'asia', 'system'),
  
  ('grant_gcf_climate_1', 'climate-change', 'system'),
  ('grant_gcf_climate_1', 'agriculture', 'system'),
  ('grant_gcf_climate_1', 'smallholder-farmers', 'system'),
  ('grant_gcf_climate_1', 'resilience', 'system'),
  ('grant_gcf_climate_1', 'technology', 'system'),
  
  ('grant_mastercard_youth_1', 'youth-employment', 'system'),
  ('grant_mastercard_youth_1', 'skills-development', 'system'),
  ('grant_mastercard_youth_1', 'entrepreneurship', 'system'),
  ('grant_mastercard_youth_1', 'africa', 'system'),
  ('grant_mastercard_youth_1', 'job-creation', 'system'),
  
  ('grant_nih_research_1', 'biomedical-research', 'system'),
  ('grant_nih_research_1', 'disease-prevention', 'system'),
  ('grant_nih_research_1', 'diagnosis', 'system'),
  ('grant_nih_research_1', 'treatment', 'system'),
  ('grant_nih_research_1', 'innovation', 'system'),
  
  ('grant_ford_rights_1', 'human-rights', 'system'),
  ('grant_ford_rights_1', 'civil-society', 'system'),
  ('grant_ford_rights_1', 'defenders', 'system'),
  ('grant_ford_rights_1', 'security', 'system'),
  ('grant_ford_rights_1', 'capacity-building', 'system')
ON CONFLICT (grant_id, tag) DO NOTHING;

-- ============================================================================
-- SYSTEM SETTINGS (Configuration values)
-- ============================================================================

INSERT INTO system_settings (key, value, type, category) VALUES
  ('scraping_enabled', 'true', 'boolean', 'scraping'),
  ('max_scrape_concurrent', '5', 'number', 'scraping'),
  ('scrape_delay_seconds', '2', 'number', 'scraping'),
  ('notification_batch_size', '100', 'number', 'notifications'),
  ('ai_default_model', 'gpt-4', 'string', 'ai'),
  ('ai_max_tokens', '4000', 'number', 'ai'),
  ('max_file_upload_size', '10485760', 'number', 'files'),
  ('supported_file_types', '["pdf","docx","txt","doc","rtf"]', 'json', 'files'),
  ('email_notifications_enabled', 'true', 'boolean', 'notifications'),
  ('whatsapp_notifications_enabled', 'false', 'boolean', 'notifications'),
  ('match_score_threshold', '70', 'number', 'matching'),
  ('auto_match_enabled', 'true', 'boolean', 'matching'),
  ('deadline_reminder_days', '7', 'number', 'notifications'),
  ('max_grants_per_user', '1000', 'number', 'limits'),
  ('max_ai_sessions_per_user', '50', 'number', 'limits')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Benefitiary seed data inserted successfully!';
  RAISE NOTICE 'Created:';
  RAISE NOTICE '- % funders', (SELECT COUNT(*) FROM funders);
  RAISE NOTICE '- % scraped sources', (SELECT COUNT(*) FROM scraped_sources);
  RAISE NOTICE '- % sample grants', (SELECT COUNT(*) FROM grants);
  RAISE NOTICE '- % grant tags', (SELECT COUNT(*) FROM grant_tags);
  RAISE NOTICE '- % system settings', (SELECT COUNT(*) FROM system_settings);
END $$;