---
inclusion: always
---

# Grant Scraping Workflow & Database Management

This document defines the complete grant scraping workflow, database interactions, and deadline management system for Benefitiary. Use this as the authoritative reference for all scraping-related implementations.

## 🕷️ Grant Scraping: Tables & Data Flow

### **Tables Involved in Scraping Process**

| Table | Role | Key Fields |
|-------|------|------------|
| `scraped_sources` | **Source Management** | `url`, `frequency`, `status`, `lastScrapedAt` |
| `scrape_jobs` | **Job Tracking** | `status`, `totalFound`, `totalInserted`, `log` |
| `grants` | **Grant Storage** | All grant data + scraping metadata |
| `funders` | **Funder Normalization** | `name`, `type`, `website` |
| `grant_tags` | **Classification** | `tag`, `source` |
| `notifications` | **Deadline Alerts** | `type`, `channel`, `sentAt` |
| `audit_log` | **System Tracking** | `action`, `entityType`, `metadata` |

---

## 📋 **Complete Scraping Scenario Example**

Let's walk through scraping the **Gates Foundation** website:

### **Step 1: Source Configuration**
```sql
-- scraped_sources table
INSERT INTO scraped_sources VALUES (
  'source_gates_001',                    -- id
  'https://gatesfoundation.org/grants',  -- url
  'FOUNDATION',                          -- type
  '2025-01-09 08:00:00',                -- lastScrapedAt
  'WEEKLY',                              -- frequency
  'ACTIVE',                              -- status
  'healthcare',                          -- category
  'Global',                              -- region
  'Gates Foundation grant opportunities', -- notes
  95.5,                                  -- successRate (95.5%)
  2340,                                  -- avgParseTime (2.34 seconds)
  2,                                     -- failCount
  NULL,                                  -- lastError
  '2025-01-01 10:00:00',                -- createdAt
  '2025-01-09 08:00:00'                 -- updatedAt
);
```

### **Step 2: Scrape Job Initiation**
```sql
-- scrape_jobs table
INSERT INTO scrape_jobs VALUES (
  'job_gates_20250109_001',             -- id
  'source_gates_001',                   -- sourceId
  'RUNNING',                            -- status
  NULL,                                 -- totalFound (will update)
  NULL,                                 -- totalInserted (will update)
  NULL,                                 -- totalUpdated (will update)
  NULL,                                 -- totalSkipped (will update)
  '2025-01-09 08:00:00',               -- startedAt
  NULL,                                 -- finishedAt (still running)
  NULL,                                 -- duration (will calculate)
  'Starting scrape of Gates Foundation grants page', -- log
  '{"user_agent": "BenefitiaryScraper/1.0", "timeout": 30000}' -- metadata
);
```

### **Step 3: Funder Normalization**
```sql
-- funders table (create or find existing)
INSERT INTO funders VALUES (
  'funder_gates_foundation',            -- id
  'Bill & Melinda Gates Foundation',    -- name
  'PRIVATE_FOUNDATION',                 -- type
  'https://gatesfoundation.org',        -- website
  'grants@gatesfoundation.org',         -- contactEmail
  '2025-01-09 08:01:00',               -- createdAt
  '2025-01-09 08:01:00'                -- updatedAt
) ON CONFLICT (id) DO NOTHING;
```

### **Step 4: Grant Data Extraction & Storage**
```sql
-- grants table (main grant record)
INSERT INTO grants VALUES (
  'grant_gates_maternal_health_2025',   -- id
  'funder_gates_foundation',            -- funderId
  'Maternal Health Innovation Challenge 2025', -- title
  'Supporting breakthrough innovations to reduce maternal mortality in Sub-Saharan Africa and South Asia. Focus on scalable, evidence-based interventions that can be implemented in low-resource settings.', -- description
  'Organizations must: 1) Be registered nonprofits or social enterprises, 2) Have 3+ years experience in maternal health, 3) Demonstrate partnerships with local health systems, 4) Show measurable impact metrics', -- eligibilityCriteria
  '2025-04-15 23:59:59',              -- deadline
  100000.00,                           -- fundingAmountMin
  750000.00,                           -- fundingAmountMax
  'https://gatesfoundation.org/grants/maternal-health-2025', -- source
  'HEALTHCARE_PUBLIC_HEALTH',          -- category
  'gatesfoundation.org',               -- scrapedFrom
  
  -- Enhanced scraping fields
  '["KE", "UG", "TZ", "NG", "IN", "BD", "PK"]', -- locationEligibility (JSON array)
  'Online Portal',                     -- applicationMethod
  'https://gatesfoundation.org/apply/maternal-health', -- applicationUrl
  '["concept_note", "budget", "impact_metrics", "partnership_letters"]', -- requiredDocuments
  0.92,                               -- confidenceScore (92% extraction confidence)
  'sha256:a1b2c3d4e5f6...',           -- contentHash (for change detection)
  'en',                               -- language
  'Gates Foundation seeks innovative solutions for maternal health in developing countries, focusing on scalable interventions with proven impact.', -- aiSummary
  '2025-04-15 23:59:59',             -- deadlineTimestamp (same as deadline)
  true,                               -- isFeatured
  'Healthcare',                       -- sector
  'Maternal Health',                  -- subCategory
  'NGO,Social Enterprise',            -- applicantType
  'GRANT',                            -- fundingType
  24,                                 -- durationMonths (2 years)
  'maternalhealth@gatesfoundation.org', -- contactEmail
  'Annual',                           -- fundingCycle
  'Sub-Saharan Africa, South Asia',   -- regionFocus
  'https://gatesfoundation.org/docs/maternal-health-rfp-2025.pdf', -- rfaPdfUrl
  '2025-01-09 07:45:00',             -- sourceUpdatedAt
  'ACTIVE',                           -- status
  
  '2025-01-09 08:02:00',             -- createdAt
  '2025-01-09 08:02:00'              -- updatedAt
);
```

