/**
 * Tests for ErrorHandler class
 */

import { ErrorHandler, ErrorHandlerConfig } from '../error-handler';
import { ErrorTracker, ScrapingErrorType, ScrapingContext } from '../error-tracker';
import { NotificationSender } from '../notification-sender';
import { ScrapingError } from '../../types';

// Mock dependencies
jest.mock('../error-tracker');
jest.mock('../notification-sender');

describe('ErrorHandler', () => {
  let errorHandler: ErrorHandler;
  let mockErrorTracker: jest.Mocked<ErrorTracker>;
  let mockNotificationSender: jest.Mocked<NotificationSender>;
  let mockContext: ScrapingContext;

  beforeEach(() => {
    mockErrorTracker = new ErrorTracker() as jest.Mocked<ErrorTracker>;
    mockNotificationSender = new NotificationSender({} as any) as jest.Mocked<NotificationSender>;
    
    mockContext = {
      sourceId: 'test-source',
      sourceUrl: 'https://example.com',
      jobId: 'job-123',
      attemptNumber: 1,
      startTime: new Date()
    };

    const config: Partial<ErrorHandlerConfig> = {
      retryConfig: {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 10000,
        backoffMultiplier: 2,
        jitterEnabled: false // Disable for predictable tests
      }
    };

    errorHandler = new ErrorHandler(mockErrorTracker, mockNotificationSender, config);
  });

  describe('handleScrapingError', () => {
    it('should handle rate limit errors with appropriate delay', async () => {
      const error: ScrapingError = {
        type: 'RATE_LIMIT',
        message: 'Rate limit exceeded, retry-after: 60',
        timestamp: new Date()
      };

      const resolution = await errorHandler.handleScrapingError(error, mockContext);

      expect(resolution.action).toBe('retry');
      expect(resolution.delay).toBe(60000); // 60 seconds
      expect(mockErrorTracker.trackError).toHaveBeenCalledWith(error, mockContext);
    });

    it('should handle network errors with exponential backoff', async () => {
      const error: ScrapingError = {
        type: 'NETWORK',
        message: 'Connection timeout',
        timestamp: new Date()
      };

      const resolution = await errorHandler.handleScrapingError(error, mockContext);

      expect(resolution.action).toBe('retry');
      expect(resolution.delay).toBe(1000); // Base delay for first attempt
    });

    it('should handle authentication errors with manual review', async () => {
      const error: ScrapingError = {
        type: 'AUTHENTICATION',
        message: '401 Unauthorized',
        timestamp: new Date()
      };

      const resolution = await errorHandler.handleScrapingError(error, mockContext);

      expect(resolution.action).toBe('manual_review');
      expect(resolution.message).toContain('Authentication failed');
    });

    it('should handle CAPTCHA errors with manual review', async () => {
      const error: ScrapingError = {
        type: 'CAPTCHA',
        message: 'CAPTCHA challenge detected',
        timestamp: new Date()
      };

      const resolution = await errorHandler.handleScrapingError(error, mockContext);

      expect(resolution.action).toBe('manual_review');
      expect(resolution.message).toContain('CAPTCHA detected');
    });

    it('should skip after max retries for network errors', async () => {
      const error: ScrapingError = {
        type: 'NETWORK',
        message: 'Connection timeout',
        timestamp: new Date()
      };

      const contextWithMaxAttempts = { ...mockContext, attemptNumber: 4 };
      const resolution = await errorHandler.handleScrapingError(error, contextWithMaxAttempts);

      expect(resolution.action).toBe('skip');
      expect(resolution.message).toContain('Max retries exceeded');
    });

    it('should handle recurring parsing errors with manual review', async () => {
      mockErrorTracker.hasRecurringErrors.mockReturnValue(true);

      const error: ScrapingError = {
        type: 'PARSING',
        message: 'Element not found',
        timestamp: new Date()
      };

      const resolution = await errorHandler.handleScrapingError(error, mockContext);

      expect(resolution.action).toBe('manual_review');
      expect(resolution.message).toContain('Recurring parsing errors');
    });
  });

  describe('executeWithRetry', () => {
    it('should succeed on first attempt', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      const result = await errorHandler.executeWithRetry(operation, mockContext);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and succeed', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue('success');

      const result = await errorHandler.executeWithRetry(operation, mockContext);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should fail after max retries', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Persistent error'));

      await expect(errorHandler.executeWithRetry(operation, mockContext))
        .rejects.toThrow('Persistent error');

      expect(operation).toHaveBeenCalledTimes(4); // Initial + 3 retries
    });

    it('should not retry authentication errors', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('401 Unauthorized'));

      await expect(errorHandler.executeWithRetry(operation, mockContext))
        .rejects.toThrow('401 Unauthorized');

      expect(operation).toHaveBeenCalledTimes(1); // No retries
    });

    it('should record successful retry metrics', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue('success');

      await errorHandler.executeWithRetry(operation, mockContext);

      expect(mockErrorTracker.recordSuccessfulRetry).toHaveBeenCalledWith(
        ScrapingErrorType.NETWORK_ERROR,
        expect.any(Number)
      );
    });

    it('should record failed retry metrics', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Network error'));

      await expect(errorHandler.executeWithRetry(operation, mockContext))
        .rejects.toThrow();

      expect(mockErrorTracker.recordFailedRetry).toHaveBeenCalledWith(
        ScrapingErrorType.NETWORK_ERROR
      );
    });
  });

  describe('handlePartialFailure', () => {
    it('should continue with low error rate', async () => {
      const errors: ScrapingError[] = [
        { type: 'NETWORK', message: 'Error 1', timestamp: new Date() }
      ];
      const successfulResults = ['result1', 'result2', 'result3', 'result4'];

      const result = await errorHandler.handlePartialFailure(errors, successfulResults, mockContext);

      expect(result.shouldContinue).toBe(true);
      expect(result.fallbackStrategy).toBeUndefined();
    });

    it('should apply fallback strategy with high error rate', async () => {
      const errors: ScrapingError[] = [
        { type: 'NETWORK', message: 'Error 1', timestamp: new Date() },
        { type: 'NETWORK', message: 'Error 2', timestamp: new Date() },
        { type: 'NETWORK', message: 'Error 3', timestamp: new Date() }
      ];
      const successfulResults = ['result1'];

      const result = await errorHandler.handlePartialFailure(errors, successfulResults, mockContext);

      expect(result.shouldContinue).toBe(true);
      expect(result.fallbackStrategy).toBeDefined();
    });

    it('should not continue when graceful degradation is disabled', async () => {
      const configWithoutGracefulDegradation: Partial<ErrorHandlerConfig> = {
        gracefulDegradation: { enabled: false, fallbackStrategies: [] }
      };

      const errorHandlerWithoutGraceful = new ErrorHandler(
        mockErrorTracker,
        mockNotificationSender,
        configWithoutGracefulDegradation
      );

      const errors: ScrapingError[] = [
        { type: 'NETWORK', message: 'Error 1', timestamp: new Date() }
      ];
      const successfulResults = ['result1'];

      const result = await errorHandlerWithoutGraceful.handlePartialFailure(
        errors,
        successfulResults,
        mockContext
      );

      expect(result.shouldContinue).toBe(false);
    });
  });

  describe('notification triggers', () => {
    it('should send critical error alerts', async () => {
      const error: ScrapingError = {
        type: 'DATABASE',
        message: 'Database connection failed',
        timestamp: new Date()
      };

      await errorHandler.handleScrapingError(error, mockContext);

      expect(mockNotificationSender.sendCriticalErrorAlert).toHaveBeenCalledWith(
        ScrapingErrorType.DATABASE_ERROR,
        mockContext
      );
    });

    it('should send high error rate alerts', async () => {
      mockErrorTracker.getSourceErrorRate.mockReturnValue(0.8);

      const error: ScrapingError = {
        type: 'NETWORK',
        message: 'Network error',
        timestamp: new Date()
      };

      await errorHandler.handleScrapingError(error, mockContext);

      expect(mockNotificationSender.sendHighErrorRateAlert).toHaveBeenCalledWith(
        'test-source',
        0.8
      );
    });

    it('should send consecutive failures alerts', async () => {
      const recentErrors = Array(6).fill(null).map(() => ({
        type: 'NETWORK',
        message: 'Network error',
        timestamp: new Date()
      }));
      mockErrorTracker.getSourceErrorHistory.mockReturnValue(recentErrors);

      const error: ScrapingError = {
        type: 'NETWORK',
        message: 'Network error',
        timestamp: new Date()
      };

      await errorHandler.handleScrapingError(error, mockContext);

      expect(mockNotificationSender.sendConsecutiveFailuresAlert).toHaveBeenCalledWith(
        'test-source',
        6
      );
    });
  });

  describe('error categorization', () => {
    const testCases = [
      { message: 'Connection timeout', expected: ScrapingErrorType.TIMEOUT_ERROR },
      { message: 'ETIMEDOUT', expected: ScrapingErrorType.TIMEOUT_ERROR },
      { message: 'ECONNREFUSED', expected: ScrapingErrorType.NETWORK_ERROR },
      { message: 'ENOTFOUND', expected: ScrapingErrorType.NETWORK_ERROR },
      { message: 'Rate limit exceeded', expected: ScrapingErrorType.RATE_LIMIT_ERROR },
      { message: '429 Too Many Requests', expected: ScrapingErrorType.RATE_LIMIT_ERROR },
      { message: '401 Unauthorized', expected: ScrapingErrorType.AUTHENTICATION_ERROR },
      { message: '403 Forbidden', expected: ScrapingErrorType.AUTHENTICATION_ERROR },
      { message: 'CAPTCHA challenge', expected: ScrapingErrorType.CAPTCHA_ERROR },
      { message: 'reCAPTCHA detected', expected: ScrapingErrorType.CAPTCHA_ERROR },
      { message: 'Element not found', expected: ScrapingErrorType.PARSING_ERROR },
      { message: 'Database error', expected: ScrapingErrorType.DATABASE_ERROR },
      { message: 'Prisma error', expected: ScrapingErrorType.DATABASE_ERROR },
      { message: 'Proxy connection failed', expected: ScrapingErrorType.PROXY_ERROR }
    ];

    testCases.forEach(({ message, expected }) => {
      it(`should categorize "${message}" as ${expected}`, async () => {
        const error: ScrapingError = {
          type: 'NETWORK', // Will be recategorized
          message,
          timestamp: new Date()
        };

        const resolution = await errorHandler.handleScrapingError(error, mockContext);

        // The resolution should be appropriate for the expected error type
        if (expected === ScrapingErrorType.AUTHENTICATION_ERROR || 
            expected === ScrapingErrorType.CAPTCHA_ERROR) {
          expect(resolution.action).toBe('manual_review');
        } else if (expected === ScrapingErrorType.RATE_LIMIT_ERROR) {
          expect(resolution.action).toBe('retry');
          expect(resolution.delay).toBeGreaterThan(0);
        }
      });
    });
  });
});