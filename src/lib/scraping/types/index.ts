/**
 * Core TypeScript interfaces and types for the grant scraping system
 */

// Enums for scraping system
export enum ScrapedSourceType {
  GOV = 'GOV',
  FOUNDATION = 'FOUNDATION',
  BUSINESS = 'BUSINESS',
  NGO = 'NGO',
  OTHER = 'OTHER'
}

export enum ScrapingFrequency {
  HOURLY = 'HOURLY',
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
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

export enum GrantCategory {
  HEALTHCARE_PUBLIC_HEALTH = 'HEALTHCARE_PUBLIC_HEALTH',
  EDUCATION_TRAINING = 'EDUCATION_TRAINING',
  ENVIRONMENT_SUSTAINABILITY = 'ENVIRONMENT_SUSTAINABILITY',
  SOCIAL_SERVICES = 'SOCIAL_SERVICES',
  ARTS_CULTURE = 'ARTS_CULTURE',
  TECHNOLOGY_INNOVATION = 'TECHNOLOGY_INNOVATION',
  RESEARCH_DEVELOPMENT = 'RESEARCH_DEVELOPMENT',
  COMMUNITY_DEVELOPMENT = 'COMMUNITY_DEVELOPMENT'
}

// Core scraping interfaces
export interface SchedulerConfig {
  defaultFrequency: ScrapingFrequency;
  maxConcurrentJobs: number;
  retryAttempts: number;
  healthCheckInterval: number;
}

export interface ScrapeJob {
  id: string;
  sourceId: string;
  scheduledAt: Date;
  startedAt?: Date;
  finishedAt?: Date;
  status: ScrapeJobStatus;
  priority: number;
  metadata: Record<string, any>;
}

export interface ScrapingResult {
  sourceId: string;
  totalFound: number;
  totalInserted: number;
  totalUpdated: number;
  totalSkipped: number;
  errors: ScrapingError[];
  duration: number;
  metadata: Record<string, any>;
}

export interface ScrapingError {
  type: 'NETWORK' | 'PARSING' | 'VALIDATION' | 'DATABASE' | 'RATE_LIMIT' | 'AUTHENTICATION' | 'CAPTCHA' | 'CONTENT_CHANGED';
  message: string;
  url?: string;
  stack?: string;
  timestamp: Date;
}

export interface SourceConfiguration {
  id: string;
  url: string;
  type: ScrapedSourceType;
  engine: 'static' | 'browser' | 'api';
  selectors: SourceSelectors;
  rateLimit: RateLimitConfig;
  headers: Record<string, string>;
  authentication?: AuthConfig;
  customLogic?: string;
}

export interface SourceSelectors {
  grantContainer: string;
  title: string;
  description: string;
  deadline: string;
  fundingAmount: string;
  eligibility: string;
  applicationUrl: string;
  funderInfo: string;
}

export interface RateLimitConfig {
  requestsPerMinute: number;
  delayBetweenRequests: number;
  respectRobotsTxt: boolean;
}

export interface AuthConfig {
  type: 'bearer' | 'basic' | 'apikey' | 'oauth2';
  credentials: Record<string, string>;
}

export interface PaginationConfig {
  type: 'offset' | 'cursor' | 'page';
  pageSize: number;
  maxPages: number;
}

// Data processing interfaces
export interface RawGrantData {
  title: string;
  description?: string;
  deadline?: string;
  fundingAmount?: string;
  eligibility?: string;
  applicationUrl?: string;
  funderName?: string;
  sourceUrl: string;
  scrapedAt: Date;
  rawContent: Record<string, any>;
}

export interface ProcessedGrantData {
  title: string;
  description: string;
  deadline?: Date;
  fundingAmountMin?: number;
  fundingAmountMax?: number;
  eligibilityCriteria: string;
  applicationUrl?: string;
  funder: FunderData;
  category: GrantCategory;
  locationEligibility: string[];
  confidenceScore: number;
  contentHash: string;
}

export interface FunderData {
  name: string;
  website?: string;
  contactEmail?: string;
  type: ScrapedSourceType;
}

// Validation interfaces
export interface ValidationRule {
  field: string;
  required: boolean;
  type: 'string' | 'number' | 'date' | 'url' | 'email' | 'array';
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  customValidator?: (value: any) => boolean;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  qualityScore: number;
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

// Classification interfaces
export interface ClassificationResult {
  category: GrantCategory;
  tags: string[];
  confidence: number;
  reasoning: string[];
}

export interface ClassificationModel {
  name: string;
  version: string;
  accuracy: number;
  lastTrained: Date;
}

// Metrics and monitoring interfaces
export interface SourceMetrics {
  totalScrapes: number;
  successfulScrapes: number;
  failedScrapes: number;
  averageProcessingTime: number;
  averageGrantsFound: number;
  lastSuccessfulScrape?: Date;
  lastError?: string;
  successRate: number;
}

export interface ScrapingMetrics {
  activeJobs: number;
  completedJobs: number;
  failedJobs: number;
  averageProcessingTime: number;
  grantsScrapedToday: number;
  successRate: number;
  topPerformingSources: SourcePerformance[];
  recentErrors: ScrapingError[];
}

export interface SourcePerformance {
  sourceId: string;
  sourceName: string;
  successRate: number;
  averageGrantsFound: number;
  lastScrapeTime: Date;
}

// Content change detection
export interface ContentChangeDetection {
  grantId: string;
  previousHash: string;
  currentHash: string;
  changedFields: string[];
  changeType: 'minor' | 'major' | 'critical';
  detectedAt: Date;
}

// Base scraping engine interface
export interface ScrapingEngine {
  scrape(source: SourceConfiguration): Promise<RawGrantData[]>;
}

// Error resolution interface
export interface ErrorResolution {
  action: 'retry' | 'skip' | 'manual_review' | 'disable_source';
  delay?: number;
  message: string;
}

// Cache interfaces
export interface CacheConfig {
  ttl: number; // Time to live in seconds
  maxSize: number; // Maximum cache size
  strategy: 'lru' | 'fifo' | 'lfu';
}

// Proxy interfaces
export interface ProxyConfig {
  host: string;
  port: number;
  username?: string;
  password?: string;
  type: 'http' | 'https' | 'socks5';
}

// Alert interfaces
export interface AlertConfig {
  type: 'email' | 'slack' | 'webhook';
  threshold: number;
  cooldown: number; // Minutes between alerts
  recipients: string[];
}

// Browser engine interfaces
export interface BrowserEngineConfig {
  headless: boolean;
  viewport: { width: number; height: number };
  timeout: number;
  waitForSelector: string;
  blockResources: string[]; // Block images, fonts, etc. for performance
  stealthMode: boolean;
}

export interface StaticParserConfig {
  timeout: number;
  retries: number;
  userAgent: string;
  followRedirects: boolean;
}

export interface APIClientConfig {
  baseUrl: string;
  authentication: AuthConfig;
  rateLimit: RateLimitConfig;
  responseFormat: 'json' | 'xml' | 'csv';
  pagination: PaginationConfig;
}