### **Step 5: Multi-Tag Classification**
```sql
-- grant_tags table (multiple tags per grant)
INSERT INTO grant_tags VALUES 
  ('tag_001', 'grant_gates_maternal_health_2025', 'maternal-health', 'system'),
  ('tag_002', 'grant_gates_maternal_health_2025', 'innovation', 'system'),
  ('tag_003', 'grant_gates_maternal_health_2025', 'africa', 'system'),
  ('tag_004', 'grant_gates_maternal_health_2025', 'south-asia', 'system'),
  ('tag_005', 'grant_gates_maternal_health_2025', 'mortality-reduction', 'system'),
  ('tag_006', 'grant_gates_maternal_health_2025', 'health-systems', 'system'),
  ('tag_007', 'grant_gates_maternal_health_2025', 'scalable-solutions', 'system');
```

### **Step 6: Job Completion Update**
```sql
-- Update scrape_jobs with results
UPDATE scrape_jobs SET 
  status = 'SUCCESS',
  totalFound = 12,                     -- Found 12 grants on the page
  totalInserted = 8,                   -- 8 were new
  totalUpdated = 3,                    -- 3 were updates to existing
  totalSkipped = 1,                    -- 1 was duplicate/invalid
  finishedAt = '2025-01-09 08:05:30',
  duration = 330,                      -- 5.5 minutes
  log = 'Successfully scraped 12 grants. 8 new, 3 updated, 1 skipped. No errors.',
  metadata = '{"grants_processed": 12, "extraction_confidence_avg": 0.89, "parsing_errors": 0}'
WHERE id = 'job_gates_20250109_001';
```

### **Step 7: Audit Trail**
```sql
-- audit_log table
INSERT INTO audit_log VALUES (
  'audit_scrape_001',                  -- id
  NULL,                                -- userId (system action)
  'SCRAPE_EXECUTED',                   -- action
  'scrape_job',                        -- entityType
  'job_gates_20250109_001',           -- entityId
  '{"source": "gatesfoundation.org", "grants_found": 12, "success": true}', -- metadata
  '10.0.0.1',                         -- ipAddress (scraper server)
  'BenefitiaryScraper/1.0',           -- userAgent
  '2025-01-09 08:05:30'               -- createdAt
);
```

---

## ⏰ **Deadline Management & Expiration Handling**

### **Deadline Monitoring System**

#### **1. Automatic Deadline Notifications**
```sql
-- Query to find grants expiring in 7 days
SELECT g.id, g.title, g.deadline, u.id as user_id, u.email
FROM grants g
JOIN grant_matches gm ON g.id = gm.grant_id
JOIN users u ON gm.user_id = u.id
JOIN user_preferences up ON u.id = up.user_id
WHERE g.deadline BETWEEN NOW() AND NOW() + INTERVAL '7 days'
  AND gm.status = 'SAVED'
  AND up.deadline_reminders = true
  AND NOT EXISTS (
    SELECT 1 FROM notifications n 
    WHERE n.user_id = u.id 
    AND n.type = 'DEADLINE_REMINDER'
    AND n.metadata->>'grant_id' = g.id
    AND n.created_at > NOW() - INTERVAL '24 hours'
  );
```

#### **2. Create Deadline Notifications**
```sql
-- notifications table (7-day reminder)
INSERT INTO notifications VALUES (
  'notif_deadline_001',               -- id
  'user_12345',                       -- userId
  'DEADLINE_REMINDER',                -- type
  'Grant Deadline Approaching',       -- title
  'The "Maternal Health Innovation Challenge 2025" deadline is in 7 days (April 15, 2025). Don''t miss out!', -- message
  '/grants/grant_gates_maternal_health_2025', -- link
  false,                              -- read
  'EMAIL',                            -- channel
  NULL,                               -- sentAt (will update when sent)
  '{"grant_id": "grant_gates_maternal_health_2025", "days_remaining": 7, "deadline": "2025-04-15"}', -- metadata
  '2025-04-08 09:00:00'              -- createdAt
);
```

