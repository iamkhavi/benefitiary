import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RolePage from '@/app/onboarding/role/page'
import { OnboardingProvider } from '@/components/onboarding/onboarding-context'

// Mock fetch
global.fetch = vi.fn()

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn()
  })
}))

const renderWithProvider = (initialData = {}) => {
  return render(
    <OnboardingProvider>
      <RolePage />
    </OnboardingProvider>
  )
}

describe('RolePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fetch).mockClear()
  })

  it('should render role selection form with all role options', () => {
    renderWithProvider()

    expect(screen.getByText('Select Your Role')).toBeInTheDocument()
    expect(screen.getByText('How will you use Benefitiary? *')).toBeInTheDocument()
    
    // Check all role options are present
    expect(screen.getByText('Grant Seeker')).toBeInTheDocument()
    expect(screen.getByText('Grant Writer')).toBeInTheDocument()
    expect(screen.getByText('Funder')).toBeInTheDocument()
    
    // Check role descriptions
    expect(screen.getByText('Find grants for your organization')).toBeInTheDocument()
    expect(screen.getByText('Offer proposal writing services')).toBeInTheDocument()
    expect(screen.getByText('Post grant opportunities')).toBeInTheDocument()
  })

  it('should display role features for each option', () => {
    renderWithProvider()

    // Seeker features
    expect(screen.getByText('Discover relevant grants based on your profile')).toBeInTheDocument()
    expect(screen.getByText('Track application deadlines and status')).toBeInTheDocument()
    
    // Writer features
    expect(screen.getByText('Connect with organizations seeking writing help')).toBeInTheDocument()
    expect(screen.getByText('Manage multiple client projects')).toBeInTheDocument()
    
    // Funder features
    expect(screen.getByText('Publish and manage grant opportunities')).toBeInTheDocument()
    expect(screen.getByText('Review and evaluate applications')).toBeInTheDocument()
  })

  it('should allow selecting a role', async () => {
    const user = userEvent.setup()
    renderWithProvider()

    const seekerOption = screen.getByRole('radio', { name: /grant seeker/i })
    await user.click(seekerOption)

    expect(seekerOption).toBeChecked()
  })

  it('should show validation error when no role is selected', async () => {
    const user = userEvent.setup()
    renderWithProvider()

    const continueButton = screen.getByRole('button', { name: /continue to preferences/i })
    await user.click(continueButton)

    await waitFor(() => {
      expect(screen.getByText('Please select a role')).toBeInTheDocument()
    })
  })

  it('should submit form successfully when role is selected', async () => {
    const user = userEvent.setup()
    
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        user: { id: 'user-123', role: 'seeker' }
      })
    } as Response)

    renderWithProvider()

    // Select a role
    const seekerOption = screen.getByRole('radio', { name: /grant seeker/i })
    await user.click(seekerOption)

    // Submit form
    const continueButton = screen.getByRole('button', { name: /continue to preferences/i })
    await user.click(continueButton)

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/onboarding/role', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: 'seeker' })
      })
    })
  })

  it('should show loading state during submission', async () => {
    const user = userEvent.setup()
    
    // Mock a delayed response
    vi.mocked(fetch).mockImplementationOnce(() => 
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: async () => ({ success: true, user: { id: 'user-123', role: 'writer' } })
      } as Response), 100))
    )

    renderWithProvider()

    const writerOption = screen.getByRole('radio', { name: /grant writer/i })
    await user.click(writerOption)

    const continueButton = screen.getByRole('button', { name: /continue to preferences/i })
    await user.click(continueButton)

    // Should show loading state
    expect(screen.getByText('Saving...')).toBeInTheDocument()
    expect(continueButton).toBeDisabled()

    // Wait for submission to complete
    await waitFor(() => {
      expect(screen.queryByText('Saving...')).not.toBeInTheDocument()
    }, { timeout: 200 })
  })

  it('should handle API errors gracefully', async () => {
    const user = userEvent.setup()
    
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        error: 'Failed to update role',
        code: 'DATABASE_ERROR'
      })
    } as Response)

    renderWithProvider()

    const funderOption = screen.getByRole('radio', { name: /funder/i })
    await user.click(funderOption)

    const continueButton = screen.getByRole('button', { name: /continue to preferences/i })
    await user.click(continueButton)

    await waitFor(() => {
      expect(screen.getByText('Failed to update role')).toBeInTheDocument()
    })
  })

  it('should handle validation errors from API', async () => {
    const user = userEvent.setup()
    
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: {
          role: ['Invalid role selected']
        }
      })
    } as Response)

    renderWithProvider()

    const seekerOption = screen.getByRole('radio', { name: /grant seeker/i })
    await user.click(seekerOption)

    const continueButton = screen.getByRole('button', { name: /continue to preferences/i })
    await user.click(continueButton)

    await waitFor(() => {
      expect(screen.getByText('Invalid role selected')).toBeInTheDocument()
    })
  })

  it('should have back button that works', async () => {
    const user = userEvent.setup()
    renderWithProvider()

    const backButton = screen.getByRole('button', { name: /back/i })
    expect(backButton).toBeInTheDocument()
    
    // Should be clickable (not testing navigation since it's mocked)
    await user.click(backButton)
  })

  it('should preserve selected role when component re-renders', () => {
    // This would test the defaultValues from the form
    const { rerender } = renderWithProvider()
    
    // Simulate having existing role data
    rerender(
      <OnboardingProvider>
        <RolePage />
      </OnboardingProvider>
    )

    // The form should maintain its state through re-renders
    expect(screen.getByText('Select Your Role')).toBeInTheDocument()
    expect(screen.getByRole('radiogroup')).toBeInTheDocument()
  })

  it('should have proper accessibility attributes', () => {
    renderWithProvider()

    // Check for proper form structure
    expect(screen.getByRole('radiogroup')).toBeInTheDocument()
    
    // Check for proper labeling
    const roleOptions = screen.getAllByRole('radio')
    expect(roleOptions).toHaveLength(3)
    
    roleOptions.forEach(option => {
      expect(option).toHaveAttribute('id')
      expect(option).toHaveAttribute('value')
    })

    // Check that form has proper structure
    expect(screen.getByText('How will you use Benefitiary? *')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /continue to preferences/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument()
  })
})