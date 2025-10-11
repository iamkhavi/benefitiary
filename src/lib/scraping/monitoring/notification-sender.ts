/**
 * Notification system for scraping errors and alerts
 */

import { ScrapingErrorType, ScrapingContext } from './error-tracker';
import { AlertConfig } from '../types';

export interface NotificationConfig {
  email?: {
    enabled: boolean;
    smtpHost: string;
    smtpPort: number;
    username: string;
    password: string;
    from: string;
    to: string[];
  };
  slack?: {
    enabled: boolean;
    webhookUrl: string;
    channel: string;
    username: string;
  };
  webhook?: {
    enabled: boolean;
    url: string;
    headers: Record<string, string>;
  };
  console?: {
    enabled: boolean;
    logLevel: 'error' | 'warn' | 'info';
  };
}

export interface NotificationMessage {
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  metadata: Record<string, any>;
}

export class NotificationSender {
  private config: NotificationConfig;
  private alertCooldowns: Map<string, Date> = new Map();
  private defaultCooldownMinutes = 15;

  constructor(config: NotificationConfig) {
    this.config = config;
  }

  /**
   * Send critical error alert
   */
  async sendCriticalErrorAlert(
    errorType: ScrapingErrorType,
    context: ScrapingContext
  ): Promise<void> {
    const alertKey = `critical_${errorType}_${context.sourceId}`;
    
    if (this.isInCooldown(alertKey)) {
      return;
    }

    const notification: NotificationMessage = {
      title: `🚨 Critical Scraping Error: ${errorType}`,
      message: `Critical error occurred in source ${context.sourceId}.\n\n` +
               `Error Type: ${errorType}\n` +
               `Job ID: ${context.jobId}\n` +
               `Source URL: ${context.sourceUrl}\n` +
               `Attempt: ${context.attemptNumber}\n` +
               `Time: ${new Date().toISOString()}\n\n` +
               `This error type requires immediate attention.`,
      severity: 'critical',
      timestamp: new Date(),
      metadata: {
        errorType,
        sourceId: context.sourceId,
        jobId: context.jobId,
        sourceUrl: context.sourceUrl,
        attemptNumber: context.attemptNumber
      }
    };

    await this.sendNotification(notification);
    this.setCooldown(alertKey);
  }

  /**
   * Send high error rate alert
   */
  async sendHighErrorRateAlert(sourceId: string, errorRate: number): Promise<void> {
    const alertKey = `high_error_rate_${sourceId}`;
    
    if (this.isInCooldown(alertKey)) {
      return;
    }

    const notification: NotificationMessage = {
      title: `⚠️ High Error Rate Detected`,
      message: `Source ${sourceId} has a high error rate of ${(errorRate * 100).toFixed(1)}%.\n\n` +
               `This may indicate:\n` +
               `• Website structure changes\n` +
               `• Network connectivity issues\n` +
               `• Rate limiting or blocking\n` +
               `• Authentication problems\n\n` +
               `Please investigate and consider updating the scraping configuration.`,
      severity: 'high',
      timestamp: new Date(),
      metadata: {
        sourceId,
        errorRate,
        threshold: 0.5
      }
    };

    await this.sendNotification(notification);
    this.setCooldown(alertKey, 30); // 30 minute cooldown for error rate alerts
  }

  /**
   * Send consecutive failures alert
   */
  async sendConsecutiveFailuresAlert(
    sourceId: string, 
    failureCount: number
  ): Promise<void> {
    const alertKey = `consecutive_failures_${sourceId}`;
    
    if (this.isInCooldown(alertKey)) {
      return;
    }

    const notification: NotificationMessage = {
      title: `🔄 Consecutive Failures Alert`,
      message: `Source ${sourceId} has failed ${failureCount} consecutive times.\n\n` +
               `This suggests a persistent issue that may require:\n` +
               `• Manual investigation\n` +
               `• Configuration updates\n` +
               `• Temporary source disabling\n\n` +
               `Consider reviewing recent error logs for this source.`,
      severity: 'medium',
      timestamp: new Date(),
      metadata: {
        sourceId,
        failureCount,
        threshold: 5
      }
    };

    await this.sendNotification(notification);
    this.setCooldown(alertKey, 60); // 1 hour cooldown for consecutive failures
  }

  /**
   * Send source recovery notification
   */
  async sendSourceRecoveryNotification(
    sourceId: string,
    previousFailureCount: number
  ): Promise<void> {
    const notification: NotificationMessage = {
      title: `✅ Source Recovery`,
      message: `Source ${sourceId} has recovered after ${previousFailureCount} failures.\n\n` +
               `Scraping operations have resumed successfully.`,
      severity: 'low',
      timestamp: new Date(),
      metadata: {
        sourceId,
        previousFailureCount
      }
    };

    await this.sendNotification(notification);
  }

