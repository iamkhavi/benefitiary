import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

interface TestSuite {
  name: string;
  pattern: string;
  timeout: number;
  retries: number;
}

interface TestResult {
  suite: string;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  coverage?: number;
}

interface QualityMetrics {
  testResults: TestResult[];
  overallCoverage: number;
  performanceMetrics: {
    averageTestDuration: number;
    slowestTest: string;
    fastestTest: string;
  };
  qualityScore: number;
}

/**
 * Comprehensive Test Runner for Scraping System Quality Assurance
 * 
 * This test runner orchestrates all testing phases and generates quality reports
 */
export class ScrapingTestRunner {
  private testSuites: TestSuite[] = [
    {
      name: 'Unit Tests',
      pattern: 'src/lib/scraping/**/*.test.ts --exclude src/lib/scraping/**/*integration*.test.ts --exclude src/lib/scraping/**/*e2e*.test.ts --exclude src/lib/scraping/**/*performance*.test.ts',
      timeout: 30000,
      retries: 2
    },
    {
      name: 'Integration Tests',
      pattern: 'src/lib/scraping/**/*integration*.test.ts',
      timeout: 60000,
      retries: 3
    },
    {
      name: 'End-to-End Tests',
      pattern: 'src/lib/scraping/__tests__/e2e-workflow.test.ts',
      timeout: 120000,
      retries: 2
    },
    {
      name: 'Performance Tests',
      pattern: 'src/lib/scraping/__tests__/performance.test.ts',
      timeout: 180000,
      retries: 1
    },
    {
      name: 'Data Quality Tests',
      pattern: 'src/lib/scraping/__tests__/data-quality.test.ts',
      timeout: 90000,
      retries: 2
    },
    {
      name: 'Regression Tests',
      pattern: 'src/lib/scraping/__tests__/regression.test.ts',
      timeout: 150000,
      retries: 1
    }
  ];

  private results: TestResult[] = [];
  private startTime: number = 0;

  async runAllTests(): Promise<QualityMetrics> {
    console.log('🚀 Starting Comprehensive Scraping System Test Suite');
    console.log('=' .repeat(60));
    
    this.startTime = Date.now();
    
    // Run each test suite
    for (const suite of this.testSuites) {
      await this.runTestSuite(suite);
    }

    // Generate coverage report
    const coverage = await this.generateCoverageReport();
    
    // Calculate quality metrics
    const metrics = await this.calculateQualityMetrics(coverage);
    
    // Generate final report
    await this.generateQualityReport(metrics);
    
    return metrics;
  }

  private async runTestSuite(suite: TestSuite): Promise<TestResult> {
    console.log(`\n📋 Running ${suite.name}...`);
    console.log('-'.repeat(40));
    
    const startTime = Date.now();
    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt <= suite.retries) {
      try {
        const command = `npx vitest run ${suite.pattern} --reporter=json --timeout=${suite.timeout}`;
        const { stdout, stderr } = await execAsync(command, {
          timeout: suite.timeout + 10000 // Add buffer for command execution
        });

        const result = this.parseTestOutput(stdout, suite.name, Date.now() - startTime);
        this.results.push(result);
        
        console.log(`✅ ${suite.name} completed successfully`);
        console.log(`   Passed: ${result.passed}, Failed: ${result.failed}, Duration: ${result.duration}ms`);
        
        return result;
      } catch (error) {
        attempt++;
        lastError = error as Error;
        
        if (attempt <= suite.retries) {
          console.log(`⚠️  ${suite.name} failed (attempt ${attempt}/${suite.retries + 1}), retrying...`);
          await this.delay(2000 * attempt); // Exponential backoff
        }
      }
    }

    // All retries failed
    const failedResult: TestResult = {
      suite: suite.name,
      passed: 0,
      failed: 1,
      skipped: 0,
      duration: Date.now() - startTime
    };
    
    this.results.push(failedResult);
    console.log(`❌ ${suite.name} failed after ${suite.retries + 1} attempts`);
    console.log(`   Error: ${lastError?.message}`);
    
