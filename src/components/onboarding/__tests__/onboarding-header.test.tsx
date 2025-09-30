import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { OnboardingHeader } from '../onboarding-header'

describe('OnboardingHeader', () => {
  it('should render with title and description', () => {
    render(
      <OnboardingHeader 
        title="Test Title" 
        description="Test description for the step" 
      />
    )

    expect(screen.getByText('Test Title')).toBeInTheDocument()
    expect(screen.getByText('Test description for the step')).toBeInTheDocument()
  })

  it('should render without description', () => {
    render(
      <OnboardingHeader 
        title="Test Title" 
      />
    )

    expect(screen.getByText('Test Title')).toBeInTheDocument()
  })

  it('should have proper heading structure', () => {
    render(
      <OnboardingHeader 
        title="Organization Profile" 
        description="Tell us about your organization" 
      />
    )

    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).toHaveTextContent('Organization Profile')
  })

  it('should apply proper CSS classes for styling', () => {
    render(
      <OnboardingHeader 
        title="Test Title" 
        description="Test description" 
      />
    )

    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).toHaveClass('text-2xl', 'font-bold', 'text-gray-900')
    
    const description = screen.getByText('Test description')
    expect(description).toHaveClass('text-gray-600', 'mt-2')
  })

  it('should be accessible with proper semantic structure', () => {
    render(
      <OnboardingHeader 
        title="Step Title" 
        description="Step description" 
      />
    )

    // Should have proper heading hierarchy
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    
    // Description should be associated with heading
    const description = screen.getByText('Step description')
    expect(description.tagName).toBe('P')
  })

  it('should handle long titles gracefully', () => {
    const longTitle = 'This is a very long title that might wrap to multiple lines in the onboarding header component'
    
    render(
      <OnboardingHeader 
        title={longTitle} 
        description="Short description" 
      />
    )

    expect(screen.getByText(longTitle)).toBeInTheDocument()
  })

  it('should handle long descriptions gracefully', () => {
    const longDescription = 'This is a very long description that provides detailed information about what the user needs to do in this step of the onboarding process and might wrap to multiple lines'
    
    render(
      <OnboardingHeader 
        title="Short Title" 
        description={longDescription} 
      />
    )

    expect(screen.getByText(longDescription)).toBeInTheDocument()
  })
})