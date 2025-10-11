/**
 * Retry manager with exponential backoff and jitter
 */

export interface RetryOptions {
  maxRetries: number;
  baseDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  backoffMultiplier: number;
  jitterEnabled: boolean;
  retryCondition?: (error: Error) => boolean;
  onRetry?: (error: Error, attemptNumber: number) => void;
}

export interface RetryResult<T> {
  result: T;
  attemptNumber: number;
  totalTime: number;
  errors: Error[];
}

export class RetryManager {
  private defaultOptions: RetryOptions = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 300000, // 5 minutes
    backoffMultiplier: 2,
    jitterEnabled: true
  };

  /**
   * Execute operation with retry logic
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    options?: Partial<RetryOptions>
  ): Promise<RetryResult<T>> {
    const config = { ...this.defaultOptions, ...options };
    const errors: Error[] = [];
    const startTime = Date.now();
    let attemptNumber = 0;

    while (attemptNumber <= config.maxRetries) {
      try {
        const result = await operation();
        return {
          result,
          attemptNumber,
          totalTime: Date.now() - startTime,
          errors
        };
      } catch (error) {
        const err = error as Error;
        errors.push(err);
        attemptNumber++;

        // Check if we should retry this error
        if (config.retryCondition && !config.retryCondition(err)) {
          throw err;
        }

        // If this was the last attempt, throw the error
        if (attemptNumber > config.maxRetries) {
          throw err;
        }

        // Calculate delay for next attempt
        const delay = this.calculateDelay(attemptNumber, config);

        // Call retry callback if provided
        if (config.onRetry) {
          config.onRetry(err, attemptNumber);
        }

        // Wait before next attempt
        await this.sleep(delay);
      }
    }

    throw new Error('Unexpected end of retry loop');
  }

  /**
   * Execute multiple operations with retry, stopping on first success
   */
  async executeWithFallbacks<T>(
    operations: Array<() => Promise<T>>,
    options?: Partial<RetryOptions>
  ): Promise<RetryResult<T>> {
    const errors: Error[] = [];
    const startTime = Date.now();

    for (let i = 0; i < operations.length; i++) {
      try {
        const result = await this.executeWithRetry(operations[i], options);
        return {
          result: result.result,
          attemptNumber: i + 1,
          totalTime: Date.now() - startTime,
          errors: [...errors, ...result.errors]
        };
      } catch (error) {
        errors.push(error as Error);
        
        // If this was the last operation, throw the accumulated errors
        if (i === operations.length - 1) {
          const combinedError = new Error(
            `All fallback operations failed: ${errors.map(e => e.message).join(', ')}`
          );
          (combinedError as any).errors = errors;
          throw combinedError;
        }
      }
    }

    throw new Error('No operations provided');
  }

  /**
   * Execute operation with circuit breaker pattern
   */
  async executeWithCircuitBreaker<T>(
    operation: () => Promise<T>,
    circuitBreakerConfig: {
      failureThreshold: number;
      resetTimeout: number; // milliseconds
      monitoringPeriod: number; // milliseconds
    },
    options?: Partial<RetryOptions>
  ): Promise<T> {
    // This is a simplified circuit breaker implementation
    // In a real system, you'd want to persist state across instances
    
    const key = operation.toString(); // Simple key generation
    const now = Date.now();
    
    // Check if circuit is open
    if (this.isCircuitOpen(key, circuitBreakerConfig, now)) {
      throw new Error('Circuit breaker is open');
    }

    try {
      const result = await this.executeWithRetry(operation, options);
      this.recordSuccess(key, now);
      return result.result;
    } catch (error) {
      this.recordFailure(key, now);
      throw error;
    }
  }

  /**
   * Calculate exponential backoff delay with optional jitter
   */
  private calculateDelay(attemptNumber: number, config: RetryOptions): number {
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
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Circuit breaker state management (simplified in-memory implementation)
  private circuitState: Map<string, {
    failures: number;
    lastFailure: number;
    lastSuccess: number;
    state: 'closed' | 'open' | 'half-open';
  }> = new Map();

  private isCircuitOpen(
    key: string, 
    config: { failureThreshold: number; resetTimeout: number; monitoringPeriod: number }, 
    now: number
  ): boolean {
    const state = this.circuitState.get(key);
    if (!state) return false;

    if (state.state === 'open') {
      // Check if reset timeout has passed
      if (now - state.lastFailure > config.resetTimeout) {
        state.state = 'half-open';
        return false;
      }
      return true;
    }

    return false;
  }

  private recordSuccess(key: string, now: number): void {
    const state = this.circuitState.get(key) || {
      failures: 0,
      lastFailure: 0,
      lastSuccess: now,
      state: 'closed' as const
    };

    state.lastSuccess = now;
    state.failures = 0;
    state.state = 'closed';
    
    this.circuitState.set(key, state);
  }

  private recordFailure(key: string, now: number): void {
    const state = this.circuitState.get(key) || {
      failures: 0,
      lastFailure: now,
      lastSuccess: 0,
      state: 'closed' as const
    };

    state.failures++;
    state.lastFailure = now;
    
    // Open circuit if failure threshold exceeded
    if (state.failures >= 5) { // Default threshold
      state.state = 'open';
    }
    
    this.circuitState.set(key, state);
  }
}

/**
 * Predefined retry conditions for common scenarios
 */
export const RetryConditions = {
  /**
   * Retry on network errors
   */
  networkErrors: (error: Error): boolean => {
    const message = error.message.toLowerCase();
    return message.includes('network') || 
           message.includes('timeout') || 
           message.includes('econnrefused') || 
           message.includes('enotfound') ||
           message.includes('etimedout');
  },

  /**
   * Retry on temporary HTTP errors
   */
  temporaryHttpErrors: (error: Error): boolean => {
    const message = error.message.toLowerCase();
    return message.includes('500') || 
           message.includes('502') || 
           message.includes('503') || 
           message.includes('504') ||
           message.includes('429'); // Rate limit
  },

  /**
   * Never retry authentication errors
   */
  notAuthenticationErrors: (error: Error): boolean => {
    const message = error.message.toLowerCase();
    return !message.includes('401') && 
           !message.includes('403') && 
           !message.includes('unauthorized') && 
           !message.includes('forbidden');
  },

  /**
   * Combine multiple conditions with AND logic
   */
  and: (...conditions: Array<(error: Error) => boolean>) => {
    return (error: Error): boolean => {
      return conditions.every(condition => condition(error));
    };
  },

  /**
   * Combine multiple conditions with OR logic
   */
  or: (...conditions: Array<(error: Error) => boolean>) => {
    return (error: Error): boolean => {
      return conditions.some(condition => condition(error));
    };
  }
};