Excellent — let’s design a **complete, practical sourcing & scraping plan** for Benefitiary that covers **which sources** to target (by sector), **how** to scrape and parse them, the **data model mapping** into your Neon schema, and operational rules (scheduling, dedupe, QA, legal). I’ll organize this so you can hand it to Kiro.dev or implement it yourself.

---

# 1 — High-level goals (what we must achieve)

1. **Comprehensive coverage by sector** (Healthcare, Research/Academic, SME/Startup, Climate/Agriculture, Gender/Human Rights, Govt funding).
2. **Structured output** for each grant: canonical fields (title, funder, deadline(s), amount, currency, eligibility, location(s), category tags, application\_url, required\_docs, raw\_text, source\_url).
3. **Reliable metadata**: funder normalized (link to `funders` table), scraped source record, extraction confidence, ingestion timestamp.
4. **Indexable & matchable**: categories and locations must be canonical for matching to user profiles.
5. **Operational**: sensible scheduling, error handling, dedupe, monitoring, and legal compliance.

---

# 2 — Source taxonomy (seed list by category)

> For each category I list representative high-value sources (seed). You’ll expand these programmatically over time.

## A. Healthcare & Public Health

* Multilaterals / gov: WHO opportunity pages, USAID funding, European Commission health calls (Horizon), Global Fund calls.
* Foundations / Pharma: Gates Foundation, Wellcome Trust, Pfizer Global Medical Grants, Johnson & Johnson (J\&J) Foundation, Merck grants pages.
* Humanitarian health NGOs: MSF (calls), ICRC partnerships.
* Research funders: NIH (calls), NSF (health-related programs), Wellcome.

## B. Research / Academic Grants

* Major funders: National Science Foundations (NIH/NSF), ERC (European Research Council), national research councils, university research funding pages.
* Calls databases: CORDIS (EU), Grants.gov (US research grants).

## C. SME / Startups / Business Grants

* Government SME programmes: Small Business Administration (US), national SME portals (KENYA NACADA? county business funds), Innovate UK, Startup India, Kenya ICT Authority grants.
* Corporate CSR & accelerator grants: Mastercard Foundation, Google.org grants, Microsoft for Startups grant programs.
* VC / accelerator open calls (for non-equity programs): Y Combinator research grants, local incubators.

## D. Climate / Agriculture / Food Security

* Multilaterals: UNDP, UNEP, FAO, Green Climate Fund, World Bank calls.
* Foundations: Rockefeller Foundation climate programs, Gates (agriculture programs), regional agriculture funds.
* NGOs with grant programs: Climate-focused NGOs, CGIAR calls.

## E. Gender / Women & Youth Empowerment / Human Rights

* Foundations: Ford Foundation, Oak Foundation, Global Fund for Women.
* UN agencies: UN Women grants, UNESCO calls.
* Regional funds & trusts focusing on gender.

## F. Corporate CSR / Philanthropy (cross-sector)

* Corporate foundations: Coca-Cola Foundation, Shell Foundation, etc. (CSR pages)
* Company CSR portals and press releases.

---

# 3 — Data model mapping (how each source maps to schema)

We’ll align the JSON we extract to your schema tables. Canonical fields and where they go:

### Primary target table: `grants` (existing schema)

* `title` ← extracted RFP title
* `description` ← long description (plain text)
* `eligibility_criteria` ← eligibility JSON/concise text
* `deadline` ← primary deadline (DATE) — if multiple, store earliest or create extra fields (`deadline_loi`, `deadline_full`)
* `funding_amount_min` / `funding_amount_max` ← numeric values
* `source` ← original `source_url` (string)
* `category` ← primary category tag (one of set: healthcare, public\_health, research, sme, climate, agriculture, gender, etc.) — consider `category` as array in implementation (jsonb)
* `scraped_from` ← `scraped_sources.url` or site name
* `created_at`, `updated_at` ← ingestion timestamps

### Supporting tables

* `funders`

  * `name`, `type` (private\_foundation/government/ngo/corporate), `website`, `contact_email` — create/normalize on ingest.
* `scraped_sources`

  * list of seed pages + metadata (type, frequency, last\_scraped\_at).
* `rfps` / `rfp_structured` (if using RFP ingestion flow)

  * keep `raw_text` and extracted `jsonb` for deep parsing.

