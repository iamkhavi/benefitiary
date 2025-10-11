/**
 * Comprehensive error handling and recovery system for grant scraping
 */

import { ScrapingError, ErrorResolution, SourceConfiguration } from '../types';
import { ErrorTracker, ScrapingErrorType, ScrapingContext } from './error-tracker';
import { NotificationSender } from './notification-sender';

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  backoffMultiplier: number;
  jitterEnabled: boolean;
}

export interface ErrorHandlerConfig {
  retryConfig: RetryConfig;
  notificationThresholds: {
    errorRate: number; // 0.0 to 1.0
    consecutiveFailures: number;
    criticalErrorTypes: ScrapingErrorType[];
  };
  gracefulDegradation: {
    enabled: boolean;
    fallbackStrategies: string[];
  };
}

export class ErrorHandler {
  private errorTracker: ErrorTracker;
  private notificationSender: NotificationSender;
  private config: ErrorHandlerConfig;

  constructor(
    errorTracker: ErrorTracker,
    notificationSender: NotificationSender,
    config?: Partial<ErrorHandlerConfig>
  ) {
    this.errorTracker = errorTracker;
    this.notificationSender = notificationSender;
    this.config = {
      retryConfig: {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 300000, // 5 minutes
        backoffMultiplier: 2,
        jitterEnabled: true
      },
      notificationThresholds: {
        errorRate: 0.5,
        consecutiveFailures: 5,
        criticalErrorTypes: [
          ScrapingErrorType.DATABASE_ERROR,
          ScrapingErrorType.AUTHENTICATION_ERROR
        ]
      },
      gracefulDegradation: {
        enabled: true,
        fallbackStrategies: ['skip_source', 'use_cache', 'partial_processing']
      },
      ...config
    };
  }

  /**
   * Handle a scraping error and determine resolution strategy
   */
  async handleScrapingError(
    error: ScrapingError, 
    context: ScrapingContext
  ): Promise<ErrorResolution> {
    // Track the error
    await this.errorTracker.trackError(error, context);

    // Determine error category and resolution strategy
    const errorType = this.categorizeError(error);
    const resolution = await this.determineResolution(errorType, error, context);

    // Check if we need to send notifications
    await this.checkNotificationTriggers(errorType, context);

    // Log resolution decision
    console.info(`[ErrorHandler] Resolution for ${errorType}: ${resolution.action}`, {
      sourceId: context.sourceId,
      jobId: context.jobId,
      delay: resolution.delay,
      message: resolution.message
    });

    return resolution;
  }

