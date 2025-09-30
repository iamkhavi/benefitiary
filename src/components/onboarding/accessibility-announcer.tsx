"use client"

import React, { useEffect, useRef } from 'react'
import { useOnboarding } from './onboarding-context'

/**
 * Accessibility announcer component that provides screen reader announcements
 * for onboarding step changes and important state updates
 */
export function AccessibilityAnnouncer() {
  const { currentStep, steps } = useOnboarding()
  const announcerRef = useRef<HTMLDivElement>(null)
  const previousStepRef = useRef<number>(-1)

  useEffect(() => {
    // Announce step changes to screen readers
    if (previousStepRef.current !== currentStep && previousStepRef.current !== -1) {
      const currentStepInfo = steps[currentStep]
      const announcement = `Navigated to step ${currentStep + 1} of ${steps.length}: ${currentStepInfo?.title}`
      
      if (announcerRef.current) {
        announcerRef.current.textContent = announcement
        
        // Clear the announcement after a short delay to allow for re-announcements
        setTimeout(() => {
          if (announcerRef.current) {
            announcerRef.current.textContent = ''
          }
        }, 1000)
      }
    }
    
    previousStepRef.current = currentStep
  }, [currentStep, steps])

  return (
    <div
      ref={announcerRef}
      className="sr-only"
      aria-live="polite"
      aria-atomic="true"
      role="status"
    />
  )
}