  /**
   * Send daily summary notification
   */
  async sendDailySummary(summary: {
    totalSources: number;
    activeSources: number;
    errorSources: number;
    totalErrors: number;
    topErrors: Array<{ type: ScrapingErrorType; count: number }>;
  }): Promise<void> {
    const errorList = summary.topErrors
      .map(e => `• ${e.type}: ${e.count} occurrences`)
      .join('\n');

    const notification: NotificationMessage = {
      title: `📊 Daily Scraping Summary`,
      message: `Daily scraping summary for ${new Date().toDateString()}:\n\n` +
               `📈 **Statistics:**\n` +
               `• Total Sources: ${summary.totalSources}\n` +
               `• Active Sources: ${summary.activeSources}\n` +
               `• Sources with Errors: ${summary.errorSources}\n` +
               `• Total Errors: ${summary.totalErrors}\n\n` +
               `🔝 **Top Error Types:**\n${errorList || 'No errors recorded'}`,
      severity: 'low',
      timestamp: new Date(),
      metadata: summary
    };

    await this.sendNotification(notification);
  }

  /**
   * Send notification through configured channels
   */
  private async sendNotification(notification: NotificationMessage): Promise<void> {
    const promises: Promise<void>[] = [];

    // Console logging
    if (this.config.console?.enabled) {
      promises.push(this.sendConsoleNotification(notification));
    }

    // Email notification
    if (this.config.email?.enabled) {
      promises.push(this.sendEmailNotification(notification));
    }

    // Slack notification
    if (this.config.slack?.enabled) {
      promises.push(this.sendSlackNotification(notification));
    }

    // Webhook notification
    if (this.config.webhook?.enabled) {
      promises.push(this.sendWebhookNotification(notification));
    }

    // Send all notifications concurrently
    await Promise.allSettled(promises);
  }

  /**
   * Send console notification
   */
  private async sendConsoleNotification(notification: NotificationMessage): Promise<void> {
    const logLevel = this.config.console?.logLevel || 'error';
    const message = `[${notification.severity.toUpperCase()}] ${notification.title}\n${notification.message}`;
    
    switch (logLevel) {
      case 'error':
        console.error(message, notification.metadata);
        break;
      case 'warn':
        console.warn(message, notification.metadata);
        break;
      case 'info':
        console.info(message, notification.metadata);
        break;
    }
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(notification: NotificationMessage): Promise<void> {
    if (!this.config.email) return;

    try {
      // This would integrate with an email service like nodemailer
      // For now, we'll log the email that would be sent
      console.info('[EmailNotification] Would send email:', {
        to: this.config.email.to,
        subject: notification.title,
        body: notification.message,
        severity: notification.severity
      });
    } catch (error) {
      console.error('[EmailNotification] Failed to send email:', error);
    }
  }

  /**
   * Send Slack notification
   */
  private async sendSlackNotification(notification: NotificationMessage): Promise<void> {
    if (!this.config.slack) return;

    try {
      const color = this.getSeverityColor(notification.severity);
      const payload = {
        channel: this.config.slack.channel,
        username: this.config.slack.username,
        attachments: [{
          color,
          title: notification.title,
          text: notification.message,
          timestamp: Math.floor(notification.timestamp.getTime() / 1000),
          fields: Object.entries(notification.metadata).map(([key, value]) => ({
            title: key,
            value: String(value),
            short: true
          }))
        }]
      };

      // This would make an HTTP request to the Slack webhook
      console.info('[SlackNotification] Would send to Slack:', payload);
    } catch (error) {
      console.error('[SlackNotification] Failed to send Slack message:', error);
    }
  }

  /**
   * Send webhook notification
   */
  private async sendWebhookNotification(notification: NotificationMessage): Promise<void> {
    if (!this.config.webhook) return;

    try {
      const payload = {
        notification,
        timestamp: notification.timestamp.toISOString()
      };

      // This would make an HTTP request to the webhook URL
      console.info('[WebhookNotification] Would send webhook:', {
        url: this.config.webhook.url,
        payload
      });
    } catch (error) {
      console.error('[WebhookNotification] Failed to send webhook:', error);
    }
  }

  /**
   * Get color for severity level (for Slack)
   */
  private getSeverityColor(severity: string): string {
    switch (severity) {
      case 'critical': return '#ff0000';
      case 'high': return '#ff8c00';
      case 'medium': return '#ffd700';
      case 'low': return '#00ff00';
      default: return '#808080';
    }
  }

  /**
   * Check if alert is in cooldown period
   */
  private isInCooldown(alertKey: string): boolean {
    const lastSent = this.alertCooldowns.get(alertKey);
    if (!lastSent) return false;

    const cooldownEnd = new Date(lastSent.getTime() + (this.defaultCooldownMinutes * 60 * 1000));
    return new Date() < cooldownEnd;
  }

  /**
   * Set cooldown for alert
   */
  private setCooldown(alertKey: string, minutes?: number): void {
    this.alertCooldowns.set(alertKey, new Date());
    
    // Clean up old cooldowns after they expire
    setTimeout(() => {
      this.alertCooldowns.delete(alertKey);
    }, (minutes || this.defaultCooldownMinutes) * 60 * 1000);
  }
}