/**
 * Performance Benchmarker for scraping system optimization
 * Provides performance analysis, benchmarking, and optimization recommendations
 */

import { MetricsCollector } from './metrics-collector';
import { SourcePerformanceTracker, PerformanceMetrics } from './source-performance-tracker';
import { prisma } from '@/lib/prisma';

export interface BenchmarkResult {
  category: 'excellent' | 'good' | 'fair' | 'poor';
  score: number;
  baseline: number;
  target: number;
  improvement: number;
  recommendations: string[];
}

export interface SystemBenchmarks {
  overall: BenchmarkResult;
  successRate: BenchmarkResult;
  processingSpeed: BenchmarkResult;
  errorRate: BenchmarkResult;
  throughput: BenchmarkResult;
  reliability: BenchmarkResult;
  efficiency: BenchmarkResult;
}

export interface SourceBenchmark {
  sourceId: string;
  sourceName: string;
  benchmarks: {
    performance: BenchmarkResult;
    reliability: BenchmarkResult;
    speed: BenchmarkResult;
    dataQuality: BenchmarkResult;
  };
  overallRating: 'excellent' | 'good' | 'fair' | 'poor';
  competitivePosition: number; // Percentile among all sources
  improvementPotential: number; // Percentage improvement possible
}

export interface OptimizationRecommendation {
  type: 'configuration' | 'infrastructure' | 'algorithm' | 'maintenance';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  expectedImprovement: {
    metric: string;
    currentValue: number;
    targetValue: number;
    improvementPercentage: number;
  };
  implementationEffort: 'low' | 'medium' | 'high';
  estimatedTimeToImplement: string;
  prerequisites: string[];
  riskLevel: 'low' | 'medium' | 'high';
}

export interface PerformanceReport {
  generatedAt: Date;
  reportPeriod: {
    startDate: Date;
    endDate: Date;
    durationDays: number;
  };
  systemBenchmarks: SystemBenchmarks;
  sourceBenchmarks: SourceBenchmark[];
  topPerformers: SourceBenchmark[];
  underPerformers: SourceBenchmark[];
  optimizationRecommendations: OptimizationRecommendation[];
  keyInsights: string[];
  actionPlan: {
    immediate: OptimizationRecommendation[];
    shortTerm: OptimizationRecommendation[];
    longTerm: OptimizationRecommendation[];
  };
}

export class PerformanceBenchmarker {
  private metricsCollector: MetricsCollector;
  private performanceTracker: SourcePerformanceTracker;

  // Industry benchmarks and targets
  private readonly BENCHMARKS = {
    SUCCESS_RATE: {
      excellent: 0.95,
      good: 0.85,
      fair: 0.70,
      poor: 0.50,
      target: 0.90
    },
    PROCESSING_TIME: {
      excellent: 5000,   // 5 seconds
      good: 10000,       // 10 seconds
      fair: 20000,       // 20 seconds
      poor: 40000,       // 40 seconds
      target: 8000       // 8 seconds
    },
    ERROR_RATE: {
      excellent: 0.02,
      good: 0.05,
      fair: 0.10,
      poor: 0.20,
      target: 0.03
    },
    THROUGHPUT: {
      excellent: 100,    // grants per hour
      good: 50,
      fair: 25,
      poor: 10,
      target: 75
    },
    RELIABILITY: {
      excellent: 0.98,   // uptime percentage
      good: 0.95,
      fair: 0.90,
      poor: 0.80,
      target: 0.96
    }
  };

  constructor() {
    this.metricsCollector = new MetricsCollector();
    this.performanceTracker = new SourcePerformanceTracker();
  }

