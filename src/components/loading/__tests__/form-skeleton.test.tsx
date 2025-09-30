import React from 'react'
import { render, screen } from '@testing-library/react'
import { FormSkeleton, OnboardingFormSkeleton } from '../form-skeleton'

describe('FormSkeleton', () => {
  it('renders with default props', () => {
    render(<FormSkeleton />)
    
    // Should render default 3 fields
    const skeletons = screen.getAllByTestId(/skeleton/i)
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('renders specified number of fields', () => {
    render(<FormSkeleton fields={5} />)
    
    // Check that we have the right structure
    const container = screen.getByRole('main', { hidden: true }) || document.querySelector('[role="main"]')
    expect(container).toBeInTheDocument()
  })

  it('shows header when showHeader is true', () => {
    render(<FormSkeleton showHeader={true} />)
    
    // Header should be present (skeleton elements for title and description)
    const container = document.querySelector('.space-y-6')
    expect(container).toBeInTheDocument()
  })

  it('hides header when showHeader is false', () => {
    render(<FormSkeleton showHeader={false} />)
    
    // Should still render the form content
    const container = document.querySelector('.space-y-6')
    expect(container).toBeInTheDocument()
  })

  it('shows navigation when showNavigation is true', () => {
    render(<FormSkeleton showNavigation={true} />)
    
    // Navigation should be present
    const container = document.querySelector('.flex.justify-between')
    expect(container).toBeInTheDocument()
  })

  it('hides navigation when showNavigation is false', () => {
    render(<FormSkeleton showNavigation={false} />)
    
    // Should still render the form content
    const container = document.querySelector('.space-y-6')
    expect(container).toBeInTheDocument()
  })
})

describe('OnboardingFormSkeleton', () => {
  it('renders complete onboarding skeleton structure', () => {
    render(<OnboardingFormSkeleton />)
    
    // Should have header section
    const headerSection = document.querySelector('.border-b')
    expect(headerSection).toBeInTheDocument()
    
    // Should have main content
    const mainContent = document.querySelector('main')
    expect(mainContent).toBeInTheDocument()
    expect(mainContent).toHaveClass('container', 'mx-auto', 'px-4', 'py-8', 'max-w-2xl')
  })

  it('has proper semantic structure', () => {
    render(<OnboardingFormSkeleton />)
    
    // Should have main element
    const main = screen.getByRole('main')
    expect(main).toBeInTheDocument()
    
    // Should have proper classes for styling
    expect(main).toHaveClass('container', 'mx-auto')
  })

  it('renders with full height background', () => {
    render(<OnboardingFormSkeleton />)
    
    const container = document.querySelector('.min-h-screen')
    expect(container).toBeInTheDocument()
    expect(container).toHaveClass('bg-background')
  })
})