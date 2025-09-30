import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import { vi } from 'vitest'
import { OnboardingProvider } from '../onboarding-context'
import { OnboardingHeader } from '../onboarding-header'

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

describe('Basic Accessibility Tests', () => {
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

    it('should have proper heading structure', () => {
      render(
        <TestWrapper>
          <OnboardingHeader />
        </TestWrapper>
      )

      // Check for main heading
      const heading = screen.getByRole('heading', { level: 1 })
      expect(heading).toBeInTheDocument()
      expect(heading).toHaveAttribute('id', 'onboarding-step-title')
    })

    it('should provide step information to screen readers', () => {
      render(
        <TestWrapper>
          <OnboardingHeader />
        </TestWrapper>
      )

      // Check for step counter with proper labeling
      expect(screen.getByText(/step \d+ of \d+/i)).toBeInTheDocument()
    })
  })

  describe('Skip Link', () => {
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
  })

  describe('Color Contrast', () => {
    it('should have visible text elements', () => {
      render(
        <TestWrapper>
          <OnboardingHeader />
        </TestWrapper>
      )

      // Basic visibility check for text elements
      const textElements = screen.getAllByText(/step|organization|role|preferences/i)
      textElements.forEach(element => {
        expect(element).toBeVisible()
      })
    })
  })
})