  /**
   * Execute operation with retry logic and error handling
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: ScrapingContext,
    customRetryConfig?: Partial<RetryConfig>
  ): Promise<T> {
    const retryConfig = { ...this.config.retryConfig, ...customRetryConfig };
    let lastError: Error | undefined;
    let attemptNumber = 0;

    while (attemptNumber <= retryConfig.maxRetries) {
      try {
        const startTime = Date.now();
        const result = await operation();
        
        // Record successful retry if this wasn't the first attempt
        if (attemptNumber > 0 && lastError) {
          const errorType = this.categorizeError(this.createScrapingError(lastError));
          const resolutionTime = Date.now() - startTime;
          this.errorTracker.recordSuccessfulRetry(errorType, resolutionTime);
        }
        
        return result;
      } catch (error) {
        lastError = error as Error;
        attemptNumber++;
        
        const scrapingError = this.createScrapingError(lastError, context.sourceUrl);
        const errorType = this.categorizeError(scrapingError);
        
        // Check if we should retry this error type
        if (!this.shouldRetry(errorType, attemptNumber, retryConfig.maxRetries)) {
          this.errorTracker.recordFailedRetry(errorType);
          throw lastError;
        }
        
        // Calculate delay for next attempt
        const delay = this.calculateBackoffDelay(attemptNumber, retryConfig);
        
        console.warn(`[ErrorHandler] Attempt ${attemptNumber} failed, retrying in ${delay}ms`, {
          error: scrapingError.message,
          sourceId: context.sourceId,
          jobId: context.jobId
        });
        
        // Wait before retry
        await this.sleep(delay);
      }
    }

    // All retries exhausted
    if (lastError) {
      const errorType = this.categorizeError(this.createScrapingError(lastError));
      this.errorTracker.recordFailedRetry(errorType);
      throw lastError;
    }

    throw new Error('Unexpected error in retry logic');
  }

  /**
   * Handle partial scraping failures with graceful degradation
   */
  async handlePartialFailure(
    errors: ScrapingError[],
    successfulResults: any[],
    context: ScrapingContext
  ): Promise<{ shouldContinue: boolean; fallbackStrategy?: string }> {
    if (!this.config.gracefulDegradation.enabled) {
      return { shouldContinue: false };
    }

    const errorRate = errors.length / (errors.length + successfulResults.length);
    
    // If error rate is acceptable, continue processing
    if (errorRate < 0.3) {
      return { shouldContinue: true };
    }

    // Determine fallback strategy
    const fallbackStrategy = await this.selectFallbackStrategy(errors, context);
    
    console.info(`[ErrorHandler] Applying graceful degradation: ${fallbackStrategy}`, {
      sourceId: context.sourceId,
      errorRate,
      errorCount: errors.length,
      successCount: successfulResults.length
    });

    return { 
      shouldContinue: true, 
      fallbackStrategy 
    };
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
   * Determine resolution strategy for error
   */
  private async determineResolution(
    errorType: ScrapingErrorType,
    error: ScrapingError,
    context: ScrapingContext
  ): Promise<ErrorResolution> {
    switch (errorType) {
      case ScrapingErrorType.RATE_LIMIT_ERROR:
        return {
          action: 'retry',
          delay: this.calculateRateLimitDelay(error.message),
          message: 'Rate limit detected, will retry with extended delay'
        };

      case ScrapingErrorType.TIMEOUT_ERROR:
      case ScrapingErrorType.NETWORK_ERROR:
        if (context.attemptNumber < this.config.retryConfig.maxRetries) {
          return {
            action: 'retry',
            delay: this.calculateBackoffDelay(context.attemptNumber, this.config.retryConfig),
            message: 'Network error, will retry with exponential backoff'
          };
        }
        return {
          action: 'skip',
          message: 'Max retries exceeded for network error'
        };

      case ScrapingErrorType.AUTHENTICATION_ERROR:
        return {
          action: 'manual_review',
          message: 'Authentication failed, requires manual intervention'
        };

      case ScrapingErrorType.CAPTCHA_ERROR:
        return {
          action: 'manual_review',
          message: 'CAPTCHA detected, requires manual solving'
        };

      case ScrapingErrorType.PARSING_ERROR:
        if (this.errorTracker.hasRecurringErrors(context.sourceId, errorType)) {
          return {
            action: 'manual_review',
            message: 'Recurring parsing errors detected, source structure may have changed'
          };
        }
        return {
          action: 'retry',
          delay: 5000,
          message: 'Parsing error, will retry once'
        };

      case ScrapingErrorType.DATABASE_ERROR:
        return {
          action: 'retry',
          delay: 10000,
          message: 'Database error, will retry with delay'
        };

      case ScrapingErrorType.CONTENT_CHANGED_ERROR:
        return {
          action: 'manual_review',
          message: 'Content structure changed, selectors need updating'
        };

      case ScrapingErrorType.PROXY_ERROR:
        return {
          action: 'retry',
          delay: 2000,
          message: 'Proxy error, will retry with different proxy'
        };

      default:
        return {
          action: 'skip',
          message: 'Unknown error type, skipping'
        };
    }
  }

  /**
   * Check if error type should be retried
   */
  private shouldRetry(
    errorType: ScrapingErrorType, 
    attemptNumber: number, 
    maxRetries: number
  ): boolean {
    if (attemptNumber >= maxRetries) {
      return false;
    }

    // Never retry these error types
    const nonRetryableErrors = [
      ScrapingErrorType.AUTHENTICATION_ERROR,
      ScrapingErrorType.CAPTCHA_ERROR
    ];

    return !nonRetryableErrors.includes(errorType);
  }

  /**
   * Calculate exponential backoff delay with jitter
   */
  private calculateBackoffDelay(attemptNumber: number, config: RetryConfig): number {
    let delay = config.baseDelay * Math.pow(config.backoffMultiplier, attemptNumber - 1);
    delay = Math.min(delay, config.maxDelay);
    
    if (config.jitterEnabled) {
      // Add random jitter (±25%)
      const jitter = delay * 0.25 * (Math.random() - 0.5);
      delay += jitter;
    }
    
    return Math.max(delay, 0);
  }

  /**
   * Calculate delay for rate limit errors
   */
  private calculateRateLimitDelay(errorMessage: string): number {
    // Try to extract retry-after header value from error message
    const retryAfterMatch = errorMessage.match(/retry[- ]after[:\s]+(\d+)/i);
    if (retryAfterMatch) {
      return parseInt(retryAfterMatch[1]) * 1000; // Convert to milliseconds
    }
    
    // Default rate limit delay
    return 60000; // 1 minute
  }

  /**
   * Select appropriate fallback strategy
   */
  private async selectFallbackStrategy(
    errors: ScrapingError[],
    context: ScrapingContext
  ): Promise<string> {
    const errorTypes = errors.map(e => this.categorizeError(e));
    
    // If mostly network errors, try different approach
    const networkErrors = errorTypes.filter(t => 
      t === ScrapingErrorType.NETWORK_ERROR || 
      t === ScrapingErrorType.TIMEOUT_ERROR
    ).length;
    
    if (networkErrors > errors.length * 0.7) {
      return 'use_cache';
    }
    
    // If parsing errors, try partial processing
    const parsingErrors = errorTypes.filter(t => 
      t === ScrapingErrorType.PARSING_ERROR
    ).length;
    
    if (parsingErrors > errors.length * 0.5) {
      return 'partial_processing';
    }
    
    return 'skip_source';
  }

  /**
   * Check if notifications should be sent
   */
  private async checkNotificationTriggers(
    errorType: ScrapingErrorType,
    context: ScrapingContext
  ): Promise<void> {
    const { notificationThresholds } = this.config;
    
    // Check for critical error types
    if (notificationThresholds.criticalErrorTypes.includes(errorType)) {
      await this.notificationSender.sendCriticalErrorAlert(errorType, context);
      return;
    }
    
    // Check error rate threshold
    const errorRate = this.errorTracker.getSourceErrorRate(context.sourceId);
    if (errorRate > notificationThresholds.errorRate) {
      await this.notificationSender.sendHighErrorRateAlert(context.sourceId, errorRate);
    }
    
    // Check consecutive failures
    const recentErrors = this.errorTracker.getSourceErrorHistory(context.sourceId, 10);
    if (recentErrors.length >= notificationThresholds.consecutiveFailures) {
      await this.notificationSender.sendConsecutiveFailuresAlert(
        context.sourceId, 
        recentErrors.length
      );
    }
  }

  /**
   * Create ScrapingError from generic Error
   */
  private createScrapingError(error: Error, url?: string): ScrapingError {
    return {
      type: 'NETWORK', // Will be recategorized
      message: error.message,
      url,
      stack: error.stack,
      timestamp: new Date()
    };
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}