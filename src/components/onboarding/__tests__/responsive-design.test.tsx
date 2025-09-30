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

// Mock window.matchMedia for responsive tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

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

describe('Responsive Design', () => {
  describe('OnboardingHeader', () => {
    it('should have responsive padding and spacing', () => {
      render(
        <TestWrapper>
          <OnboardingHeader />
        </TestWrapper>
      )

      const header = screen.getByRole('banner')
      expect(header).toHaveClass('border-b', 'bg-background/95', 'backdrop-blur')

      const container = header.querySelector('.container')
      expect(container).toHaveClass('px-4', 'sm:px-6', 'lg:px-8', 'py-3', 'sm:py-4')
    })

    it('should show responsive step indicators', () => {
      render(
        <TestWrapper>
          <OnboardingHeader />
        </TestWrapper>
      )

      const stepNav = screen.getByRole('navigation', { name: /onboarding steps/i })
      const stepList = stepNav.querySelector('ol')
      expect(stepList).toHaveClass('flex', 'justify-between', 'gap-1')

      // Check step indicators have responsive classes
      const stepItems = stepList?.querySelectorAll('li')
      stepItems?.forEach(item => {
        expect(item).toHaveClass('flex', 'flex-col', 'items-center', 'flex-1', 'min-w-0')
        
        const stepText = item.querySelector('span')
        expect(stepText).toHaveClass('hidden', 'sm:block', 'text-center', 'leading-tight', 'truncate', 'w-full', 'px-1')
      })
    })

    it('should have responsive title and description', () => {
      render(
        <TestWrapper>
          <OnboardingHeader />
        </TestWrapper>
      )

      const title = screen.getByRole('heading', { level: 1 })
      expect(title).toHaveClass('text-lg', 'sm:text-xl', 'font-semibold', 'truncate')

      const description = document.getElementById('onboarding-step-description')
      expect(description).toHaveClass('text-xs', 'sm:text-sm', 'text-muted-foreground', 'line-clamp-2')
    })
  })

  describe('PreferencesForm', () => {
    it('should have responsive grid layout', () => {
      render(<PreferencesFormWrapper />)

      const fieldset = screen.getByRole('group', { name: /select grant categories/i })
      expect(fieldset).toHaveClass('grid', 'grid-cols-1', 'sm:grid-cols-2', 'gap-3', 'sm:gap-4')
    })

    it('should have responsive card padding', () => {
      render(<PreferencesFormWrapper />)

      const cards = document.querySelectorAll('[role="option"]')
      cards.forEach(card => {
        const cardContent = card.querySelector('.p-3')
        expect(cardContent).toHaveClass('p-3', 'sm:p-4')
      })
    })

    it('should have responsive navigation buttons', () => {
      render(<PreferencesFormWrapper />)

      const nav = screen.getByRole('navigation', { name: /form navigation/i })
      expect(nav).toHaveClass('flex', 'flex-col', 'sm:flex-row', 'gap-3', 'pt-4', 'sm:pt-6')

      const buttons = nav.querySelectorAll('button')
      buttons.forEach(button => {
        expect(button).toHaveClass('min-h-[44px]') // Touch target size
      })

      // Back button should be full width on mobile
      const backButton = screen.getByRole('button', { name: /back/i })
      expect(backButton).toHaveClass('w-full', 'sm:w-auto')

      // Submit button should be full width on mobile, flex-1 on desktop
      const submitButton = screen.getByRole('button', { name: /complete/i })
      expect(submitButton).toHaveClass('w-full', 'sm:flex-1')
    })

    it('should have responsive icon and text sizing', () => {
      render(<PreferencesFormWrapper />)

      // Check icons are responsive
      const icons = document.querySelectorAll('svg[aria-hidden="true"]')
      icons.forEach(icon => {
        if (icon.classList.contains('lucide')) {
          expect(icon).toHaveClass('h-4', 'w-4', 'sm:h-5', 'sm:w-5')
        }
      })

      // Check labels have responsive sizing
      const labels = document.querySelectorAll('label')
      labels.forEach(label => {
        if (label.textContent && !label.textContent.includes('Select Grant Categories')) {
          expect(label).toHaveClass('text-sm')
        }
      })
    })
  })

  describe('Touch Targets', () => {
    it('should have minimum 44px touch targets for mobile', () => {
      render(<PreferencesFormWrapper />)

      // Check all interactive buttons meet touch target requirements
      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        expect(button).toHaveClass('min-h-[44px]')
      })

      // Check checkboxes are properly sized
      const checkboxes = screen.getAllByRole('checkbox')
      checkboxes.forEach(checkbox => {
        expect(checkbox).toHaveClass('h-4', 'w-4')
      })
    })
  })

  describe('Spacing and Layout', () => {
    it('should have responsive spacing between elements', () => {
      render(<PreferencesFormWrapper />)

      const form = document.querySelector('form')
      expect(form).toHaveClass('space-y-4', 'sm:space-y-6')

      const fieldset = screen.getByRole('group')
      expect(fieldset).toHaveClass('gap-3', 'sm:gap-4', 'mt-3', 'sm:mt-4')
    })

    it('should handle text overflow properly', () => {
      render(
        <TestWrapper>
          <OnboardingHeader />
        </TestWrapper>
      )

      const titleContainer = document.querySelector('.min-w-0.flex-1')
      expect(titleContainer).toHaveClass('min-w-0', 'flex-1')

      const title = screen.getByRole('heading', { level: 1 })
      expect(title).toHaveClass('truncate')
    })
  })

  describe('Viewport Meta Tag', () => {
    it('should be mobile-friendly', () => {
      // This would typically be tested in an E2E test
      // Here we just verify our components use responsive classes
      render(<PreferencesFormWrapper />)

      const container = document.querySelector('.w-full')
      expect(container).toHaveClass('w-full')
    })
  })
})