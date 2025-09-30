import { describe, it, expect, beforeEach, vi } from 'vitest'
import { performanceMonitor, useOnboardingAnalytics } from '@/lib/performance'
import { generateImageSizes, getOptimalImageQuality } from '@/lib/image-optimization'

// Set test environment
process.env.NODE_ENV = 'test'

describe('Performance Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    performanceMonitor.clearMetrics()
  })

  describe('Performance Monitoring Integration', () => {
    it('should track complete onboarding flow', () => {
      const userId = 'test-user-123'
      
      // Start onboarding
      performanceMonitor.startOnboarding(userId)
      
      // Complete steps
      performanceMonitor.startStep(1, userId)
      performanceMonitor.completeStep(1, userId)
      
      performanceMonitor.startStep(2, userId)
      performanceMonitor.completeStep(2, userId)
      
      performanceMonitor.startStep(3, userId)
      performanceMonitor.completeStep(3, userId)
      
      // Complete onboarding
      performanceMonitor.completeOnboarding(userId)
      
      const metrics = performanceMonitor.getMetrics()
      
      // Verify all expected metrics are present
      expect(metrics.some(m => m.name === 'onboarding_started')).toBe(true)
      expect(metrics.filter(m => m.name === 'step_completed')).toHaveLength(3)
      expect(metrics.some(m => m.name === 'onboarding_completed')).toBe(true)
    })

    it('should track error scenarios', () => {
      const userId = 'error-user'
      const errorMessage = 'Validation failed'
      
      performanceMonitor.recordFormError(1, errorMessage, userId)
      
      const metrics = performanceMonitor.getMetrics()
      const errorMetric = metrics.find(m => m.name === 'form_error')
      
      expect(errorMetric).toBeDefined()
      expect(errorMetric?.userId).toBe(userId)
      expect(errorMetric?.metadata?.error).toBe(errorMessage)
    })

    it('should handle analytics hook integration', () => {
      const analytics = useOnboardingAnalytics()
      
      expect(analytics.stepStarted).toBeDefined()
      expect(analytics.stepCompleted).toBeDefined()
      expect(analytics.onboardingCompleted).toBeDefined()
      expect(analytics.onboardingAbandoned).toBeDefined()
      expect(analytics.formError).toBeDefined()
    })
  })

  describe('Image Optimization', () => {
    it('should generate responsive image sizes', () => {
      const sizes = generateImageSizes(800)
      
      expect(sizes).toContain('(max-width: 640px) 640px')
      expect(sizes).toContain('(max-width: 768px) 768px')
      expect(sizes).toContain('800px')
    })

    it('should optimize quality based on connection', () => {
      // Mock slow connection
      Object.defineProperty(navigator, 'connection', {
        value: {
          effectiveType: '2g',
          downlink: 0.5
        },
        configurable: true
      })

      const quality = getOptimalImageQuality()
      expect(quality).toBe(50) // Reduced quality for slow connection
    })

    it('should provide default quality when connection info unavailable', () => {
      // Remove connection info
      Object.defineProperty(navigator, 'connection', {
        value: undefined,
        configurable: true
      })

      const quality = getOptimalImageQuality()
      expect(quality).toBe(75) // Default quality
    })
  })

  describe('Bundle Optimization Configuration', () => {
    it('should have correct Next.js configuration', () => {
      const config = require('../../../next.config.js')
      
      expect(config.experimental?.optimizePackageImports).toBeDefined()
      expect(config.compress).toBe(true)
      expect(config.images?.formats).toContain('image/webp')
      expect(config.images?.formats).toContain('image/avif')
    })

    it('should have webpack optimization configured', () => {
      const config = require('../../../next.config.js')
      
      expect(config.webpack).toBeDefined()
      expect(typeof config.webpack).toBe('function')
    })
  })

  describe('Performance Benchmarks', () => {
    it('should meet performance targets', () => {
      // Mock performance timing
      global.performance.getEntriesByType = vi.fn().mockReturnValue([{
        fetchStart: 0,
        loadEventEnd: 1500, // Under 2s target
        domContentLoadedEventEnd: 800 // Under 1s target
      }])
      
      performanceMonitor.measurePageLoad('/onboarding')
      
      const metrics = performanceMonitor.getMetrics()
      const pageLoadMetric = metrics.find(m => m.name === 'page_load_time')
      const domMetric = metrics.find(m => m.name === 'dom_content_loaded')
      
      expect(pageLoadMetric?.value).toBeLessThan(2000) // Under 2s
      expect(domMetric?.value).toBeLessThan(1000) // Under 1s
    })

    it('should track step completion within reasonable time', () => {
      const userId = 'benchmark-user'
      
      performanceMonitor.startStep(1, userId)
      const duration = performanceMonitor.completeStep(1, userId)
      
      // Should complete immediately in test
      expect(duration).toBeGreaterThanOrEqual(0)
      expect(duration).toBeLessThan(100) // Should be very fast in test
    })
  })

  describe('Memory Management', () => {
    it('should clear metrics properly', () => {
      // Add some metrics
      for (let i = 0; i < 10; i++) {
        performanceMonitor.recordMetric({
          name: `test_metric_${i}`,
          value: i,
          timestamp: Date.now()
        })
      }
      
      expect(performanceMonitor.getMetrics()).toHaveLength(10)
      
      performanceMonitor.clearMetrics()
      expect(performanceMonitor.getMetrics()).toHaveLength(0)
    })

    it('should handle large numbers of metrics', () => {
      // Generate many metrics
      for (let i = 0; i < 1000; i++) {
        performanceMonitor.recordMetric({
          name: `bulk_metric_${i}`,
          value: i,
          timestamp: Date.now()
        })
      }
      
      const metrics = performanceMonitor.getMetrics()
      expect(metrics).toHaveLength(1000)
      
      // Should not cause memory issues
      expect(metrics[0].name).toBe('bulk_metric_0')
      expect(metrics[999].name).toBe('bulk_metric_999')
    })
  })

  describe('Analytics Data Quality', () => {
    it('should include session tracking', () => {
      performanceMonitor.recordMetric({
        name: 'session_test',
        value: 1,
        timestamp: Date.now()
      })
      
      const metrics = performanceMonitor.getMetrics()
      const sessionMetric = metrics.find(m => m.name === 'session_test')
      
      expect(sessionMetric?.sessionId).toBeDefined()
      expect(sessionMetric?.sessionId).toMatch(/^session_\d+_[a-z0-9]+$/)
    })

    it('should handle optional fields gracefully', () => {
      performanceMonitor.recordMetric({
        name: 'minimal_metric',
        value: 123,
        timestamp: Date.now()
      })
      
      const metrics = performanceMonitor.getMetrics()
      const metric = metrics.find(m => m.name === 'minimal_metric')
      
      expect(metric).toBeDefined()
      expect(metric?.name).toBe('minimal_metric')
      expect(metric?.value).toBe(123)
      expect(metric?.userId).toBeUndefined()
      expect(metric?.metadata).toBeUndefined()
    })
  })
})