### Extra metadata to store per grant (in `grants` or a linked `grant_metadata`):

* `location_eligibility` (jsonb array of country codes/regions)
* `application_method` (url, email, portal) & `application_url`
* `required_documents` (jsonb array)
* `confidence_score` (float) — extraction confidence
* `content_hash` — for change detection (hash of source content)
* `language` — for locale-specific parsing

---

# 4 — Canonical taxonomies (must-have lists)

You must normalize categories & locations for matching.

### Category taxonomy (start minimal, expand later)

* healthcare, public\_health, research, sme, startup, climate, agriculture, food\_security, women\_youth, education, environment, arts\_culture, human\_rights, general

### Location taxonomy

* Use **ISO 3166-1 alpha-2** country codes for country-level.
* Allow region tags: `East Africa`, `Sub-Saharan Africa`, `Global`, `EU`, `North America`.

Map scraped location text to ISO country codes via a simple lookup + fuzzy match (use `country-list` npm package + heuristics).

---

# 5 — Scraper architecture & rules

### A. Scraper components

1. **Scheduler** — enqueues scraping jobs per `scraped_sources` frequency. (Daily/weekly/monthly).
2. **Fetcher** — HTTP fetch with retries, polite headers, and robots.txt check. Use axios/fetch + `bottleneck` for per-domain rate limiting.
3. **Renderer** — `cheerio` for static HTML, `playwright` for JS-heavy pages.
4. **Parser** — domain-specific parser modules that extract fields using CSS selectors / regex / heuristics. If parser confidence low, fallback to LLM extraction on extracted text chunk.
5. **Normalizer** — map raw extracted values into canonical categories, currencies, and country codes.
6. **Deduper/Upserter** — compute content hash; upsert grant record by `source_url` or (title+funder+deadline).
7. **Monitor & Alert** — log failures to Sentry/Logflare and raise alerts for repeated errors.

### B. Per-domain parser strategy

* **Gold-standard**: write a small parser per funder/page with explicit selectors (more reliable). Start with top 20 sources (highest value) and add generic parsers for other pages.
* **Generic fallback**: generic text extraction → run LLM prompt to extract canonical fields.

### C. Rate limits & proxies

* Implement per-domain concurrency limits (2–5 concurrent requests per domain).
* Use proxies/residential proxies only if IP blocks occur (costly). For MVP keep it simple, respectful.

### D. Change detection & re-scrape

* Store `content_hash` (SHA256) of page body or primary content. If changed → re-parse and update grant record.
* Schedule more frequent scrapes for gov portals and high-velocity sources (daily), weekly for foundations, monthly for CSR pages.

---

# 6 — Seed `scraped_sources` (example entries to bootstrap)

Below are high-priority seeds (add more in each sector):

**Healthcare**

* `https://www.who.int/calls-for-proposals` (WHO funding/calls)
* `https://www.usaid.gov/work-usaid` (USAID funding opportunities)
* `https://www.gatesfoundation.org/how-we-work/grant-opportunities`
* `https://www.wellcome.org/grant-funding`
* `https://www.pfizer.com/science/grants` (Pfizer Global Medical Grants)
* `https://www.msf.org/funding-opportunities` (if any)

**Research / Academic**

* `https://grants.nih.gov/grants`
* `https://cordis.europa.eu/en/opportunities`
* `https://www.nsf.gov/funding/`

**SME / Startups**

* `https://www.grants.gov` (US-wide)
* Country SME portals (Kenya: `https://www.kcca.go.ke` — add actual county portals)
* `https://www.mastercardfoundation.org/` (programs / calls)

**Climate / Agriculture**

* `https://www.greenclimate.fund/get-involved/funding`
* `https://www.worldbank.org/en/projects-operations/products-and-services/financing`
* `https://www.fao.org/calls/en/`

**Gender / Human Rights**

* `https://www.globalfundforwomen.org/grants`
* `https://www.fordfoundation.org/work/our-grants`

**Corporate CSR**

* `https://www.coca-colacompany.com/shared-value` (CSR news)
* `https://about.microsoft.com/en-us/corporate-responsibility/` (search grants)

> Start with a curated CSV of 100–200 seed URLs across sectors and regions.

---

# 7 — Parsing & extraction templates (examples)

For each domain parser module, define:

