import { render, screen, act, renderHook } from '@testing-library/react'
import { OnboardingProvider, useOnboarding } from '../onboarding-context'

import { vi } from 'vitest'

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
})

describe('OnboardingContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should provide initial state', () => {
    const { result } = renderHook(() => useOnboarding(), {
      wrapper: OnboardingProvider,
    })

    expect(result.current.currentStep).toBe(0)
    expect(result.current.totalSteps).toBe(3)
    expect(result.current.canGoBack).toBe(false)
    expect(result.current.data).toEqual({})
  })

  it('should update data correctly', () => {
    const { result } = renderHook(() => useOnboarding(), {
      wrapper: OnboardingProvider,
    })

    act(() => {
      result.current.updateData({
        organization: {
          name: 'Test Org',
          orgType: 'SME',
          size: 'Small',
          country: 'US'
        }
      })
    })

    expect(result.current.data.organization).toEqual({
      name: 'Test Org',
      orgType: 'SME',
      size: 'Small',
      country: 'US'
    })
  })

  it('should navigate between steps correctly', () => {
    const { result } = renderHook(() => useOnboarding(), {
      wrapper: OnboardingProvider,
    })

    // Go to next step
    act(() => {
      result.current.goNext()
    })

    expect(result.current.currentStep).toBe(1)
    expect(result.current.canGoBack).toBe(true)

    // Go back
    act(() => {
      result.current.goBack()
    })

    expect(result.current.currentStep).toBe(0)
    expect(result.current.canGoBack).toBe(false)
  })

  it('should not go beyond step boundaries', () => {
    const { result } = renderHook(() => useOnboarding(), {
      wrapper: OnboardingProvider,
    })

    // Try to go back from first step
    act(() => {
      result.current.goBack()
    })

    expect(result.current.currentStep).toBe(0)

    // Go to last step
    act(() => {
      result.current.goToStep(2)
    })

    expect(result.current.currentStep).toBe(2)

    // Try to go beyond last step
    act(() => {
      result.current.goNext()
    })

    expect(result.current.currentStep).toBe(2)
  })
})