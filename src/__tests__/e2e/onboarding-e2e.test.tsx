import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { OnboardingProvider } from '@/components/onboarding/onboarding-context'
import OrganizationPage from '@/app/onboarding/organization/page'
import RolePage from '@/app/onboarding/role/page'
import PreferencesPage from '@/app/onboarding/preferences/page'

// Mock fetch for E2E scenarios
global.fetch = vi.fn()

// Mock next/navigation with more realistic behavior
const mockPush = vi.fn()
const mockReplace = vi.fn()
const mockBack = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    back: mockBack
  })
}))

// Mock localStorage for persistence testing
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
})

const renderWithProvider = (component: React.ReactNode) => {
  return render(
    <OnboardingProvider>
      {component}
    </OnboardingProvider>
  )
}

describe('Onboarding End-to-End Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fetch).mockClear()
    mockPush.mockClear()
    mockReplace.mockClear()
    mockBack.mockClear()
    mockLocalStorage.getItem.mockClear()
    mockLocalStorage.setItem.mockClear()
  })

  describe('Complete User Journeys', () => {
    it('should complete onboarding as SME seeking healthcare grants', async () => {
      const user = userEvent.setup()

      // Mock successful API responses
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            organization: {
              id: 'org-123',
              name: 'HealthTech Solutions',
              orgType: 'SME',
              size: 'Small',
              country: 'United States',
              region: 'California'
            }
          })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            user: { id: 'user-123', role: 'seeker' }
          })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            preferences: {
              id: 'pref-123',
              categories: ['healthcare', 'technology']
            }
          })
        } as Response)

      // Step 1: Organization Profile
      const { rerender } = renderWithProvider(<OrganizationPage />)

      // User fills out their SME information
      await user.type(screen.getByLabelText(/organization name/i), 'HealthTech Solutions')
      await user.click(screen.getByRole('combobox', { name: /organization type/i }))
      await user.click(screen.getByRole('option', { name: /sme/i }))
      await user.click(screen.getByRole('combobox', { name: /organization size/i }))
      await user.click(screen.getByRole('option', { name: /small/i }))
      await user.click(screen.getByRole('combobox', { name: /country/i }))
      await user.click(screen.getByRole('option', { name: /united states/i }))
      await user.type(screen.getByLabelText(/region/i), 'California')

      // Submit organization form
      await user.click(screen.getByRole('button', { name: /continue to role selection/i }))

      // Verify API call
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/onboarding/organization', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'HealthTech Solutions',
            orgType: 'SME',
            size: 'Small',
            country: 'United States',
            region: 'California'
          })
        })
      })

      // Step 2: Role Selection
      rerender(<RolePage />)

      // User selects seeker role
      expect(screen.getByText('Grant Seeker')).toBeInTheDocument()
      expect(screen.getByText('Find grants for your organization')).toBeInTheDocument()
      
      await user.click(screen.getByRole('radio', { name: /grant seeker/i }))
      await user.click(screen.getByRole('button', { name: /continue to preferences/i }))

      // Verify role API call
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/onboarding/role', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: 'seeker' })
        })
      })

      // Step 3: Preferences
      rerender(<PreferencesPage />)

      // User selects healthcare and technology categories
      expect(screen.getByText('Select Your Interests')).toBeInTheDocument()
      
      await user.click(screen.getByRole('checkbox', { name: /healthcare & public health/i }))
      await user.click(screen.getByRole('checkbox', { name: /technology & innovation/i }))
      
      // Verify at least one category is selected
      expect(screen.getByRole('checkbox', { name: /healthcare & public health/i })).toBeChecked()
      expect(screen.getByRole('checkbox', { name: /technology & innovation/i })).toBeChecked()
      
      await user.click(screen.getByRole('button', { name: /complete setup/i }))

      // Verify preferences API call
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/onboarding/preferences', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            categories: ['healthcare', 'technology']
          })
        })
      })

      // Should redirect to seeker dashboard
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard/seeker')
      })
    })

    it('should complete onboarding as nonprofit seeking community grants', async () => {
      const user = userEvent.setup()

      // Mock API responses for nonprofit flow
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, organization: {} })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, user: { role: 'seeker' } })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, preferences: {} })
        } as Response)

      const { rerender } = renderWithProvider(<OrganizationPage />)

      // Nonprofit organization setup
      await user.type(screen.getByLabelText(/organization name/i), 'Community Action Network')
      await user.click(screen.getByRole('combobox', { name: /organization type/i }))
      await user.click(screen.getByRole('option', { name: /nonprofit/i }))
      await user.click(screen.getByRole('combobox', { name: /organization size/i }))
      await user.click(screen.getByRole('option', { name: /medium/i }))
      await user.click(screen.getByRole('combobox', { name: /country/i }))
      await user.click(screen.getByRole('option', { name: /canada/i }))
      await user.type(screen.getByLabelText(/region/i), 'Ontario')

      await user.click(screen.getByRole('button', { name: /continue to role selection/i }))

      // Role selection
      rerender(<RolePage />)
      await user.click(screen.getByRole('radio', { name: /grant seeker/i }))
      await user.click(screen.getByRole('button', { name: /continue to preferences/i }))

      // Preferences for community work
      rerender(<PreferencesPage />)
      await user.click(screen.getByRole('checkbox', { name: /community development/i }))
      await user.click(screen.getByRole('checkbox', { name: /human rights & governance/i }))
      await user.click(screen.getByRole('button', { name: /complete setup/i }))

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard/seeker')
      })
    })

    it('should complete onboarding as grant writer', async () => {
      const user = userEvent.setup()

      // Mock API responses for writer flow
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, organization: {} })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, user: { role: 'writer' } })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, preferences: {} })
        } as Response)

      const { rerender } = renderWithProvider(<OrganizationPage />)

      // Writer service organization
      await user.type(screen.getByLabelText(/organization name/i), 'Grant Writing Experts')
      await user.click(screen.getByRole('combobox', { name: /organization type/i }))
      await user.click(screen.getByRole('option', { name: /other/i }))
      await user.click(screen.getByRole('combobox', { name: /organization size/i }))
      await user.click(screen.getByRole('option', { name: /micro/i }))
      await user.click(screen.getByRole('combobox', { name: /country/i }))
      await user.click(screen.getByRole('option', { name: /united kingdom/i }))

      await user.click(screen.getByRole('button', { name: /continue to role selection/i }))

      // Writer role selection
      rerender(<RolePage />)
      expect(screen.getByText('Grant Writer')).toBeInTheDocument()
      expect(screen.getByText('Offer proposal writing services')).toBeInTheDocument()
      
      await user.click(screen.getByRole('radio', { name: /grant writer/i }))
      await user.click(screen.getByRole('button', { name: /continue to preferences/i }))

      // Writer preferences (areas of expertise)
      rerender(<PreferencesPage />)
      await user.click(screen.getByRole('checkbox', { name: /education & training/i }))
      await user.click(screen.getByRole('checkbox', { name: /arts & culture/i }))
      await user.click(screen.getByRole('checkbox', { name: /women & youth empowerment/i }))
      await user.click(screen.getByRole('button', { name: /complete setup/i }))

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard/writer')
      })
    })
  })

  describe('Error Recovery Scenarios', () => {
    it('should recover from network errors gracefully', async () => {
      const user = userEvent.setup()

      // Mock network failure then success
      vi.mocked(fetch)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, organization: {} })
        } as Response)

      renderWithProvider(<OrganizationPage />)

      // Fill form
      await user.type(screen.getByLabelText(/organization name/i), 'Resilient Org')
      await user.click(screen.getByRole('combobox', { name: /organization type/i }))
      await user.click(screen.getByRole('option', { name: /sme/i }))
      await user.click(screen.getByRole('combobox', { name: /organization size/i }))
      await user.click(screen.getByRole('option', { name: /small/i }))
      await user.click(screen.getByRole('combobox', { name: /country/i }))
      await user.click(screen.getByRole('option', { name: /united states/i }))

      // First submission fails
      await user.click(screen.getByRole('button', { name: /continue to role selection/i }))

      // Should show error
      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument()
      })

      // Retry should work
      await user.click(screen.getByRole('button', { name: /continue to role selection/i }))

      // Should succeed on retry
      await waitFor(() => {
        expect(screen.queryByText(/network error/i)).not.toBeInTheDocument()
      })
    })

    it('should handle session expiry during onboarding', async () => {
      const user = userEvent.setup()

      // Mock session expiry
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          error: 'Unauthorized',
          code: 'AUTH_ERROR'
        })
      } as Response)

      renderWithProvider(<OrganizationPage />)

      // Fill and submit form
      await user.type(screen.getByLabelText(/organization name/i), 'Session Test Org')
      await user.click(screen.getByRole('combobox', { name: /organization type/i }))
      await user.click(screen.getByRole('option', { name: /sme/i }))
      await user.click(screen.getByRole('combobox', { name: /organization size/i }))
      await user.click(screen.getByRole('option', { name: /small/i }))
      await user.click(screen.getByRole('combobox', { name: /country/i }))
      await user.click(screen.getByRole('option', { name: /united states/i }))

      await user.click(screen.getByRole('button', { name: /continue to role selection/i }))

      // Should show auth error
      await waitFor(() => {
        expect(screen.getByText('Unauthorized')).toBeInTheDocument()
      })

      // Could redirect to login (would be tested in integration)
    })
  })

  describe('Data Persistence and Recovery', () => {
    it('should persist form data across page refreshes', async () => {
      const user = userEvent.setup()

      // Mock localStorage to return saved data
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify({
        organization: {
          name: 'Saved Organization',
          orgType: 'Healthcare',
          size: 'Large',
          country: 'Canada'
        }
      }))

      renderWithProvider(<OrganizationPage />)

      // Should restore saved data
      expect(screen.getByDisplayValue('Saved Organization')).toBeInTheDocument()
      
      // Verify localStorage was called
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('onboarding-data')
    })

    it('should save form data as user types', async () => {
      const user = userEvent.setup()

      renderWithProvider(<OrganizationPage />)

      // Type in form
      await user.type(screen.getByLabelText(/organization name/i), 'Auto Save Org')

      // Should save to localStorage
      await waitFor(() => {
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
          'onboarding-data',
          expect.stringContaining('Auto Save Org')
        )
      })
    })
  })

  describe('Accessibility in Real Usage', () => {
    it('should support complete keyboard navigation', async () => {
      const user = userEvent.setup()

      renderWithProvider(<OrganizationPage />)

      // Tab through all form elements
      await user.tab() // Organization name
      expect(screen.getByLabelText(/organization name/i)).toHaveFocus()

      await user.tab() // Organization type
      expect(screen.getByRole('combobox', { name: /organization type/i })).toHaveFocus()

      await user.tab() // Organization size
      expect(screen.getByRole('combobox', { name: /organization size/i })).toHaveFocus()

      await user.tab() // Country
      expect(screen.getByRole('combobox', { name: /country/i })).toHaveFocus()

      await user.tab() // Region
      expect(screen.getByLabelText(/region/i)).toHaveFocus()

      await user.tab() // Continue button
      expect(screen.getByRole('button', { name: /continue to role selection/i })).toHaveFocus()
    })

    it('should announce form errors to screen readers', async () => {
      const user = userEvent.setup()

      renderWithProvider(<OrganizationPage />)

      // Submit empty form
      await user.click(screen.getByRole('button', { name: /continue to role selection/i }))

      // Error messages should be properly associated
      await waitFor(() => {
        const nameInput = screen.getByLabelText(/organization name/i)
        const errorMessage = screen.getByText('Organization name must be at least 2 characters')
        
        expect(nameInput).toHaveAttribute('aria-invalid', 'true')
        expect(nameInput).toHaveAttribute('aria-describedby')
        expect(errorMessage).toHaveAttribute('role', 'alert')
      })
    })
  })

  describe('Mobile Experience', () => {
    it('should work on mobile viewport', async () => {
      const user = userEvent.setup()

      // Simulate mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 375 })
      Object.defineProperty(window, 'innerHeight', { value: 667 })

      renderWithProvider(<OrganizationPage />)

      // Form should be usable on mobile
      const nameInput = screen.getByLabelText(/organization name/i)
      expect(nameInput).toBeVisible()

      // Touch interactions should work
      await user.type(nameInput, 'Mobile Test Org')
      expect(screen.getByDisplayValue('Mobile Test Org')).toBeInTheDocument()

      // Buttons should be touch-friendly (minimum 44px)
      const continueButton = screen.getByRole('button', { name: /continue to role selection/i })
      const buttonRect = continueButton.getBoundingClientRect()
      expect(buttonRect.height).toBeGreaterThanOrEqual(44)
    })
  })
})