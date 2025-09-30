"use client"

import React from 'react'
import { ArrowRight, ArrowLeft } from 'lucide-react'
import { useOnboarding } from './onboarding-context'
import { LoadingButton } from '@/components/loading/loading-button'
import { Button } from '@/components/ui/button'

interface OnboardingNavigationProps {
  onNext?: () => void | Promise<void>
  onBack?: () => void
  nextLabel?: string
  backLabel?: string
  isNextDisabled?: boolean
  isNextLoading?: boolean
  showBack?: boolean
  showNext?: boolean
}

export function OnboardingNavigation({
  onNext,
  onBack,
  nextLabel = "Continue",
  backLabel = "Back",
  isNextDisabled = false,
  isNextLoading = false,
  showBack = true,
  showNext = true
}: OnboardingNavigationProps) {
  const { canGoBack, goBack, currentStep, totalSteps, steps } = useOnboarding()
  
  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      goBack()
    }
  }

  const handleNext = async () => {
    if (onNext) {
      await onNext()
    }
  }

  const isLastStep = currentStep === totalSteps - 1
  const nextStepTitle = !isLastStep && steps[currentStep + 1]?.title
  const prevStepTitle = canGoBack && steps[currentStep - 1]?.title

  return (
    <nav 
      className="flex justify-between items-center pt-6 border-t"
      role="navigation"
      aria-label="Onboarding step navigation"
    >
      <div>
        {showBack && canGoBack && (
          <Button
            type="button"
            variant="outline"
            onClick={handleBack}
            className="gap-2"
            disabled={isNextLoading}
            aria-label={`Go back to previous step${prevStepTitle ? `: ${prevStepTitle}` : ''}`}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {backLabel}
          </Button>
        )}
      </div>
      
      <div>
        {showNext && (
          <LoadingButton
            type="submit"
            onClick={handleNext}
            loading={isNextLoading}
            loadingText="Processing..."
            disabled={isNextDisabled}
            className="gap-2"
            icon={!isLastStep ? <ArrowRight className="h-4 w-4" /> : undefined}
            aria-label={
              isNextLoading 
                ? "Processing your information, please wait"
                : isLastStep 
                  ? "Complete onboarding setup"
                  : `Continue to next step${nextStepTitle ? `: ${nextStepTitle}` : ''}`
            }
            aria-describedby={isNextDisabled ? "next-button-help" : undefined}
          >
            {isLastStep ? "Complete Setup" : nextLabel}
          </LoadingButton>
        )}
        {isNextDisabled && (
          <div id="next-button-help" className="sr-only">
            Please complete all required fields to continue
          </div>
        )}
      </div>
    </nav>
  )
}