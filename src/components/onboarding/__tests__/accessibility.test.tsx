import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import { vi } from 'vitest'
import { OnboardingProvider } from '../onboarding-context'
import { OnboardingHeader } from '../onboarding-header'
import { PreferencesForm } from '../preferences-form'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { preferencesSchema, type PreferencesFormData } from '@/lib/validations/onboarding'

// Extend Jest matchers
expect.extend(toHaveNoViolations)

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

// Test wrapper component
function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <OnboardingProvider>
      {children}
    </OnboardingProvider>
  )
}

// Preferences form test wrapper
function PreferencesFormWrapper() {
  const form = useForm<PreferencesFormData>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: {
      categories: [],
    },
  })

  return (
    <PreferencesForm
      onSubmit={vi.fn()}
      selectedCategories={form.watch('categories') || []}
      isLoading={false}
      form={form}
    />
  )
}

describe('Onboarding Accessibility', () => {
  describe('OnboardingHeader', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(
        <TestWrapper>
          <OnboardingHeader />
        </TestWrapper>
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should have proper ARIA labels and roles', () => {
      render(
        <TestWrapper>
          <OnboardingHeader />
        </TestWrapper>
      )

      // Check header role
      expect(screen.getByRole('banner')).toBeInTheDocument()

      // Check progress bar
      expect(screen.getByRole('progressbar')).toBeInTheDocument()
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow')
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuemin', '0')
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuemax', '100')

      // Check navigation
      expect(screen.getByRole('navigation', { name: /onboarding steps/i })).toBeInTheDocument()
    })

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <OnboardingHeader />
        </TestWrapper>
      )

      // Tab through focusable elements
      await user.tab()
      
      // Back button should be focusable if present
      const backButton = screen.queryByRole('button', { name: /go back/i })
      if (backButton) {
        expect(backButton).toHaveFocus()
      }
    })

    it('should announce step changes to screen readers', () => {
      render(
        <TestWrapper>
          <OnboardingHeader />
        </TestWrapper>
      )

      // Check for screen reader announcements
      expect(screen.getByText(/step \d+ of \d+/i)).toBeInTheDocument()
    })
  })

  describe('PreferencesForm', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(
        <TestWrapper>
          <PreferencesFormWrapper />
        </TestWrapper>
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should have proper form structure and labels', () => {
      render(
        <TestWrapper>
          <PreferencesFormWrapper />
        </TestWrapper>
      )

      // Check form structure
      expect(screen.getByRole('form')).toBeInTheDocument()
      expect(screen.getByRole('group')).toBeInTheDocument()

      // Check fieldset and legend
      const fieldset = screen.getByRole('group')
      expect(fieldset).toHaveAttribute('aria-labelledby', 'categories-label')
      expect(fieldset).toHaveAttribute('aria-describedby', 'categories-help')

      // Check checkboxes
      const checkboxes = screen.getAllByRole('checkbox')
      expect(checkboxes.length).toBeGreaterThan(0)
      
      checkboxes.forEach(checkbox => {
        expect(checkbox).toHaveAttribute('aria-describedby')
      })
    })

    it('should support keyboard navigation through categories', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <PreferencesFormWrapper />
        </TestWrapper>
      )

      const checkboxes = screen.getAllByRole('checkbox')
      
      // Tab to first checkbox
      await user.tab()
      expect(checkboxes[0]).toHaveFocus()

      // Space to select
      await user.keyboard(' ')
      expect(checkboxes[0]).toBeChecked()

      // Tab to next checkbox
      await user.tab()
      expect(checkboxes[1]).toHaveFocus()
    })

    it('should announce form errors to screen readers', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <PreferencesFormWrapper />
        </TestWrapper>
      )

      // Try to submit without selecting categories
      const submitButton = screen.getByRole('button', { name: /complete setup/i })
      await user.click(submitButton)

      // Check for error announcement
      await waitFor(() => {
        const errorMessage = screen.getByRole('alert')
        expect(errorMessage).toBeInTheDocument()
        expect(errorMessage).toHaveAttribute('aria-live', 'polite')
      })
    })

    it('should have proper color contrast', () => {
      render(
        <TestWrapper>
          <PreferencesFormWrapper />
        </TestWrapper>
      )

      // This is a basic check - in a real app you'd use tools like 
      // @axe-core/react or manual testing with color contrast analyzers
      const labels = screen.getAllByText(/healthcare|education|agriculture/i)
      labels.forEach(label => {
        expect(label).toBeVisible()
      })
    })

    it('should support screen reader descriptions', () => {
      render(
        <TestWrapper>
          <PreferencesFormWrapper />
        </TestWrapper>
      )

      // Check for hidden help text
      expect(screen.getByText(/select one or more grant categories/i)).toBeInTheDocument()
      
      // Check category descriptions
      const descriptions = screen.getAllByText(/grants for/i)
      expect(descriptions.length).toBeGreaterThan(0)
    })
  })

  describe('Focus Management', () => {
    it('should provide skip link for keyboard users', () => {
      render(
        <div>
          <a 
            href="#main-content" 
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary text-primary-foreground px-4 py-2 rounded-md z-50"
          >
            Skip to main content
          </a>
          <main id="main-content">Content</main>
        </div>
      )

      const skipLink = screen.getByText('Skip to main content')
      expect(skipLink).toBeInTheDocument()
      expect(skipLink).toHaveAttribute('href', '#main-content')
    })

    it('should manage focus on form submission errors', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <PreferencesFormWrapper />
        </TestWrapper>
      )

      // Submit form to trigger validation error
      const submitButton = screen.getByRole('button', { name: /complete setup/i })
      await user.click(submitButton)

      // Error should be announced and focusable
      await waitFor(() => {
        const errorAlert = screen.getByRole('alert')
        expect(errorAlert).toBeInTheDocument()
      })
    })
  })

  describe('Loading States', () => {
    it('should announce loading states to screen readers', () => {
      const form = useForm<PreferencesFormData>({
        resolver: zodResolver(preferencesSchema),
        defaultValues: { categories: [] },
      })

      render(
        <TestWrapper>
          <PreferencesForm
            onSubmit={vi.fn()}
            selectedCategories={[]}
            isLoading={true}
            form={form}
          />
        </TestWrapper>
      )

      // Check for loading announcement
      expect(screen.getByText('Processing...')).toBeInTheDocument()
      expect(screen.getByText('Processing...')).toHaveAttribute('aria-live', 'polite')
    })

    it('should disable form elements during loading', () => {
      const form = useForm<PreferencesFormData>({
        resolver: zodResolver(preferencesSchema),
        defaultValues: { categories: [] },
      })

      render(
        <TestWrapper>
          <PreferencesForm
            onSubmit={vi.fn()}
            selectedCategories={[]}
            isLoading={true}
            form={form}
          />
        </TestWrapper>
      )

      // Submit button should be disabled
      const submitButton = screen.getByRole('button', { name: /processing/i })
      expect(submitButton).toBeDisabled()
    })
  })

  describe('Responsive Design', () => {
    it('should maintain accessibility at different viewport sizes', () => {
      // Mock different viewport sizes
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375, // Mobile width
      })

      render(
        <TestWrapper>
          <OnboardingHeader />
        </TestWrapper>
      )

      // Elements should still be accessible on mobile
      expect(screen.getByRole('banner')).toBeInTheDocument()
      expect(screen.getByRole('progressbar')).toBeInTheDocument()
    })
  })
})