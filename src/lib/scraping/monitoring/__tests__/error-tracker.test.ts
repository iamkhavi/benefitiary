/**
 * Tests for ErrorTracker class
 */

import { ErrorTracker, ScrapingErrorType, ScrapingContext } from '../error-tracker';
import { ScrapingError } from '../../types';

describe('ErrorTracker', () => {
  let errorTracker: ErrorTracker;
  let mockContext: ScrapingContext;

  beforeEach(() => {
    errorTracker = new ErrorTracker();
    mockContext = {
      sourceId: 'test-source',
      sourceUrl: 'https://example.com',
      jobId: 'job-123',
      attemptNumber: 1,
      startTime: new Date()
    };
  });

  describe('trackError', () => {
    it('should track a new error', async () => {
      const error: ScrapingError = {
        type: 'NETWORK',
        message: 'Connection timeout',
        timestamp: new Date(),
        url: 'https://example.com'
      };

      await errorTracker.trackError(error, mockContext);

      const history = errorTracker.getSourceErrorHistory('test-source');
      expect(history).toHaveLength(1);
      expect(history[0]).toEqual(error);
    });

    it('should maintain error history size limit', async () => {
      // Create more errors than the limit (1000)
      for (let i = 0; i < 1005; i++) {
        const error: ScrapingError = {
          type: 'NETWORK',
          message: `Error ${i}`,
          timestamp: new Date(),
          url: 'https://example.com'
        };
        await errorTracker.trackError(error, mockContext);
      }

      const history = errorTracker.getSourceErrorHistory('test-source');
      expect(history.length).toBeLessThanOrEqual(1000);
    });

    it('should update error metrics', async () => {
      const error: ScrapingError = {
        type: 'NETWORK',
        message: 'Connection timeout',
        timestamp: new Date()
      };

      await errorTracker.trackError(error, mockContext);

      const metrics = errorTracker.getErrorMetrics();
      // The error should be categorized as TIMEOUT_ERROR due to "timeout" in message
      const timeoutMetrics = metrics.get(ScrapingErrorType.TIMEOUT_ERROR);
      
      expect(timeoutMetrics).toBeDefined();
      expect(timeoutMetrics!.count).toBe(1);
      expect(timeoutMetrics!.errorType).toBe(ScrapingErrorType.TIMEOUT_ERROR);
    });
  });

  describe('getRecentErrors', () => {
    it('should return recent errors sorted by timestamp', async () => {
      const error1: ScrapingError = {
        type: 'NETWORK',
        message: 'Error 1',
        timestamp: new Date('2023-01-01T10:00:00Z')
      };

      const error2: ScrapingError = {
        type: 'PARSING',
        message: 'Error 2',
        timestamp: new Date('2023-01-01T11:00:00Z')
      };

      await errorTracker.trackError(error1, mockContext);
      await errorTracker.trackError(error2, { ...mockContext, sourceId: 'source-2' });

      const recentErrors = errorTracker.getRecentErrors(10);
      expect(recentErrors).toHaveLength(2);
      expect(recentErrors[0].timestamp.getTime()).toBeGreaterThan(recentErrors[1].timestamp.getTime());
    });

    it('should limit results to specified count', async () => {
      for (let i = 0; i < 5; i++) {
        const error: ScrapingError = {
          type: 'NETWORK',
          message: `Error ${i}`,
          timestamp: new Date()
        };
        await errorTracker.trackError(error, { ...mockContext, sourceId: `source-${i}` });
      }

      const recentErrors = errorTracker.getRecentErrors(3);
      expect(recentErrors).toHaveLength(3);
    });
  });

  describe('hasRecurringErrors', () => {
    it('should detect recurring errors within time window', async () => {
      const now = new Date();
      
      for (let i = 0; i < 3; i++) {
        const error: ScrapingError = {
          type: 'PARSING',
          message: `Element not found ${i}`, // Use message that will be categorized as PARSING_ERROR
          timestamp: new Date(now.getTime() - (i * 60000)) // 1 minute apart
        };
        await errorTracker.trackError(error, mockContext);
      }

      const hasRecurring = errorTracker.hasRecurringErrors(
        'test-source', 
        ScrapingErrorType.PARSING_ERROR,
        3600000 // 1 hour window
      );
      
      expect(hasRecurring).toBe(true);
    });

    it('should not detect recurring errors outside time window', async () => {
      const now = new Date();
      
      for (let i = 0; i < 3; i++) {
        const error: ScrapingError = {
          type: 'PARSING',
          message: `Element not found ${i}`, // Use message that will be categorized as PARSING_ERROR
          timestamp: new Date(now.getTime() - (2 * 3600000) - (i * 60000)) // 2+ hours ago
        };
        await errorTracker.trackError(error, mockContext);
      }

      const hasRecurring = errorTracker.hasRecurringErrors(
        'test-source', 
        ScrapingErrorType.PARSING_ERROR,
        3600000 // 1 hour window
      );
      
      expect(hasRecurring).toBe(false);
    });
  });

  describe('getSourceErrorRate', () => {
    it('should calculate error rate correctly', async () => {
      const now = new Date();
      
      // Add 2 errors within time window
      for (let i = 0; i < 2; i++) {
        const error: ScrapingError = {
          type: 'NETWORK',
          message: `Error ${i}`,
          timestamp: new Date(now.getTime() - (i * 60000))
        };
        await errorTracker.trackError(error, mockContext);
      }

      const errorRate = errorTracker.getSourceErrorRate('test-source', 3600000);
      expect(errorRate).toBeGreaterThan(0);
      expect(errorRate).toBeLessThanOrEqual(1);
    });

    it('should return 0 for sources with no errors', () => {
      const errorRate = errorTracker.getSourceErrorRate('non-existent-source');
      expect(errorRate).toBe(0);
    });
  });

  describe('recordSuccessfulRetry', () => {
    it('should update successful retry metrics', async () => {
      // First track an error to create metrics
      const error: ScrapingError = {
        type: 'NETWORK',
        message: 'Network connection failed', // Will be categorized as NETWORK_ERROR
        timestamp: new Date()
      };
      await errorTracker.trackError(error, mockContext);

      // Record successful retry
      errorTracker.recordSuccessfulRetry(ScrapingErrorType.NETWORK_ERROR, 5000);

      const metrics = errorTracker.getErrorMetrics();
      const networkMetrics = metrics.get(ScrapingErrorType.NETWORK_ERROR);
      
      expect(networkMetrics!.successfulRetries).toBe(1);
      expect(networkMetrics!.averageResolutionTime).toBe(5000);
    });
  });

  describe('recordFailedRetry', () => {
    it('should update failed retry metrics', async () => {
      // First track an error to create metrics
      const error: ScrapingError = {
        type: 'NETWORK',
        message: 'Network connection failed', // Will be categorized as NETWORK_ERROR
        timestamp: new Date()
      };
      await errorTracker.trackError(error, mockContext);

      // Record failed retry
      errorTracker.recordFailedRetry(ScrapingErrorType.NETWORK_ERROR);

      const metrics = errorTracker.getErrorMetrics();
      const networkMetrics = metrics.get(ScrapingErrorType.NETWORK_ERROR);
      
      expect(networkMetrics!.failedRetries).toBe(1);
    });
  });

  describe('clearSourceErrors', () => {
    it('should clear all errors for a source', async () => {
      const error: ScrapingError = {
        type: 'NETWORK',
        message: 'Network connection failed',
        timestamp: new Date()
      };
      await errorTracker.trackError(error, mockContext);

      expect(errorTracker.getSourceErrorHistory('test-source')).toHaveLength(1);

      errorTracker.clearSourceErrors('test-source');
      expect(errorTracker.getSourceErrorHistory('test-source')).toHaveLength(0);
    });
  });
});