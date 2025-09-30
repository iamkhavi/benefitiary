import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import { ErrorDisplay, ValidationErrorDisplay, NetworkErrorDisplay } from '../error-display'
import { APIClientError } from '@/lib/api-client'

describe('ErrorDisplay', () => {
  it('renders nothing when error is null', () => {
    const { container } = render(<ErrorDisplay error={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders string error message', () => {
    render(<ErrorDisplay error="Test error message" />)
    
    expect(screen.getByText('Error')).toBeInTheDocument()
    expect(screen.getByText('Test error message')).toBeInTheDocument()
  })

  it('renders Error object message', () => {
    const error = new Error('Test error object')
    render(<ErrorDisplay error={error} />)
    
    expect(screen.getByText('Test error object')).toBeInTheDocument()
  })

  it('renders APIClientError with user-friendly message', () => {
    const error = new APIClientError({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: { name: ['Name is required'] }
    })
    
    render(<ErrorDisplay error={error} />)
    
    expect(screen.getByText('Please check your input and try again.')).toBeInTheDocument()
    expect(screen.getByText('Details:')).toBeInTheDocument()
    expect(screen.getByText(/name.*Name is required/)).toBeInTheDocument()
  })

  it('shows retry button when onRetry is provided', () => {
    const onRetry = vi.fn()
    render(<ErrorDisplay error="Test error" onRetry={onRetry} />)
    
    const retryButton = screen.getByRole('button', { name: /try again/i })
    expect(retryButton).toBeInTheDocument()
    
    fireEvent.click(retryButton)
    expect(onRetry).toHaveBeenCalled()
  })

  it('shows dismiss button when onDismiss is provided', () => {
    const onDismiss = vi.fn()
    render(<ErrorDisplay error="Test error" onDismiss={onDismiss} />)
    
    const dismissButton = screen.getByRole('button', { name: /dismiss error/i })
    expect(dismissButton).toBeInTheDocument()
    
    fireEvent.click(dismissButton)
    expect(onDismiss).toHaveBeenCalled()
  })

  it('shows technical details in development mode', () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'

    const error = new APIClientError({
      error: 'Test error',
      code: 'DATABASE_ERROR'
    })
    
    render(<ErrorDisplay error={error} />)
    
    expect(screen.getByText('Technical Details (Development)')).toBeInTheDocument()
    
    process.env.NODE_ENV = originalEnv
  })

  it('uses custom title when provided', () => {
    render(<ErrorDisplay error="Test error" title="Custom Title" />)
    
    expect(screen.getByText('Custom Title')).toBeInTheDocument()
  })
})

describe('ValidationErrorDisplay', () => {
  it('renders validation error', () => {
    const error = new APIClientError({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: { email: ['Invalid email format'] }
    })
    
    render(<ValidationErrorDisplay error={error} />)
    
    expect(screen.getByText('Validation Error')).toBeInTheDocument()
    expect(screen.getByText(/email.*Invalid email format/)).toBeInTheDocument()
  })

  it('renders nothing for non-validation errors', () => {
    const error = new APIClientError({
      error: 'Database error',
      code: 'DATABASE_ERROR'
    })
    
    const { container } = render(<ValidationErrorDisplay error={error} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when error is null', () => {
    const { container } = render(<ValidationErrorDisplay error={null} />)
    expect(container.firstChild).toBeNull()
  })
})

describe('NetworkErrorDisplay', () => {
  it('renders network error', () => {
    const error = new Error('fetch failed')
    render(<NetworkErrorDisplay error={error} />)
    
    expect(screen.getByText('Connection Error')).toBeInTheDocument()
    expect(screen.getByText(/Unable to connect to our servers/)).toBeInTheDocument()
  })

  it('renders timeout error', () => {
    const error = new Error('Request timeout')
    render(<NetworkErrorDisplay error={error} />)
    
    expect(screen.getByText('Connection Error')).toBeInTheDocument()
  })

  it('renders nothing for non-network errors', () => {
    const error = new Error('Some other error')
    const { container } = render(<NetworkErrorDisplay error={error} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when error is null', () => {
    const { container } = render(<NetworkErrorDisplay error={null} />)
    expect(container.firstChild).toBeNull()
  })
})