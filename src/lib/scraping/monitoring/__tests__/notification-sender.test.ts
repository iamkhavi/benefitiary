/**
 * Tests for NotificationSender class
 */

import { NotificationSender, NotificationConfig } from '../notification-sender';
import { ScrapingErrorType, ScrapingContext } from '../error-tracker';

describe('NotificationSender', () => {
  let notificationSender: NotificationSender;
  let mockContext: ScrapingContext;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleInfoSpy: jest.SpyInstance;

  beforeEach(() => {
    const config: NotificationConfig = {
      console: {
        enabled: true,
        logLevel: 'error'
      },
      email: {
        enabled: false,
        smtpHost: 'smtp.example.com',
        smtpPort: 587,
        username: 'test@example.com',
        password: 'password',
        from: 'test@example.com',
        to: ['admin@example.com']
      },
      slack: {
        enabled: false,
        webhookUrl: 'https://hooks.slack.com/test',
        channel: '#alerts',
        username: 'ScrapingBot'
      },
      webhook: {
        enabled: false,
        url: 'https://api.example.com/webhook',
        headers: { 'Authorization': 'Bearer token' }
      }
    };

    notificationSender = new NotificationSender(config);
    
    mockContext = {
      sourceId: 'test-source',
      sourceUrl: 'https://example.com',
      jobId: 'job-123',
      attemptNumber: 1,
      startTime: new Date()
    };

    // Spy on console methods
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleInfoSpy.mockRestore();
  });

  describe('sendCriticalErrorAlert', () => {
    it('should send critical error alert', async () => {
      await notificationSender.sendCriticalErrorAlert(
        ScrapingErrorType.DATABASE_ERROR,
        mockContext
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('🚨 Critical Scraping Error: DATABASE_ERROR'),
        expect.objectContaining({
          errorType: ScrapingErrorType.DATABASE_ERROR,
          sourceId: 'test-source',
          jobId: 'job-123'
        })
      );
    });

    it('should respect cooldown period', async () => {
      // Send first alert
      await notificationSender.sendCriticalErrorAlert(
        ScrapingErrorType.DATABASE_ERROR,
        mockContext
      );

      // Send second alert immediately (should be blocked by cooldown)
      await notificationSender.sendCriticalErrorAlert(
        ScrapingErrorType.DATABASE_ERROR,
        mockContext
      );

      // Should only be called once due to cooldown
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });

    it('should allow alerts for different error types', async () => {
      await notificationSender.sendCriticalErrorAlert(
        ScrapingErrorType.DATABASE_ERROR,
        mockContext
      );

      await notificationSender.sendCriticalErrorAlert(
        ScrapingErrorType.AUTHENTICATION_ERROR,
        mockContext
      );

      // Should be called twice for different error types
      expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('sendHighErrorRateAlert', () => {
    it('should send high error rate alert', async () => {
      await notificationSender.sendHighErrorRateAlert('test-source', 0.75);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('⚠️ High Error Rate Detected'),
        expect.objectContaining({
          sourceId: 'test-source',
          errorRate: 0.75,
          threshold: 0.5
        })
      );
    });

    it('should format error rate as percentage', async () => {
      await notificationSender.sendHighErrorRateAlert('test-source', 0.8);

      const callArgs = consoleErrorSpy.mock.calls[0][0];
      expect(callArgs).toContain('80.0%');
    });

    it('should respect cooldown period', async () => {
      await notificationSender.sendHighErrorRateAlert('test-source', 0.75);
      await notificationSender.sendHighErrorRateAlert('test-source', 0.8);

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('sendConsecutiveFailuresAlert', () => {
    it('should send consecutive failures alert', async () => {
      await notificationSender.sendConsecutiveFailuresAlert('test-source', 7);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('🔄 Consecutive Failures Alert'),
        expect.objectContaining({
          sourceId: 'test-source',
          failureCount: 7,
          threshold: 5
        })
      );
    });

    it('should include failure count in message', async () => {
      await notificationSender.sendConsecutiveFailuresAlert('test-source', 10);

      const callArgs = consoleErrorSpy.mock.calls[0][0];
      expect(callArgs).toContain('failed 10 consecutive times');
    });
  });

  describe('sendSourceRecoveryNotification', () => {
    it('should send source recovery notification', async () => {
      await notificationSender.sendSourceRecoveryNotification('test-source', 5);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('✅ Source Recovery'),
        expect.objectContaining({
          sourceId: 'test-source',
          previousFailureCount: 5
        })
      );
    });

    it('should include previous failure count', async () => {
      await notificationSender.sendSourceRecoveryNotification('test-source', 8);

      const callArgs = consoleErrorSpy.mock.calls[0][0];
      expect(callArgs).toContain('recovered after 8 failures');
    });
  });

  describe('sendDailySummary', () => {
    it('should send daily summary with statistics', async () => {
      const summary = {
        totalSources: 10,
        activeSources: 8,
        errorSources: 2,
        totalErrors: 15,
        topErrors: [
          { type: ScrapingErrorType.NETWORK_ERROR, count: 8 },
          { type: ScrapingErrorType.PARSING_ERROR, count: 4 },
          { type: ScrapingErrorType.RATE_LIMIT_ERROR, count: 3 }
        ]
      };

      await notificationSender.sendDailySummary(summary);

      const callArgs = consoleErrorSpy.mock.calls[0][0];
      expect(callArgs).toContain('📊 Daily Scraping Summary');
      expect(callArgs).toContain('Total Sources: 10');
      expect(callArgs).toContain('Active Sources: 8');
      expect(callArgs).toContain('Sources with Errors: 2');
      expect(callArgs).toContain('Total Errors: 15');
      expect(callArgs).toContain('NETWORK_ERROR: 8 occurrences');
      expect(callArgs).toContain('PARSING_ERROR: 4 occurrences');
      expect(callArgs).toContain('RATE_LIMIT_ERROR: 3 occurrences');
    });

    it('should handle empty error list', async () => {
      const summary = {
        totalSources: 5,
        activeSources: 5,
        errorSources: 0,
        totalErrors: 0,
        topErrors: []
      };

      await notificationSender.sendDailySummary(summary);

      const callArgs = consoleErrorSpy.mock.calls[0][0];
      expect(callArgs).toContain('No errors recorded');
    });
  });

  describe('console notification levels', () => {
    it('should use error level for critical notifications', async () => {
      const config: NotificationConfig = {
        console: { enabled: true, logLevel: 'error' }
      };
      const sender = new NotificationSender(config);

      await sender.sendCriticalErrorAlert(ScrapingErrorType.DATABASE_ERROR, mockContext);

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      expect(consoleInfoSpy).not.toHaveBeenCalled();
    });

    it('should use warn level when configured', async () => {
      const config: NotificationConfig = {
        console: { enabled: true, logLevel: 'warn' }
      };
      const sender = new NotificationSender(config);

      await sender.sendHighErrorRateAlert('test-source', 0.8);

      expect(consoleWarnSpy).toHaveBeenCalled();
      expect(consoleErrorSpy).not.toHaveBeenCalled();
      expect(consoleInfoSpy).not.toHaveBeenCalled();
    });

    it('should use info level when configured', async () => {
      const config: NotificationConfig = {
        console: { enabled: true, logLevel: 'info' }
      };
      const sender = new NotificationSender(config);

      await sender.sendSourceRecoveryNotification('test-source', 3);

      expect(consoleInfoSpy).toHaveBeenCalled();
      expect(consoleErrorSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });
  });

  describe('disabled notifications', () => {
    it('should not send notifications when console is disabled', async () => {
      const config: NotificationConfig = {
        console: { enabled: false, logLevel: 'error' }
      };
      const sender = new NotificationSender(config);

      await sender.sendCriticalErrorAlert(ScrapingErrorType.DATABASE_ERROR, mockContext);

      expect(consoleErrorSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      expect(consoleInfoSpy).not.toHaveBeenCalled();
    });
  });

  describe('email notifications', () => {
    it('should log email notification details when enabled', async () => {
      const config: NotificationConfig = {
        console: { enabled: true, logLevel: 'info' },
        email: {
          enabled: true,
          smtpHost: 'smtp.example.com',
          smtpPort: 587,
          username: 'test@example.com',
          password: 'password',
          from: 'test@example.com',
          to: ['admin@example.com']
        }
      };
      const sender = new NotificationSender(config);

      await sender.sendCriticalErrorAlert(ScrapingErrorType.DATABASE_ERROR, mockContext);

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        '[EmailNotification] Would send email:',
        expect.objectContaining({
          to: ['admin@example.com'],
          subject: expect.stringContaining('Critical Scraping Error'),
          severity: 'critical'
        })
      );
    });
  });

  describe('slack notifications', () => {
    it('should log slack notification details when enabled', async () => {
      const config: NotificationConfig = {
        console: { enabled: true, logLevel: 'info' },
        slack: {
          enabled: true,
          webhookUrl: 'https://hooks.slack.com/test',
          channel: '#alerts',
          username: 'ScrapingBot'
        }
      };
      const sender = new NotificationSender(config);

      await sender.sendHighErrorRateAlert('test-source', 0.8);

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        '[SlackNotification] Would send to Slack:',
        expect.objectContaining({
          channel: '#alerts',
          username: 'ScrapingBot',
          attachments: expect.arrayContaining([
            expect.objectContaining({
              color: expect.any(String),
              title: expect.stringContaining('High Error Rate'),
              text: expect.any(String)
            })
          ])
        })
      );
    });
  });

  describe('webhook notifications', () => {
    it('should log webhook notification details when enabled', async () => {
      const config: NotificationConfig = {
        console: { enabled: true, logLevel: 'info' },
        webhook: {
          enabled: true,
          url: 'https://api.example.com/webhook',
          headers: { 'Authorization': 'Bearer token' }
        }
      };
      const sender = new NotificationSender(config);

      await sender.sendConsecutiveFailuresAlert('test-source', 6);

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        '[WebhookNotification] Would send webhook:',
        expect.objectContaining({
          url: 'https://api.example.com/webhook',
          payload: expect.objectContaining({
            notification: expect.objectContaining({
              title: expect.stringContaining('Consecutive Failures'),
              severity: 'medium'
            })
          })
        })
      );
    });
  });
});