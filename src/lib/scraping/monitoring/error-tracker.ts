/**
 * Error tracking and categorization system for grant scraping operations
 */

import { ScrapingError, ErrorResolution, SourceConfiguration } from '../types';

export enum ScrapingErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  PARSING_ERROR = 'PARSING_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  CAPTCHA_ERROR = 'CAPTCHA_ERROR',
  CONTENT_CHANGED_ERROR = 'CONTENT_CHANGED_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  PROXY_ERROR = 'PROXY_ERROR'
}

export interface ScrapingContext {
  sourceId: string;
  sourceUrl: string;
  jobId: string;
  attemptNumber: number;
  startTime: Date;
  userAgent?: string;
  proxyUsed?: string;
}

export interface ErrorMetrics {
  errorType: ScrapingErrorType;
  count: number;
  lastOccurrence: Date;
  averageResolutionTime: number;
  successfulRetries: number;
  failedRetries: number;
}

export class ErrorTracker {
  private errorHistory: Map<string, ScrapingError[]> = new Map();
  private errorMetrics: Map<ScrapingErrorType, ErrorMetrics> = new Map();
  private maxHistorySize = 1000;

  /**
   * Track a new scraping error
   */
  async trackError(error: ScrapingError, context: ScrapingContext): Promise<void> {
    // Add to error history
    const sourceErrors = this.errorHistory.get(context.sourceId) || [];
    sourceErrors.push(error);
    
    // Maintain history size limit
    if (sourceErrors.length > this.maxHistorySize) {
      sourceErrors.shift();
    }
    
    this.errorHistory.set(context.sourceId, sourceErrors);

    // Update error metrics
    await this.updateErrorMetrics(error);

    // Log error details
    console.error(`[ErrorTracker] ${error.type}: ${error.message}`, {
      sourceId: context.sourceId,
      jobId: context.jobId,
      attemptNumber: context.attemptNumber,
      url: error.url,
      timestamp: error.timestamp
    });
  }

  /**
   * Get error history for a specific source
   */
  getSourceErrorHistory(sourceId: string, limit: number = 50): ScrapingError[] {
    const errors = this.errorHistory.get(sourceId) || [];
    return errors.slice(-limit);
  }

  /**
   * Get recent errors across all sources
   */
  getRecentErrors(limit: number = 100): ScrapingError[] {
    const allErrors: ScrapingError[] = [];
    
    for (const errors of this.errorHistory.values()) {
      allErrors.push(...errors);
    }
    
    return allErrors
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get error metrics by type
   */
  getErrorMetrics(): Map<ScrapingErrorType, ErrorMetrics> {
    return new Map(this.errorMetrics);
  }

  /**
   * Check if source has recurring errors
   */
  hasRecurringErrors(sourceId: string, errorType: ScrapingErrorType, timeWindow: number = 3600000): boolean {
    const errors = this.errorHistory.get(sourceId) || [];
    const cutoffTime = new Date(Date.now() - timeWindow);
    
    const recentErrors = errors.filter(error => {
      const categorizedType = this.categorizeError(error);
      return categorizedType === errorType && error.timestamp > cutoffTime;
    });
    
    return recentErrors.length >= 3;
  }

  /**
   * Get error rate for a source
   */
  getSourceErrorRate(sourceId: string, timeWindow: number = 3600000): number {
    const errors = this.errorHistory.get(sourceId) || [];
    const cutoffTime = new Date(Date.now() - timeWindow);
    
    const recentErrors = errors.filter(error => error.timestamp > cutoffTime);
    
    // Estimate total attempts (this would be better tracked separately)
    const estimatedAttempts = Math.max(recentErrors.length * 2, 1);
    
    return recentErrors.length / estimatedAttempts;
  }

  /**
   * Clear error history for a source
   */
  clearSourceErrors(sourceId: string): void {
    this.errorHistory.delete(sourceId);
  }

  /**
   * Update error metrics
   */
  private async updateErrorMetrics(error: ScrapingError): Promise<void> {
    // Categorize the error to get the proper ScrapingErrorType
    const errorType = this.categorizeError(error);
    const existing = this.errorMetrics.get(errorType);
    
    if (existing) {
      existing.count++;
      existing.lastOccurrence = error.timestamp;
    } else {
      this.errorMetrics.set(errorType, {
        errorType,
        count: 1,
        lastOccurrence: error.timestamp,
        averageResolutionTime: 0,
        successfulRetries: 0,
        failedRetries: 0
      });
    }
  }

  /**
   * Categorize error into specific type
   */
  private categorizeError(error: ScrapingError): ScrapingErrorType {
    const message = error.message.toLowerCase();
    
    // Network-related errors
    if (message.includes('timeout') || message.includes('etimedout')) {
      return ScrapingErrorType.TIMEOUT_ERROR;
    }
    
    if (message.includes('econnrefused') || message.includes('enotfound') || 
        message.includes('network') || message.includes('connection')) {
      return ScrapingErrorType.NETWORK_ERROR;
    }
    
    // Rate limiting
    if (message.includes('rate limit') || message.includes('429') || 
        message.includes('too many requests')) {
      return ScrapingErrorType.RATE_LIMIT_ERROR;
    }
    
    // Authentication
    if (message.includes('401') || message.includes('403') || 
        message.includes('unauthorized') || message.includes('forbidden')) {
      return ScrapingErrorType.AUTHENTICATION_ERROR;
    }
    
    // CAPTCHA
    if (message.includes('captcha') || message.includes('recaptcha') || 
        message.includes('bot detection')) {
      return ScrapingErrorType.CAPTCHA_ERROR;
    }
    
    // Parsing errors
    if (message.includes('parse') || message.includes('selector') || 
        message.includes('element not found')) {
      return ScrapingErrorType.PARSING_ERROR;
    }
    
    // Database errors
    if (message.includes('database') || message.includes('prisma') || 
        message.includes('sql')) {
      return ScrapingErrorType.DATABASE_ERROR;
    }
    
    // Proxy errors
    if (message.includes('proxy') || message.includes('tunnel')) {
      return ScrapingErrorType.PROXY_ERROR;
    }
    
    // Default to network error
    return ScrapingErrorType.NETWORK_ERROR;
  }

  /**
   * Record successful retry
   */
  recordSuccessfulRetry(errorType: ScrapingErrorType, resolutionTime: number): void {
    const metrics = this.errorMetrics.get(errorType);
    if (metrics) {
      const totalRetries = metrics.successfulRetries + 1;
      metrics.averageResolutionTime = 
        (metrics.averageResolutionTime * metrics.successfulRetries + resolutionTime) / totalRetries;
      metrics.successfulRetries++;
    }
  }

  /**
   * Record failed retry
   */
  recordFailedRetry(errorType: ScrapingErrorType): void {
    const metrics = this.errorMetrics.get(errorType);
    if (metrics) {
      metrics.failedRetries++;
    }
  }
}