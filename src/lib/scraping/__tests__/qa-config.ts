/**
 * Quality Assurance Configuration for Scraping System
 * 
 * This file defines quality standards, thresholds, and validation rules
 * for the grant scraping system to ensure consistent high-quality operation.
 */

export interface QualityThresholds {
  // Test Coverage Requirements
  minimumCoverage: number;
  criticalPathCoverage: number;
  
  // Performance Standards
  maxTestDuration: number;
  maxMemoryUsage: number;
  maxConcurrentSources: number;
  
  // Data Quality Standards
  minimumDataQualityScore: number;
  maxDuplicateRate: number;
  minClassificationAccuracy: number;
  
  // Reliability Standards
  maxErrorRate: number;
  minSuccessRate: number;
  maxRetryAttempts: number;
  
  // Security Standards
  maxRateLimitViolations: number;
  requiredAntiDetectionMeasures: string[];
}

export interface ValidationRules {
  // Required Fields Validation
  requiredGrantFields: string[];
  requiredFunderFields: string[];
  
  // Data Format Validation
  dateFormats: string[];
  currencyFormats: string[];
  urlPatterns: RegExp[];
  
  // Content Quality Rules
  minTitleLength: number;
  maxTitleLength: number;
  minDescriptionLength: number;
  maxDescriptionLength: number;
  
  // Classification Rules
  supportedCategories: string[];
  minConfidenceScore: number;
  maxTagsPerGrant: number;
}

export interface PerformanceBenchmarks {
  // Processing Speed Benchmarks
  grantsPerSecond: number;
  sourcesPerMinute: number;
  
  // Memory Usage Benchmarks
  maxMemoryPerGrant: number; // bytes
  maxMemoryPerSource: number; // bytes
  
  // Database Performance
  maxInsertTime: number; // milliseconds
  maxQueryTime: number; // milliseconds
  
  // Network Performance
  maxRequestTime: number; // milliseconds
  maxRetryDelay: number; // milliseconds
}

export const QA_CONFIG: {
  thresholds: QualityThresholds;
  validation: ValidationRules;
  benchmarks: PerformanceBenchmarks;
} = {
  thresholds: {
    // Test Coverage Requirements (80% minimum, 95% for critical paths)
    minimumCoverage: 80,
    criticalPathCoverage: 95,
    
    // Performance Standards
    maxTestDuration: 300000, // 5 minutes max per test suite
    maxMemoryUsage: 512 * 1024 * 1024, // 512MB max memory usage
    maxConcurrentSources: 20, // Max concurrent scraping sources
    
    // Data Quality Standards
    minimumDataQualityScore: 0.8, // 80% minimum quality score
    maxDuplicateRate: 0.05, // Max 5% duplicate rate
    minClassificationAccuracy: 0.85, // 85% minimum classification accuracy
    
    // Reliability Standards
    maxErrorRate: 0.1, // Max 10% error rate
    minSuccessRate: 0.9, // Min 90% success rate
    maxRetryAttempts: 3, // Max 3 retry attempts
    
    // Security Standards
    maxRateLimitViolations: 0, // Zero tolerance for rate limit violations
    requiredAntiDetectionMeasures: [
      'user-agent-rotation',
      'request-delays',
      'proxy-rotation',
      'header-randomization'
    ]
  },

  validation: {
    // Required Fields Validation
    requiredGrantFields: [
      'title',
      'description',
      'funder',
      'sourceUrl',
      'scrapedAt',
      'contentHash'
    ],
    requiredFunderFields: [
      'name'
    ],
    
    // Data Format Validation
    dateFormats: [
      'YYYY-MM-DD',
      'MM/DD/YYYY',
      'DD/MM/YYYY',
      'Month DD, YYYY',
      'DD Month YYYY'
    ],
    currencyFormats: [
      '$X,XXX',
      '$X,XXX - $X,XXX',
      'Up to $X,XXX',
      '€X,XXX',
      '£X,XXX'
    ],
    urlPatterns: [
      /^https?:\/\/.+/,
      /^mailto:.+/
    ],
    
    // Content Quality Rules
    minTitleLength: 5,
    maxTitleLength: 200,
    minDescriptionLength: 20,
    maxDescriptionLength: 5000,
    
    // Classification Rules
    supportedCategories: [
      'HEALTHCARE_PUBLIC_HEALTH',
      'EDUCATION_TRAINING',
      'ENVIRONMENT_SUSTAINABILITY',
      'SOCIAL_SERVICES',
      'ARTS_CULTURE',
      'TECHNOLOGY_INNOVATION',
      'RESEARCH_DEVELOPMENT',
      'COMMUNITY_DEVELOPMENT'
    ],
    minConfidenceScore: 0.6,
    maxTagsPerGrant: 10
  },

  benchmarks: {
    // Processing Speed Benchmarks
    grantsPerSecond: 10, // Should process at least 10 grants per second
    sourcesPerMinute: 5, // Should process at least 5 sources per minute
    
    // Memory Usage Benchmarks
    maxMemoryPerGrant: 1024, // 1KB max per grant
    maxMemoryPerSource: 10 * 1024 * 1024, // 10MB max per source
    
    // Database Performance
    maxInsertTime: 1000, // 1 second max for batch insert
    maxQueryTime: 500, // 500ms max for queries
    
    // Network Performance
    maxRequestTime: 30000, // 30 seconds max per request
    maxRetryDelay: 60000 // 1 minute max retry delay
  }
};