  /**
   * Generate comprehensive performance report
   */
  async generatePerformanceReport(days: number = 30): Promise<PerformanceReport> {
    try {
      console.log(`Generating performance report for last ${days} days...`);
      const startTime = Date.now();

      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

      // Generate system benchmarks
      const systemBenchmarks = await this.generateSystemBenchmarks(startDate, endDate);

      // Generate source benchmarks
      const sourceBenchmarks = await this.generateSourceBenchmarks(startDate, endDate);

      // Identify top and under performers
      const topPerformers = sourceBenchmarks
        .filter(s => s.overallRating === 'excellent' || s.overallRating === 'good')
        .sort((a, b) => b.competitivePosition - a.competitivePosition)
        .slice(0, 5);

      const underPerformers = sourceBenchmarks
        .filter(s => s.overallRating === 'poor' || s.overallRating === 'fair')
        .sort((a, b) => a.competitivePosition - b.competitivePosition)
        .slice(0, 5);

      // Generate optimization recommendations
      const optimizationRecommendations = await this.generateOptimizationRecommendations(
        systemBenchmarks,
        sourceBenchmarks
      );

      // Generate key insights
      const keyInsights = this.generateKeyInsights(systemBenchmarks, sourceBenchmarks);

      // Create action plan
      const actionPlan = this.createActionPlan(optimizationRecommendations);

      const report: PerformanceReport = {
        generatedAt: new Date(),
        reportPeriod: {
          startDate,
          endDate,
          durationDays: days
        },
        systemBenchmarks,
        sourceBenchmarks,
        topPerformers,
        underPerformers,
        optimizationRecommendations,
        keyInsights,
        actionPlan
      };

      console.log(`Performance report generated in ${Date.now() - startTime}ms`);
      return report;
    } catch (error) {
      console.error('Error generating performance report:', error);
      throw new Error(`Failed to generate performance report: ${error}`);
    }
  }

  /**
   * Benchmark system performance against industry standards
   */
  async benchmarkSystem(): Promise<SystemBenchmarks> {
    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000); // Last 30 days

