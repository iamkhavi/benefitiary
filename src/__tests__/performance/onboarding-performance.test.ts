import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { OnboardingProvider } from '@/components/onboarding/onboarding-context'
import OrganizationPage from '@/app/onboarding/organization/page'
import RolePage from '@/app/onboarding/role/page'
import PreferencesPage from '@/app/onboarding/preferences/page'

// Mock fetch with realistic delays
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

describe('Onboarding Performance Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fetch).mockClear()
  })

  describe('Page Load Performance', () => {
    it('should render organization page within performance budget', async () => {
      const startTime = performance.now()
      
      renderWithProvider(<OrganizationPage />)
      
      // Wait for all elements to be rendered
      await waitFor(() => {
        expect(screen.getByText('Organization Profile')).toBeInTheDocument()
        expect(screen.getByLabelText(/organization name/i)).toBeInTheDocument()
        expect(screen.getByRole('combobox', { name: /organization type/i })).toBeInTheDocument()
      })
      
      const endTime = performance.now()
      const renderTime = endTime - startTime
      
      // Should render within 100ms (performance budget)
      expect(renderTime).toBeLessThan(100)
    })

    it('should render role page within performance budget', async () => {
      const startTime = performance.now()
      
      renderWithProvider(<RolePage />)
      
      await waitFor(() => {
        expect(screen.getByText('Select Your Role')).toBeInTheDocument()
        expect(screen.getByRole('radiogroup')).toBeInTheDocument()
      })
      
      const endTime = performance.now()
      const renderTime = endTime - startTime
      
      expect(renderTime).toBeLessThan(100)
    })

    it('should render preferences page within performance budget', async () => {
      const startTime = performance.now()
      
      renderWithProvider(<PreferencesPage />)
      
      await waitFor(() => {
        expect(screen.getByText('Select Your Interests')).toBeInTheDocument()
        expect(screen.getAllByRole('checkbox')).toHaveLength(10) // All category checkboxes
      })
      
      const endTime = performance.now()
      const renderTime = endTime - startTime
      
      expect(renderTime).toBeLessThan(100)
    })
  })

  describe('Form Interaction Performance', () => {
    it('should provide fast validation feedback', async () => {
      const user = userEvent.setup()
      renderWithProvider(<OrganizationPage />)

      const nameInput = screen.getByLabelText(/organization name/i)
      
      const startTime = performance.now()
      
      // Type a single character (should trigger validation)
      await user.type(nameInput, 'A')
      
      // Clear the input (should show validation error)
      await user.clear(nameInput)
      
      // Wait for validation error to appear
      await waitFor(() => {
        expect(screen.getByText('Organization name must be at least 2 characters')).toBeInTheDocument()
      })
      
      const endTime = performance.now()
      const validationTime = endTime - startTime
      
      // Validation feedback should appear within 50ms
      expect(validationTime).toBeLessThan(50)
    })

    it('should handle rapid form interactions efficiently', async () => {
      const user = userEvent.setup()
      renderWithProvider(<RolePage />)

      const startTime = performance.now()
      
      // Rapidly click between role options
      const seekerOption = screen.getByRole('radio', { name: /grant seeker/i })
      const writerOption = screen.getByRole('radio', { name: /grant writer/i })
      const funderOption = screen.getByRole('radio', { name: /funder/i })
      
      await user.click(seekerOption)
      await user.click(writerOption)
      await user.click(funderOption)
      await user.click(seekerOption)
      
      const endTime = performance.now()
      const interactionTime = endTime - startTime
      
      // Multiple rapid interactions should complete within 100ms
      expect(interactionTime).toBeLessThan(100)
      
      // Final selection should be correct
      expect(seekerOption).toBeChecked()
    })

    it('should handle multiple checkbox selections efficiently', async () => {
      const user = userEvent.setup()
      renderWithProvider(<PreferencesPage />)

      const startTime = performance.now()
      
      // Select multiple categories rapidly
      const checkboxes = screen.getAllByRole('checkbox')
      
      // Select first 5 categories
      for (let i = 0; i < 5; i++) {
        await user.click(checkboxes[i])
      }
      
      const endTime = performance.now()
      const selectionTime = endTime - startTime
      
      // Multiple selections should complete within 200ms
      expect(selectionTime).toBeLessThan(200)
      
      // All selected checkboxes should be checked
      for (let i = 0; i < 5; i++) {
        expect(checkboxes[i]).toBeChecked()
      }
    })
  })

  describe('API Response Performance', () => {
    it('should handle fast API responses efficiently', async () => {
      const user = userEvent.setup()
      
      // Mock fast API response (50ms)
      vi.mocked(fetch).mockImplementationOnce(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({ success: true, organization: {} })
        } as Response), 50))
      )

      renderWithProvider(<OrganizationPage />)

      // Fill form
      await user.type(screen.getByLabelText(/organization name/i), 'Fast Org')
      await user.click(screen.getByRole('combobox', { name: /organization type/i }))
      await user.click(screen.getByRole('option', { name: /sme/i }))
      await user.click(screen.getByRole('combobox', { name: /organization size/i }))
      await user.click(screen.getByRole('option', { name: /small/i }))
      await user.click(screen.getByRole('combobox', { name: /country/i }))
      await user.click(screen.getByRole('option', { name: /united states/i }))

      const startTime = performance.now()
      
      // Submit form
      await user.click(screen.getByRole('button', { name: /continue to role selection/i }))
      
      // Wait for loading state to appear and disappear
      await waitFor(() => {
        expect(screen.getByText('Saving...')).toBeInTheDocument()
      })
      
      await waitFor(() => {
        expect(screen.queryByText('Saving...')).not.toBeInTheDocument()
      })
      
      const endTime = performance.now()
      const responseTime = endTime - startTime
      
      // Should handle fast response within 100ms of API response time
      expect(responseTime).toBeLessThan(150) // 50ms API + 100ms handling
    })

    it('should handle slow API responses gracefully', async () => {
      const user = userEvent.setup()
      
      // Mock slow API response (2 seconds)
      vi.mocked(fetch).mockImplementationOnce(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({ success: true, user: { role: 'seeker' } })
        } as Response), 2000))
      )

      renderWithProvider(<RolePage />)

      const startTime = performance.now()
      
      // Select role and submit
      await user.click(screen.getByRole('radio', { name: /grant seeker/i }))
      await user.click(screen.getByRole('button', { name: /continue to preferences/i }))
      
      // Should show loading state immediately
      await waitFor(() => {
        expect(screen.getByText('Saving...')).toBeInTheDocument()
      }, { timeout: 100 })
      
      const loadingStartTime = performance.now()
      const timeToLoading = loadingStartTime - startTime
      
      // Loading state should appear within 50ms
      expect(timeToLoading).toBeLessThan(50)
      
      // Wait for slow response to complete
      await waitFor(() => {
        expect(screen.queryByText('Saving...')).not.toBeInTheDocument()
      }, { timeout: 3000 })
    })
  })

  describe('Memory Performance', () => {
    it('should not create memory leaks during form interactions', async () => {
      const user = userEvent.setup()
      
      // Get initial memory usage (if available)
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0
      
      const { unmount } = renderWithProvider(<OrganizationPage />)
      
      // Perform many form interactions
      for (let i = 0; i < 100; i++) {
        const nameInput = screen.getByLabelText(/organization name/i)
        await user.type(nameInput, `Test ${i}`)
        await user.clear(nameInput)
      }
      
      // Unmount component
      unmount()
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc()
      }
      
      // Check memory usage after cleanup
      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0
      
      // Memory should not increase significantly (allow 1MB increase)
      if (initialMemory > 0) {
        const memoryIncrease = finalMemory - initialMemory
        expect(memoryIncrease).toBeLessThan(1024 * 1024) // 1MB
      }
    })

    it('should handle component re-renders efficiently', async () => {
      let renderCount = 0
      
      const TestComponent = () => {
        renderCount++
        return <OrganizationPage />
      }
      
      const { rerender } = renderWithProvider(<TestComponent />)
      
      const initialRenderCount = renderCount
      
      // Trigger multiple re-renders
      for (let i = 0; i < 10; i++) {
        rerender(<OnboardingProvider><TestComponent /></OnboardingProvider>)
      }
      
      const finalRenderCount = renderCount
      const totalRenders = finalRenderCount - initialRenderCount
      
      // Should not cause excessive re-renders
      expect(totalRenders).toBeLessThan(15) // Allow some React overhead
    })
  })

  describe('Bundle Size Impact', () => {
    it('should not significantly impact bundle size', () => {
      // This is more of a build-time test, but we can check component complexity
      const { container } = renderWithProvider(<OrganizationPage />)
      
      // Count DOM nodes as a proxy for component complexity
      const nodeCount = container.querySelectorAll('*').length
      
      // Should not create excessive DOM nodes
      expect(nodeCount).toBeLessThan(100)
    })
  })
})