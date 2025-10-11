/**
 * Example usage of the monitoring and metrics collection system
 * This demonstrates how to integrate the monitoring components
 */

import { MetricsCollector } from './metrics-collector';
import { AlertingService, AlertingConfig } from './alerting-service';
import { DashboardDataProvider } from './dashboard-data-provider';
import { PerformanceBenchmarker } from './performance-benchmarker';
import { ScrapeJobStatus } from '../types';

// Example configuration for alerting
const alertingConfig: AlertingConfig = {
  enabled: true,
  checkIntervalMinutes: 5,
  maxAlertsPerHour: 20,
  defaultCooldownMinutes: 15,
  escalationRules: [
    {
      severity: 'critical',
      escalateAfterMinutes: 10,
      escalateToChannels: ['email', 'slack']
    },
    {
      severity: 'high',
      escalateAfterMinutes: 30,
      escalateToChannels: ['email']
    }
  ],
  notificationConfig: {
    console: {
      enabled: true,
      logLevel: 'error'
    },
    email: {
      enabled: false, // Would be configured with SMTP settings
      smtpHost: 'smtp.example.com',
      smtpPort: 587,
      username: 'alerts@example.com',
      password: 'password',
      from: 'alerts@example.com',
      to: ['admin@example.com']
    },
    slack: {
      enabled: false, // Would be configured with webhook URL
      webhookUrl: 'https://hooks.slack.com/services/...',
      channel: '#alerts',
      username: 'Scraping Bot'
    }
  }
};

/**
 * Example: Setting up the monitoring system
 */
export async function setupMonitoring() {
  // Initialize components
  const metricsCollector = new MetricsCollector();
  const alertingService = new AlertingService(alertingConfig);
  const dashboardProvider = new DashboardDataProvider(alertingService);
  const benchmarker = new PerformanceBenchmarker();

  // Start alerting service
  await alertingService.start();

  return {
    metricsCollector,
    alertingService,
    dashboardProvider,
    benchmarker
  };
}

/**
 * Example: Tracking a scraping job completion
 */
export async function trackScrapingJob(
  metricsCollector: MetricsCollector,
  jobId: string,
  sourceId: string,
  result: {
    totalFound: number;
    totalInserted: number;
    totalUpdated: number;
    totalSkipped: number;
    errors: any[];
    duration: number;
    metadata?: Record<string, any>;
  }
) {
  const job = {
    id: jobId,
    sourceId,
    status: ScrapeJobStatus.COMPLETED, // Use COMPLETED since we're tracking completion
    scheduledAt: new Date(),
    startedAt: new Date(),
    priority: 1,
    metadata: {}
  };

  const scrapingResult = {
    sourceId,
    ...result,
    metadata: result.metadata || {}
  };

  await metricsCollector.trackJobCompletion(job, scrapingResult);
  console.log(`Tracked completion of job ${jobId} for source ${sourceId}`);
}

/**
 * Example: Getting dashboard data for admin interface
 */
export async function getDashboardMetrics(dashboardProvider: DashboardDataProvider) {
  try {
    const dashboardData = await dashboardProvider.getDashboardData();
    
    console.log('Dashboard Overview:');
    console.log(`- System Status: ${dashboardData.overview.systemStatus}`);
    console.log(`- Total Sources: ${dashboardData.overview.totalSources}`);
    console.log(`- Active Sources: ${dashboardData.overview.activeSources}`);
    console.log(`- Success Rate: ${(dashboardData.overview.successRate * 100).toFixed(1)}%`);
    console.log(`- Grants Today: ${dashboardData.overview.totalGrantsToday}`);
    
    console.log('\nTop Performing Sources:');
    dashboardData.sourcePerformance.topPerformers.slice(0, 3).forEach((source, index) => {
      console.log(`${index + 1}. ${source.sourceId} - Score: ${source.performanceScore}`);
    });

    console.log('\nRecent Errors:');
    dashboardData.errorAnalysis.recentCriticalErrors.slice(0, 3).forEach(error => {
      console.log(`- ${error.errorType}: ${error.message} (${error.sourceId})`);
    });

    return dashboardData;
  } catch (error) {
    console.error('Error getting dashboard metrics:', error);
    throw error;
  }
}

/**
 * Example: Generating performance report
 */
export async function generatePerformanceReport(benchmarker: PerformanceBenchmarker) {
  try {
    const report = await benchmarker.generatePerformanceReport(30); // Last 30 days
    
    console.log('Performance Report:');
    console.log(`- Overall Performance: ${report.systemBenchmarks.overall.category} (${report.systemBenchmarks.overall.score.toFixed(1)}/100)`);
    console.log(`- Success Rate: ${(report.systemBenchmarks.successRate.baseline * 100).toFixed(1)}%`);
    console.log(`- Average Processing Time: ${(report.systemBenchmarks.processingSpeed.baseline / 1000).toFixed(1)}s`);
    
    console.log('\nKey Insights:');
    report.keyInsights.forEach(insight => {
      console.log(`- ${insight}`);
    });

    console.log('\nImmediate Action Items:');
    report.actionPlan.immediate.forEach(action => {
      console.log(`- ${action.title} (${action.priority})`);
    });

    return report;
  } catch (error) {
    console.error('Error generating performance report:', error);
    throw error;
  }
}

/**
 * Example: Manual alert check
 */
export async function checkSystemHealth(alertingService: AlertingService) {
  try {
    await alertingService.performAlertChecks();
    console.log('System health check completed');
  } catch (error) {
    console.error('Error during system health check:', error);
  }
}

/**
 * Example: Complete monitoring workflow
 */
export async function runMonitoringExample() {
  console.log('Setting up monitoring system...');
  
  const monitoring = await setupMonitoring();
  
  // Simulate tracking a successful scraping job
  await trackScrapingJob(
    monitoring.metricsCollector,
    'job-123',
    'gates-foundation',
    {
      totalFound: 15,
      totalInserted: 12,
      totalUpdated: 3,
      totalSkipped: 0,
      errors: [],
      duration: 8000,
      metadata: { processingTime: 8000 }
    }
  );

  // Get dashboard metrics
  await getDashboardMetrics(monitoring.dashboardProvider);

  // Generate performance report
  await generatePerformanceReport(monitoring.benchmarker);

  // Check system health
  await checkSystemHealth(monitoring.alertingService);

  // Stop alerting service
  await monitoring.alertingService.stop();
  
  console.log('Monitoring example completed');
}

// Export for use in other parts of the application
export {
  MetricsCollector,
  AlertingService,
  DashboardDataProvider,
  PerformanceBenchmarker
};