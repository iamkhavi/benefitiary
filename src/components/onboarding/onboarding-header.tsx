"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ArrowLeft } from 'lucide-react'
import { useOnboarding } from './onboarding-context'
import { cn } from '@/lib/utils'

export function OnboardingHeader() {
  const { currentStep, totalSteps, steps, canGoBack, goBack } = useOnboarding()
  
  const progressPercentage = ((currentStep + 1) / totalSteps) * 100
  const currentStepInfo = steps[currentStep]

  return (
    <header 
      className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      role="banner"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 max-w-2xl">
        {/* Navigation and Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 sm:mb-4 gap-3 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
            {canGoBack && (
              <Button
                variant="ghost"
                size="sm"
                onClick={goBack}
                className="gap-1 sm:gap-2 flex-shrink-0"
                aria-label={`Go back to previous step: ${steps[currentStep - 1]?.title || 'previous step'}`}
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Back</span>
              </Button>
            )}
            <div className="min-w-0 flex-1">
              <h1 
                className="text-lg sm:text-xl font-semibold text-foreground truncate"
                id="onboarding-step-title"
              >
                {currentStepInfo?.title}
              </h1>
              <p 
                className="text-xs sm:text-sm text-muted-foreground line-clamp-2"
                id="onboarding-step-description"
              >
                {currentStepInfo?.description}
              </p>
            </div>
          </div>
          
          {/* Step Counter */}
          <div 
            className="text-xs sm:text-sm text-muted-foreground flex-shrink-0 self-start sm:self-center"
            aria-label={`Current step: ${currentStep + 1} of ${totalSteps}`}
          >
            Step {currentStep + 1} of {totalSteps}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2" role="region" aria-labelledby="progress-label">
          <div id="progress-label" className="sr-only">
            Onboarding Progress
          </div>
          <Progress 
            value={progressPercentage} 
            className="h-2"
            aria-label={`Onboarding progress: ${Math.round(progressPercentage)}% complete, step ${currentStep + 1} of ${totalSteps}`}
            aria-valuenow={progressPercentage}
            aria-valuemin={0}
            aria-valuemax={100}
            role="progressbar"
          />
          
          {/* Step Indicators */}
          <nav 
            aria-label="Onboarding steps"
            role="navigation"
          >
            <ol 
              className="flex justify-between gap-1"
              role="list"
            >
              {steps.map((step, index) => (
                <li
                  key={step.id}
                  className={cn(
                    "flex flex-col items-center text-xs flex-1 min-w-0",
                    index <= currentStep ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  <div
                    className={cn(
                      "w-2 h-2 rounded-full mb-1 flex-shrink-0",
                      index < currentStep 
                        ? "bg-primary" 
                        : index === currentStep 
                          ? "bg-primary" 
                          : "bg-muted"
                    )}
                    aria-hidden="true"
                  />
                  <span 
                    className="hidden sm:block text-center leading-tight truncate w-full px-1"
                    aria-label={`Step ${index + 1}: ${step.title}${index < currentStep ? ' (completed)' : index === currentStep ? ' (current)' : ' (upcoming)'}`}
                    title={step.title}
                  >
                    {step.title}
                  </span>
                </li>
              ))}
            </ol>
          </nav>
        </div>
      </div>
    </header>
  )
}