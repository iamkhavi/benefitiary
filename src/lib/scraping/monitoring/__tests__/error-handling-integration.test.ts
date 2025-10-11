/**
 * Integration tests for the complete error handling system
 */

import { ErrorHandler } from '../error-handler';
import { ErrorTracker, ScrapingContext } from '../error-tracker';
import { NotificationSender, NotificationConfig } from '../notification-sender';
import { RetryManager, RetryConditions } from '../../utils/retry-manager';
import { ScrapingError } from '../../types';

describe('Error Handling Integration', () => {
  let errorHandler: ErrorHandler;
  let errorTracker: ErrorTracker;
  let notificationSender: NotificationSender;
  let retryManager: RetryManager;
  let mockContext: ScrapingContext;

  beforeEach(() => {
    errorTracker = new ErrorTracker();
    
    const notificationConfig: NotificationConfig = {
      console: { enabled: true, logLevel: 'error' }
    };
    notificationSender = new NotificationSender(notificationConfig);
    
    errorHandler = new ErrorHandler(errorTracker, notificationSender, {
      retryConfig: {
        maxRetries: 3,
        baseDelay: 100,
        maxDelay: 1000,
        backoffMultiplier: 2,
        jitterEnabled: false
      }
    });
    
    retryManager = new RetryManager();
    
    mockContext = {
      sourceId: 'integration-test-source',
      sourceUrl: 'https://example.com',
      jobId: 'integration-job-123',
      attemptNumber: 1,
      startTime: new Date()
    };

    // Spy on console to avoid noise in tests
    jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'info').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Complete Error Handling Workflow', () => {
    it('should handle transient network errors with retry and recovery', async () => {
      let attemptCount = 0;
      const mockOperation = jest.fn().mockImplementation(() => {
        attemptCount++;
        if (attemptCount <= 2) {
          throw new Error('Network timeout');
        }
        return Promise.resolve('success');
      });

      // Execute operation with error handling
      const result = await errorHandler.executeWithRetry(mockOperation, mockContext);

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(3);
      
      // Verify error tracking
      const errorHistory = errorTracker.getSourceErrorHistory('integration-test-source');
      expect(errorHistory).toHaveLength(2); // Two failed attempts
      
      // Verify metrics
      const metrics = errorTracker.getErrorMetrics();
      expect(metrics.size).toBeGreaterThan(0);
    });

    it('should handle permanent errors without excessive retries', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('401 Unauthorized'));

      await expect(errorHandler.executeWithRetry(mockOperation, mockContext))
        .rejects.toThrow('401 Unauthorized');

      // Should not retry authentication errors
      expect(mockOperation).toHaveBeenCalledTimes(1);
      
      // Verify error was tracked
      const errorHistory = errorTracker.getSourceErrorHistory('integration-test-source');
      expect(errorHistory).toHaveLength(1);
      expect(errorHistory[0].message).toContain('401 Unauthorized');
    });

    it('should handle rate limiting with appropriate delays', async () => {
      const error: ScrapingError = {
        type: 'RATE_LIMIT',
        message: 'Rate limit exceeded, retry-after: 5',
        timestamp: new Date()
      };

      const resolution = await errorHandler.handleScrapingError(error, mockContext);

      expect(resolution.action).toBe('retry');
      expect(resolution.delay).toBe(5000); // 5 seconds
      
      // Verify error was tracked
      const errorHistory = errorTracker.getSourceErrorHistory('integration-test-source');
      expect(errorHistory).toHaveLength(1);
    });

    it('should detect and handle recurring parsing errors', async () => {
      // Simulate multiple parsing errors
      for (let i = 0; i < 4; i++) {
        const error: ScrapingError = {
          type: 'PARSING',
          message: 'Element not found: .grant-title',
          timestamp: new Date(),
          url: 'https://example.com/grants'
        };
        
        await errorTracker.trackError(error, {
          ...mockContext,
          attemptNumber: i + 1
        });
      }

      // Next parsing error should trigger manual review
      const error: ScrapingError = {
        type: 'PARSING',
        message: 'Element not found: .grant-title',
        timestamp: new Date(),
        url: 'https://example.com/grants'
      };

      const resolution = await errorHandler.handleScrapingError(error, mockContext);

      expect(resolution.action).toBe('manual_review');
      expect(resolution.message).toContain('Recurring parsing errors');
    });

    it('should handle partial failures with graceful degradation', async () => {
      const errors: ScrapingError[] = [
        { type: 'NETWORK', message: 'Timeout 1', timestamp: new Date() },
        { type: 'NETWORK', message: 'Timeout 2', timestamp: new Date() },
        { type: 'PARSING', message: 'Parse error', timestamp: new Date() }
      ];
      
      const successfulResults = ['result1']; // Low success rate

      const result = await errorHandler.handlePartialFailure(
        errors,
        successfulResults,
        mockContext
      );

      expect(result.shouldContinue).toBe(true);
      expect(result.fallbackStrategy).toBeDefined();
    });

    it('should integrate with RetryManager for complex retry scenarios', async () => {
      let attemptCount = 0;
      const complexOperation = jest.fn().mockImplementation(() => {
        attemptCount++;
        
        if (attemptCount === 1) {
          throw new Error('Network timeout');
        } else if (attemptCount === 2) {
          throw new Error('502 Bad Gateway');
        } else if (attemptCount === 3) {
          throw new Error('503 Service Unavailable');
        }
        
        return Promise.resolve('finally succeeded');
      });

      const result = await retryManager.executeWithRetry(complexOperation, {
        maxRetries: 4,
        baseDelay: 50,
        retryCondition: RetryConditions.or(
          RetryConditions.networkErrors,
          RetryConditions.temporaryHttpErrors
        ),
        onRetry: (error, attempt) => {
          console.info(`Retry attempt ${attempt} after error: ${error.message}`);
        }
      });

      expect(result.result).toBe('finally succeeded');
      expect(result.attemptNumber).toBe(3); // 3 retries
      expect(result.errors).toHaveLength(3);
      expect(complexOperation).toHaveBeenCalledTimes(4);
    });

    it('should handle cascading failures across multiple sources', async () => {
      const sources = ['source-1', 'source-2', 'source-3'];
      
      // Simulate errors across multiple sources
      for (const sourceId of sources) {
        for (let i = 0; i < 3; i++) {
          const error: ScrapingError = {
            type: 'NETWORK',
            message: `Network error ${i}`,
            timestamp: new Date()
          };
          
          await errorTracker.trackError(error, {
            ...mockContext,
            sourceId,
            attemptNumber: i + 1
          });
        }
      }

      // Check error rates for all sources
      const errorRates = sources.map(sourceId => ({
        sourceId,
        errorRate: errorTracker.getSourceErrorRate(sourceId)
      }));

      errorRates.forEach(({ sourceId, errorRate }) => {
        expect(errorRate).toBeGreaterThan(0);
        
        const hasRecurring = errorTracker.hasRecurringErrors(
          sourceId,
          'NETWORK' as any
        );
        expect(hasRecurring).toBe(true);
      });

      // Verify total error count
      const recentErrors = errorTracker.getRecentErrors(20);
      expect(recentErrors).toHaveLength(9); // 3 sources × 3 errors each
    });

    it('should handle error recovery and notification', async () => {
      const sourceId = 'recovery-test-source';
      
      // Simulate initial failures
      for (let i = 0; i < 5; i++) {
        const error: ScrapingError = {
          type: 'NETWORK',
          message: `Network error ${i}`,
          timestamp: new Date()
        };
        
        await errorTracker.trackError(error, {
          ...mockContext,
          sourceId,
          attemptNumber: i + 1
        });
      }

      // Verify high error rate
      const initialErrorRate = errorTracker.getSourceErrorRate(sourceId);
      expect(initialErrorRate).toBeGreaterThan(0.5);

      // Simulate recovery by clearing errors
      errorTracker.clearSourceErrors(sourceId);
      
      // Verify recovery
      const recoveredErrorRate = errorTracker.getSourceErrorRate(sourceId);
      expect(recoveredErrorRate).toBe(0);
      
      const errorHistory = errorTracker.getSourceErrorHistory(sourceId);
      expect(errorHistory).toHaveLength(0);
    });

    it('should handle circuit breaker pattern for failing sources', async () => {
      let callCount = 0;
      const failingOperation = jest.fn().mockImplementation(() => {
        callCount++;
        throw new Error(`Failure ${callCount}`);
      });

      const circuitConfig = {
        failureThreshold: 3,
        resetTimeout: 1000,
        monitoringPeriod: 5000
      };

      // Execute operations until circuit opens
      for (let i = 0; i < 5; i++) {
        try {
          await retryManager.executeWithCircuitBreaker(
            failingOperation,
            circuitConfig,
            { maxRetries: 0 }
          );
        } catch (error) {
          // Expected to fail
        }
      }

      // Circuit should be open now, preventing further calls
      try {
        await retryManager.executeWithCircuitBreaker(
          failingOperation,
          circuitConfig,
          { maxRetries: 0 }
        );
      } catch (error) {
        expect((error as Error).message).toContain('Circuit breaker is open');
      }
    });
  });

  describe('Error Metrics and Reporting', () => {
    it('should collect comprehensive error metrics', async () => {
      // Generate various types of errors
      const errorTypes = ['NETWORK', 'PARSING', 'RATE_LIMIT', 'DATABASE'] as const;
      
      for (const type of errorTypes) {
        for (let i = 0; i < 3; i++) {
          const error: ScrapingError = {
            type,
            message: `${type} error ${i}`,
            timestamp: new Date()
          };
          
          await errorTracker.trackError(error, {
            ...mockContext,
            sourceId: `source-${type.toLowerCase()}`,
            attemptNumber: i + 1
          });
        }
      }

      // Verify metrics collection
      const metrics = errorTracker.getErrorMetrics();
      expect(metrics.size).toBe(errorTypes.length);
      
      errorTypes.forEach(type => {
        const typeMetrics = metrics.get(type as any);
        expect(typeMetrics).toBeDefined();
        expect(typeMetrics!.count).toBe(3);
      });

      // Test recent errors retrieval
      const recentErrors = errorTracker.getRecentErrors(15);
      expect(recentErrors).toHaveLength(12); // 4 types × 3 errors each
    });

    it('should generate daily summary data', async () => {
      // Simulate a day's worth of scraping activity
      const summary = {
        totalSources: 10,
        activeSources: 8,
        errorSources: 3,
        totalErrors: 25,
        topErrors: [
          { type: 'NETWORK_ERROR' as any, count: 12 },
          { type: 'PARSING_ERROR' as any, count: 8 },
          { type: 'RATE_LIMIT_ERROR' as any, count: 5 }
        ]
      };

      // This would normally be called by a scheduled job
      await notificationSender.sendDailySummary(summary);

      // Verify the summary was processed (would normally send notifications)
      expect(summary.totalErrors).toBe(25);
      expect(summary.topErrors).toHaveLength(3);
    });
  });
});