/**
 * Quality Gates - Define conditions that must be met for deployment
 */
export interface QualityGate {
  name: string;
  condition: (metrics: any) => boolean;
  severity: 'error' | 'warning' | 'info';
  message: string;
}

export const QUALITY_GATES: QualityGate[] = [
  {
    name: 'Test Coverage',
    condition: (metrics) => metrics.overallCoverage >= QA_CONFIG.thresholds.minimumCoverage,
    severity: 'error',
    message: `Test coverage must be at least ${QA_CONFIG.thresholds.minimumCoverage}%`
  },
  {
    name: 'Test Success Rate',
    condition: (metrics) => {
      const totalTests = metrics.testResults.reduce((sum: number, r: any) => sum + r.passed + r.failed, 0);
      const passedTests = metrics.testResults.reduce((sum: number, r: any) => sum + r.passed, 0);
      return totalTests > 0 ? (passedTests / totalTests) >= QA_CONFIG.thresholds.minSuccessRate : false;
    },
    severity: 'error',
    message: `Test success rate must be at least ${QA_CONFIG.thresholds.minSuccessRate * 100}%`
  },
  {
    name: 'Performance Standards',
    condition: (metrics) => metrics.performanceMetrics.averageTestDuration <= QA_CONFIG.thresholds.maxTestDuration,
    severity: 'warning',
    message: `Average test duration should not exceed ${QA_CONFIG.thresholds.maxTestDuration / 1000} seconds`
  },
  {
    name: 'Quality Score',
    condition: (metrics) => metrics.qualityScore >= 70,
    severity: 'error',
    message: 'Overall quality score must be at least 70/100'
  },
  {
    name: 'No Critical Failures',
    condition: (metrics) => !metrics.testResults.some((r: any) => r.suite.includes('Regression') && r.failed > 0),
    severity: 'error',
    message: 'No regression test failures are allowed'
  }
];

/**
 * Test Environment Configuration
 */
export const TEST_ENVIRONMENT = {
  // Database Configuration
  database: {
    maxConnections: 10,
    connectionTimeout: 5000,
    queryTimeout: 30000
  },
  
  // Cache Configuration
  cache: {
    maxMemory: '100mb',
    ttl: 300, // 5 minutes
    maxKeys: 1000
  },
  
  // Network Configuration
  network: {
    timeout: 30000,
    retries: 3,
    rateLimit: {
      requests: 100,
      window: 60000 // 1 minute
    }
  },
  
  // Browser Configuration (for headless browser tests)
  browser: {
    headless: true,
    timeout: 30000,
    viewport: { width: 1366, height: 768 },
    userAgent: 'Mozilla/5.0 (compatible; TestRunner/1.0)'
  }
};

