/**
 * Tests for AlertingService
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { AlertingService, AlertingConfig } from '../alerting-service';
import { MetricsCollector } from '../metrics-collector';
import { NotificationSender } from '../notification-sender';
import { SourcePerformanceTracker } from '../source-performance-tracker';
import { ErrorTracker } from '../error-tracker';

// Mock dependencies
vi.mock('../metrics-collector');
vi.mock('../notification-sender');
vi.mock('../source-performance-tracker');
vi.mock('../error-tracker');
vi.mock('@/lib/prisma', () => ({
  prisma: {
    scrapedSource: {
      findMany: vi.fn()
    },
    scrapeJob: {
      create: vi.fn()
    }
  }
}));

describe('AlertingService', () => {
  let alertingService: AlertingService;
  let mockConfig: AlertingConfig;
  let mockMetricsCollector: Mock;
  let mockNotificationSender: Mock;
  let mockPerformanceTracker: Mock;
  let mockErrorTracker: Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockConfig = {
      enabled: true,
      checkIntervalMinutes: 5,
      maxAlertsPerHour: 10,
      defaultCooldownMinutes: 15,
      escalationRules: [
        {
          severity: 'critical',
          escalateAfterMinutes: 10,
          escalateToChannels: ['email', 'slack']
        }
      ],
      notificationConfig: {
        console: { enabled: true, logLevel: 'error' }
      }
    };

    // Mock class constructors
    mockMetricsCollector = vi.mocked(MetricsCollector);
    mockNotificationSender = vi.mocked(NotificationSender);
    mockPerformanceTracker = vi.mocked(SourcePerformanceTracker);
    mockErrorTracker = vi.mocked(ErrorTracker);

    alertingService = new AlertingService(mockConfig);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('start and stop', () => {
    it('should start the alerting service', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await alertingService.start();

      expect(consoleSpy).toHaveBeenCalledWith('Starting alerting service...');
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Alerting service started'));

      consoleSpy.mockRestore();
    });

    it('should not start if already running', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await alertingService.start();
      await alertingService.start(); // Second call

      expect(consoleSpy).toHaveBeenCalledWith('Alerting service is already running');

      consoleSpy.mockRestore();
    });

    it('should stop the alerting service', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await alertingService.start();
      await alertingService.stop();

      expect(consoleSpy).toHaveBeenCalledWith('Alerting service stopped');

      consoleSpy.mockRestore();
    });
  });

  describe('performAlertChecks', () => {
    it('should perform comprehensive alert checks when enabled', async () => {
      const { prisma } = await import('@/lib/prisma');
      
      // Mock metrics collector
      const mockMetricsInstance = {
        collectCurrentMetrics: vi.fn().mockResolvedValue({
          successRate: 0.6, // Below threshold
          activeJobs: 25,    // Above threshold
          grantsScrapedToday: 0 // Critical issue
        })
      };
      mockMetricsCollector.mockImplementation(() => mockMetricsInstance);

      // Mock performance tracker
      const mockPerformanceInstance = {
        checkPerformanceAlerts: vi.fn().mockResolvedValue([
          {
            sourceId: 'source1',
            alertType: 'performance_degradation',
            severity: 'high',
            message: 'Performance degraded',
            threshold: 0.8,
            currentValue: 0.6,
            timestamp: new Date()
          }
        ])
      };
      mockPerformanceTracker.mockImplementation(() => mockPerformanceInstance);

      // Mock error tracker
      const mockErrorInstance = {
        getRecentErrors: vi.fn().mockResolvedValue([
          { type: 'NETWORK_ERROR', sourceId: 'source1', timestamp: new Date() },
          { type: 'NETWORK_ERROR', sourceId: 'source1', timestamp: new Date() },
          { type: 'PARSING_ERROR', sourceId: 'source2', timestamp: new Date() }
        ])
      };
      mockErrorTracker.mockImplementation(() => mockErrorInstance);

      // Mock database
      (prisma.scrapedSource.findMany as Mock).mockResolvedValue([
        { id: 'source1', status: 'ACTIVE' },
        { id: 'source2', status: 'ACTIVE' }
      ]);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await alertingService.performAlertChecks();

      expect(consoleSpy).toHaveBeenCalledWith('Performing alert checks...');
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Alert checks completed'));

      consoleSpy.mockRestore();
    });

    it('should skip checks when disabled', async () => {
      const disabledConfig = { ...mockConfig, enabled: false };
      const disabledService = new AlertingService(disabledConfig);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await disabledService.performAlertChecks();

      expect(consoleSpy).not.toHaveBeenCalledWith('Performing alert checks...');

      consoleSpy.mockRestore();
    });
  });

  describe('checkAlertRule', () => {
    it('should trigger alert when condition is met', async () => {
      const mockRule = {
        id: 'test-rule',
        name: 'Test Alert',
        description: 'Test alert description',
        condition: {
          type: 'threshold' as const,
          metric: 'successRate',
          operator: 'lt' as const,
          value: 0.8
        },
        severity: 'high' as const,
        enabled: true,
        cooldownMinutes: 30,
        notificationChannels: ['console'],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Mock metrics that will trigger the alert
      const mockMetricsInstance = {
        collectCurrentMetrics: vi.fn().mockResolvedValue({
          successRate: 0.6 // Below threshold of 0.8
        })
      };
      mockMetricsCollector.mockImplementation(() => mockMetricsInstance);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await alertingService.checkAlertRule(mockRule);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Alert triggered: Test Alert'));

      consoleSpy.mockRestore();
    });

    it('should not trigger alert when in cooldown', async () => {
      const mockRule = {
        id: 'test-rule-cooldown',
        name: 'Test Alert Cooldown',
        description: 'Test alert description',
        condition: {
          type: 'threshold' as const,
          metric: 'successRate',
          operator: 'lt' as const,
          value: 0.8
        },
        severity: 'high' as const,
        enabled: true,
        cooldownMinutes: 30,
        notificationChannels: ['console'],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockMetricsInstance = {
        collectCurrentMetrics: vi.fn().mockResolvedValue({
          successRate: 0.6
        })
      };
      mockMetricsCollector.mockImplementation(() => mockMetricsInstance);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      // First trigger
      await alertingService.checkAlertRule(mockRule);
      
      // Second trigger (should be in cooldown)
      await alertingService.checkAlertRule(mockRule);

      // Should only trigger once
      expect(consoleSpy).toHaveBeenCalledTimes(1);

      consoleSpy.mockRestore();
    });
  });

  describe('checkPerformanceAlerts', () => {
    it('should check performance alerts for all active sources', async () => {
      const { prisma } = await import('@/lib/prisma');
      
      (prisma.scrapedSource.findMany as Mock).mockResolvedValue([
        { id: 'source1', status: 'ACTIVE' },
        { id: 'source2', status: 'ACTIVE' }
      ]);

      const mockPerformanceInstance = {
        checkPerformanceAlerts: vi.fn()
          .mockResolvedValueOnce([
            {
              sourceId: 'source1',
              alertType: 'performance_degradation',
              severity: 'high',
              message: 'Performance degraded',
              threshold: 0.8,
              currentValue: 0.6,
              timestamp: new Date()
            }
          ])
          .mockResolvedValueOnce([])
      };
      mockPerformanceTracker.mockImplementation(() => mockPerformanceInstance);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await alertingService.checkPerformanceAlerts();

      expect(mockPerformanceInstance.checkPerformanceAlerts).toHaveBeenCalledTimes(2);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[Performance Alert]'));

      consoleSpy.mockRestore();
    });
  });

  describe('checkErrorPatternAlerts', () => {
    it('should detect error patterns and send alerts', async () => {
      const mockErrorInstance = {
        getRecentErrors: vi.fn().mockResolvedValue([
          { type: 'NETWORK_ERROR', sourceId: 'source1', timestamp: new Date() },
          { type: 'NETWORK_ERROR', sourceId: 'source1', timestamp: new Date() },
          { type: 'NETWORK_ERROR', sourceId: 'source1', timestamp: new Date() },
          { type: 'NETWORK_ERROR', sourceId: 'source1', timestamp: new Date() },
          { type: 'NETWORK_ERROR', sourceId: 'source1', timestamp: new Date() },
          { type: 'NETWORK_ERROR', sourceId: 'source1', timestamp: new Date() },
          { type: 'NETWORK_ERROR', sourceId: 'source1', timestamp: new Date() },
          { type: 'NETWORK_ERROR', sourceId: 'source1', timestamp: new Date() },
          { type: 'NETWORK_ERROR', sourceId: 'source1', timestamp: new Date() },
          { type: 'NETWORK_ERROR', sourceId: 'source1', timestamp: new Date() },
          { type: 'PARSING_ERROR', sourceId: 'source2', timestamp: new Date() }
        ])
      };
      mockErrorTracker.mockImplementation(() => mockErrorInstance);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await alertingService.checkErrorPatternAlerts();

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[Error Pattern Alert]'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('NETWORK_ERROR'));

      consoleSpy.mockRestore();
    });
  });

  describe('checkSystemHealthAlerts', () => {
    it('should check system health and send alerts for critical issues', async () => {
      const mockMetricsInstance = {
        collectCurrentMetrics: vi.fn().mockResolvedValue({
          successRate: 0.5,  // Below 70% threshold
          activeJobs: 60,    // Above 50 threshold
          grantsScrapedToday: 0 // Critical - no activity
        })
      };
      mockMetricsCollector.mockImplementation(() => mockMetricsInstance);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await alertingService.checkSystemHealthAlerts();

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[System Health Alert]'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Low System Success Rate'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('High Active Job Count'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No Scraping Activity'));

      consoleSpy.mockRestore();
    });

    it('should not send alerts for healthy system', async () => {
      const mockMetricsInstance = {
        collectCurrentMetrics: vi.fn().mockResolvedValue({
          successRate: 0.95,  // Healthy
          activeJobs: 10,     // Normal
          grantsScrapedToday: 100 // Active
        })
      };
      mockMetricsCollector.mockImplementation(() => mockMetricsInstance);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await alertingService.checkSystemHealthAlerts();

      expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('[System Health Alert]'));

      consoleSpy.mockRestore();
    });
  });

  describe('triggerAlert', () => {
    it('should create and store alert instance', async () => {
      const mockRule = {
        id: 'test-rule',
        name: 'Test Alert',
        description: 'Test alert description',
        condition: {
          type: 'threshold' as const,
          metric: 'successRate',
          operator: 'lt' as const,
          value: 0.8
        },
        severity: 'high' as const,
        enabled: true,
        cooldownMinutes: 30,
        notificationChannels: ['console'],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const metadata = { sourceId: 'source1', currentValue: 0.6 };

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const alert = await alertingService.triggerAlert(mockRule, metadata);

      expect(alert).toMatchObject({
        id: expect.any(String),
        ruleId: 'test-rule',
        sourceId: 'source1',
        title: 'Test Alert',
        message: expect.stringContaining('Test alert description'),
        severity: 'high',
        status: 'active',
        triggeredAt: expect.any(Date),
        metadata
      });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Alert triggered: Test Alert'));

      consoleSpy.mockRestore();
    });
  });

  describe('alert condition evaluation', () => {
    it('should evaluate greater than condition correctly', async () => {
      const mockRule = {
        id: 'gt-rule',
        name: 'GT Test',
        description: 'Greater than test',
        condition: {
          type: 'threshold' as const,
          metric: 'activeJobs',
          operator: 'gt' as const,
          value: 20
        },
        severity: 'medium' as const,
        enabled: true,
        cooldownMinutes: 15,
        notificationChannels: ['console'],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockMetricsInstance = {
        collectCurrentMetrics: vi.fn().mockResolvedValue({
          activeJobs: 25 // Greater than 20
        })
      };
      mockMetricsCollector.mockImplementation(() => mockMetricsInstance);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await alertingService.checkAlertRule(mockRule);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Alert triggered'));

      consoleSpy.mockRestore();
    });

    it('should evaluate less than condition correctly', async () => {
      const mockRule = {
        id: 'lt-rule',
        name: 'LT Test',
        description: 'Less than test',
        condition: {
          type: 'threshold' as const,
          metric: 'successRate',
          operator: 'lt' as const,
          value: 0.8
        },
        severity: 'high' as const,
        enabled: true,
        cooldownMinutes: 15,
        notificationChannels: ['console'],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockMetricsInstance = {
        collectCurrentMetrics: vi.fn().mockResolvedValue({
          successRate: 0.6 // Less than 0.8
        })
      };
      mockMetricsCollector.mockImplementation(() => mockMetricsInstance);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await alertingService.checkAlertRule(mockRule);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Alert triggered'));

      consoleSpy.mockRestore();
    });

    it('should not trigger when condition is not met', async () => {
      const mockRule = {
        id: 'no-trigger-rule',
        name: 'No Trigger Test',
        description: 'Should not trigger',
        condition: {
          type: 'threshold' as const,
          metric: 'successRate',
          operator: 'lt' as const,
          value: 0.5
        },
        severity: 'high' as const,
        enabled: true,
        cooldownMinutes: 15,
        notificationChannels: ['console'],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockMetricsInstance = {
        collectCurrentMetrics: vi.fn().mockResolvedValue({
          successRate: 0.8 // Greater than 0.5, so condition not met
        })
      };
      mockMetricsCollector.mockImplementation(() => mockMetricsInstance);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await alertingService.checkAlertRule(mockRule);

      expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('Alert triggered'));

      consoleSpy.mockRestore();
    });
  });

  describe('error handling', () => {
    it('should handle errors in alert checks gracefully', async () => {
      const mockMetricsInstance = {
        collectCurrentMetrics: vi.fn().mockRejectedValue(new Error('Metrics error'))
      };
      mockMetricsCollector.mockImplementation(() => mockMetricsInstance);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await alertingService.performAlertChecks();

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Error performing alert checks'));

      consoleSpy.mockRestore();
    });

    it('should handle individual rule check errors', async () => {
      const mockRule = {
        id: 'error-rule',
        name: 'Error Test',
        description: 'Will cause error',
        condition: {
          type: 'threshold' as const,
          metric: 'nonexistentMetric',
          operator: 'gt' as const,
          value: 10
        },
        severity: 'medium' as const,
        enabled: true,
        cooldownMinutes: 15,
        notificationChannels: ['console'],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockMetricsInstance = {
        collectCurrentMetrics: vi.fn().mockResolvedValue({
          successRate: 0.8
        })
      };
      mockMetricsCollector.mockImplementation(() => mockMetricsInstance);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await alertingService.checkAlertRule(mockRule);

      // Should not crash, but may log error
      expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('Alert triggered'));

      consoleSpy.mockRestore();
    });
  });
});