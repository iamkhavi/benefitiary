# Benefitiary – Day 1 Engineering Blueprint

## 📌 Overview
Benefitiary (benefitiary.com) is a SaaS B2B platform connecting **SMEs, nonprofits, and healthcare/public health organizations** with grant opportunities.  
It also supports **grant writers** and **funders** to collaborate in a single ecosystem.  

Goal: Provide **grant discovery, proposal assistance (AI-powered), and tracking** in a clean, modern, production-ready UI.

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router, React Server Components)
- **Styling**: TailwindCSS + shadcn/ui (modern, clean, no blue-heavy gradients)
- **State**: React Query (TanStack Query) for data fetching & caching
- **Icons**: Lucide React (consistent & modern)
- **Fonts**: Inter / Source Sans (Google Fonts)

### Backend
- **Language/Runtime**: Node.js (TypeScript)
- **Framework**: Next.js API routes OR Express (if separated)
- **Database**: Neon (serverless Postgres)
- **ORM**: Prisma
- **Auth**: BetterAuth (with DodoPayments integration)
- **Scraping**: Node.js scrapers (Cheerio + Playwright for dynamic sites)
- **AI Proposal Writing**: OpenAI API integration (later phase)

### Infra & DevOps
- **Hosting**: Vercel (both domains)
  - `benefitiary.com` → Marketing site (lightweight)
  - `app.benefitiary.com` → Console app (full stack)
- **Database**: Neon (serverless Postgres) - Console app only
- **Storage**: Neon for DB, optional S3 (for file uploads later)
- **Payments**: DodoPayments (BetterAuth adapter) - Console app only
- **Monitoring**: Logtail / Sentry

---

## 📂 Repository Architecture

### **Two-Repository Structure**
```
benefitiary-marketing/          # Landing page (benefitiary.com)
├── src/app/                   # Next.js App Router
├── src/components/            # Marketing components
├── tailwind.config.ts         # Styling configuration
├── package.json               # Lightweight dependencies
└── vercel.json               # Deployment config

benefitiary/                   # Console app (app.benefitiary.com)  
├── src/app/                   # Next.js App Router
├── src/components/            # App components
├── prisma/                    # Database schema & migrations
├── src/lib/                   # Auth, payments, utilities
├── package.json               # Full app dependencies
└── .env                       # Environment variables
```

### **Domain Mapping**
- **Marketing**: `https://benefitiary.com` → `benefitiary-marketing` repo
- **Console**: `https://app.benefitiary.com` → `benefitiary` repo (this repo)


---

## 🗄️ Database Schema (Neon + Prisma)

### Tables
**users**
- id (uuid, pk)
- email (string, unique)
- password_hash (string, via BetterAuth)
- role (enum: seeker, writer, funder)
- created_at, updated_at

**organizations**
- id (uuid, pk)
- user_id (fk → users)
- name (string)
- org_type (enum: SME, Nonprofit, Academic, Healthcare, Other)
- org_size (enum: Solo, Micro, Small, Medium, Large)
- country (string)
- region (string, nullable)

**user_preferences**
- id (uuid, pk)
- user_id (fk → users)
- categories (array of enums)

**grants**
- id (uuid, pk)
- title (string)
- description (text)
- funder (string)
- category (enum or array)
- deadline (date, nullable)
- location_eligibility (string[])
- source_url (string)
- scraped_at (timestamp)

**applications**
- id (uuid, pk)
- user_id (fk → users)
- grant_id (fk → grants)
- status (enum: draft, submitted, won, lost)
- proposal_url (string, nullable)
- created_at, updated_at

**payments (DodoPayments synced)**
- id (uuid, pk)
- user_id (fk → users)
- dodo_customer_id (string)
- plan (string)
- status (active, canceled, trialing)
- last_payment_date (date)

---

## 🔑 Authentication & Payments

- **BetterAuth** handles user auth, sessions, and roles.
- **DodoPayments adapter**:
  - Customer creation on signup
  - Checkout flow (plans mapped in config)
  - Customer portal (manage billing)
  - Webhooks for subscription status

---

## 🧭 User Flow & Onboarding

### **Landing to Console Flow**
```
https://benefitiary.com → https://app.benefitiary.com/auth/signup
```

### **Onboarding Wizard (2 Steps)**

### Step 1: Organization Profile (`/onboarding/organization`)
- **Organization Name**: Text input
- **Organization Type**: SME, Nonprofit/NGO, Academic, Healthcare, Other
- **Size**: Solo, Micro, Small, Medium, Large  
- **Position**: CEO, Founder, Program Manager, Development Manager, etc.
- **Website**: Optional URL
- **Location**: Country (dropdown), Region (optional)

👉 Purpose: Ensures eligibility filtering (most grants are type/size/location specific).

### Step 2: Grant Preferences (`/onboarding/preferences`)
Multi-select categories aligned with **real-world grant filters**:
- Healthcare & Public Health
- Education & Training
- Agriculture & Food Security
- Climate & Environment
- Technology & Innovation
- Women & Youth Empowerment
- Arts & Culture
- Community Development
- Human Rights & Governance
- SME / Business Growth

👉 Purpose: Surfaces relevant grants first; aligns with scraped data tagging.

---

## 🎨 UI Pages & Actions (MVP)

### 🔐 Auth
- Sign Up / Login (BetterAuth UI components)
- Role-based redirection after onboarding