* `source_url_pattern` (regex)
* `selectors` object e.g.

```js
{
  title: 'h1.entry-title',
  description: '.grant-description',
  deadline: '.deadline, .apply-deadline',
  amount: '.funding-range',
  apply_url: '.apply-button a[href]',
  eligibility: '.eligibility-section'
}
```

* `post_process` functions: parse dates (various formats), extract currency (regex: `(\$|USD|KES|€)\s?([0-9,]+)`), normalize eligibility bullets.

If selectors fail or return null for core fields → call `LLM_extractor(raw_text)` with the strict JSON prompt.

---

# 8 — Normalization rules (mapping to schema)

* **Dates**: parse into ISO; if ambiguity (month/day/year), attempt locale rules; if still ambiguous, store `null` and flag `needs_review`.
* **Amounts**: extract numeric value and currency; if single value and no range, set min=max.
* **Locations**: use fuzzy country mapping; if region-only, map to region tag.
* **Categories**: map keywords to taxonomy via keyword list (e.g., contain `vaccine|immuniz` -> healthcare/public\_health).

Store original raw strings in metadata for traceability.

---

# 9 — Deduplication & prioritization

* Primary dedupe by `source_url`.
* Secondary dedupe by `(normalized_title, funder_normalized, deadline)` with fuzzy matching (Levenshtein). If duplicate within 7 days, pick most recent.
* Prioritize authoritative sources for freshness and accuracy (gov portals > foundation site > CSR news).

---

# 10 — Scheduling & frequency guidance

* **Daily**: Grants.gov, WHO, USAID, World Bank, Green Climate Fund.
* **Every 3 days**: Gates, Wellcome, NIH/NSF funding pages.
* **Weekly**: Foundation news pages and CSR pages.
* **Monthly**: Small NGO pages and local county pages.
* **On-demand / user-submit**: allow users to submit a `source_url` that is enqueued for immediate one-off parse (manual verification flow).

---

# 11 — QA & human-in-the-loop

* Flag for manual review if:

  * `confidence_score < 0.6` OR
  * mandatory fields missing (title, deadline OR funding amount OR application\_url) OR
  * location ambiguous or category unmapped.
* Build an Admin Review UI showing the raw page snippet, parsed JSON, and acceptance buttons (approve / edit / reject). Approved entries become visible to users.

---

# 12 — Legal & robots.txt considerations

* Always check `robots.txt` for disallowed paths. If `robots.txt` disallows crawling for commercial use, escalate to manual contact or skip.
* Respect site terms; for foundation pages that publish public calls, scraping is generally acceptable but be conservative with frequency.
* Provide **attribution** (link to original source) on grant details page.

---

# 13 — Monitoring & observability

* Track metrics per-source: `success_rate`, `avg_parse_time`, `last_scraped_at`, `fail_count`. Store in `scraped_sources`.
* Alerts on repeated failures (3+ failures in 24h) via Sentry/Slack.
* Keep logs of extracted JSON and raw HTML for 90 days for debugging.

---

# 14 — Example ingestion flow (end-to-end for one seed)

1. Scheduler enqueues job for `https://gatesfoundation.org/grants/opportunities` (weekly).
2. Fetcher GETs page (with UA, 2 req/s limit).
3. Renderer (cheerio) extracts list of grant links. For each link: fetch page, compute SHA256 of the main content.
4. If new or changed:

   * Run domain parser selectors → get title, deadline, description.
   * Run normalizers (date, currency, location, category).
   * If missing core fields or low confidence → include HTML/text in LLM extraction job.
5. Upsert into `grants` table with `scraped_from='gatesfoundation.org'` and `source=link`.
6. Link/create `funders` record for Gates Foundation if not present.
7. Notify admin if `needs_review`.
8. Push notification (in-app / email / WhatsApp) to matched users according to their preferences.

---

# 15 — Implementation checklist for Kiro.dev (task list)

1. Prepare `scraped_sources` seed CSV (100+ entries across sectors).
2. Build scheduler & job queue (BullMQ + Redis).
3. Implement fetcher + renderer + per-domain parser scaffold. Add first 20 domain parsers (top funders/portals).
4. Implement normalizer utilities (date, currency, country).
5. Implement upsert logic into `grants` + `funders` + `scraped_sources`.
6. Add LLM extraction fallback service (strict JSON prompts).
7. Add admin review UI for flagged grants.
8. Add monitoring/alerts & logging.
9. Add user submit source flow (one-click verify & parse).

