"use client"

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useOnboarding } from './onboarding-context'

export function OnboardingStepSync() {
  const pathname = usePathname()
  const { goToStep, steps } = useOnboarding()

  useEffect(() => {
    // Find the current step based on the pathname
    const currentStepIndex = steps.findIndex(step => step.path === pathname)
    
    if (currentStepIndex !== -1) {
      goToStep(currentStepIndex)
    }
  }, [pathname, steps, goToStep])

  return null // This component doesn't render anything
}