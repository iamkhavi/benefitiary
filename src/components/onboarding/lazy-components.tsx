"use client"

import { lazy, Suspense } from 'react'
import { FormSkeleton } from '@/components/loading/form-skeleton'

// Lazy load onboarding components for better performance
export const LazyPreferencesForm = lazy(() => 
  import('./preferences-form').then(module => ({ default: module.PreferencesForm }))
)

export const LazyOnboardingForm = lazy(() => 
  import('./onboarding-form').then(module => ({ default: module.OnboardingForm }))
)

// Wrapper components with loading states
export function PreferencesFormWithSuspense(props: any) {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <LazyPreferencesForm {...props} />
    </Suspense>
  )
}

export function OnboardingFormWithSuspense(props: any) {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <LazyOnboardingForm {...props} />
    </Suspense>
  )
}