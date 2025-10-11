// Core scraping interfaces
export interface ScrapingResult {
  totalFound: number;
  totalInserted: number;
  totalUpdated: number;
  totalSkipped: number;
  grants: any[];
}

export interface GrantData {
  title: string;
  description?: string;
  deadline?: Date;
  fundingAmountMin?: number;
  fundingAmountMax?: number;
  applicationUrl?: string;
  category: string;
  funderName: string;
  eligibilityCriteria?: string;
  locationEligibility?: string[];
  source: string;
  contentHash: string;
}

// Enums from Prisma schema - re-exported for scraping modules
export enum ScrapedSourceType {
  GOV = 'GOV',
  FOUNDATION = 'FOUNDATION',
  BUSINESS = 'BUSINESS',
  NGO = 'NGO',
  OTHER = 'OTHER'
}

export enum ScrapingFrequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY'
}

export enum ScrapedSourceStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE'
}

export enum ScrapeJobStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

export enum GrantCategory {
  HEALTHCARE_PUBLIC_HEALTH = 'HEALTHCARE_PUBLIC_HEALTH',
  EDUCATION_TRAINING = 'EDUCATION_TRAINING',
  AGRICULTURE_FOOD_SECURITY = 'AGRICULTURE_FOOD_SECURITY',
  CLIMATE_ENVIRONMENT = 'CLIMATE_ENVIRONMENT',
  TECHNOLOGY_INNOVATION = 'TECHNOLOGY_INNOVATION',
  WOMEN_YOUTH_EMPOWERMENT = 'WOMEN_YOUTH_EMPOWERMENT',
  ARTS_CULTURE = 'ARTS_CULTURE',
  COMMUNITY_DEVELOPMENT = 'COMMUNITY_DEVELOPMENT',
  HUMAN_RIGHTS_GOVERNANCE = 'HUMAN_RIGHTS_GOVERNANCE',
  SME_BUSINESS_GROWTH = 'SME_BUSINESS_GROWTH'
}