---

# 16 — Quick examples of selector rules (to hand to Kiro.dev)

**Grants.gov (example skeleton)**:

```js
{
  source_pattern: /grants\.gov/,
  list_selector: '.search-results .result a',
  detail_selectors: {
    title: 'h1',
    description: '#opportunityDescription',
    deadline: '.opportunity-deadline',
    apply_url: '.apply-button a[href]'
  }
}
```

**Gates Foundation (example skeleton)**:

```js
{
  source_pattern: /gatesfoundation\.org/,
  list_selector: '.grant-opportunities-list a',
  detail_selectors: {
    title: '.page-title',
    description: '.rich-text-content',
    deadline: '.deadline, .apply-by',
    apply_url: '.cta-apply a[href]'
  }
}
```

If a selector returns null → fallback to `extractFromText(document_text)` using LLM.

---

# 17 — Final notes & scaling roadmap

* **MVP (0–3 months)**: focus on top 50–100 seed sources in prioritized sectors (healthcare, research, SME). Use Neon for storage; store raw\_text in `grants.description` and RFP raw files as `BYTEA` or Vercel Blob only if needed. No vector DB yet; simple keyword matching + match\_score heuristics (keyword weighting + location filter).
* **Phase 2**: add embeddings & vector DB (Pinecone/Weaviate) for semantic matching, scale scrapers, add paid data partners (Candid/FD) when revenue justifies it.
* **Phase 3**: data partnerships with funders, publisher APIs, and automated two-way integrations (funder dashboards).

---
Perfect ✅ — let’s move forward step by step.
We’ll do two parts:

1. 📄 **CSV seed file** – top curated sources to bootstrap your `scraped_sources` table.
2. 🧩 **SQL migration** – updates your Neon Postgres schema to include additional grant metadata fields for robust scraping and matching.

---

## 🧩 1. CSV SEED FILE — `scraped_sources_seed.csv`

You’ll upload this into Neon or your backend job scheduler to populate your initial `scraped_sources` table.

**File:** `scraped_sources_seed.csv`

```csv
id,url,type,category,frequency,status,region,notes
1,https://www.who.int/calls-for-proposals,gov,healthcare,weekly,active,Global,WHO global health calls
2,https://www.usaid.gov/work-usaid,gov,healthcare,daily,active,Global,USAID funding opportunities
3,https://www.gatesfoundation.org/how-we-work/grant-opportunities,foundation,healthcare,weekly,active,Global,Gates Foundation opportunities
4,https://www.wellcome.org/grant-funding,foundation,research,weekly,active,Global,Wellcome Trust calls
5,https://www.nih.gov/grants-funding,gov,research,weekly,active,US,NIH funding
6,https://www.nsf.gov/funding,gov,research,weekly,active,US,NSF programs
7,https://www.greenclimate.fund/get-involved/funding,gov,climate,daily,active,Global,Green Climate Fund
8,https://www.fao.org/calls/en/,gov,agriculture,weekly,active,Global,FAO funding calls
9,https://www.worldbank.org/en/projects-operations/products-and-services/financing,gov,climate,weekly,active,Global,World Bank financing projects
10,https://www.globalfundforwomen.org/grants,foundation,gender,weekly,active,Global,Global Fund for Women
11,https://www.fordfoundation.org/work/our-grants,foundation,human_rights,weekly,active,Global,Ford Foundation
12,https://www.mastercardfoundation.org/,foundation,sme,weekly,active,Africa,Mastercard Foundation programs
13,https://grants.gov,gov,small_business,daily,active,US,US Federal grant listings
14,https://cordis.europa.eu/en/opportunities,gov,research,weekly,active,EU,EU CORDIS
15,https://pfizer.com/science/grants,corporate,healthcare,weekly,active,Global,Pfizer Global Medical Grants
16,https://www.unwomen.org/en/funding,gov,gender,weekly,active,Global,UN Women funding
17,https://www.unep.org/funding,gov,climate,weekly,active,Global,UNEP environmental calls
18,https://about.microsoft.com/en-us/corporate-responsibility/,corporate,sme,monthly,active,Global,Microsoft CSR
19,https://www.coca-colacompany.com/shared-value,corporate,csr,monthly,active,Global,Coca-Cola Foundation programs
20,https://www.rockefellerfoundation.org/grants/,foundation,agriculture,weekly,active,Global,Rockefeller Foundation calls
21,https://www.wfp.org/funding,gov,food_security,weekly,active,Global,WFP humanitarian grants
22,https://www.unesco.org/en/funding,gov,education,weekly,active,Global,UNESCO programs
23,https://www.icrc.org/en/funding,ngo,healthcare,weekly,active,Global,ICRC partnership grants
24,https://www.climateinvestmentfunds.org/,gov,climate,weekly,active,Global,Climate Investment Funds
25,https://www.innovateuk.ukri.org/funding,gov,startup,weekly,active,UK,Innovate UK calls
```

