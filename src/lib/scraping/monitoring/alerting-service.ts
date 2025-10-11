/**
 * Alerting Service for monitoring scraping system health and performance
 * Provides automated alerts for critical errors, performance degradation, and system issues
 */

import { MetricsCollector } from './metrics-collector';
import { NotificationSender, NotificationConfig } from './notification-sender';
import { SourcePerformanceTracker, PerformanceAlert } from './source-performance-tracker';
import { ErrorTracker, ScrapingErrorType } from './error-tracker';
import { prisma } from '@/lib/prisma';

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  condition: AlertCondition;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  cooldownMinutes: number;
  notificationChannels: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AlertCondition {
  type: 'threshold' | 'trend' | 'anomaly' | 'pattern';
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'contains' | 'matches';
  value: number | string;
  timeWindow?: number; // minutes
  aggregation?: 'avg' | 'sum' | 'count' | 'max' | 'min';
}

export interface AlertInstance {
  id: string;
  ruleId: string;
  sourceId?: string;
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'acknowledged' | 'resolved';
  triggeredAt: Date;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  metadata: Record<string, any>;
}

export interface AlertingConfig {
  enabled: boolean;
  checkIntervalMinutes: number;
  maxAlertsPerHour: number;
  defaultCooldownMinutes: number;
  escalationRules: EscalationRule[];
  notificationConfig: NotificationConfig;
}

export interface EscalationRule {
  severity: 'high' | 'critical';
  escalateAfterMinutes: number;
  escalateToChannels: string[];
}

export class AlertingService {
  private metricsCollector: MetricsCollector;
  private notificationSender: NotificationSender;
  private performanceTracker: SourcePerformanceTracker;
  private errorTracker: ErrorTracker;
  private config: AlertingConfig;
  private alertCooldowns: Map<string, Date> = new Map();
  private isRunning = false;
  private checkInterval?: NodeJS.Timeout;

  constructor(config: AlertingConfig) {
    this.config = config;
    this.metricsCollector = new MetricsCollector();
    this.notificationSender = new NotificationSender(config.notificationConfig);
    this.performanceTracker = new SourcePerformanceTracker();
    this.errorTracker = new ErrorTracker();
  }

