import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import { runAccessibilityTestSuite } from '@/test/accessibility-utils'
import OrganizationPage from '../onboarding/organization/page'
import RolePage from '../onboarding/role/page'
import PreferencesPage from '../onboarding/preferences/page'
import OnboardingLayout from '../onboarding/layout'

// Extend Jest matchers
expect.extend(toHaveNoViolations)

import { vi } from 'vitest'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn(),
  }),
}))

// Mock fetch for API calls
global.fetch = vi.fn()

describe('Onboarding Flow Accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    })
  })

  describe('Organization Page Accessibility', () => {
    it('should pass comprehensive accessibility tests', async () => {
      await runAccessibilityTestSuite(
        <OnboardingLayout>
          <OrganizationPage />
        </OnboardingLayout>,
        {
          testKeyboard: true,
          testScreenReader: true,
          testFocus: true,
          testResponsive: true,
          expectedFocusableElements: [
            'input[name="name"]',
            'button[role="combobox"]', // Organization type select
            'button[role="combobox"]', // Size select
            'button[role="combobox"]', // Country select
            'input[name="region"]',
            'button[type="button"]', // Back button
            'button[type="submit"]', // Continue button
          ],
        }
      )
    })

    it('should have proper form validation accessibility', async () => {
      const user = userEvent.setup()
      
      render(
        <OnboardingLayout>
          <OrganizationPage />
        </OnboardingLayout>
      )

      // Try to submit empty form
      const submitButton = screen.getByRole('button', { name: /continue to role selection/i })
      await user.click(submitButton)

      // Check for validation errors with proper ARIA
      await waitFor(() => {
        const nameInput = screen.getByLabelText(/organization name/i)
        expect(nameInput).toHaveAttribute('aria-invalid', 'true')
        expect(nameInput).toHaveAttribute('aria-describedby')
      })
    })

    it('should support keyboard navigation through form fields', async () => {
      const user = userEvent.setup()
      
      render(
        <OnboardingLayout>
          <OrganizationPage />
        </OnboardingLayout>
      )

      // Tab through form fields
      await user.tab() // Skip link
      await user.tab() // Name input
      
      const nameInput = screen.getByLabelText(/organization name/i)
      expect(nameInput).toHaveFocus()

      // Continue tabbing through selects
      await user.tab()
      const orgTypeSelect = screen.getByRole('combobox', { name: /organization type/i })
      expect(orgTypeSelect).toHaveFocus()
    })

    it('should announce field requirements to screen readers', () => {
      render(
        <OnboardingLayout>
          <OrganizationPage />
        </OnboardingLayout>
      )

      // Check for required field indicators
      const requiredFields = screen.getAllByText(/\*/i)
      expect(requiredFields.length).toBeGreaterThan(0)

      // Check for aria-required attributes
      const nameInput = screen.getByLabelText(/organization name/i)
      expect(nameInput).toHaveAttribute('aria-required', 'true')
    })
  })

  describe('Role Page Accessibility', () => {
    it('should pass comprehensive accessibility tests', async () => {
      await runAccessibilityTestSuite(
        <OnboardingLayout>
          <RolePage />
        </OnboardingLayout>,
        {
          testKeyboard: true,
          testScreenReader: true,
          testFocus: true,
          expectedFocusableElements: [
            'input[type="radio"]',
            'button[type="button"]', // Back button
            'button[type="submit"]', // Continue button
          ],
        }
      )
    })

    it('should have proper radio group accessibility', () => {
      render(
        <OnboardingLayout>
          <RolePage />
        </OnboardingLayout>
      )

      // Check for radio group
      const radioGroup = screen.getByRole('radiogroup')
      expect(radioGroup).toBeInTheDocument()
      expect(radioGroup).toHaveAttribute('aria-labelledby')
      expect(radioGroup).toHaveAttribute('aria-required', 'true')

      // Check individual radio buttons
      const radioButtons = screen.getAllByRole('radio')
      expect(radioButtons.length).toBe(3) // seeker, writer, funder

      radioButtons.forEach(radio => {
        expect(radio).toHaveAttribute('aria-describedby')
      })
    })

    it('should support keyboard navigation through role options', async () => {
      const user = userEvent.setup()
      
      render(
        <OnboardingLayout>
          <RolePage />
        </OnboardingLayout>
      )

      const radioButtons = screen.getAllByRole('radio')
      
      // Tab to first radio button
      await user.tab() // Skip link
      await user.tab() // First radio
      expect(radioButtons[0]).toHaveFocus()

      // Arrow keys should navigate between radio buttons
      await user.keyboard('{ArrowDown}')
      expect(radioButtons[1]).toHaveFocus()

      await user.keyboard('{ArrowDown}')
      expect(radioButtons[2]).toHaveFocus()

      // Space should select
      await user.keyboard(' ')
      expect(radioButtons[2]).toBeChecked()
    })
  })

  describe('Preferences Page Accessibility', () => {
    it('should pass comprehensive accessibility tests', async () => {
      await runAccessibilityTestSuite(
        <OnboardingLayout>
          <PreferencesPage />
        </OnboardingLayout>,
        {
          testKeyboard: true,
          testScreenReader: true,
          testFocus: true,
          expectedFocusableElements: [
            'input[type="checkbox"]',
            'button[type="button"]', // Back button
            'button[type="submit"]', // Complete button
          ],
        }
      )
    })

    it('should have proper checkbox group accessibility', () => {
      render(
        <OnboardingLayout>
          <PreferencesPage />
        </OnboardingLayout>
      )

      // Check for fieldset with proper labeling
      const fieldset = screen.getByRole('group')
      expect(fieldset).toHaveAttribute('aria-labelledby')
      expect(fieldset).toHaveAttribute('aria-describedby')

      // Check checkboxes
      const checkboxes = screen.getAllByRole('checkbox')
      expect(checkboxes.length).toBeGreaterThan(0)

      checkboxes.forEach(checkbox => {
        expect(checkbox).toHaveAttribute('aria-describedby')
      })
    })

    it('should support multi-selection with keyboard', async () => {
      const user = userEvent.setup()
      
      render(
        <OnboardingLayout>
          <PreferencesPage />
        </OnboardingLayout>
      )

      const checkboxes = screen.getAllByRole('checkbox')
      
      // Tab to first checkbox
      await user.tab() // Skip link
      await user.tab() // First checkbox
      expect(checkboxes[0]).toHaveFocus()

      // Space to select
      await user.keyboard(' ')
      expect(checkboxes[0]).toBeChecked()

      // Tab to next checkbox
      await user.tab()
      expect(checkboxes[1]).toHaveFocus()

      // Select multiple
      await user.keyboard(' ')
      expect(checkboxes[1]).toBeChecked()
      expect(checkboxes[0]).toBeChecked() // Previous selection should remain
    })

    it('should validate minimum selection requirement', async () => {
      const user = userEvent.setup()
      
      render(
        <OnboardingLayout>
          <PreferencesPage />
        </OnboardingLayout>
      )

      // Try to submit without selections
      const submitButton = screen.getByRole('button', { name: /complete setup/i })
      expect(submitButton).toBeDisabled()

      // Select a category
      const firstCheckbox = screen.getAllByRole('checkbox')[0]
      await user.click(firstCheckbox)

      // Submit button should now be enabled
      expect(submitButton).not.toBeDisabled()
    })
  })

  describe('Overall Layout Accessibility', () => {
    it('should have proper landmark structure', () => {
      render(
        <OnboardingLayout>
          <div>Test content</div>
        </OnboardingLayout>
      )

      // Check for proper landmarks
      expect(screen.getByRole('banner')).toBeInTheDocument() // Header
      expect(screen.getByRole('main')).toBeInTheDocument() // Main content
      expect(screen.getByRole('navigation', { name: /onboarding steps/i })).toBeInTheDocument()
    })

    it('should provide skip link for keyboard users', async () => {
      const user = userEvent.setup()
      
      render(
        <OnboardingLayout>
          <div>Test content</div>
        </OnboardingLayout>
      )

      // Tab to skip link
      await user.tab()
      const skipLink = screen.getByText('Skip to main content')
      expect(skipLink).toHaveFocus()
      expect(skipLink).toHaveAttribute('href', '#main-content')
    })

    it('should announce step changes', () => {
      render(
        <OnboardingLayout>
          <div>Test content</div>
        </OnboardingLayout>
      )

      // Check for accessibility announcer
      const announcer = document.querySelector('[aria-live="polite"][role="status"]')
      expect(announcer).toBeInTheDocument()
    })

    it('should have proper heading hierarchy', () => {
      render(
        <OnboardingLayout>
          <OrganizationPage />
        </OnboardingLayout>
      )

      // Check heading structure
      const h1 = screen.getByRole('heading', { level: 1 })
      expect(h1).toBeInTheDocument()

      const h2 = screen.getByRole('heading', { level: 2 })
      expect(h2).toBeInTheDocument()
    })
  })

  describe('Error Handling Accessibility', () => {
    it('should announce API errors to screen readers', async () => {
      const user = userEvent.setup()
      
      // Mock API error
      ;(global.fetch as any).mockRejectedValueOnce(new Error('Network error'))
      
      render(
        <OnboardingLayout>
          <OrganizationPage />
        </OnboardingLayout>
      )

      // Fill form and submit
      const nameInput = screen.getByLabelText(/organization name/i)
      await user.type(nameInput, 'Test Organization')

      const submitButton = screen.getByRole('button', { name: /continue/i })
      await user.click(submitButton)

      // Check for error announcement
      await waitFor(() => {
        const errorAlert = screen.getByRole('alert')
        expect(errorAlert).toBeInTheDocument()
        expect(errorAlert).toHaveAttribute('aria-live', 'assertive')
      })
    })

    it('should focus first error field on validation failure', async () => {
      const user = userEvent.setup()
      
      render(
        <OnboardingLayout>
          <OrganizationPage />
        </OnboardingLayout>
      )

      // Submit empty form
      const submitButton = screen.getByRole('button', { name: /continue/i })
      await user.click(submitButton)

      // First invalid field should receive focus
      await waitFor(() => {
        const nameInput = screen.getByLabelText(/organization name/i)
        expect(nameInput).toHaveAttribute('aria-invalid', 'true')
      })
    })
  })

  describe('Loading States Accessibility', () => {
    it('should announce loading states', async () => {
      const user = userEvent.setup()
      
      // Mock slow API response
      ;(global.fetch as any).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve({ success: true })
        }), 100))
      )
      
      render(
        <OnboardingLayout>
          <OrganizationPage />
        </OnboardingLayout>
      )

      // Fill and submit form
      const nameInput = screen.getByLabelText(/organization name/i)
      await user.type(nameInput, 'Test Organization')

      const submitButton = screen.getByRole('button', { name: /continue/i })
      await user.click(submitButton)

      // Check for loading state
      expect(screen.getByText(/saving/i)).toBeInTheDocument()
      expect(submitButton).toBeDisabled()

      // Check for aria-live announcement
      const loadingText = screen.getByText(/saving/i)
      expect(loadingText).toHaveAttribute('aria-live', 'polite')
    })
  })
})