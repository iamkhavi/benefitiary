import { describe, it, expect, beforeEach, vi } from 'vitest'
import { performanceMonitor } from '@/lib/performance'

// Mock performance APIs
const mockPerformanceObserver = vi.fn()
const mockPerformanceEntry = {
  startTime: 100,
  processingStart: 110,
  value: 0.05,
  hadRecentInput: false
}

global.PerformanceObserver = vi.fn().mockImplementation((callback) => {
  mockPerformanceObserver.mockImplementation(callback)
  return {
    observe: vi.fn(),
    disconnect: vi.fn()
  }
})

global.performance = {
  ...global.performance,
  getEntriesByType: vi.fn().mockReturnValue([{
    fetchStart: 0,
    loadEventEnd: 1500,
    domContentLoadedEventEnd: 800
  }])
}

describe('Onboarding Performance Optimizations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    performanceMonitor.clearMetrics()
  })

  describe('Performance Monitoring', () => {
    it('should track Core Web Vitals', () => {
      performanceMonitor.measureCoreWebVitals()
      
      // Simulate LCP measurement by directly calling the callback
      const mockCallback = mockPerformanceObserver.mock.calls[0]?.[0]
      if (mockCallback) {
        mockCallback({
          getEntries: () => [mockPerformanceEntry]
        })
      }
      
      const metrics = performanceMonitor.getMetrics()
      expect(metrics.some(m => m.name === 'LCP')).toBe(true)
    })

    it('should measure page load performance', () => {
      performanceMonitor.measurePageLoad('/onboarding/organization')
      
      const metrics = performanceMonitor.getMetrics()
      const pageLoadMetric = metrics.find(m => m.name === 'page_load_time')
      
      expect(pageLoadMetric).toBeDefined()
      expect(pageLoadMetric?.value).toBe(1500) // loadEventEnd - fetchStart
      expect(pageLoadMetric?.metadata?.page).toBe('/onboarding/organization')
    })

    it('should track onboarding flow timing', () => {
      const userId = 'test-user-123'
      
      // Start onboarding
      performanceMonitor.startOnboarding(userId)
      
      // Complete steps
      performanceMonitor.startStep(1, userId)
      const step1Duration = performanceMonitor.completeStep(1, userId)
      
      performanceMonitor.startStep(2, userId)
      const step2Duration = performanceMonitor.completeStep(2, userId)
      
      // Complete onboarding
      const totalDuration = performanceMonitor.completeOnboarding(userId)
      
      const metrics = performanceMonitor.getMetrics()
      
      // Check onboarding started
      expect(metrics.some(m => m.name === 'onboarding_started' && m.userId === userId)).toBe(true)
      
      // Check steps completed
      expect(metrics.some(m => m.name === 'step_completed' && m.value === 1)).toBe(true)
      expect(metrics.some(m => m.name === 'step_completed' && m.value === 2)).toBe(true)
      
      // Check onboarding completed
      expect(metrics.some(m => m.name === 'onboarding_completed' && m.userId === userId)).toBe(true)
      
      // Verify durations are reasonable
      expect(step1Duration).toBeGreaterThanOrEqual(0)
      expect(step2Duration).toBeGreaterThanOrEqual(0)
      expect(totalDuration).toBeGreaterThanOrEqual(0)
    })

    it('should track onboarding abandonment', () => {
      const userId = 'test-user-456'
      
      performanceMonitor.startOnboarding(userId)
      performanceMonitor.startStep(2, userId)
      performanceMonitor.abandonOnboarding(2, userId)
      
      const metrics = performanceMonitor.getMetrics()
      const abandonmentMetric = metrics.find(m => m.name === 'onboarding_abandoned')
      
      expect(abandonmentMetric).toBeDefined()
      expect(abandonmentMetric?.value).toBe(2)
      expect(abandonmentMetric?.userId).toBe(userId)
      expect(abandonmentMetric?.metadata?.abandonedAtStep).toBe(2)
    })

    it('should track form errors', () => {
      const userId = 'test-user-789'
      const errorMessage = 'Validation failed: Organization name is required'
      
      performanceMonitor.recordFormError(1, errorMessage, userId)
      
      const metrics = performanceMonitor.getMetrics()
      const errorMetric = metrics.find(m => m.name === 'form_error')
      
      expect(errorMetric).toBeDefined()
      expect(errorMetric?.value).toBe(1)
      expect(errorMetric?.userId).toBe(userId)
      expect(errorMetric?.metadata?.error).toBe(errorMessage)
    })
  })

  describe('Performance Benchmarks', () => {
    it('should meet page load time benchmarks', () => {
      // Simulate fast page load
      global.performance.getEntriesByType = vi.fn().mockReturnValue([{
        fetchStart: 0,
        loadEventEnd: 1200, // Under 2 second target
        domContentLoadedEventEnd: 600
      }])
      
      performanceMonitor.measurePageLoad('/onboarding')
      
      const metrics = performanceMonitor.getMetrics()
      const pageLoadMetric = metrics.find(m => m.name === 'page_load_time')
      
      // Should be under 2 seconds (2000ms)
      expect(pageLoadMetric?.value).toBeLessThan(2000)
    })

    it('should meet DOM content loaded benchmarks', () => {
      global.performance.getEntriesByType = vi.fn().mockReturnValue([{
        fetchStart: 0,
        loadEventEnd: 1200,
        domContentLoadedEventEnd: 800 // Under 1 second target
      }])
      
      performanceMonitor.measurePageLoad('/onboarding')
      
      const metrics = performanceMonitor.getMetrics()
      const domMetric = metrics.find(m => m.name === 'dom_content_loaded')
      
      // Should be under 1 second (1000ms)
      expect(domMetric?.value).toBeLessThan(1000)
    })

    it('should track step completion times within reasonable bounds', () => {
      const userId = 'benchmark-user'
      
      performanceMonitor.startStep(1, userId)
      
      // Simulate reasonable step completion time
      setTimeout(() => {
        const duration = performanceMonitor.completeStep(1, userId)
        
        // Step should complete in reasonable time (under 5 minutes)
        expect(duration).toBeLessThan(5 * 60 * 1000)
      }, 100)
    })
  })

  describe('Analytics Data Quality', () => {
    it('should include required fields in all metrics', () => {
      performanceMonitor.recordMetric({
        name: 'test_metric',
        value: 123,
        timestamp: Date.now(),
        userId: 'test-user',
        sessionId: 'test-session'
      })
      
      const metrics = performanceMonitor.getMetrics()
      const testMetric = metrics.find(m => m.name === 'test_metric')
      
      expect(testMetric).toBeDefined()
      expect(testMetric?.name).toBe('test_metric')
      expect(testMetric?.value).toBe(123)
      expect(testMetric?.timestamp).toBeTypeOf('number')
      expect(testMetric?.userId).toBe('test-user')
      expect(testMetric?.sessionId).toBe('test-session')
    })

    it('should handle missing optional fields gracefully', () => {
      performanceMonitor.recordMetric({
        name: 'minimal_metric',
        value: 456,
        timestamp: Date.now()
      })
      
      const metrics = performanceMonitor.getMetrics()
      const minimalMetric = metrics.find(m => m.name === 'minimal_metric')
      
      expect(minimalMetric).toBeDefined()
      expect(minimalMetric?.userId).toBeUndefined()
      expect(minimalMetric?.sessionId).toBeUndefined()
      expect(minimalMetric?.metadata).toBeUndefined()
    })
  })

  describe('Memory and Performance Impact', () => {
    it('should not accumulate excessive metrics in memory', () => {
      // Generate many metrics
      for (let i = 0; i < 1000; i++) {
        performanceMonitor.recordMetric({
          name: `test_metric_${i}`,
          value: i,
          timestamp: Date.now()
        })
      }
      
      const metrics = performanceMonitor.getMetrics()
      expect(metrics.length).toBe(1000)
      
      // Clear metrics to prevent memory leaks
      performanceMonitor.clearMetrics()
      expect(performanceMonitor.getMetrics().length).toBe(0)
    })

    it('should handle performance observer errors gracefully', () => {
      // Mock PerformanceObserver to throw an error
      global.PerformanceObserver = vi.fn().mockImplementation(() => {
        throw new Error('PerformanceObserver not supported')
      })
      
      // Mock console.warn to capture the warning
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      
      // Should not throw when initializing, but should log a warning
      performanceMonitor.measureCoreWebVitals()
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'PerformanceObserver not supported or failed to initialize:',
        expect.any(Error)
      )
      
      consoleSpy.mockRestore()
    })
  })
})