/**
 * Monitoring and Alerting Configuration
 */
export const MONITORING_CONFIG = {
  // Metrics Collection
  metrics: {
    collectInterval: 60000, // 1 minute
    retentionPeriod: 7 * 24 * 60 * 60 * 1000, // 7 days
    aggregationWindow: 5 * 60 * 1000 // 5 minutes
  },
  
  // Alert Thresholds
  alerts: {
    errorRate: 0.05, // Alert if error rate > 5%
    responseTime: 10000, // Alert if response time > 10s
    memoryUsage: 0.8, // Alert if memory usage > 80%
    diskUsage: 0.9 // Alert if disk usage > 90%
  },
  
  // Notification Channels
  notifications: {
    email: process.env.ALERT_EMAIL || 'admin@example.com',
    slack: process.env.SLACK_WEBHOOK_URL,
    webhook: process.env.ALERT_WEBHOOK_URL
  }
};

/**
 * Data Quality Validation Functions
 */
export class QualityValidator {
  static validateGrant(grant: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Handle null/undefined inputs
    if (!grant || typeof grant !== 'object') {
      errors.push('Grant data is null, undefined, or not an object');
      return { isValid: false, errors };
    }
    
    // Check required fields
    QA_CONFIG.validation.requiredGrantFields.forEach(field => {
      if (!grant[field]) {
        errors.push(`Missing required field: ${field}`);
      }
    });
    
    // Validate title length
    if (grant.title && (
      grant.title.length < QA_CONFIG.validation.minTitleLength ||
      grant.title.length > QA_CONFIG.validation.maxTitleLength
    )) {
      errors.push(`Title length must be between ${QA_CONFIG.validation.minTitleLength} and ${QA_CONFIG.validation.maxTitleLength} characters`);
    }
    
    // Validate description length
    if (grant.description && (
      grant.description.length < QA_CONFIG.validation.minDescriptionLength ||
      grant.description.length > QA_CONFIG.validation.maxDescriptionLength
    )) {
      errors.push(`Description length must be between ${QA_CONFIG.validation.minDescriptionLength} and ${QA_CONFIG.validation.maxDescriptionLength} characters`);
    }
    
    // Validate URL format
    if (grant.applicationUrl && !QA_CONFIG.validation.urlPatterns.some(pattern => pattern.test(grant.applicationUrl))) {
      errors.push('Invalid application URL format');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  static validateClassification(classification: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Handle null/undefined inputs
    if (!classification || typeof classification !== 'object') {
      errors.push('Classification data is null, undefined, or not an object');
      return { isValid: false, errors };
    }
    
    // Check category is supported
    if (!QA_CONFIG.validation.supportedCategories.includes(classification.category)) {
      errors.push(`Unsupported category: ${classification.category}`);
    }
    
    // Check confidence score
    if (classification.confidence < QA_CONFIG.validation.minConfidenceScore) {
      errors.push(`Confidence score too low: ${classification.confidence}`);
    }
    
    // Check tag count
    if (classification.tags && classification.tags.length > QA_CONFIG.validation.maxTagsPerGrant) {
      errors.push(`Too many tags: ${classification.tags.length}`);
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  static validatePerformance(metrics: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Handle null/undefined inputs
    if (!metrics || typeof metrics !== 'object') {
      errors.push('Performance metrics data is null, undefined, or not an object');
      return { isValid: false, errors };
    }
    
    // Check processing speed
    if (metrics.grantsPerSecond < QA_CONFIG.benchmarks.grantsPerSecond) {
      errors.push(`Processing speed too slow: ${metrics.grantsPerSecond} grants/second`);
    }
    
    // Check memory usage
    if (metrics.memoryUsage > QA_CONFIG.thresholds.maxMemoryUsage) {
      errors.push(`Memory usage too high: ${metrics.memoryUsage} bytes`);
    }
    
    // Check response time
    if (metrics.averageResponseTime > QA_CONFIG.benchmarks.maxRequestTime) {
      errors.push(`Response time too slow: ${metrics.averageResponseTime}ms`);
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export default QA_CONFIG;