#### **3. Grant Expiration Handling**
```sql
-- Daily cleanup job to handle expired grants
UPDATE grants SET 
  status = 'EXPIRED',
  updated_at = NOW()
WHERE deadline < NOW() 
  AND (status IS NULL OR status != 'EXPIRED');

-- Archive expired grant matches
UPDATE grant_matches SET 
  status = 'EXPIRED'
WHERE grant_id IN (
  SELECT id FROM grants WHERE deadline < NOW()
) AND status = 'SAVED';
```

#### **4. Multi-Channel Notification Delivery**

**Email Notification:**
```sql
UPDATE notifications SET 
  sent_at = NOW(),
  metadata = metadata || '{"email_sent": true, "email_id": "email_12345"}'
WHERE id = 'notif_deadline_001' AND channel = 'EMAIL';
```

**WhatsApp Notification:**
```sql
INSERT INTO notifications VALUES (
  'notif_whatsapp_001',
  'user_12345',
  'DEADLINE_REMINDER',
  'Grant Deadline Alert 📅',
  'Hi! Your saved grant "Maternal Health Innovation" expires in 7 days. Apply now: https://benefitiary.com/grants/...',
  '/grants/grant_gates_maternal_health_2025',
  false,
  'WHATSAPP',
  NOW(),
  '{"grant_id": "grant_gates_maternal_health_2025", "whatsapp_message_id": "wa_msg_001"}',
  NOW()
);
```

#### **5. Deadline Escalation Logic**
```sql
-- Create escalating reminders (7 days, 3 days, 1 day, 6 hours)
WITH deadline_reminders AS (
  SELECT 
    g.id,
    g.title,
    g.deadline,
    CASE 
      WHEN g.deadline - NOW() <= INTERVAL '6 hours' THEN '6_hours'
      WHEN g.deadline - NOW() <= INTERVAL '1 day' THEN '1_day'
      WHEN g.deadline - NOW() <= INTERVAL '3 days' THEN '3_days'
      WHEN g.deadline - NOW() <= INTERVAL '7 days' THEN '7_days'
    END as reminder_type
  FROM grants g
  WHERE g.deadline > NOW() 
    AND g.deadline <= NOW() + INTERVAL '7 days'
)
-- Insert appropriate notifications based on timing
INSERT INTO notifications (user_id, type, title, message, metadata, channel)
SELECT 
  gm.user_id,
  'DEADLINE_REMINDER',
  CASE dr.reminder_type
    WHEN '6_hours' THEN 'URGENT: Grant deadline in 6 hours!'
    WHEN '1_day' THEN 'Final reminder: Grant deadline tomorrow'
    WHEN '3_days' THEN 'Grant deadline in 3 days'
    WHEN '7_days' THEN 'Grant deadline approaching (7 days)'
  END,
  'Grant: ' || dr.title || ' - Deadline: ' || dr.deadline,
  jsonb_build_object('grant_id', dr.id, 'reminder_type', dr.reminder_type),
  CASE dr.reminder_type
    WHEN '6_hours' THEN 'WHATSAPP'  -- Urgent via WhatsApp
    ELSE 'EMAIL'                     -- Others via email
  END
FROM deadline_reminders dr
JOIN grant_matches gm ON dr.id = gm.grant_id
WHERE gm.status = 'SAVED';
```

---

## 🔄 **Scraping Frequency & Scheduling**

### **Source Scheduling Logic**
```sql
-- Query sources ready for scraping
SELECT * FROM scraped_sources 
WHERE status = 'ACTIVE'
  AND (
    (frequency = 'DAILY' AND (last_scraped_at IS NULL OR last_scraped_at < NOW() - INTERVAL '1 day')) OR
    (frequency = 'WEEKLY' AND (last_scraped_at IS NULL OR last_scraped_at < NOW() - INTERVAL '7 days')) OR
    (frequency = 'MONTHLY' AND (last_scraped_at IS NULL OR last_scraped_at < NOW() - INTERVAL '30 days'))
  )
ORDER BY 
  CASE frequency 
    WHEN 'DAILY' THEN 1 
    WHEN 'WEEKLY' THEN 2 
    WHEN 'MONTHLY' THEN 3 
  END,
  last_scraped_at ASC NULLS FIRST;
```

## 🎯 **Implementation Guidelines**

### **Field Validation Rules**
- `confidenceScore`: Must be between 0.0 and 1.0
- `locationEligibility`: JSON array of ISO country codes
- `requiredDocuments`: JSON array of document types
- `contentHash`: SHA256 hash for change detection
- `status`: One of 'ACTIVE', 'EXPIRED', 'CLOSED'

### **Error Handling**
- Always update `scrape_jobs.log` with detailed error messages
- Increment `scraped_sources.failCount` on failures
- Store last error in `scraped_sources.lastError`
- Create audit log entries for all scraping operations

### **Performance Considerations**
- Use batch inserts for multiple grants from same source
- Update `scraped_sources.lastScrapedAt` immediately when job starts
- Use content hashing to avoid unnecessary updates
- Implement rate limiting per source domain

This workflow ensures comprehensive grant data management with full audit trails and precise deadline handling for the Benefitiary platform.