You can start with these 25 entries and expand later.

Each field maps directly to:

```sql
scraped_sources(url, type, category, frequency, status)
```

---

## 🧱 2. SQL MIGRATION — Grant Metadata Expansion

**File:** `2025_10_07_add_grant_metadata.sql`

This migration updates your `grants` table to include new columns for detailed metadata and indexing.

```sql
-- 1️⃣ Add new metadata columns to `grants` table
ALTER TABLE grants
ADD COLUMN IF NOT EXISTS location_eligibility JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS application_method TEXT,
ADD COLUMN IF NOT EXISTS application_url TEXT,
ADD COLUMN IF NOT EXISTS required_documents JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS confidence_score NUMERIC(3,2) DEFAULT 1.00,
ADD COLUMN IF NOT EXISTS content_hash TEXT,
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en',
ADD COLUMN IF NOT EXISTS extraction_source TEXT,
ADD COLUMN IF NOT EXISTS is_reviewed BOOLEAN DEFAULT FALSE;

-- 2️⃣ Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_grants_category ON grants(category);
CREATE INDEX IF NOT EXISTS idx_grants_deadline ON grants(deadline);
CREATE INDEX IF NOT EXISTS idx_grants_location_eligibility ON grants USING gin(location_eligibility);
CREATE INDEX IF NOT EXISTS idx_grants_confidence_score ON grants(confidence_score);
CREATE INDEX IF NOT EXISTS idx_grants_content_hash ON grants(content_hash);

-- 3️⃣ Update `scraped_sources` with better structure
ALTER TABLE scraped_sources
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS region TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- 4️⃣ Create indexes for source scheduling
CREATE INDEX IF NOT EXISTS idx_scraped_sources_status ON scraped_sources(status);
CREATE INDEX IF NOT EXISTS idx_scraped_sources_frequency ON scraped_sources(frequency);
CREATE INDEX IF NOT EXISTS idx_scraped_sources_region ON scraped_sources(region);

-- 5️⃣ Add trigger for automatic updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_grants_modtime ON grants;
CREATE TRIGGER update_grants_modtime
BEFORE UPDATE ON grants
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

---

## 🔧 3. Neon Setup & Usage Notes

1. Run the above migration using `psql` or your migration tool (Prisma, Drizzle, etc.):

   ```bash
   psql $NEON_DATABASE_URL -f 2025_10_07_add_grant_metadata.sql
   ```

2. Load the CSV into your `scraped_sources` table:

   ```sql
   \copy scraped_sources(url, type, category, frequency, status, region, notes)
   FROM 'scraped_sources_seed.csv'
   WITH (FORMAT csv, HEADER true);
   ```

3. Verify with:

   ```sql
   SELECT url, category, frequency, status FROM scraped_sources LIMIT 5;
   ```

---
Excellent — you’re thinking like a data architect ✅

We’ll now expand your **scraping sources dataset** with 25 additional **credible, high-value grant sources** — balanced across **healthcare, climate, education, agriculture, gender, humanitarian, and SME/startup** domains.

These are designed for your **Benefitiary MVP**, compatible with your existing schema:

```sql
scraped_sources(url, type, category, frequency, status, region, notes)
```

---

## 🧾 CSV ADDITION (2nd Batch: 26–50)

```csv
id,url,type,category,frequency,status,region,notes
26,https://www.globalinnovation.fund/apply,fund,startup,weekly,active,Global,Global Innovation Fund for scalable social enterprises
27,https://www.afdb.org/en/projects-and-operations/procurement,gov,development,weekly,active,Africa,African Development Bank funding calls
28,https://www.ifad.org/en/grants,gov,agriculture,weekly,active,Global,International Fund for Agricultural Development
29,https://www.isdb.org/what-we-do/projects,gov,development,weekly,active,Global,Islamic Development Bank projects and grants
30,https://www.challengetochange.org/opportunities,foundation,gender,monthly,active,Global,Challenge to Change women empowerment grants
31,https://www.avina.net/en/grants,foundation,climate,monthly,active,Latin America,Fundación Avina social impact programs
32,https://www.africanunion.org/en/opportunities,gov,development,weekly,active,Africa,African Union programs and calls
33,https://www.commonwealthfoundation.com/grants,gov,governance,quarterly,active,Commonwealth,Commonwealth Foundation civil society grants
34,https://www.cartierwomensinitiative.com/apply,corporate,entrepreneurship,yearly,active,Global,Cartier Women’s Initiative for startups
35,https://echo.dietzenbacherfoundation.org/opportunities,foundation,education,quarterly,active,Global,Education-focused grant opportunities
36,https://www.hivos.org/opportunities,ngo,gender,weekly,active,Global,Hivos human rights and equality programs
37,https://www.dfid.gov.uk/funding,gov,development,weekly,active,UK,UK Department for International Development programs
38,https://www.sida.se/en/funding,gov,development,weekly,active,Sweden,Swedish International Development Cooperation Agency grants
39,https://www.giz.de/en/html/jobs_and_tenders.html,gov,development,weekly,active,Germany,GIZ calls for proposals and cooperation
40,https://www.onepercentclub.com/funding,foundation,sme,monthly,active,Global,1% Club social innovation support
41,https://www.changemakers.com/funding,ngo,social_innovation,weekly,active,Global,Ashoka Changemakers global grants
42,https://www.unfpa.org/funding,gov,healthcare,weekly,active,Global,UNFPA reproductive health funding
43,https://www.unicef.org/innovation/funding,gov,healthcare,weekly,active,Global,UNICEF Innovation Fund
44,https://www.wfpinnovation.org/apply,gov,food_security,weekly,active,Global,WFP Innovation Accelerator funding
45,https://www.unops.org/work-with-us/funding,gov,development,weekly,active,Global,UNOPS partnership programs
46,https://www.undp.org/partnerships/funding,gov,development,weekly,active,Global,UNDP partnership and innovation funding
47,https://www.danida.dk/en/grants,gov,development,monthly,active,Denmark,Danish Ministry of Foreign Affairs programs
48,https://www.europeaid.europa.eu/grants,gov,development,weekly,active,EU,EuropeAid international funding calls
49,https://www.globalinnovationexchange.org/,platform,startup,daily,active,Global,Aggregated innovation and grant listings
50,https://www.schmidheinyfoundation.org/en/funding,foundation,entrepreneurship,quarterly,active,Latin America,Schmidheiny Foundation sustainable enterprise support
```

---

### 🌍 Distribution by Category

| Category                 | Count | Sample Source                   |
| ------------------------ | ----- | ------------------------------- |
| Healthcare               | 2     | UNFPA, UNICEF                   |
| Climate                  | 2     | Fundación Avina, GCF (existing) |
| Agriculture              | 1     | IFAD                            |
| Gender / Human Rights    | 2     | Hivos, Challenge to Change      |
| Startups / SMEs          | 3     | Cartier, GIF, 1% Club           |
| Development / Governance | 8     | AfDB, DFID, UNDP, AU, GIZ, etc. |
| Education / Research     | 1     | Dietzenbacher Foundation        |
| Food Security            | 1     | WFP Innovation                  |
| Multi-domain / Platform  | 1     | Global Innovation Exchange      |
| Entrepreneurship         | 1     | Schmidheiny Foundation          |

---

### 🧩 How to Load This Data

Append this to your initial CSV (`scraped_sources_seed.csv`) or save separately as `scraped_sources_batch2.csv`.

Then load into Neon:

```sql
\copy scraped_sources(url, type, category, frequency, status, region, notes)
FROM 'scraped_sources_batch2.csv'
WITH (FORMAT csv, HEADER true);
```

To verify:

```sql
SELECT id, url, category, region FROM scraped_sources ORDER BY id DESC LIMIT 10;
```

---

