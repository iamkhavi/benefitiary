import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { OnboardingProvider } from '@/components/onboarding/onboarding-context'
import OrganizationPage from '@/app/onboarding/organization/page'
import RolePage from '@/app/onboarding/role/page'
import PreferencesPage from '@/app/onboarding/preferences/page'

// Mock fetch
global.fetch = vi.fn()

// Mock next/navigation
const mockPush = vi.fn()
const mockReplace = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    back: vi.fn()
  })
}))

// Mock auth
vi.mock('@/lib/auth-client', () => ({
  authClient: {
    useSession: () => ({
      data: { user: { id: 'user-123' } },
      isPending: false
    })
  }
}))

const renderWithProvider = (component: React.ReactNode) => {
  return render(
    <OnboardingProvider>
      {component}
    </OnboardingProvider>
  )
}

describe('Onboarding Flow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fetch).mockClear()
    mockPush.mockClear()
    mockReplace.mockClear()
  })

  describe('Complete Onboarding Flow', () => {
    it('should complete full onboarding flow for seeker role', async () => {
      const user = userEvent.setup()

      // Mock API responses
      vi.mocked(fetch)
        .mockResolvedValueOnce({
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

      // Fill organization form
      await user.type(screen.getByLabelText(/organization name/i), 'Test Organization')
      await user.click(screen.getByRole('combobox', { name: /organization type/i }))
      await user.click(screen.getByRole('option', { name: /sme/i }))
      await user.click(screen.getByRole('combobox', { name: /organization size/i }))
      await user.click(screen.getByRole('option', { name: /small/i }))
      await user.click(screen.getByRole('combobox', { name: /country/i }))
      await user.click(screen.getByRole('option', { name: /united states/i }))
      await user.type(screen.getByLabelText(/region/i), 'California')

      // Submit organization form
      await user.click(screen.getByRole('button', { name: /continue to role selection/i }))

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/onboarding/organization', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Test Organization',
            orgType: 'SME',
            size: 'Small',
            country: 'United States',
            region: 'California'
          })
        })
      })

      // Step 2: Role Selection
      rerender(<RolePage />)

      // Select seeker role
      await user.click(screen.getByRole('radio', { name: /grant seeker/i }))
      await user.click(screen.getByRole('button', { name: /continue to preferences/i }))

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/onboarding/role', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: 'seeker' })
        })
      })

      // Step 3: Preferences
      rerender(<PreferencesPage />)

      // Select preferences
      await user.click(screen.getByRole('checkbox', { name: /healthcare/i }))
      await user.click(screen.getByRole('checkbox', { name: /technology/i }))
      await user.click(screen.getByRole('button', { name: /complete setup/i }))

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

    it('should complete full onboarding flow for writer role', async () => {
      const user = userEvent.setup()

      // Mock API responses
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, organization: {} })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            user: { id: 'user-123', role: 'writer' }
          })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, preferences: {} })
        } as Response)

      // Complete flow with writer role
      const { rerender } = renderWithProvider(<OrganizationPage />)

      // Organization step (minimal)
      await user.type(screen.getByLabelText(/organization name/i), 'Writer Services LLC')
      await user.click(screen.getByRole('combobox', { name: /organization type/i }))
      await user.click(screen.getByRole('option', { name: /other/i }))
      await user.click(screen.getByRole('combobox', { name: /organization size/i }))
      await user.click(screen.getByRole('option', { name: /solo/i }))
      await user.click(screen.getByRole('combobox', { name: /country/i }))
      await user.click(screen.getByRole('option', { name: /canada/i }))
      await user.click(screen.getByRole('button', { name: /continue to role selection/i }))

      // Role step
      rerender(<RolePage />)
      await user.click(screen.getByRole('radio', { name: /grant writer/i }))
      await user.click(screen.getByRole('button', { name: /continue to preferences/i }))

      // Preferences step
      rerender(<PreferencesPage />)
      await user.click(screen.getByRole('checkbox', { name: /education/i }))
      await user.click(screen.getByRole('button', { name: /complete setup/i }))

      // Should redirect to writer dashboard
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard/writer')
      })
    })

    it('should complete full onboarding flow for funder role', async () => {
      const user = userEvent.setup()

      // Mock API responses
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, organization: {} })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            user: { id: 'user-123', role: 'funder' }
          })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, preferences: {} })
        } as Response)

      // Complete flow with funder role
      const { rerender } = renderWithProvider(<OrganizationPage />)

      // Organization step
      await user.type(screen.getByLabelText(/organization name/i), 'Foundation for Good')
      await user.click(screen.getByRole('combobox', { name: /organization type/i }))
      await user.click(screen.getByRole('option', { name: /nonprofit/i }))
      await user.click(screen.getByRole('combobox', { name: /organization size/i }))
      await user.click(screen.getByRole('option', { name: /large/i }))
      await user.click(screen.getByRole('combobox', { name: /country/i }))
      await user.click(screen.getByRole('option', { name: /united kingdom/i }))
      await user.click(screen.getByRole('button', { name: /continue to role selection/i }))

      // Role step
      rerender(<RolePage />)
      await user.click(screen.getByRole('radio', { name: /funder/i }))
      await user.click(screen.getByRole('button', { name: /continue to preferences/i }))

      // Preferences step
      rerender(<PreferencesPage />)
      await user.click(screen.getByRole('checkbox', { name: /community/i }))
      await user.click(screen.getByRole('checkbox', { name: /human_rights/i }))
      await user.click(screen.getByRole('button', { name: /complete setup/i }))

      // Should redirect to funder dashboard
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard/funder')
      })
    })
  })

  describe('Error Handling in Flow', () => {
    it('should handle API errors gracefully during flow', async () => {
      const user = userEvent.setup()

      // Mock organization API to fail
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: 'Database connection failed',
          code: 'DATABASE_ERROR'
        })
      } as Response)

      renderWithProvider(<OrganizationPage />)

      // Fill and submit organization form
      await user.type(screen.getByLabelText(/organization name/i), 'Test Org')
      await user.click(screen.getByRole('combobox', { name: /organization type/i }))
      await user.click(screen.getByRole('option', { name: /sme/i }))
      await user.click(screen.getByRole('combobox', { name: /organization size/i }))
      await user.click(screen.getByRole('option', { name: /small/i }))
      await user.click(screen.getByRole('combobox', { name: /country/i }))
      await user.click(screen.getByRole('option', { name: /united states/i }))
      await user.click(screen.getByRole('button', { name: /continue to role selection/i }))

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText('Database connection failed')).toBeInTheDocument()
      })

      // Should not proceed to next step
      expect(mockPush).not.toHaveBeenCalled()
    })

    it('should handle validation errors during flow', async () => {
      const user = userEvent.setup()

      // Mock role API to return validation error
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, organization: {} })
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({
            error: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: {
              role: ['Invalid role selected']
            }
          })
        } as Response)

      const { rerender } = renderWithProvider(<OrganizationPage />)

      // Complete organization step
      await user.type(screen.getByLabelText(/organization name/i), 'Test Org')
      await user.click(screen.getByRole('combobox', { name: /organization type/i }))
      await user.click(screen.getByRole('option', { name: /sme/i }))
      await user.click(screen.getByRole('combobox', { name: /organization size/i }))
      await user.click(screen.getByRole('option', { name: /small/i }))
      await user.click(screen.getByRole('combobox', { name: /country/i }))
      await user.click(screen.getByRole('option', { name: /united states/i }))
      await user.click(screen.getByRole('button', { name: /continue to role selection/i }))

      // Move to role step
      rerender(<RolePage />)
      await user.click(screen.getByRole('radio', { name: /grant seeker/i }))
      await user.click(screen.getByRole('button', { name: /continue to preferences/i }))

      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText('Invalid role selected')).toBeInTheDocument()
      })
    })
  })

  describe('Data Persistence', () => {
    it('should persist form data between steps', async () => {
      const user = userEvent.setup()

      // Mock successful API responses
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true })
      } as Response)

      const { rerender } = renderWithProvider(<OrganizationPage />)

      // Fill organization form
      await user.type(screen.getByLabelText(/organization name/i), 'Persistent Org')
      await user.click(screen.getByRole('combobox', { name: /organization type/i }))
      await user.click(screen.getByRole('option', { name: /healthcare/i }))

      // Move to role step
      rerender(<RolePage />)
      await user.click(screen.getByRole('radio', { name: /grant seeker/i }))

      // Go back to organization step
      await user.click(screen.getByRole('button', { name: /back/i }))
      rerender(<OrganizationPage />)

      // Data should be preserved
      expect(screen.getByDisplayValue('Persistent Org')).toBeInTheDocument()
      // Note: Select values would need to be checked differently in a real implementation
    })
  })

  describe('Navigation', () => {
    it('should allow navigation between steps', async () => {
      const user = userEvent.setup()

      const { rerender } = renderWithProvider(<RolePage />)

      // Should show back button on step 2
      expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument()

      // Move to preferences step
      rerender(<PreferencesPage />)

      // Should show back button on step 3
      expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument()
    })

    it('should not show back button on first step', () => {
      renderWithProvider(<OrganizationPage />)

      // Should not show back button on step 1
      expect(screen.queryByRole('button', { name: /back/i })).not.toBeInTheDocument()
    })
  })
})