### 🏠 Dashboard
- **For Seekers**: Matched grants, saved applications, AI proposal drafts
- **For Writers**: List of seekers looking for writing help
- **For Funders**: Manage grant postings, view applicants

### 📑 Grants Explorer
- Filter by category, location, deadline
- Search funders or keywords
- Save grants to dashboard

### 📝 Proposal Workspace
- AI-assisted draft proposal (OpenAI API)
- Upload documents
- Track status (draft, submitted)

### 💳 Billing
- Subscription plan (via DodoPayments checkout)
- Self-service portal (cancel/upgrade)

### ⚙️ Settings
- Update org profile
- Update preferences
- Manage auth

---

## 🌍 Data Sourcing (Scraping)
- **Scrapers built with Node.js (Cheerio/Playwright)**.
- Sources:
  - Grants.gov (SMEs, US-focused but good structure)
  - GlobalGiving
  - Gates Foundation
  - Ford Foundation
  - WHO, UNICEF (health/public health)
  - African Development Foundation (SMEs in Africa)
- Store in `grants` table with tagging.

---

## 🚀 Current Status ✅

### **Completed**
1. ✅ **Two-repository architecture** (`benefitiary-marketing` + `benefitiary`)
2. ✅ **Landing page deployed** to `https://benefitiary.com`
3. ✅ **Console app structure** with Next.js + Prisma + BetterAuth
4. ✅ **Database schema** designed and implemented (Neon Postgres)
5. ✅ **Onboarding wizard** (2-step flow: Organization → Preferences)
6. ✅ **User flow** from landing page to console app
7. ✅ **BetterAuth + DodoPayments** integration configured

### **In Progress**
- Dashboard implementation with grant matching
- Grant scraping system
- AI proposal assistance features

---

# ✅ Next Steps
- Expand scrapers for more funders
- Add AI proposal generator
- Build collaboration features (seekers ↔ writers)
- Implement grant tracking automation (email parsing in v2)


-- Enable UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ================================
-- USERS
-- ================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT CHECK (role IN ('admin','seeker','writer','funder')) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ================================
-- ORGANIZATIONS
-- ================================
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    industry TEXT CHECK (industry IN ('nonprofit','healthcare','public_health','sme','other')) NOT NULL,
    size TEXT CHECK (size IN ('startup','small_business','medium_business','large_enterprise','ngo')) NOT NULL,
    location TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ================================
-- FUNDERS
-- ================================
CREATE TABLE funders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT CHECK (type IN ('private_foundation','government','ngo','corporate')) NOT NULL,
    website TEXT,
    contact_email TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ================================
-- GRANTS
-- ================================
CREATE TABLE grants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    funder_id UUID REFERENCES funders(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    eligibility_criteria TEXT,
    deadline DATE,
    funding_amount_min NUMERIC,
    funding_amount_max NUMERIC,
    source TEXT,
    category TEXT CHECK (category IN ('small_business','healthcare','nonprofit','public_health','general')) NOT NULL,
    scraped_from TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ================================
-- GRANT MATCHES (recommendations)
-- ================================
CREATE TABLE grant_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    grant_id UUID REFERENCES grants(id) ON DELETE CASCADE,
    match_score INT CHECK (match_score >= 0 AND match_score <= 100),
    status TEXT CHECK (status IN ('saved','applied','rejected')) DEFAULT 'saved',
    created_at TIMESTAMP DEFAULT NOW()
);

-- ================================
-- SUBMISSIONS (tracking proposals)
-- ================================
CREATE TABLE submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    grant_id UUID REFERENCES grants(id) ON DELETE CASCADE,
    proposal_text TEXT,
    status TEXT CHECK (status IN ('draft','submitted','won','lost')) DEFAULT 'draft',
    submitted_at TIMESTAMP,
    result_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ================================
-- SCRAPED SOURCES
-- ================================
CREATE TABLE scraped_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    url TEXT NOT NULL,
    type TEXT CHECK (type IN ('gov','foundation','business','ngo','other')) NOT NULL,
    last_scraped_at TIMESTAMP,
    frequency TEXT CHECK (frequency IN ('daily','weekly','monthly')) DEFAULT 'weekly',
    status TEXT CHECK (status IN ('active','inactive')) DEFAULT 'active'
);

-- ================================
-- PAYMENTS
-- ================================
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    currency TEXT DEFAULT 'USD',
    provider TEXT CHECK (provider IN ('polar','dodopayments')) NOT NULL,
    subscription_plan TEXT CHECK (subscription_plan IN ('basic','pro','enterprise')) NOT NULL,
    status TEXT CHECK (status IN ('paid','failed','refunded')) DEFAULT 'paid',
    created_at TIMESTAMP DEFAULT NOW()
);

-- ================================
-- AI USAGE (track token billing)
-- ================================
CREATE TABLE ai_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    task_type TEXT CHECK (task_type IN ('proposal_generation','editing','summarization')) NOT NULL,
    tokens_used INT NOT NULL,
    cost_usd NUMERIC NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ================================
-- INDEXES for performance
-- ================================
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_grants_deadline ON grants(deadline);
CREATE INDEX idx_grant_matches_user ON grant_matches(user_id);
CREATE INDEX idx_submissions_user ON submissions(user_id);
CREATE INDEX idx_payments_user ON payments(user_id);
CREATE INDEX idx_ai_usage_user ON ai_usage(user_id);
