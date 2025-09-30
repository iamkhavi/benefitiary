// Performance monitoring utilities for onboarding flow

export interface PerformanceMetric {
  name: string
  value: number
  timestamp: number
  userId?: string
  sessionId?: string
  metadata?: Record<string, any>
}

export interface OnboardingAnalytics {
  stepStarted: (step: number, userId?: string) => void
  stepCompleted: (step: number, duration: number, userId?: string) => void
  onboardingCompleted: (totalDuration: number, userId?: string) => void
  onboardingAbandoned: (step: number, duration: number, userId?: string) => void
  formError: (step: number, error: string, userId?: string) => void
  performanceMetric: (metric: PerformanceMetric) => void
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = []
  private sessionId: string
  private stepStartTimes: Map<number, number> = new Map()
  private onboardingStartTime?: number

  constructor() {
    this.sessionId = this.generateSessionId()
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // Core Web Vitals monitoring
  measureCoreWebVitals() {
    if (typeof window === 'undefined') return

    try {
      // Largest Contentful Paint (LCP)
      new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const lastEntry = entries[entries.length - 1]
        this.recordMetric({
          name: 'LCP',
          value: lastEntry.startTime,
          timestamp: Date.now(),
          sessionId: this.sessionId
        })
      }).observe({ entryTypes: ['largest-contentful-paint'] })

      // First Input Delay (FID)
      new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach((entry: any) => {
          this.recordMetric({
            name: 'FID',
            value: entry.processingStart - entry.startTime,
            timestamp: Date.now(),
            sessionId: this.sessionId
          })
        })
      }).observe({ entryTypes: ['first-input'] })

      // Cumulative Layout Shift (CLS)
      let clsValue = 0
      new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value
          }
        })
        this.recordMetric({
          name: 'CLS',
          value: clsValue,
          timestamp: Date.now(),
          sessionId: this.sessionId
        })
      }).observe({ entryTypes: ['layout-shift'] })
    } catch (error) {
      console.warn('PerformanceObserver not supported or failed to initialize:', error)
    }
  }

  // Page load performance
  measurePageLoad(pageName: string) {
    if (typeof window === 'undefined') return

    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    
    this.recordMetric({
      name: 'page_load_time',
      value: navigation.loadEventEnd - navigation.fetchStart,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      metadata: { page: pageName }
    })

    this.recordMetric({
      name: 'dom_content_loaded',
      value: navigation.domContentLoadedEventEnd - navigation.fetchStart,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      metadata: { page: pageName }
    })
  }

  // Onboarding-specific analytics
  startOnboarding(userId?: string) {
    this.onboardingStartTime = Date.now()
    this.recordMetric({
      name: 'onboarding_started',
      value: 1,
      timestamp: Date.now(),
      userId,
      sessionId: this.sessionId
    })
  }

  startStep(step: number, userId?: string) {
    const now = Date.now()
    this.stepStartTimes.set(step, now)
    this.recordMetric({
      name: 'step_started',
      value: step,
      timestamp: now,
      userId,
      sessionId: this.sessionId
    })
  }

  completeStep(step: number, userId?: string) {
    const now = Date.now()
    const startTime = this.stepStartTimes.get(step)
    const duration = startTime ? now - startTime : 0

    this.recordMetric({
      name: 'step_completed',
      value: step,
      timestamp: now,
      userId,
      sessionId: this.sessionId,
      metadata: { duration, step }
    })

    this.stepStartTimes.delete(step)
    return duration
  }

  completeOnboarding(userId?: string) {
    const now = Date.now()
    const totalDuration = this.onboardingStartTime ? now - this.onboardingStartTime : 0

    this.recordMetric({
      name: 'onboarding_completed',
      value: 1,
      timestamp: now,
      userId,
      sessionId: this.sessionId,
      metadata: { totalDuration }
    })

    return totalDuration
  }

  abandonOnboarding(step: number, userId?: string) {
    const now = Date.now()
    const stepStartTime = this.stepStartTimes.get(step)
    const stepDuration = stepStartTime ? now - stepStartTime : 0
    const totalDuration = this.onboardingStartTime ? now - this.onboardingStartTime : 0

    this.recordMetric({
      name: 'onboarding_abandoned',
      value: step,
      timestamp: now,
      userId,
      sessionId: this.sessionId,
      metadata: { stepDuration, totalDuration, abandonedAtStep: step }
    })
  }

  recordFormError(step: number, error: string, userId?: string) {
    this.recordMetric({
      name: 'form_error',
      value: step,
      timestamp: Date.now(),
      userId,
      sessionId: this.sessionId,
      metadata: { error, step }
    })
  }

  recordMetric(metric: PerformanceMetric) {
    // Ensure sessionId is included if not provided
    const enrichedMetric = {
      ...metric,
      sessionId: metric.sessionId || this.sessionId
    }
    
    this.metrics.push(enrichedMetric)
    
    // Send to analytics service (implement based on your analytics provider)
    this.sendToAnalytics(enrichedMetric)
    
    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Performance Metric:', enrichedMetric)
    }
  }

  private async sendToAnalytics(metric: PerformanceMetric) {
    // Skip analytics in test environment
    if (process.env.NODE_ENV === 'test') {
      return
    }
    
    try {
      // Send to your analytics service
      // This could be Google Analytics, Mixpanel, PostHog, etc.
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
      await fetch(`${baseUrl}/api/analytics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(metric),
      })
    } catch (error) {
      console.error('Failed to send analytics:', error)
    }
  }

  getMetrics(): PerformanceMetric[] {
    return [...this.metrics]
  }

  clearMetrics() {
    this.metrics = []
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor()

// React hook for onboarding analytics
export function useOnboardingAnalytics(): OnboardingAnalytics {
  return {
    stepStarted: (step: number, userId?: string) => {
      performanceMonitor.startStep(step, userId)
    },
    
    stepCompleted: (step: number, duration: number, userId?: string) => {
      performanceMonitor.completeStep(step, userId)
    },
    
    onboardingCompleted: (totalDuration: number, userId?: string) => {
      performanceMonitor.completeOnboarding(userId)
    },
    
    onboardingAbandoned: (step: number, duration: number, userId?: string) => {
      performanceMonitor.abandonOnboarding(step, userId)
    },
    
    formError: (step: number, error: string, userId?: string) => {
      performanceMonitor.recordFormError(step, error, userId)
    },
    
    performanceMetric: (metric: PerformanceMetric) => {
      performanceMonitor.recordMetric(metric)
    }
  }
}

// Initialize performance monitoring
export function initializePerformanceMonitoring() {
  if (typeof window !== 'undefined') {
    performanceMonitor.measureCoreWebVitals()
    
    // Measure page load on initial load
    window.addEventListener('load', () => {
      performanceMonitor.measurePageLoad(window.location.pathname)
    })
  }
}