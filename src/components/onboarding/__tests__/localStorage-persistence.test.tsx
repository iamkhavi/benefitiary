import { renderHook, act } from '@testing-library/react'
import { OnboardingProvider, useOnboarding } from '../onboarding-context'

// Mock localStorage
import { vi } from 'vitest'

const mockLocalStorage = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
})

describe('OnboardingContext - localStorage persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLocalStorage.clear()
  })

  it('should save data to localStorage when data changes', () => {
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

    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'benefitiary-onboarding-data',
      expect.stringContaining('"name":"Test Org"')
    )
  })

  it('should load data from localStorage on initialization', () => {
    const testData = {
      currentStep: 1,
      data: {
        organization: {
          name: 'Saved Org',
          orgType: 'Nonprofit',
          size: 'Medium',
          country: 'CA'
        }
      },
      timestamp: Date.now()
    }

    mockLocalStorage.setItem(
      'benefitiary-onboarding-data',
      JSON.stringify(testData)
    )

    const { result } = renderHook(() => useOnboarding(), {
      wrapper: OnboardingProvider,
    })

    expect(result.current.currentStep).toBe(1)
    expect(result.current.data.organization?.name).toBe('Saved Org')
  })

  it('should not load expired data', () => {
    const expiredData = {
      currentStep: 1,
      data: { organization: { name: 'Expired Org' } },
      timestamp: Date.now() - (25 * 60 * 60 * 1000) // 25 hours ago
    }

    mockLocalStorage.setItem(
      'benefitiary-onboarding-data',
      JSON.stringify(expiredData)
    )

    const { result } = renderHook(() => useOnboarding(), {
      wrapper: OnboardingProvider,
    })

    expect(result.current.currentStep).toBe(0)
    expect(result.current.data).toEqual({})
  })

  it('should clear localStorage data', () => {
    const { result } = renderHook(() => useOnboarding(), {
      wrapper: OnboardingProvider,
    })

    act(() => {
      result.current.updateData({ organization: { name: 'Test' } })
    })

    act(() => {
      result.current.clearStorage()
    })

    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(
      'benefitiary-onboarding-data'
    )
    expect(result.current.data).toEqual({})
    expect(result.current.currentStep).toBe(0)
  })

  it('should handle localStorage errors gracefully', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    
    mockLocalStorage.setItem.mockImplementation(() => {
      throw new Error('Storage quota exceeded')
    })

    const { result } = renderHook(() => useOnboarding(), {
      wrapper: OnboardingProvider,
    })

    act(() => {
      result.current.updateData({ organization: { name: 'Test' } })
    })

    expect(consoleSpy).toHaveBeenCalledWith(
      'Failed to save onboarding data to localStorage:',
      expect.any(Error)
    )

    consoleSpy.mockRestore()
  })

  it('should handle malformed localStorage data', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    
    mockLocalStorage.getItem.mockReturnValueOnce('invalid json')

    const { result } = renderHook(() => useOnboarding(), {
      wrapper: OnboardingProvider,
    })

    expect(result.current.currentStep).toBe(0)
    expect(result.current.data).toEqual({})
    expect(consoleSpy).toHaveBeenCalledWith(
      'Failed to load onboarding data from localStorage:',
      expect.any(Error)
    )

    consoleSpy.mockRestore()
  })
})