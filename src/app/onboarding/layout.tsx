"use client"

import React from 'react'
import { OnboardingProvider } from '@/components/onboarding/onboarding-context'
import { OnboardingHeader } from '@/components/onboarding/onboarding-header'
import { OnboardingStepSync } from '@/components/onboarding/onboarding-step-sync'
import { AccessibilityAnnouncer } from '@/components/onboarding/accessibility-announcer'
import { OnboardingErrorBoundary } from '@/components/error/onboarding-error-boundary'

interface OnboardingLayoutProps {
  children: React.ReactNode
}

export default function OnboardingLayout({ children }: OnboardingLayoutProps) {
  return (
    <OnboardingErrorBoundary>
      <OnboardingProvider>
        <OnboardingStepSync />
        <AccessibilityAnnouncer />
        <div className="min-h-screen bg-background">
          <a 
            href="#main-content" 
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary text-primary-foreground px-4 py-2 rounded-md z-50"
          >
            Skip to main content
          </a>
          <OnboardingHeader />
          <main 
            id="main-content"
            className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 max-w-2xl"
            role="main"
            aria-labelledby="onboarding-step-title"
            aria-describedby="onboarding-step-description"
          >
            {children}
          </main>
        </div>
      </OnboardingProvider>
    </OnboardingErrorBoundary>
  )
}