/**
 * Tests for RetryManager class
 */

import { RetryManager, RetryConditions, RetryOptions } from '../retry-manager';

describe('RetryManager', () => {
  let retryManager: RetryManager;

  beforeEach(() => {
    retryManager = new RetryManager();
  });

  describe('executeWithRetry', () => {
    it('should succeed on first attempt', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      const result = await retryManager.executeWithRetry(operation);

      expect(result.result).toBe('success');
      expect(result.attemptNumber).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and succeed', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue('success');

      const result = await retryManager.executeWithRetry(operation);

      expect(result.result).toBe('success');
      expect(result.attemptNumber).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should fail after max retries', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Persistent error'));

      await expect(retryManager.executeWithRetry(operation, { maxRetries: 2 }))
        .rejects.toThrow('Persistent error');

      expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should use custom retry options', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Error'));
      const options: Partial<RetryOptions> = {
        maxRetries: 1,
        baseDelay: 100,
        jitterEnabled: false
      };

      const startTime = Date.now();
      await expect(retryManager.executeWithRetry(operation, options))
        .rejects.toThrow('Error');
      const endTime = Date.now();

      expect(operation).toHaveBeenCalledTimes(2);
      expect(endTime - startTime).toBeGreaterThanOrEqual(100);
    });

    it('should respect retry condition', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('401 Unauthorized'));
      const options: Partial<RetryOptions> = {
        retryCondition: (error) => !error.message.includes('401')
      };

      await expect(retryManager.executeWithRetry(operation, options))
        .rejects.toThrow('401 Unauthorized');

      expect(operation).toHaveBeenCalledTimes(1); // No retries due to condition
    });

    it('should call onRetry callback', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue('success');
      
      const onRetry = jest.fn();
      const options: Partial<RetryOptions> = { onRetry };

      await retryManager.executeWithRetry(operation, options);

      expect(onRetry).toHaveBeenCalledWith(
        expect.any(Error),
        1 // Attempt number
      );
    });

    it('should calculate exponential backoff correctly', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Error'));
      const options: Partial<RetryOptions> = {
        maxRetries: 3,
        baseDelay: 100,
        backoffMultiplier: 2,
        jitterEnabled: false
      };

      const startTime = Date.now();
      await expect(retryManager.executeWithRetry(operation, options))
        .rejects.toThrow('Error');
      const endTime = Date.now();

      // Should have delays of 100ms, 200ms, 400ms = 700ms total minimum
      expect(endTime - startTime).toBeGreaterThanOrEqual(700);
      expect(operation).toHaveBeenCalledTimes(4);
    });

    it('should respect max delay', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Error'));
      const options: Partial<RetryOptions> = {
        maxRetries: 2,
        baseDelay: 1000,
        backoffMultiplier: 10,
        maxDelay: 1500,
        jitterEnabled: false
      };

      const startTime = Date.now();
      await expect(retryManager.executeWithRetry(operation, options))
        .rejects.toThrow('Error');
      const endTime = Date.now();

      // First delay: 1000ms, second delay: capped at 1500ms = 2500ms total
      expect(endTime - startTime).toBeLessThan(3000);
      expect(endTime - startTime).toBeGreaterThanOrEqual(2500);
    });

    it('should add jitter when enabled', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Error'));
      const options: Partial<RetryOptions> = {
        maxRetries: 1,
        baseDelay: 1000,
        jitterEnabled: true
      };

      const delays: number[] = [];
      for (let i = 0; i < 5; i++) {
        const startTime = Date.now();
        await expect(retryManager.executeWithRetry(operation, options))
          .rejects.toThrow('Error');
        const endTime = Date.now();
        delays.push(endTime - startTime);
      }

      // With jitter, delays should vary
      const uniqueDelays = new Set(delays.map(d => Math.floor(d / 100)));
      expect(uniqueDelays.size).toBeGreaterThan(1);
    });
  });

  describe('executeWithFallbacks', () => {
    it('should succeed with first operation', async () => {
      const operation1 = jest.fn().mockResolvedValue('success1');
      const operation2 = jest.fn().mockResolvedValue('success2');

      const result = await retryManager.executeWithFallbacks([operation1, operation2]);

      expect(result.result).toBe('success1');
      expect(result.attemptNumber).toBe(1);
      expect(operation1).toHaveBeenCalled();
      expect(operation2).not.toHaveBeenCalled();
    });

    it('should fallback to second operation', async () => {
      const operation1 = jest.fn().mockRejectedValue(new Error('Error 1'));
      const operation2 = jest.fn().mockResolvedValue('success2');

      const result = await retryManager.executeWithFallbacks([operation1, operation2]);

      expect(result.result).toBe('success2');
      expect(result.attemptNumber).toBe(2);
      expect(result.errors).toHaveLength(1);
      expect(operation1).toHaveBeenCalled();
      expect(operation2).toHaveBeenCalled();
    });

    it('should fail when all operations fail', async () => {
      const operation1 = jest.fn().mockRejectedValue(new Error('Error 1'));
      const operation2 = jest.fn().mockRejectedValue(new Error('Error 2'));

      await expect(retryManager.executeWithFallbacks([operation1, operation2]))
        .rejects.toThrow('All fallback operations failed');

      expect(operation1).toHaveBeenCalled();
      expect(operation2).toHaveBeenCalled();
    });

    it('should throw error when no operations provided', async () => {
      await expect(retryManager.executeWithFallbacks([]))
        .rejects.toThrow('No operations provided');
    });
  });

  describe('executeWithCircuitBreaker', () => {
    it('should execute operation when circuit is closed', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      const circuitConfig = {
        failureThreshold: 3,
        resetTimeout: 5000,
        monitoringPeriod: 60000
      };

      const result = await retryManager.executeWithCircuitBreaker(
        operation,
        circuitConfig
      );

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalled();
    });

    it('should record failures and successes', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Error'))
        .mockResolvedValue('success');
      
      const circuitConfig = {
        failureThreshold: 3,
        resetTimeout: 5000,
        monitoringPeriod: 60000
      };

      // First call fails
      await expect(retryManager.executeWithCircuitBreaker(
        operation,
        circuitConfig,
        { maxRetries: 0 }
      )).rejects.toThrow('Error');

      // Second call succeeds
      const result = await retryManager.executeWithCircuitBreaker(
        operation,
        circuitConfig
      );

      expect(result).toBe('success');
    });
  });

  describe('RetryConditions', () => {
    describe('networkErrors', () => {
      it('should return true for network errors', () => {
        const networkErrors = [
          new Error('Network error'),
          new Error('Connection timeout'),
          new Error('ECONNREFUSED'),
          new Error('ENOTFOUND'),
          new Error('ETIMEDOUT')
        ];

        networkErrors.forEach(error => {
          expect(RetryConditions.networkErrors(error)).toBe(true);
        });
      });

      it('should return false for non-network errors', () => {
        const nonNetworkErrors = [
          new Error('Validation error'),
          new Error('401 Unauthorized'),
          new Error('Parse error')
        ];

        nonNetworkErrors.forEach(error => {
          expect(RetryConditions.networkErrors(error)).toBe(false);
        });
      });
    });

    describe('temporaryHttpErrors', () => {
      it('should return true for temporary HTTP errors', () => {
        const temporaryErrors = [
          new Error('500 Internal Server Error'),
          new Error('502 Bad Gateway'),
          new Error('503 Service Unavailable'),
          new Error('504 Gateway Timeout'),
          new Error('429 Too Many Requests')
        ];

        temporaryErrors.forEach(error => {
          expect(RetryConditions.temporaryHttpErrors(error)).toBe(true);
        });
      });

      it('should return false for permanent HTTP errors', () => {
        const permanentErrors = [
          new Error('400 Bad Request'),
          new Error('401 Unauthorized'),
          new Error('404 Not Found')
        ];

        permanentErrors.forEach(error => {
          expect(RetryConditions.temporaryHttpErrors(error)).toBe(false);
        });
      });
    });

    describe('notAuthenticationErrors', () => {
      it('should return false for authentication errors', () => {
        const authErrors = [
          new Error('401 Unauthorized'),
          new Error('403 Forbidden'),
          new Error('Authentication failed'),
          new Error('Access forbidden')
        ];

        authErrors.forEach(error => {
          expect(RetryConditions.notAuthenticationErrors(error)).toBe(false);
        });
      });

      it('should return true for non-authentication errors', () => {
        const nonAuthErrors = [
          new Error('500 Internal Server Error'),
          new Error('Network error'),
          new Error('Parse error')
        ];

        nonAuthErrors.forEach(error => {
          expect(RetryConditions.notAuthenticationErrors(error)).toBe(true);
        });
      });
    });

    describe('and', () => {
      it('should return true when all conditions are true', () => {
        const condition1 = jest.fn().mockReturnValue(true);
        const condition2 = jest.fn().mockReturnValue(true);
        const combinedCondition = RetryConditions.and(condition1, condition2);

        const error = new Error('Test error');
        const result = combinedCondition(error);

        expect(result).toBe(true);
        expect(condition1).toHaveBeenCalledWith(error);
        expect(condition2).toHaveBeenCalledWith(error);
      });

      it('should return false when any condition is false', () => {
        const condition1 = jest.fn().mockReturnValue(true);
        const condition2 = jest.fn().mockReturnValue(false);
        const combinedCondition = RetryConditions.and(condition1, condition2);

        const result = combinedCondition(new Error('Test error'));

        expect(result).toBe(false);
      });
    });

    describe('or', () => {
      it('should return true when any condition is true', () => {
        const condition1 = jest.fn().mockReturnValue(false);
        const condition2 = jest.fn().mockReturnValue(true);
        const combinedCondition = RetryConditions.or(condition1, condition2);

        const result = combinedCondition(new Error('Test error'));

        expect(result).toBe(true);
      });

      it('should return false when all conditions are false', () => {
        const condition1 = jest.fn().mockReturnValue(false);
        const condition2 = jest.fn().mockReturnValue(false);
        const combinedCondition = RetryConditions.or(condition1, condition2);

        const result = combinedCondition(new Error('Test error'));

        expect(result).toBe(false);
      });
    });
  });
});