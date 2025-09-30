import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import OrganizationPage from '@/app/onboarding/organization/page'
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

const renderWithProvider = () => {
  return render(
    <OnboardingProvider>
      <OrganizationPage />
    </OnboardingProvider>
  )
}

describe('OrganizationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fetch).mockClear()
  })

  it('should render organization profile form with all required fields', () => {
    renderWithProvider()

    expect(screen.getByText('Organization Profile')).toBeInTheDocument()
    expect(screen.getByLabelText(/organization name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/organization type/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/organization size/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/country/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/region/i)).toBeInTheDocument()
  })

  it('should validate required fields', async () => {
    const user = userEvent.setup()
    renderWithProvider()

    const continueButton = screen.getByRole('button', { name: /continue to role selection/i })
    await user.click(continueButton)

    await waitFor(() => {
      expect(screen.getByText('Organization name must be at least 2 characters')).toBeInTheDocument()
      expect(screen.getByText('Please select an organization type')).toBeInTheDocument()
      expect(screen.getByText('Please select an organization size')).toBeInTheDocument()
      expect(screen.getByText('Please select a country')).toBeInTheDocument()
    })
  })

  it('should allow filling out the form with valid data', async () => {
    const user = userEvent.setup()
    renderWithProvider()

    // Fill out form
    await user.type(screen.getByLabelText(/organization name/i), 'Test Organization')
    
    // Select organization type
    await user.click(screen.getByRole('combobox', { name: /organization type/i }))
    await user.click(screen.getByRole('option', { name: /sme/i }))
    
    // Select organization size
    await user.click(screen.getByRole('combobox', { name: /organization size/i }))
    await user.click(screen.getByRole('option', { name: /small/i }))
    
    // Select country
    await user.click(screen.getByRole('combobox', { name: /country/i }))
    await user.click(screen.getByRole('option', { name: /united states/i }))
    
    // Fill region
    await user.type(screen.getByLabelText(/region/i), 'California')

    // Verify form is filled
    expect(screen.getByDisplayValue('Test Organization')).toBeInTheDocument()
    expect(screen.getByDisplayValue('California')).toBeInTheDocument()
  })

  it('should submit form successfully with valid data', async () => {
    const user = userEvent.setup()
    
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        organization: {
          id: 'org-123',
          name: 'Test Organization',
          orgType: 'SME',
          size: 'Small',
          country: 'United States',
          region: 'California'
        }
      })
    } as Response)

    renderWithProvider()

    // Fill out form
    await user.type(screen.getByLabelText(/organization name/i), 'Test Organization')
    await user.click(screen.getByRole('combobox', { name: /organization type/i }))
    await user.click(screen.getByRole('option', { name: /sme/i }))
    await user.click(screen.getByRole('combobox', { name: /organization size/i }))
    await user.click(screen.getByRole('option', { name: /small/i }))
    await user.click(screen.getByRole('combobox', { name: /country/i }))
    await user.click(screen.getByRole('option', { name: /united states/i }))
    await user.type(screen.getByLabelText(/region/i), 'California')

    // Submit form
    const continueButton = screen.getByRole('button', { name: /continue to role selection/i })
    await user.click(continueButton)

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/onboarding/organization', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Test Organization',
          orgType: 'SME',
          size: 'Small',
          country: 'United States',
          region: 'California'
        })
      })
    })
  })

  it('should show loading state during submission', async () => {
    const user = userEvent.setup()
    
    vi.mocked(fetch).mockImplementationOnce(() => 
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: async () => ({ success: true })
      } as Response), 100))
    )

    renderWithProvider()

    // Fill out minimal form
    await user.type(screen.getByLabelText(/organization name/i), 'Test Org')
    await user.click(screen.getByRole('combobox', { name: /organization type/i }))
    await user.click(screen.getByRole('option', { name: /sme/i }))
    await user.click(screen.getByRole('combobox', { name: /organization size/i }))
    await user.click(screen.getByRole('option', { name: /small/i }))
    await user.click(screen.getByRole('combobox', { name: /country/i }))
    await user.click(screen.getByRole('option', { name: /united states/i }))

    const continueButton = screen.getByRole('button', { name: /continue to role selection/i })
    await user.click(continueButton)

    expect(screen.getByText('Saving...')).toBeInTheDocument()
    expect(continueButton).toBeDisabled()

    await waitFor(() => {
      expect(screen.queryByText('Saving...')).not.toBeInTheDocument()
    }, { timeout: 200 })
  })

  it('should handle API errors gracefully', async () => {
    const user = userEvent.setup()
    
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        error: 'Failed to create organization',
        code: 'DATABASE_ERROR'
      })
    } as Response)

    renderWithProvider()

    // Fill out form
    await user.type(screen.getByLabelText(/organization name/i), 'Test Org')
    await user.click(screen.getByRole('combobox', { name: /organization type/i }))
    await user.click(screen.getByRole('option', { name: /sme/i }))
    await user.click(screen.getByRole('combobox', { name: /organization size/i }))
    await user.click(screen.getByRole('option', { name: /small/i }))
    await user.click(screen.getByRole('combobox', { name: /country/i }))
    await user.click(screen.getByRole('option', { name: /united states/i }))

    const continueButton = screen.getByRole('button', { name: /continue to role selection/i })
    await user.click(continueButton)

    await waitFor(() => {
      expect(screen.getByText('Failed to create organization')).toBeInTheDocument()
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
          name: ['Organization name already exists']
        }
      })
    } as Response)

    renderWithProvider()

    // Fill out form
    await user.type(screen.getByLabelText(/organization name/i), 'Existing Org')
    await user.click(screen.getByRole('combobox', { name: /organization type/i }))
    await user.click(screen.getByRole('option', { name: /sme/i }))
    await user.click(screen.getByRole('combobox', { name: /organization size/i }))
    await user.click(screen.getByRole('option', { name: /small/i }))
    await user.click(screen.getByRole('combobox', { name: /country/i }))
    await user.click(screen.getByRole('option', { name: /united states/i }))

    const continueButton = screen.getByRole('button', { name: /continue to role selection/i })
    await user.click(continueButton)

    await waitFor(() => {
      expect(screen.getByText('Organization name already exists')).toBeInTheDocument()
    })
  })

  it('should have proper accessibility attributes', () => {
    renderWithProvider()

    // Check for proper form structure
    const form = screen.getByRole('form')
    expect(form).toBeInTheDocument()
    
    // Check for proper labeling
    expect(screen.getByLabelText(/organization name/i)).toHaveAttribute('required')
    expect(screen.getByRole('combobox', { name: /organization type/i })).toHaveAttribute('aria-required', 'true')
    expect(screen.getByRole('combobox', { name: /organization size/i })).toHaveAttribute('aria-required', 'true')
    expect(screen.getByRole('combobox', { name: /country/i })).toHaveAttribute('aria-required', 'true')

    // Check buttons are properly labeled
    expect(screen.getByRole('button', { name: /continue to role selection/i })).toBeInTheDocument()
  })

  it('should allow form submission without region', async () => {
    const user = userEvent.setup()
    
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        organization: {
          id: 'org-123',
          name: 'Test Organization',
          orgType: 'SME',
          size: 'Small',
          country: 'Canada',
          region: null
        }
      })
    } as Response)

    renderWithProvider()

    // Fill out form without region
    await user.type(screen.getByLabelText(/organization name/i), 'Test Organization')
    await user.click(screen.getByRole('combobox', { name: /organization type/i }))
    await user.click(screen.getByRole('option', { name: /sme/i }))
    await user.click(screen.getByRole('combobox', { name: /organization size/i }))
    await user.click(screen.getByRole('option', { name: /small/i }))
    await user.click(screen.getByRole('combobox', { name: /country/i }))
    await user.click(screen.getByRole('option', { name: /canada/i }))

    const continueButton = screen.getByRole('button', { name: /continue to role selection/i })
    await user.click(continueButton)

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/onboarding/organization', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Test Organization',
          orgType: 'SME',
          size: 'Small',
          country: 'Canada',
          region: ''
        })
      })
    })
  })
})