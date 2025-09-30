import React from 'react'
import { render } from '@testing-library/react'
import { OnboardingStepSync } from '../onboarding-step-sync'
import { OnboardingProvider, useOnboarding } from '../onboarding-context'
import { vi } from 'vitest'

// Mock usePathname
const mockUsePathname = vi.fn()
vi.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname()
}))

const TestComponent = () => {
  const { currentStep } = useOnboarding()
  return <div data-testid="current-step">{currentStep}</div>
}

const renderWithProvider = (ui: React.ReactElement) => {
  return render(
    <OnboardingProvider>
      <OnboardingStepSync />
      {ui}
    </OnboardingProvider>
  )
}

describe('OnboardingStepSync', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should sync step based on pathname', () => {
    mockUsePathname.mockReturnValue('/onboarding/role')
    
    const { getByTestId } = renderWithProvider(<TestComponent />)
    
    expect(getByTestId('current-step')).toHaveTextContent('1')
  })

  it('should sync to preferences step', () => {
    mockUsePathname.mockReturnValue('/onboarding/preferences')
    
    const { getByTestId } = renderWithProvider(<TestComponent />)
    
    expect(getByTestId('current-step')).toHaveTextContent('2')
  })

  it('should sync to organization step', () => {
    mockUsePathname.mockReturnValue('/onboarding/organization')
    
    const { getByTestId } = renderWithProvider(<TestComponent />)
    
    expect(getByTestId('current-step')).toHaveTextContent('0')
  })

  it('should not change step for unknown paths', () => {
    mockUsePathname.mockReturnValue('/unknown-path')
    
    const { getByTestId } = renderWithProvider(<TestComponent />)
    
    // Should remain at default step 0
    expect(getByTestId('current-step')).toHaveTextContent('0')
  })
})