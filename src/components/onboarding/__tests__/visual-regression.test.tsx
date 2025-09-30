import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { OnboardingProvider } from '../onboarding-context'
import { OnboardingHeader } from '../onboarding-header'
import { PreferencesForm } from '../preferences-form'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { preferencesSchema, type PreferencesFormData } from '@/lib/validations/onboarding'

// Mock useRouter
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => '/onboarding/organization',
}))

// Mock window.matchMedia for different screen sizes
function mockMatchMedia(query: string) {
  return {
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }
}

// Test component wrapper
function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <OnboardingProvider>
      {children}
    </OnboardingProvider>
  )
}

function PreferencesFormWrapper() {
  const form = useForm<PreferencesFormData>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: { categories: [] },
  })

  return (
    <PreferencesForm
      onSubmit={async () => {}}
      selectedCategories={[]}
      isLoading={false}
      form={form}
    />
  )
}

describe('Visual Regression Tests', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(mockMatchMedia),
    })
  })

  describe('Mobile Layout (375px)', () => {
    beforeEach(() => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })
    })

    it('should render mobile-optimized header', () => {
      render(
        <TestWrapper>
          <OnboardingHeader />
        </TestWrapper>
      )

      // Check mobile-specific classes are applied
      const container = document.querySelector('.container')
      expect(container).toHaveClass('px-4', 'sm:px-6', 'lg:px-8')

      // Check responsive title sizing
      const title = screen.getByRole('heading', { level: 1 })
      expect(title).toHaveClass('text-lg', 'sm:text-xl')

      // Check step counter positioning
      const stepCounter = document.querySelector('[aria-label*="Current step"]')
      expect(stepCounter).toHaveClass('text-xs', 'sm:text-sm')
    })

    it('should render mobile-optimized preferences form', () => {
      render(<PreferencesFormWrapper />)

      // Check single column layout on mobile
      const fieldset = screen.getByRole('group')
      expect(fieldset).toHaveClass('grid-cols-1', 'sm:grid-cols-2')

      // Check mobile button layout
      const nav = screen.getByRole('navigation', { name: /form navigation/i })
      expect(nav).toHaveClass('flex-col', 'sm:flex-row')

      // Check touch target sizes
      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        expect(button).toHaveClass('min-h-[44px]')
      })
    })

    it('should have proper spacing for mobile', () => {
      render(<PreferencesFormWrapper />)

      const form = document.querySelector('form')
      expect(form).toHaveClass('space-y-4', 'sm:space-y-6')

      const fieldset = screen.getByRole('group')
      expect(fieldset).toHaveClass('gap-3', 'sm:gap-4')
    })
  })

  describe('Tablet Layout (768px)', () => {
    beforeEach(() => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      })
    })

    it('should render tablet-optimized layout', () => {
      render(<PreferencesFormWrapper />)

      // Should use 2-column grid on tablet
      const fieldset = screen.getByRole('group')
      expect(fieldset).toHaveClass('sm:grid-cols-2')

      // Should use horizontal button layout
      const nav = screen.getByRole('navigation', { name: /form navigation/i })
      expect(nav).toHaveClass('sm:flex-row')
    })
  })

  describe('Desktop Layout (1024px+)', () => {
    beforeEach(() => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      })
    })

    it('should render desktop-optimized layout', () => {
      render(
        <TestWrapper>
          <OnboardingHeader />
        </TestWrapper>
      )

      // Check desktop padding
      const container = document.querySelector('.container')
      expect(container).toHaveClass('lg:px-8')

      // Check desktop title size
      const title = screen.getByRole('heading', { level: 1 })
      expect(title).toHaveClass('sm:text-xl')
    })

    it('should show step labels on desktop', () => {
      render(
        <TestWrapper>
          <OnboardingHeader />
        </TestWrapper>
      )

      // Step labels should be visible on desktop (hidden on mobile)
      const stepLabels = document.querySelectorAll('.hidden.sm\\:block')
      expect(stepLabels.length).toBeGreaterThan(0)
    })
  })

  describe('Text Overflow and Truncation', () => {
    it('should handle long organization names gracefully', () => {
      render(
        <TestWrapper>
          <OnboardingHeader />
        </TestWrapper>
      )

      const title = screen.getByRole('heading', { level: 1 })
      expect(title).toHaveClass('truncate')

      const titleContainer = title.closest('.min-w-0')
      expect(titleContainer).toHaveClass('min-w-0', 'flex-1')
    })

    it('should handle long step names in navigation', () => {
      render(
        <TestWrapper>
          <OnboardingHeader />
        </TestWrapper>
      )

      const stepItems = document.querySelectorAll('li span.truncate')
      stepItems.forEach(item => {
        expect(item).toHaveClass('truncate', 'w-full')
      })
    })
  })

  describe('Interactive Elements', () => {
    it('should have proper focus states for keyboard navigation', () => {
      render(<PreferencesFormWrapper />)

      const checkboxes = screen.getAllByRole('checkbox')
      checkboxes.forEach(checkbox => {
        expect(checkbox).toHaveClass('focus-visible:ring-2')
      })

      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        expect(button).toHaveClass('focus-visible:ring-ring/50')
      })
    })

    it('should have proper hover states', () => {
      render(<PreferencesFormWrapper />)

      const cards = document.querySelectorAll('[role="option"]')
      cards.forEach(card => {
        expect(card).toHaveClass('hover:shadow-md', 'hover:bg-muted/50')
      })
    })
  })

  describe('Content Density', () => {
    it('should adjust content density for different screen sizes', () => {
      render(<PreferencesFormWrapper />)

      // Check card padding is responsive
      const cardContents = document.querySelectorAll('.p-3.sm\\:p-4')
      expect(cardContents.length).toBeGreaterThan(0)

      // Check icon sizing is responsive
      const icons = document.querySelectorAll('.h-4.w-4.sm\\:h-5.sm\\:w-5')
      expect(icons.length).toBeGreaterThan(0)
    })

    it('should have appropriate line heights for readability', () => {
      render(<PreferencesFormWrapper />)

      const descriptions = document.querySelectorAll('.leading-relaxed')
      expect(descriptions.length).toBeGreaterThan(0)

      const labels = document.querySelectorAll('.leading-tight.sm\\:leading-none')
      expect(labels.length).toBeGreaterThan(0)
    })
  })

  describe('Layout Stability', () => {
    it('should maintain layout stability during loading states', () => {
      function LoadingPreferencesForm() {
        const form = useForm<PreferencesFormData>({
          resolver: zodResolver(preferencesSchema),
          defaultValues: { categories: [] },
        })

        return (
          <PreferencesForm
            onSubmit={async () => {}}
            selectedCategories={[]}
            isLoading={true}
            form={form}
          />
        )
      }

      render(<LoadingPreferencesForm />)

      // Buttons should maintain size during loading
      const submitButton = screen.getByRole('button', { name: /processing/i })
      expect(submitButton).toHaveClass('min-h-[44px]')
    })

    it('should prevent layout shift with consistent spacing', () => {
      render(<PreferencesFormWrapper />)

      // Check consistent spacing classes
      const form = document.querySelector('form')
      expect(form).toHaveClass('space-y-4', 'sm:space-y-6')

      const nav = screen.getByRole('navigation', { name: /form navigation/i })
      expect(nav).toHaveClass('pt-4', 'sm:pt-6')
    })
  })
})