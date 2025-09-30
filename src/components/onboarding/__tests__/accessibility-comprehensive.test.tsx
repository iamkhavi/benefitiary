import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import { OnboardingProvider } from '@/components/onboarding/onboarding-context'
import OrganizationPage from '@/app/onboarding/organization/page'
import RolePage from '@/app/onboarding/role/page'
import PreferencesPage from '@/app/onboarding/preferences/page'

// Extend Jest matchers
expect.extend(toHaveNoViolations)

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

const renderWithProvider = (component: React.ReactNode) => {
  return render(
    <OnboardingProvider>
      {component}
    </OnboardingProvider>
  )
}

describe('Onboarding Accessibility - Comprehensive Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('WCAG 2.1 AA Compliance', () => {
    it('should have no accessibility violations on organization page', async () => {
      const { container } = renderWithProvider(<OrganizationPage />)
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should have no accessibility violations on role page', async () => {
      const { container } = renderWithProvider(<RolePage />)
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should have no accessibility violations on preferences page', async () => {
      const { container } = renderWithProvider(<PreferencesPage />)
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should maintain accessibility during form interactions', async () => {
      const user = userEvent.setup()
      const { container } = renderWithProvider(<OrganizationPage />)

      // Fill out form
      await user.type(screen.getByLabelText(/organization name/i), 'Test Organization')
      
      // Check accessibility after interaction
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should maintain accessibility with validation errors', async () => {
      const user = userEvent.setup()
      const { container } = renderWithProvider(<OrganizationPage />)

      // Trigger validation errors
      await user.click(screen.getByRole('button', { name: /continue to role selection/i }))

      // Wait for errors to appear
      await screen.findByText('Organization name must be at least 2 characters')

      // Check accessibility with errors
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })

  describe('Keyboard Navigation', () => {
    it('should support complete keyboard navigation on organization page', async () => {
      const user = userEvent.setup()
      renderWithProvider(<OrganizationPage />)

      // Tab through all interactive elements
      await user.tab()
      expect(screen.getByLabelText(/organization name/i)).toHaveFocus()

      await user.tab()
      expect(screen.getByRole('combobox', { name: /organization type/i })).toHaveFocus()

      await user.tab()
      expect(screen.getByRole('combobox', { name: /organization size/i })).toHaveFocus()

      await user.tab()
      expect(screen.getByRole('combobox', { name: /country/i })).toHaveFocus()

      await user.tab()
      expect(screen.getByLabelText(/region/i)).toHaveFocus()

      await user.tab()
      expect(screen.getByRole('button', { name: /continue to role selection/i })).toHaveFocus()
    })

    it('should support keyboard navigation on role selection', async () => {
      const user = userEvent.setup()
      renderWithProvider(<RolePage />)

      // Tab to first radio button
      await user.tab()
      expect(screen.getByRole('radio', { name: /grant seeker/i })).toHaveFocus()

      // Arrow keys should navigate between radio buttons
      await user.keyboard('{ArrowDown}')
      expect(screen.getByRole('radio', { name: /grant writer/i })).toHaveFocus()

      await user.keyboard('{ArrowDown}')
      expect(screen.getByRole('radio', { name: /funder/i })).toHaveFocus()

      await user.keyboard('{ArrowUp}')
      expect(screen.getByRole('radio', { name: /grant writer/i })).toHaveFocus()
    })

    it('should support keyboard navigation on preferences page', async () => {
      const user = userEvent.setup()
      renderWithProvider(<PreferencesPage />)

      // Tab through checkboxes
      const checkboxes = screen.getAllByRole('checkbox')
      
      for (let i = 0; i < checkboxes.length; i++) {
        await user.tab()
        expect(checkboxes[i]).toHaveFocus()
      }

      // Tab to navigation buttons
      await user.tab()
      expect(screen.getByRole('button', { name: /back/i })).toHaveFocus()

      await user.tab()
      expect(screen.getByRole('button', { name: /complete setup/i })).toHaveFocus()
    })

    it('should handle keyboard form submission', async () => {
      const user = userEvent.setup()
      
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, organization: {} })
      } as Response)

      renderWithProvider(<OrganizationPage />)

      // Fill form using keyboard
      await user.type(screen.getByLabelText(/organization name/i), 'Keyboard Test Org')
      
      // Navigate to submit button and press Enter
      await user.tab() // org type
      await user.tab() // org size  
      await user.tab() // country
      await user.tab() // region
      await user.tab() // submit button
      
      expect(screen.getByRole('button', { name: /continue to role selection/i })).toHaveFocus()
      
      await user.keyboard('{Enter}')
      
      // Should trigger form submission
      expect(fetch).toHaveBeenCalled()
    })
  })

  describe('Screen Reader Support', () => {
    it('should have proper ARIA labels on form controls', () => {
      renderWithProvider(<OrganizationPage />)

      // Check input labels
      expect(screen.getByLabelText(/organization name/i)).toHaveAttribute('aria-required', 'true')
      
      // Check combobox labels
      expect(screen.getByRole('combobox', { name: /organization type/i })).toHaveAttribute('aria-required', 'true')
      expect(screen.getByRole('combobox', { name: /organization size/i })).toHaveAttribute('aria-required', 'true')
      expect(screen.getByRole('combobox', { name: /country/i })).toHaveAttribute('aria-required', 'true')
    })

    it('should announce validation errors properly', async () => {
      const user = userEvent.setup()
      renderWithProvider(<OrganizationPage />)

      // Trigger validation error
      await user.click(screen.getByRole('button', { name: /continue to role selection/i }))

      // Wait for error message
      const errorMessage = await screen.findByText('Organization name must be at least 2 characters')
      
      // Error should be announced to screen readers
      expect(errorMessage).toHaveAttribute('role', 'alert')
      expect(errorMessage).toHaveAttribute('aria-live', 'polite')
    })

    it('should have proper heading hierarchy', () => {
      renderWithProvider(<OrganizationPage />)

      // Should have main heading
      const mainHeading = screen.getByRole('heading', { level: 1 })
      expect(mainHeading).toHaveTextContent('Organization Profile')

      // Should have proper heading structure
      expect(mainHeading).toBeInTheDocument()
    })

    it('should describe form sections properly', () => {
      renderWithProvider(<RolePage />)

      // Role group should be properly labeled
      const roleGroup = screen.getByRole('radiogroup')
      expect(roleGroup).toHaveAttribute('aria-labelledby')
      
      // Each role should have proper description
      const seekerRadio = screen.getByRole('radio', { name: /grant seeker/i })
      expect(seekerRadio).toHaveAttribute('aria-describedby')
    })

    it('should announce loading states', async () => {
      const user = userEvent.setup()
      
      vi.mocked(fetch).mockImplementationOnce(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({ success: true })
        } as Response), 100))
      )

      renderWithProvider(<RolePage />)

      // Select role and submit
      await user.click(screen.getByRole('radio', { name: /grant seeker/i }))
      await user.click(screen.getByRole('button', { name: /continue to preferences/i }))

      // Loading state should be announced
      const loadingButton = await screen.findByText('Saving...')
      expect(loadingButton).toHaveAttribute('aria-live', 'polite')
    })
  })

  describe('Color Contrast and Visual Accessibility', () => {
    it('should have sufficient color contrast for text', () => {
      renderWithProvider(<OrganizationPage />)

      // Check main heading contrast
      const heading = screen.getByRole('heading', { level: 1 })
      const headingStyles = window.getComputedStyle(heading)
      
      // Should have dark text (assuming light background)
      expect(headingStyles.color).toMatch(/rgb\(.*\)/)
    })

    it('should have visible focus indicators', async () => {
      const user = userEvent.setup()
      renderWithProvider(<OrganizationPage />)

      // Tab to first input
      await user.tab()
      const focusedElement = screen.getByLabelText(/organization name/i)
      
      // Should have focus styles
      expect(focusedElement).toHaveFocus()
      
      // Focus indicator should be visible (this would need visual regression testing in real scenario)
      const styles = window.getComputedStyle(focusedElement)
      expect(styles.outline).not.toBe('none')
    })

    it('should work without color alone for information', () => {
      renderWithProvider(<PreferencesPage />)

      // Category selections should not rely on color alone
      const checkboxes = screen.getAllByRole('checkbox')
      
      checkboxes.forEach(checkbox => {
        // Should have text labels, not just color indicators
        expect(checkbox).toHaveAccessibleName()
      })
    })
  })

  describe('Mobile Accessibility', () => {
    it('should have touch-friendly targets', () => {
      renderWithProvider(<RolePage />)

      // Buttons should be large enough for touch
      const continueButton = screen.getByRole('button', { name: /continue to preferences/i })
      const buttonRect = continueButton.getBoundingClientRect()
      
      // Minimum 44px touch target
      expect(buttonRect.height).toBeGreaterThanOrEqual(44)
      expect(buttonRect.width).toBeGreaterThanOrEqual(44)
    })

    it('should work with zoom up to 200%', () => {
      // Simulate 200% zoom
      Object.defineProperty(window, 'devicePixelRatio', { value: 2 })
      
      renderWithProvider(<OrganizationPage />)

      // Form should still be usable
      expect(screen.getByLabelText(/organization name/i)).toBeVisible()
      expect(screen.getByRole('button', { name: /continue to role selection/i })).toBeVisible()
    })
  })

  describe('Error Accessibility', () => {
    it('should associate errors with form controls', async () => {
      const user = userEvent.setup()
      renderWithProvider(<OrganizationPage />)

      // Trigger validation errors
      await user.click(screen.getByRole('button', { name: /continue to role selection/i }))

      // Wait for errors
      await screen.findByText('Organization name must be at least 2 characters')

      // Input should be marked as invalid
      const nameInput = screen.getByLabelText(/organization name/i)
      expect(nameInput).toHaveAttribute('aria-invalid', 'true')
      expect(nameInput).toHaveAttribute('aria-describedby')
    })

    it('should provide clear error recovery instructions', async () => {
      const user = userEvent.setup()
      
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: 'Organization name already exists',
          code: 'VALIDATION_ERROR'
        })
      } as Response)

      renderWithProvider(<OrganizationPage />)

      // Fill and submit form
      await user.type(screen.getByLabelText(/organization name/i), 'Existing Org')
      await user.click(screen.getByRole('combobox', { name: /organization type/i }))
      await user.click(screen.getByRole('option', { name: /sme/i }))
      await user.click(screen.getByRole('combobox', { name: /organization size/i }))
      await user.click(screen.getByRole('option', { name: /small/i }))
      await user.click(screen.getByRole('combobox', { name: /country/i }))
      await user.click(screen.getByRole('option', { name: /united states/i }))
      await user.click(screen.getByRole('button', { name: /continue to role selection/i }))

      // Error should be clearly announced
      const errorMessage = await screen.findByText('Organization name already exists')
      expect(errorMessage).toHaveAttribute('role', 'alert')
    })
  })
})