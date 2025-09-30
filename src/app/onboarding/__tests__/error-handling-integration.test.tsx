import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { OnboardingForm } from '@/components/onboarding/onboarding-form'
import { OnboardingProvider } from '@/components/onboarding/onboarding-context'
import { APIClientError } from '@/lib/api-client'
import { it } from 'zod/v4/locales'
import { it } from 'zod/v4/locales'
import { it } from 'zod/v4/locales'
import { it } from 'zod/v4/locales'
import { it } from 'zod/v4/locales'
import { it } from 'zod/v4/locales'
import { it } from 'zod/v4/locales'
import { beforeEach } from 'node:test'
import { describe } from 'node:test'

// Mock the API client
vi.mock('@/lib/api-client', () => ({
  APIClientError: class MockAPIClientError extends Error {
    constructor(public apiError: any) {
      super(apiError.error)
      this.name = 'APIClientError'
      this.code = apiError.code
      this.details = apiError.details
      this.statusCode = apiError.statusCode
    }
    code: string
    details?: Record<string, string | string[]>
    statusCode?: number
  },
  onboardingAPI: {
    createOrganization: vi.fn(),
    updateRole: vi.fn(),
    savePreferences: vi.fn()
  }
}))

const TestForm = ({ onSubmit, shouldFail = false }: { 
  onSubmit?: any
  shouldFail?: boolean 
}) => {
  const handleSubmit = onSubmit || vi.fn().mockImplementation(() => {
    if (shouldFail) {
      throw new Error('Test error')
    }
  })

  return (
    <OnboardingProvider>
      <OnboardingForm
        title="Test Form"
        description="Test description"
        onSubmit={handleSubmit}
      >
        <input name="testField" placeholder="Test field" />
      </OnboardingForm>
    </OnboardingProvider>
  )
}

describe('Onboarding Error Handling Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('displays error when form submission fails', async () => {
    const mockSubmit = vi.fn().mockRejectedValue(new Error('Submission failed'))
    
    render(<TestForm onSubmit={mockSubmit} />)
    
    const submitButton = screen.getByRole('button', { name: /continue/i })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Form Error')).toBeInTheDocument()
      expect(screen.getByText(/Submission failed/)).toBeInTheDocument()
    })
  })

  it('displays API validation errors', async () => {
    const { APIClientError } = await import('@/lib/api-client')
    const validationError = new APIClientError({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: {
        name: ['Name is required'],
        email: ['Invalid email format']
      }
    })
    
    const mockSubmit = vi.fn().mockRejectedValue(validationError)
    
    render(<TestForm onSubmit={mockSubmit} />)
    
    const submitButton = screen.getByRole('button', { name: /continue/i })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Form Error')).toBeInTheDocument()
      expect(screen.getByText('Details:')).toBeInTheDocument()
      expect(screen.getByText(/name.*Name is required/)).toBeInTheDocument()
      expect(screen.getByText(/email.*Invalid email format/)).toBeInTheDocument()
    })
  })

  it('shows loading state during submission', async () => {
    let resolveSubmit: (value: any) => void
    const mockSubmit = vi.fn().mockImplementation(() => 
      new Promise(resolve => { resolveSubmit = resolve })
    )
    
    render(<TestForm onSubmit={mockSubmit} />)
    
    const submitButton = screen.getByRole('button', { name: /continue/i })
    fireEvent.click(submitButton)
    
    // Should show loading state
    await waitFor(() => {
      expect(screen.getByText('Processing...')).toBeInTheDocument()
      expect(submitButton).toBeDisabled()
    })
    
    // Resolve the promise
    resolveSubmit!('success')
    
    await waitFor(() => {
      expect(screen.queryByText('Processing...')).not.toBeInTheDocument()
    })
  })

  it('allows retry after error', async () => {
    const mockSubmit = vi.fn()
      .mockRejectedValueOnce(new Error('First failure'))
      .mockResolvedValueOnce('success')
    
    render(<TestForm onSubmit={mockSubmit} />)
    
    // First submission fails
    const submitButton = screen.getByRole('button', { name: /continue/i })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/First failure/)).toBeInTheDocument()
    })
    
    // Click retry button
    const retryButton = screen.getByRole('button', { name: /try again/i })
    fireEvent.click(retryButton)
    
    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledTimes(2)
    })
  })

  it('allows dismissing errors', async () => {
    const mockSubmit = vi.fn().mockRejectedValue(new Error('Test error'))
    
    render(<TestForm onSubmit={mockSubmit} />)
    
    const submitButton = screen.getByRole('button', { name: /continue/i })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/Test error/)).toBeInTheDocument()
    })
    
    // Dismiss the error
    const dismissButton = screen.getByRole('button', { name: /dismiss error/i })
    fireEvent.click(dismissButton)
    
    await waitFor(() => {
      expect(screen.queryByText(/Test error/)).not.toBeInTheDocument()
    })
  })

  it('disables form fields during loading', async () => {
    let resolveSubmit: (value: any) => void
    const mockSubmit = vi.fn().mockImplementation(() => 
      new Promise(resolve => { resolveSubmit = resolve })
    )
    
    render(<TestForm onSubmit={mockSubmit} />)
    
    const input = screen.getByPlaceholderText('Test field')
    const submitButton = screen.getByRole('button', { name: /continue/i })
    
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(input).toBeDisabled()
      expect(submitButton).toBeDisabled()
    })
    
    resolveSubmit!('success')
    
    await waitFor(() => {
      expect(input).not.toBeDisabled()
    })
  })

  it('handles network errors gracefully', async () => {
    const networkError = new Error('fetch failed')
    const mockSubmit = vi.fn().mockRejectedValue(networkError)
    
    render(<TestForm onSubmit={mockSubmit} />)
    
    const submitButton = screen.getByRole('button', { name: /continue/i })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Form Error')).toBeInTheDocument()
      expect(screen.getByText(/Network connection issue/)).toBeInTheDocument()
    })
  })
})