  /**
   * Start the alerting service
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn('Alerting service is already running');
      return;
    }

    this.isRunning = true;
    console.log('Starting alerting service...');

    // Initialize default alert rules
    await this.initializeDefaultRules();

    // Start periodic checks
    this.checkInterval = setInterval(
      () => this.performAlertChecks(),
      this.config.checkIntervalMinutes * 60 * 1000
    );

    console.log(`Alerting service started with ${this.config.checkIntervalMinutes}min check interval`);
  }

  /**
   * Stop the alerting service
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = undefined;
    }

    console.log('Alerting service stopped');
  }

  /**
   * Perform comprehensive alert checks
   */
  async performAlertChecks(): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    try {
      console.log('Performing alert checks...');
      const startTime = Date.now();

      // Get all active alert rules
      const rules = await this.getActiveAlertRules();

      // Check each rule
      const checkPromises = rules.map(rule => this.checkAlertRule(rule));
      const results = await Promise.allSettled(checkPromises);

      // Log any failures
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.error(`Alert rule check failed for ${rules[index].name}:`, result.reason);
        }
      });

      // Check for performance alerts
      await this.checkPerformanceAlerts();

      // Check for error pattern alerts
      await this.checkErrorPatternAlerts();

      // Check for system health alerts
      await this.checkSystemHealthAlerts();

      console.log(`Alert checks completed in ${Date.now() - startTime}ms`);
    } catch (error) {
      console.error('Error performing alert checks:', error);
    }
  }

  /**
   * Check a specific alert rule
   */
  async checkAlertRule(rule: AlertRule): Promise<void> {
    try {
      const cooldownKey = `rule_${rule.id}`;
      if (this.isInCooldown(cooldownKey, rule.cooldownMinutes)) {
        return;
      }

      const shouldAlert = await this.evaluateAlertCondition(rule.condition);
      
      if (shouldAlert) {
        await this.triggerAlert(rule);
        this.setCooldown(cooldownKey, rule.cooldownMinutes);
      }
    } catch (error) {
      console.error(`Error checking alert rule ${rule.name}:`, error);
    }
  }

  /**
   * Trigger an alert
   */
  async triggerAlert(rule: AlertRule, metadata: Record<string, any> = {}): Promise<AlertInstance> {
    try {
      // Create alert instance
      const alert: AlertInstance = {
        id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ruleId: rule.id,
        sourceId: metadata.sourceId,
        title: rule.name,
        message: await this.generateAlertMessage(rule, metadata),
        severity: rule.severity,
        status: 'active',
        triggeredAt: new Date(),
        metadata
      };

      // Store alert in database (if needed)
      await this.storeAlert(alert);

      // Send notifications
      await this.sendAlertNotifications(alert, rule.notificationChannels);

      // Check for escalation
      if (rule.severity === 'high' || rule.severity === 'critical') {
        setTimeout(() => this.checkEscalation(alert), 5 * 60 * 1000); // Check after 5 minutes
      }

      console.log(`Alert triggered: ${alert.title} (${alert.severity})`);
      return alert;
    } catch (error) {
      console.error('Error triggering alert:', error);
      throw error;
    }
  }

  /**
   * Check for performance alerts across all sources
   */
  async checkPerformanceAlerts(): Promise<void> {
    try {
      const sources = await prisma.scrapedSource.findMany({
        where: { status: 'ACTIVE' }
      });

      for (const source of sources) {
        const alerts = await this.performanceTracker.checkPerformanceAlerts(source.id);
        
        for (const alert of alerts) {
          const cooldownKey = `perf_${alert.alertType}_${source.id}`;
          
          if (!this.isInCooldown(cooldownKey, 30)) { // 30 minute cooldown
            await this.sendPerformanceAlert(alert);
            this.setCooldown(cooldownKey, 30);
          }
        }
      }
    } catch (error) {
      console.error('Error checking performance alerts:', error);
    }
  }

  /**
   * Check for error pattern alerts
   */
  async checkErrorPatternAlerts(): Promise<void> {
    try {
      const recentErrors = await this.errorTracker.getRecentErrors(100);
      
      // Group errors by type and source
      const errorPatterns = new Map<string, number>();
      
      recentErrors.forEach(error => {
        const key = `${error.type}_${error.url || 'unknown'}`;
        errorPatterns.set(key, (errorPatterns.get(key) || 0) + 1);
      });

      // Check for high error rates
      for (const [pattern, count] of errorPatterns) {
        if (count >= 10) { // 10 or more errors of same type from same source
          const [errorType, sourceId] = pattern.split('_');
          const cooldownKey = `error_pattern_${pattern}`;
          
          if (!this.isInCooldown(cooldownKey, 60)) { // 1 hour cooldown
            await this.sendErrorPatternAlert(errorType as ScrapingErrorType, sourceId, count);
            this.setCooldown(cooldownKey, 60);
          }
        }
      }
    } catch (error) {
      console.error('Error checking error pattern alerts:', error);
    }
  }

  /**
   * Check for system health alerts
   */
  async checkSystemHealthAlerts(): Promise<void> {
    try {
      const metrics = await this.metricsCollector.collectCurrentMetrics();
      
      // Check overall success rate
      if (metrics.successRate < 0.7) {
        const cooldownKey = 'system_low_success_rate';
        if (!this.isInCooldown(cooldownKey, 60)) {
          await this.sendSystemHealthAlert(
            'Low System Success Rate',
            `Overall success rate is ${(metrics.successRate * 100).toFixed(1)}% (below 70% threshold)`,
            'high'
          );
          this.setCooldown(cooldownKey, 60);
        }
      }

      // Check for too many active jobs (potential queue backup)
      if (metrics.activeJobs > 50) {
        const cooldownKey = 'system_high_active_jobs';
        if (!this.isInCooldown(cooldownKey, 30)) {
          await this.sendSystemHealthAlert(
            'High Active Job Count',
            `${metrics.activeJobs} jobs are currently active (above 50 threshold)`,
            'medium'
          );
          this.setCooldown(cooldownKey, 30);
        }
      }

      // Check for no recent activity
      if (metrics.grantsScrapedToday === 0) {
        const cooldownKey = 'system_no_activity';
        if (!this.isInCooldown(cooldownKey, 120)) { // 2 hour cooldown
          await this.sendSystemHealthAlert(
            'No Scraping Activity',
            'No grants have been scraped today - system may be down',
            'critical'
          );
          this.setCooldown(cooldownKey, 120);
        }
      }
    } catch (error) {
      console.error('Error checking system health alerts:', error);
    }
  }

  /**
   * Evaluate alert condition
   */
  private async evaluateAlertCondition(condition: AlertCondition): Promise<boolean> {
    try {
      const metrics = await this.metricsCollector.collectCurrentMetrics();
      const value = this.getMetricValue(metrics, condition.metric);
      
      if (value === undefined || value === null) {
        return false;
      }

      switch (condition.operator) {
        case 'gt': return Number(value) > Number(condition.value);
        case 'lt': return Number(value) < Number(condition.value);
        case 'gte': return Number(value) >= Number(condition.value);
        case 'lte': return Number(value) <= Number(condition.value);
        case 'eq': return value === condition.value;
        case 'contains': return String(value).includes(String(condition.value));
        case 'matches': return new RegExp(String(condition.value)).test(String(value));
        default: return false;
      }
    } catch (error) {
      console.error('Error evaluating alert condition:', error);
      return false;
    }
  }

  /**
   * Get metric value by path
   */
  private getMetricValue(metrics: any, path: string): any {
    return path.split('.').reduce((obj, key) => obj?.[key], metrics);
  }

  /**
   * Generate alert message
   */
  private async generateAlertMessage(rule: AlertRule, metadata: Record<string, any>): Promise<string> {
    let message = rule.description;
    
    // Replace placeholders with actual values
    if (metadata.currentValue !== undefined) {
      message += `\nCurrent value: ${metadata.currentValue}`;
    }
    
    if (metadata.threshold !== undefined) {
      message += `\nThreshold: ${metadata.threshold}`;
    }
    
    if (metadata.sourceId) {
      message += `\nSource: ${metadata.sourceId}`;
    }
    
    message += `\nTriggered at: ${new Date().toISOString()}`;
    
    return message;
  }

  /**
   * Send alert notifications
   */
  private async sendAlertNotifications(alert: AlertInstance, channels: string[]): Promise<void> {
    try {
      // For now, use the notification sender's built-in methods
      // In a full implementation, this would route to specific channels
      
      if (alert.severity === 'critical') {
        await this.notificationSender.sendCriticalErrorAlert(
          'SYSTEM_ALERT' as any,
          {
            sourceId: alert.sourceId || 'system',
            jobId: alert.id,
            sourceUrl: '',
            attemptNumber: 1,
            startTime: new Date()
          }
        );
      } else {
        console.log(`[Alert] ${alert.severity.toUpperCase()}: ${alert.title}`);
        console.log(`Message: ${alert.message}`);
      }
    } catch (error) {
      console.error('Error sending alert notifications:', error);
    }
  }

  /**
   * Send performance alert
   */
  private async sendPerformanceAlert(alert: PerformanceAlert): Promise<void> {
    try {
      console.log(`[Performance Alert] ${alert.severity.toUpperCase()}: ${alert.alertType}`);
      console.log(`Source: ${alert.sourceId}`);
      console.log(`Message: ${alert.message}`);
      console.log(`Current Value: ${alert.currentValue}, Threshold: ${alert.threshold}`);
    } catch (error) {
      console.error('Error sending performance alert:', error);
    }
  }

  /**
   * Send error pattern alert
   */
  private async sendErrorPatternAlert(
    errorType: ScrapingErrorType,
    sourceId: string,
    count: number
  ): Promise<void> {
    try {
      console.log(`[Error Pattern Alert] HIGH: Repeated ${errorType} errors`);
      console.log(`Source: ${sourceId}`);
      console.log(`Count: ${count} occurrences`);
      console.log(`This pattern may indicate a persistent issue requiring attention.`);
    } catch (error) {
      console.error('Error sending error pattern alert:', error);
    }
  }

  /**
   * Send system health alert
   */
  private async sendSystemHealthAlert(
    title: string,
    message: string,
    severity: 'low' | 'medium' | 'high' | 'critical'
  ): Promise<void> {
    try {
      console.log(`[System Health Alert] ${severity.toUpperCase()}: ${title}`);
      console.log(`Message: ${message}`);
    } catch (error) {
      console.error('Error sending system health alert:', error);
    }
  }

  /**
   * Check for alert escalation
   */
  private async checkEscalation(alert: AlertInstance): Promise<void> {
    try {
      if (alert.status !== 'active') {
        return; // Alert was resolved or acknowledged
      }

      const escalationRule = this.config.escalationRules.find(
        rule => rule.severity === alert.severity
      );

      if (!escalationRule) {
        return;
      }

      const minutesSinceTriggered = (Date.now() - alert.triggeredAt.getTime()) / (1000 * 60);
      
      if (minutesSinceTriggered >= escalationRule.escalateAfterMinutes) {
        console.log(`Escalating alert: ${alert.title}`);
        // In a full implementation, this would send to escalation channels
      }
    } catch (error) {
      console.error('Error checking alert escalation:', error);
    }
  }

  /**
   * Store alert in database
   */
  private async storeAlert(alert: AlertInstance): Promise<void> {
    try {
      // In a full implementation, this would store alerts in a dedicated table
      console.log(`Storing alert: ${alert.id}`);
    } catch (error) {
      console.error('Error storing alert:', error);
    }
  }

  /**
   * Get active alert rules
   */
  private async getActiveAlertRules(): Promise<AlertRule[]> {
    // In a full implementation, this would fetch from database
    // For now, return default rules
    return this.getDefaultAlertRules().filter(rule => rule.enabled);
  }

  /**
   * Initialize default alert rules
   */
  private async initializeDefaultRules(): Promise<void> {
    const defaultRules = this.getDefaultAlertRules();
    console.log(`Initialized ${defaultRules.length} default alert rules`);
  }

  /**
   * Get default alert rules
   */
  private getDefaultAlertRules(): AlertRule[] {
    return [
      {
        id: 'low_success_rate',
        name: 'Low Success Rate',
        description: 'Overall scraping success rate is below threshold',
        condition: {
          type: 'threshold',
          metric: 'successRate',
          operator: 'lt',
          value: 0.8
        },
        severity: 'high',
        enabled: true,
        cooldownMinutes: 60,
        notificationChannels: ['email', 'slack'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'high_error_count',
        name: 'High Error Count',
        description: 'Too many failed jobs detected',
        condition: {
          type: 'threshold',
          metric: 'failedJobs',
          operator: 'gt',
          value: 20
        },
        severity: 'medium',
        enabled: true,
        cooldownMinutes: 30,
        notificationChannels: ['slack'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'slow_processing',
        name: 'Slow Processing Time',
        description: 'Average processing time is above threshold',
        condition: {
          type: 'threshold',
          metric: 'averageProcessingTime',
          operator: 'gt',
          value: 30000 // 30 seconds
        },
        severity: 'medium',
        enabled: true,
        cooldownMinutes: 45,
        notificationChannels: ['email'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'no_grants_found',
        name: 'No Grants Found Today',
        description: 'No grants have been scraped today',
        condition: {
          type: 'threshold',
          metric: 'grantsScrapedToday',
          operator: 'eq',
          value: 0
        },
        severity: 'critical',
        enabled: true,
        cooldownMinutes: 120,
        notificationChannels: ['email', 'slack', 'webhook'],
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
  }

  /**
   * Check if alert is in cooldown
   */
  private isInCooldown(key: string, cooldownMinutes: number): boolean {
    const lastTriggered = this.alertCooldowns.get(key);
    if (!lastTriggered) return false;

    const cooldownEnd = new Date(lastTriggered.getTime() + (cooldownMinutes * 60 * 1000));
    return new Date() < cooldownEnd;
  }

  /**
   * Set cooldown for alert
   */
  private setCooldown(key: string, cooldownMinutes: number): void {
    this.alertCooldowns.set(key, new Date());
    
    // Clean up after cooldown expires
    setTimeout(() => {
      this.alertCooldowns.delete(key);
    }, cooldownMinutes * 60 * 1000);
  }
}