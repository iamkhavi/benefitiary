"use client"

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useOnboardingAnalytics } from '@/lib/performance'

export interface OnboardingStep {
  id: string
  title: string
  description: string
  path: string
}

export interface OnboardingData {
  organization?: {
    name: string
    orgType: string
    size: string
    position: string
    website?: string
    country: string
    region?: string
  }
  preferences?: string[]
}

interface OnboardingContextType {
  currentStep: number
  totalSteps: number
  steps: OnboardingStep[]
  data: OnboardingData
  canGoBack: boolean
  updateData: (stepData: Partial<OnboardingData>) => void
  goToStep: (step: number) => void
  goBack: () => void
  goNext: () => void
  saveToStorage: () => void
  loadFromStorage: () => void
  clearStorage: () => void
  analytics: ReturnType<typeof useOnboardingAnalytics>
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined)

const STORAGE_KEY = 'benefitiary-onboarding-data'

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'organization',
    title: 'Organization Profile',
    description: 'Tell us about your organization',
    path: '/onboarding/organization'
  },
  {
    id: 'preferences',
    title: 'Grant Preferences',
    description: 'What types of grants interest you?',
    path: '/onboarding/preferences'
  }
]

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [currentStep, setCurrentStep] = useState(0)
  const [data, setData] = useState<OnboardingData>({})
  const analytics = useOnboardingAnalytics()

  const totalSteps = ONBOARDING_STEPS.length
  const canGoBack = currentStep > 0

  // Load data from localStorage on mount and start analytics
  useEffect(() => {
    loadFromStorage()
    analytics.stepStarted(currentStep)
  }, [])

  // Track step changes
  useEffect(() => {
    analytics.stepStarted(currentStep)
  }, [currentStep, analytics])

  const updateData = (stepData: Partial<OnboardingData>) => {
    setData(prev => ({ ...prev, ...stepData }))
  }

  const goToStep = (step: number) => {
    if (step >= 0 && step < totalSteps) {
      analytics.stepCompleted(currentStep, 0) // Duration will be calculated by the analytics
      setCurrentStep(step)
    }
  }

  const goBack = () => {
    if (canGoBack) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const goNext = () => {
    if (currentStep < totalSteps - 1) {
      analytics.stepCompleted(currentStep, 0) // Duration will be calculated by the analytics
      setCurrentStep(prev => prev + 1)
    } else if (currentStep === totalSteps - 1) {
      // Completing the last step means onboarding is complete
      analytics.onboardingCompleted(0, undefined) // Total duration will be calculated
    }
  }

  const saveToStorage = useCallback(() => {
    try {
      const storageData = {
        currentStep,
        data,
        timestamp: Date.now()
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(storageData))
    } catch (error) {
      console.warn('Failed to save onboarding data to localStorage:', error)
    }
  }, [currentStep, data])

  // Auto-save to localStorage when data changes
  useEffect(() => {
    if (Object.keys(data).length > 0) {
      saveToStorage()
    }
  }, [data, saveToStorage])

  const loadFromStorage = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const { currentStep: storedStep, data: storedData, timestamp } = JSON.parse(stored)
        
        // Only load if data is less than 24 hours old
        const isRecent = Date.now() - timestamp < 24 * 60 * 60 * 1000
        
        if (isRecent && storedData) {
          setData(storedData)
          setCurrentStep(storedStep || 0)
        }
      }
    } catch (error) {
      console.warn('Failed to load onboarding data from localStorage:', error)
    }
  }

  const clearStorage = () => {
    try {
      localStorage.removeItem(STORAGE_KEY)
      setData({})
      setCurrentStep(0)
    } catch (error) {
      console.warn('Failed to clear onboarding data from localStorage:', error)
    }
  }

  const value: OnboardingContextType = {
    currentStep,
    totalSteps,
    steps: ONBOARDING_STEPS,
    data,
    canGoBack,
    updateData,
    goToStep,
    goBack,
    goNext,
    saveToStorage,
    loadFromStorage,
    clearStorage,
    analytics
  }

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  )
}

export function useOnboarding() {
  const context = useContext(OnboardingContext)
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider')
  }
  return context
}