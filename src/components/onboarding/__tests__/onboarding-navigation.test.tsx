import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { OnboardingNavigation } from '../onboarding-navigation'

describe('OnboardingNavigation', () => {
  const mockOnBack = vi.fn()
  const mockOnNext = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render back and next buttons', () => {
    render(
      <OnboardingNavigation
        canGoBack={true}
        onBack={mockOnBack}
        onNext={mockOnNext}
        nextLabel="Continue"
        isLoading={false}
      />
    )

    expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument()
  })

  it('should hide back button when canGoBack is false', () => {
    render(
      <OnboardingNavigation
        canGoBack={false}
        onBack={mockOnBack}
        onNext={mockOnNext}
        nextLabel="Continue"
        isLoading={false}
      />
    )

    expect(screen.queryByRole('button', { name: /back/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument()
  })

  it('should call onBack when back button is clicked', async () => {
    const user = userEvent.setup()
    
    render(
      <OnboardingNavigation
        canGoBack={true}
        onBack={mockOnBack}
        onNext={mockOnNext}
        nextLabel="Continue"
        isLoading={false}
      />
    )

    const backButton = screen.getByRole('button', { name: /back/i })
    await user.click(backButton)

    expect(mockOnBack).toHaveBeenCalledTimes(1)
  })

  it('should call onNext when next button is clicked', async () => {
    const user = userEvent.setup()
    
    render(
      <OnboardingNavigation
        canGoBack={true}
        onBack={mockOnBack}
        onNext={mockOnNext}
        nextLabel="Continue"
        isLoading={false}
      />
    )

    const nextButton = screen.getByRole('button', { name: /continue/i })
    await user.click(nextButton)

    expect(mockOnNext).toHaveBeenCalledTimes(1)
  })

  it('should show loading state on next button', () => {
    render(
      <OnboardingNavigation
        canGoBack={true}
        onBack={mockOnBack}
        onNext={mockOnNext}
        nextLabel="Continue"
        isLoading={true}
      />
    )

    const nextButton = screen.getByRole('button', { name: /saving/i })
    expect(nextButton).toBeDisabled()
    expect(screen.getByText('Saving...')).toBeInTheDocument()
  })

  it('should disable next button when loading', async () => {
    const user = userEvent.setup()
    
    render(
      <OnboardingNavigation
        canGoBack={true}
        onBack={mockOnBack}
        onNext={mockOnNext}
        nextLabel="Continue"
        isLoading={true}
      />
    )

    const nextButton = screen.getByRole('button', { name: /saving/i })
    await user.click(nextButton)

    // Should not call onNext when disabled
    expect(mockOnNext).not.toHaveBeenCalled()
  })

  it('should not disable back button when loading', async () => {
    const user = userEvent.setup()
    
    render(
      <OnboardingNavigation
        canGoBack={true}
        onBack={mockOnBack}
        onNext={mockOnNext}
        nextLabel="Continue"
        isLoading={true}
      />
    )

    const backButton = screen.getByRole('button', { name: /back/i })
    expect(backButton).not.toBeDisabled()
    
    await user.click(backButton)
    expect(mockOnBack).toHaveBeenCalledTimes(1)
  })

  it('should use custom next label', () => {
    render(
      <OnboardingNavigation
        canGoBack={true}
        onBack={mockOnBack}
        onNext={mockOnNext}
        nextLabel="Finish Setup"
        isLoading={false}
      />
    )

    expect(screen.getByRole('button', { name: /finish setup/i })).toBeInTheDocument()
  })

  it('should have proper button styling', () => {
    render(
      <OnboardingNavigation
        canGoBack={true}
        onBack={mockOnBack}
        onNext={mockOnNext}
        nextLabel="Continue"
        isLoading={false}
      />
    )

    const backButton = screen.getByRole('button', { name: /back/i })
    const nextButton = screen.getByRole('button', { name: /continue/i })

    // Back button should have secondary styling
    expect(backButton).toHaveClass('variant-outline')
    
    // Next button should have primary styling
    expect(nextButton).toHaveClass('variant-default')
  })

  it('should be keyboard accessible', async () => {
    const user = userEvent.setup()
    
    render(
      <OnboardingNavigation
        canGoBack={true}
        onBack={mockOnBack}
        onNext={mockOnNext}
        nextLabel="Continue"
        isLoading={false}
      />
    )

    // Tab to back button
    await user.tab()
    expect(screen.getByRole('button', { name: /back/i })).toHaveFocus()

    // Tab to next button
    await user.tab()
    expect(screen.getByRole('button', { name: /continue/i })).toHaveFocus()

    // Press Enter on next button
    await user.keyboard('{Enter}')
    expect(mockOnNext).toHaveBeenCalledTimes(1)
  })

  it('should handle form submission type for next button', () => {
    render(
      <OnboardingNavigation
        canGoBack={true}
        onBack={mockOnBack}
        onNext={mockOnNext}
        nextLabel="Submit"
        isLoading={false}
        nextButtonType="submit"
      />
    )

    const nextButton = screen.getByRole('button', { name: /submit/i })
    expect(nextButton).toHaveAttribute('type', 'submit')
  })

  it('should handle button type for next button', () => {
    render(
      <OnboardingNavigation
        canGoBack={true}
        onBack={mockOnBack}
        onNext={mockOnNext}
        nextLabel="Continue"
        isLoading={false}
        nextButtonType="button"
      />
    )

    const nextButton = screen.getByRole('button', { name: /continue/i })
    expect(nextButton).toHaveAttribute('type', 'button')
  })
})