      return await this.generateSystemBenchmarks(startDate, endDate);
    } catch (error) {
      console.error('Error benchmarking system:', error);
      throw error;
    }
  }

  /**
   * Benchmark individual source performance
   */
  async benchmarkSource(sourceId: string): Promise<SourceBenchmark> {
    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

      const sourceBenchmarks = await this.generateSourceBenchmarks(startDate, endDate);
      const benchmark = sourceBenchmarks.find(s => s.sourceId === sourceId);

      if (!benchmark) {
        throw new Error(`No benchmark data found for source ${sourceId}`);
      }

      return benchmark;
    } catch (error) {
      console.error(`Error benchmarking source ${sourceId}:`, error);
      throw error;
    }
  }

  /**
   * Get optimization recommendations for the system
   */
  async getOptimizationRecommendations(): Promise<OptimizationRecommendation[]> {
    try {
      const systemBenchmarks = await this.benchmarkSystem();
      const sourceBenchmarks = await this.generateSourceBenchmarks(
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        new Date()
      );

      return await this.generateOptimizationRecommendations(systemBenchmarks, sourceBenchmarks);
    } catch (error) {
      console.error('Error getting optimization recommendations:', error);
      throw error;
    }
  }

  // Private methods

  private async generateSystemBenchmarks(startDate: Date, endDate: Date): Promise<SystemBenchmarks> {
    try {
      // Get system metrics for the period
      const metrics = await this.getSystemMetricsForPeriod(startDate, endDate);

      // Calculate individual benchmarks
      const successRate = this.benchmarkMetric(
        metrics.successRate,
        this.BENCHMARKS.SUCCESS_RATE,
        'higher_better'
      );

      const processingSpeed = this.benchmarkMetric(
        metrics.averageProcessingTime,
        this.BENCHMARKS.PROCESSING_TIME,
        'lower_better'
      );

      const errorRate = this.benchmarkMetric(
        1 - metrics.successRate, // Convert success rate to error rate
        this.BENCHMARKS.ERROR_RATE,
        'lower_better'
      );

      const throughput = this.benchmarkMetric(
        metrics.grantsPerHour,
        this.BENCHMARKS.THROUGHPUT,
        'higher_better'
      );

      const reliability = this.benchmarkMetric(
        metrics.uptime,
        this.BENCHMARKS.RELIABILITY,
        'higher_better'
      );

      // Calculate efficiency (composite metric)
      const efficiency = this.calculateEfficiencyBenchmark(metrics);

      // Calculate overall benchmark
      const overall = this.calculateOverallBenchmark([
        successRate,
        processingSpeed,
        errorRate,
        throughput,
        reliability,
        efficiency
      ]);

      return {
        overall,
        successRate,
        processingSpeed,
        errorRate,
        throughput,
        reliability,
        efficiency
      };
    } catch (error) {
      console.error('Error generating system benchmarks:', error);
      throw error;
    }
  }

  private async generateSourceBenchmarks(startDate: Date, endDate: Date): Promise<SourceBenchmark[]> {
    try {
      const sources = await prisma.scrapedSource.findMany({
        where: { status: 'ACTIVE' }
      });

      const benchmarks: SourceBenchmark[] = [];

      for (const source of sources) {
        const performance = await this.performanceTracker.getSourcePerformanceMetrics(source.id);
        
        if (!performance) continue;

        const performanceBenchmark = this.benchmarkMetric(
          performance.performanceScore / 100,
          { excellent: 0.9, good: 0.7, fair: 0.5, poor: 0.3, target: 0.8 },
          'higher_better'
        );

        const reliabilityBenchmark = this.benchmarkMetric(
          performance.successRate,
          this.BENCHMARKS.SUCCESS_RATE,
          'higher_better'
        );

        const speedBenchmark = this.benchmarkMetric(
          performance.averageProcessingTime,
          this.BENCHMARKS.PROCESSING_TIME,
          'lower_better'
        );

        const dataQualityBenchmark = this.benchmarkMetric(
          performance.averageGrantsFound,
          { excellent: 20, good: 10, fair: 5, poor: 1, target: 15 },
          'higher_better'
        );

        const overallScore = (
          performanceBenchmark.score +
          reliabilityBenchmark.score +
          speedBenchmark.score +
          dataQualityBenchmark.score
        ) / 4;

        const overallRating = this.getPerformanceCategory(overallScore);
        const competitivePosition = this.calculateCompetitivePosition(performance, sources.length);
        const improvementPotential = this.calculateImprovementPotential(overallScore);

        benchmarks.push({
          sourceId: source.id,
          sourceName: source.url, // Would use actual name if available
          benchmarks: {
            performance: performanceBenchmark,
            reliability: reliabilityBenchmark,
            speed: speedBenchmark,
            dataQuality: dataQualityBenchmark
          },
          overallRating,
          competitivePosition,
          improvementPotential
        });
      }

      return benchmarks.sort((a, b) => b.competitivePosition - a.competitivePosition);
    } catch (error) {
      console.error('Error generating source benchmarks:', error);
      throw error;
    }
  }

  private benchmarkMetric(
    value: number,
    benchmarks: { excellent: number; good: number; fair: number; poor: number; target: number },
    direction: 'higher_better' | 'lower_better'
  ): BenchmarkResult {
    let score: number;
    let category: 'excellent' | 'good' | 'fair' | 'poor';

    if (direction === 'higher_better') {
      if (value >= benchmarks.excellent) {
        category = 'excellent';
        score = 100;
      } else if (value >= benchmarks.good) {
        category = 'good';
        score = 80;
      } else if (value >= benchmarks.fair) {
        category = 'fair';
        score = 60;
      } else {
        category = 'poor';
        score = Math.max(0, (value / benchmarks.fair) * 60);
      }
    } else {
      if (value <= benchmarks.excellent) {
        category = 'excellent';
        score = 100;
      } else if (value <= benchmarks.good) {
        category = 'good';
        score = 80;
      } else if (value <= benchmarks.fair) {
        category = 'fair';
        score = 60;
      } else {
        category = 'poor';
        score = Math.max(0, 60 - ((value - benchmarks.fair) / benchmarks.fair) * 30);
      }
    }

    const improvement = direction === 'higher_better'
      ? Math.max(0, benchmarks.target - value)
      : Math.max(0, value - benchmarks.target);

    const recommendations = this.generateMetricRecommendations(category, direction);

    return {
      category,
      score,
      baseline: value,
      target: benchmarks.target,
      improvement,
      recommendations
    };
  }

  private calculateEfficiencyBenchmark(metrics: any): BenchmarkResult {
    // Efficiency = (Success Rate * Grants Per Hour) / (Processing Time / 1000)
    const efficiency = (metrics.successRate * metrics.grantsPerHour) / (metrics.averageProcessingTime / 1000);
    
    return this.benchmarkMetric(
      efficiency,
      { excellent: 10, good: 5, fair: 2, poor: 0.5, target: 7 },
      'higher_better'
    );
  }

  private calculateOverallBenchmark(benchmarks: BenchmarkResult[]): BenchmarkResult {
    const averageScore = benchmarks.reduce((sum, b) => sum + b.score, 0) / benchmarks.length;
    const category = this.getPerformanceCategory(averageScore);
    
    const recommendations = [
      ...new Set(benchmarks.flatMap(b => b.recommendations))
    ].slice(0, 5); // Top 5 unique recommendations

    return {
      category,
      score: averageScore,
      baseline: averageScore,
      target: 90,
      improvement: Math.max(0, 90 - averageScore),
      recommendations
    };
  }

  private getPerformanceCategory(score: number): 'excellent' | 'good' | 'fair' | 'poor' {
    if (score >= 90) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 50) return 'fair';
    return 'poor';
  }

  private calculateCompetitivePosition(performance: PerformanceMetrics, totalSources: number): number {
    // This would compare against all sources and return percentile
    // For now, use performance score as approximation
    return Math.min(100, performance.performanceScore);
  }

  private calculateImprovementPotential(currentScore: number): number {
    return Math.max(0, 100 - currentScore);
  }

  private async getSystemMetricsForPeriod(startDate: Date, endDate: Date): Promise<any> {
    const jobs = await prisma.scrapeJob.findMany({
      where: {
        startedAt: { gte: startDate, lte: endDate }
      }
    });

    const totalJobs = jobs.length;
    const successfulJobs = jobs.filter(job => job.status === 'SUCCESS').length;
    const successRate = totalJobs > 0 ? successfulJobs / totalJobs : 0;

    const processingTimes = jobs
      .filter(job => job.duration)
      .map(job => job.duration! * 1000);
    const averageProcessingTime = processingTimes.length > 0
      ? processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length
      : 0;

    const totalGrants = jobs.reduce((sum, job) => sum + (job.totalInserted || 0) + (job.totalUpdated || 0), 0);
    const periodHours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
    const grantsPerHour = periodHours > 0 ? totalGrants / periodHours : 0;

    // Calculate uptime (simplified - would use actual monitoring data)
    const uptime = successRate; // Approximation

    return {
      successRate,
      averageProcessingTime,
      grantsPerHour,
      uptime,
      totalJobs,
      successfulJobs,
      totalGrants
    };
  }

  private generateMetricRecommendations(
    category: 'excellent' | 'good' | 'fair' | 'poor',
    direction: 'higher_better' | 'lower_better'
  ): string[] {
    const recommendations: string[] = [];

    if (category === 'poor') {
      if (direction === 'higher_better') {
        recommendations.push('Critical improvement needed - review configuration and implementation');
        recommendations.push('Consider redesigning approach or temporarily disabling');
      } else {
        recommendations.push('Performance is critically slow - optimize immediately');
        recommendations.push('Review resource allocation and bottlenecks');
      }
    } else if (category === 'fair') {
      recommendations.push('Moderate improvement needed - review and optimize');
      recommendations.push('Monitor closely and implement incremental improvements');
    } else if (category === 'good') {
      recommendations.push('Good performance - minor optimizations possible');
    } else {
      recommendations.push('Excellent performance - maintain current approach');
    }

    return recommendations;
  }

  private async generateOptimizationRecommendations(
    systemBenchmarks: SystemBenchmarks,
    sourceBenchmarks: SourceBenchmark[]
  ): Promise<OptimizationRecommendation[]> {
    const recommendations: OptimizationRecommendation[] = [];

    // System-level recommendations
    if (systemBenchmarks.successRate.category === 'poor' || systemBenchmarks.successRate.category === 'fair') {
      recommendations.push({
        type: 'configuration',
        priority: 'high',
        title: 'Improve System Success Rate',
        description: 'Overall success rate is below target, indicating widespread issues',
        expectedImprovement: {
          metric: 'Success Rate',
          currentValue: systemBenchmarks.successRate.baseline,
          targetValue: systemBenchmarks.successRate.target,
          improvementPercentage: (systemBenchmarks.successRate.improvement / systemBenchmarks.successRate.baseline) * 100
        },
        implementationEffort: 'medium',
        estimatedTimeToImplement: '2-4 weeks',
        prerequisites: ['Error analysis', 'Source configuration review'],
        riskLevel: 'low'
      });
    }

    if (systemBenchmarks.processingSpeed.category === 'poor' || systemBenchmarks.processingSpeed.category === 'fair') {
      recommendations.push({
        type: 'infrastructure',
        priority: 'medium',
        title: 'Optimize Processing Speed',
        description: 'Processing times are above optimal range, affecting throughput',
        expectedImprovement: {
          metric: 'Processing Time',
          currentValue: systemBenchmarks.processingSpeed.baseline,
          targetValue: systemBenchmarks.processingSpeed.target,
          improvementPercentage: (systemBenchmarks.processingSpeed.improvement / systemBenchmarks.processingSpeed.baseline) * 100
        },
        implementationEffort: 'high',
        estimatedTimeToImplement: '4-8 weeks',
        prerequisites: ['Performance profiling', 'Infrastructure assessment'],
        riskLevel: 'medium'
      });
    }

    // Source-level recommendations
    const underPerformingSources = sourceBenchmarks.filter(s => s.overallRating === 'poor');
    if (underPerformingSources.length > 0) {
      recommendations.push({
        type: 'maintenance',
        priority: 'high',
        title: 'Address Underperforming Sources',
        description: `${underPerformingSources.length} sources are performing poorly and need attention`,
        expectedImprovement: {
          metric: 'Source Performance',
          currentValue: underPerformingSources.length,
          targetValue: 0,
          improvementPercentage: 100
        },
        implementationEffort: 'medium',
        estimatedTimeToImplement: '1-3 weeks',
        prerequisites: ['Source analysis', 'Configuration updates'],
        riskLevel: 'low'
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  private generateKeyInsights(
    systemBenchmarks: SystemBenchmarks,
    sourceBenchmarks: SourceBenchmark[]
  ): string[] {
    const insights: string[] = [];

    // System insights
    insights.push(`Overall system performance is ${systemBenchmarks.overall.category} with a score of ${systemBenchmarks.overall.score.toFixed(1)}/100`);
    
    if (systemBenchmarks.successRate.category === 'excellent') {
      insights.push(`Success rate is excellent at ${(systemBenchmarks.successRate.baseline * 100).toFixed(1)}%`);
    } else {
      insights.push(`Success rate needs improvement - currently at ${(systemBenchmarks.successRate.baseline * 100).toFixed(1)}%`);
    }

    // Source insights
    const excellentSources = sourceBenchmarks.filter(s => s.overallRating === 'excellent').length;
    const poorSources = sourceBenchmarks.filter(s => s.overallRating === 'poor').length;
    
    insights.push(`${excellentSources} sources are performing excellently, while ${poorSources} need immediate attention`);

    if (sourceBenchmarks.length > 0) {
      const avgCompetitivePosition = sourceBenchmarks.reduce((sum, s) => sum + s.competitivePosition, 0) / sourceBenchmarks.length;
      insights.push(`Average source performance is at the ${avgCompetitivePosition.toFixed(0)}th percentile`);
    }

    // Improvement potential
    const totalImprovementPotential = sourceBenchmarks.reduce((sum, s) => sum + s.improvementPotential, 0);
    if (totalImprovementPotential > 0) {
      insights.push(`Total improvement potential across all sources is ${totalImprovementPotential.toFixed(0)} points`);
    }

    return insights;
  }

  private createActionPlan(recommendations: OptimizationRecommendation[]): {
    immediate: OptimizationRecommendation[];
    shortTerm: OptimizationRecommendation[];
    longTerm: OptimizationRecommendation[];
  } {
    const immediate = recommendations.filter(r => 
      r.priority === 'critical' || 
      (r.priority === 'high' && r.implementationEffort === 'low')
    );

    const shortTerm = recommendations.filter(r => 
      (r.priority === 'high' && r.implementationEffort === 'medium') ||
      (r.priority === 'medium' && r.implementationEffort === 'low')
    );

    const longTerm = recommendations.filter(r => 
      r.implementationEffort === 'high' ||
      r.priority === 'low'
    );

    return { immediate, shortTerm, longTerm };
  }
}