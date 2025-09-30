"use client"

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { OnboardingNavigation } from './onboarding-navigation'
import { useOnboarding } from './onboarding-context'
import { ErrorDisplay } from '@/components/error/error-display'
import { APIClientError } from '@/lib/api-client'
import { useRetry } from '@/hooks/use-retry'

interface OnboardingFormProps {
  title?: string
  description?: string
  children: React.ReactNode
  onSubmit: (data: any) => Promise<void> | void
  onValidate?: () => boolean
  nextLabel?: string
  showBack?: boolean
  className?: string
}

export function OnboardingForm({
  title,
  description,
  children,
  onSubmit,
  onValidate,
  nextLabel,
  showBack = true,
  className
}: OnboardingFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | APIClientError | null>(null)
  const { saveToStorage } = useOnboarding()

  // Set up retry mechanism
  const { execute: executeWithRetry, isRetrying } = useRetry(
    async (data: any) => {
      await onSubmit(data)
    },
    {
      maxAttempts: 3,
      delay: 1000,
      onRetry: (attempt, error) => {
        console.log(`Retrying form submission (attempt ${attempt}):`, error.message)
      }
    }
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Clear previous errors
    setError(null)
    
    // Run custom validation if provided
    if (onValidate && !onValidate()) {
      setError(new Error("Please fill in all required fields correctly."))
      return
    }

    setIsLoading(true)
    
    try {
      const formData = new FormData(e.target as HTMLFormElement)
      const data = Object.fromEntries(formData.entries())
      
      await executeWithRetry(data)
      
      // Save progress after successful submission
      saveToStorage()
    } catch (error) {
      console.error('Form submission error:', error)
      
      if (error instanceof APIClientError) {
        setError(error)
      } else if (error instanceof Error) {
        setError(error)
      } else {
        setError(new Error("An unexpected error occurred. Please try again."))
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleRetry = () => {
    setError(null)
    // Re-submit the form
    const form = document.querySelector('form') as HTMLFormElement
    if (form) {
      form.requestSubmit()
    }
  }

  const handleDismissError = () => {
    setError(null)
  }

  const isFormLoading = isLoading || isRetrying

  return (
    <Card className={className} role="main">
      {(title || description) && (
        <CardHeader>
          {title && (
            <CardTitle 
              id="form-title"
              className="text-2xl"
            >
              {title}
            </CardTitle>
          )}
          {description && (
            <CardDescription 
              id="form-description"
              className="text-base"
            >
              {description}
            </CardDescription>
          )}
        </CardHeader>
      )}
      
      <CardContent>
        <form 
          onSubmit={handleSubmit} 
          className="space-y-6"
          aria-labelledby={title ? "form-title" : undefined}
          aria-describedby={description ? "form-description" : undefined}
          noValidate
        >
          <fieldset disabled={isFormLoading} className="space-y-6">
            <legend className="sr-only">
              {title || "Onboarding form"}
            </legend>
            {children}
          </fieldset>
          
          {error && (
            <ErrorDisplay
              error={error}
              onRetry={handleRetry}
              onDismiss={handleDismissError}
              title="Form Error"
            />
          )}
          
          <OnboardingNavigation
            nextLabel={nextLabel}
            isNextLoading={isFormLoading}
            showBack={showBack}
          />
        </form>
      </CardContent>
    </Card>
  )
}