    return failedResult;
  }

  private parseTestOutput(output: string, suiteName: string, duration: number): TestResult {
    try {
      const jsonOutput = JSON.parse(output);
      
      return {
        suite: suiteName,
        passed: jsonOutput.numPassedTests || 0,
        failed: jsonOutput.numFailedTests || 0,
        skipped: jsonOutput.numPendingTests || 0,
        duration
      };
    } catch {
      // Fallback parsing for non-JSON output
      const lines = output.split('\n');
      let passed = 0;
      let failed = 0;
      let skipped = 0;

      lines.forEach(line => {
        if (line.includes('✓') || line.includes('PASS')) passed++;
        if (line.includes('✗') || line.includes('FAIL')) failed++;
        if (line.includes('○') || line.includes('SKIP')) skipped++;
      });

      return {
        suite: suiteName,
        passed,
        failed,
        skipped,
        duration
      };
    }
  }

  private async generateCoverageReport(): Promise<number> {
    console.log('\n📊 Generating Coverage Report...');
    
    try {
      const { stdout } = await execAsync('npx vitest run --coverage --reporter=json');
      const coverageData = JSON.parse(stdout);
      
      // Extract overall coverage percentage
      const coverage = coverageData.total?.lines?.pct || 0;
      console.log(`📈 Overall Coverage: ${coverage}%`);
      
      return coverage;
    } catch (error) {
      console.log('⚠️  Coverage report generation failed:', error);
      return 0;
    }
  }

  private async calculateQualityMetrics(coverage: number): Promise<QualityMetrics> {
    const totalTests = this.results.reduce((sum, r) => sum + r.passed + r.failed, 0);
    const totalPassed = this.results.reduce((sum, r) => sum + r.passed, 0);
    const totalFailed = this.results.reduce((sum, r) => sum + r.failed, 0);
    
    const passRate = totalTests > 0 ? (totalPassed / totalTests) * 100 : 0;
    const avgDuration = this.results.reduce((sum, r) => sum + r.duration, 0) / this.results.length;
    
    // Calculate quality score (weighted combination of metrics)
    const qualityScore = (
      (passRate * 0.4) +           // 40% weight for pass rate
      (coverage * 0.3) +           // 30% weight for coverage
      (Math.min(avgDuration / 1000, 60) / 60 * 20) + // 20% weight for performance (capped at 60s)
      (this.results.length * 2)    // 10% weight for test completeness
    );

    return {
      testResults: this.results,
      overallCoverage: coverage,
      performanceMetrics: {
        averageTestDuration: avgDuration,
        slowestTest: this.results.reduce((prev, curr) => 
          prev.duration > curr.duration ? prev : curr
        ).suite,
        fastestTest: this.results.reduce((prev, curr) => 
          prev.duration < curr.duration ? prev : curr
        ).suite
      },
      qualityScore: Math.min(qualityScore, 100)
    };
  }

  private async generateQualityReport(metrics: QualityMetrics): Promise<void> {
    const totalDuration = Date.now() - this.startTime;
    const totalTests = metrics.testResults.reduce((sum, r) => sum + r.passed + r.failed, 0);
    const totalPassed = metrics.testResults.reduce((sum, r) => sum + r.passed, 0);
    const totalFailed = metrics.testResults.reduce((sum, r) => sum + r.failed, 0);

    const report = `
# Scraping System Quality Assurance Report
Generated: ${new Date().toISOString()}
Duration: ${(totalDuration / 1000).toFixed(2)}s

## Summary
- **Quality Score**: ${metrics.qualityScore.toFixed(1)}/100
- **Overall Coverage**: ${metrics.overallCoverage.toFixed(1)}%
- **Total Tests**: ${totalTests}
- **Passed**: ${totalPassed} (${((totalPassed / totalTests) * 100).toFixed(1)}%)
- **Failed**: ${totalFailed} (${((totalFailed / totalTests) * 100).toFixed(1)}%)

## Test Suite Results
${metrics.testResults.map(result => `
### ${result.suite}
- Passed: ${result.passed}
- Failed: ${result.failed}
- Skipped: ${result.skipped}
- Duration: ${(result.duration / 1000).toFixed(2)}s
- Status: ${result.failed === 0 ? '✅ PASS' : '❌ FAIL'}
`).join('')}

## Performance Metrics
- **Average Test Duration**: ${(metrics.performanceMetrics.averageTestDuration / 1000).toFixed(2)}s
- **Slowest Test Suite**: ${metrics.performanceMetrics.slowestTest}
- **Fastest Test Suite**: ${metrics.performanceMetrics.fastestTest}

## Quality Assessment
${this.generateQualityAssessment(metrics)}

## Recommendations
${this.generateRecommendations(metrics)}
`;

    // Write report to file
    const reportPath = path.join(process.cwd(), 'test-results', 'quality-report.md');
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, report);
    
    console.log('\n📋 Quality Report Generated');
    console.log('=' .repeat(60));
    console.log(report);
    console.log(`📁 Full report saved to: ${reportPath}`);
  }

  private generateQualityAssessment(metrics: QualityMetrics): string {
    const assessments = [];

    if (metrics.qualityScore >= 90) {
      assessments.push('🟢 **Excellent**: System quality is exceptional');
    } else if (metrics.qualityScore >= 80) {
      assessments.push('🟡 **Good**: System quality is acceptable with room for improvement');
    } else if (metrics.qualityScore >= 70) {
      assessments.push('🟠 **Fair**: System quality needs attention');
    } else {
      assessments.push('🔴 **Poor**: System quality requires immediate attention');
    }

    if (metrics.overallCoverage >= 80) {
      assessments.push('🟢 **Coverage**: Excellent test coverage');
    } else if (metrics.overallCoverage >= 70) {
      assessments.push('🟡 **Coverage**: Good test coverage');
    } else {
      assessments.push('🔴 **Coverage**: Insufficient test coverage');
    }

    const failedSuites = metrics.testResults.filter(r => r.failed > 0);
    if (failedSuites.length === 0) {
      assessments.push('🟢 **Reliability**: All test suites passing');
    } else {
      assessments.push(`🔴 **Reliability**: ${failedSuites.length} test suite(s) failing`);
    }

    return assessments.join('\n');
  }

  private generateRecommendations(metrics: QualityMetrics): string {
    const recommendations = [];

    if (metrics.overallCoverage < 80) {
      recommendations.push('- Increase test coverage, especially for edge cases and error handling');
    }

    const failedSuites = metrics.testResults.filter(r => r.failed > 0);
    if (failedSuites.length > 0) {
      recommendations.push(`- Fix failing tests in: ${failedSuites.map(s => s.suite).join(', ')}`);
    }

    const slowSuites = metrics.testResults.filter(r => r.duration > 60000);
    if (slowSuites.length > 0) {
      recommendations.push(`- Optimize performance for slow test suites: ${slowSuites.map(s => s.suite).join(', ')}`);
    }

    if (metrics.qualityScore < 80) {
      recommendations.push('- Review and improve overall system quality based on failed metrics');
    }

    if (recommendations.length === 0) {
      recommendations.push('- Maintain current quality standards and continue monitoring');
    }

    return recommendations.join('\n');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export test runner for use in CI/CD and manual testing
export async function runComprehensiveTests(): Promise<QualityMetrics> {
  const runner = new ScrapingTestRunner();
  return await runner.runAllTests();
}

// CLI interface for running tests
if (require.main === module) {
  runComprehensiveTests()
    .then(metrics => {
      console.log('\n🎉 Test suite completed!');
      console.log(`Quality Score: ${metrics.qualityScore.toFixed(1)}/100`);
      
      if (metrics.qualityScore < 70) {
        process.exit(1); // Fail CI if quality is too low
      }
    })
    .catch(error => {
      console.error('❌ Test suite failed:', error);
      process.exit(1);
    });
}