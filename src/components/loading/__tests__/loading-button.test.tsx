import React from 'react'
import { render, screen } from '@testing-library/react'
import { LoadingButton, SubmitButton } from '../loading-button'

describe('LoadingButton', () => {
  it('renders children when not loading', () => {
    render(<LoadingButton>Click me</LoadingButton>)
    
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument()
    expect(screen.queryByText('Loading')).not.toBeInTheDocument()
  })

  it('shows loading state with spinner', () => {
    render(<LoadingButton loading={true}>Click me</LoadingButton>)
    
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    expect(screen.getByText('Click me')).toBeInTheDocument()
    
    // Check for loading spinner (Loader2 icon)
    const spinner = button.querySelector('.animate-spin')
    expect(spinner).toBeInTheDocument()
  })

  it('shows custom loading text', () => {
    render(
      <LoadingButton loading={true} loadingText="Processing...">
        Click me
      </LoadingButton>
    )
    
    expect(screen.getByText('Processing...')).toBeInTheDocument()
    expect(screen.queryByText('Click me')).not.toBeInTheDocument()
  })

  it('shows icon when provided and not loading', () => {
    const TestIcon = () => <span data-testid="test-icon">Icon</span>
    
    render(
      <LoadingButton icon={<TestIcon />}>
        Click me
      </LoadingButton>
    )
    
    expect(screen.getByTestId('test-icon')).toBeInTheDocument()
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('hides icon when loading', () => {
    const TestIcon = () => <span data-testid="test-icon">Icon</span>
    
    render(
      <LoadingButton loading={true} icon={<TestIcon />}>
        Click me
      </LoadingButton>
    )
    
    expect(screen.queryByTestId('test-icon')).not.toBeInTheDocument()
  })

  it('is disabled when loading prop is true', () => {
    render(<LoadingButton loading={true}>Click me</LoadingButton>)
    
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('is disabled when disabled prop is true', () => {
    render(<LoadingButton disabled={true}>Click me</LoadingButton>)
    
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('passes through other button props', () => {
    render(
      <LoadingButton 
        className="custom-class" 
        variant="outline"
        data-testid="custom-button"
      >
        Click me
      </LoadingButton>
    )
    
    const button = screen.getByTestId('custom-button')
    expect(button).toHaveClass('custom-class')
  })
})

describe('SubmitButton', () => {
  it('renders as submit type button', () => {
    render(<SubmitButton>Submit</SubmitButton>)
    
    const button = screen.getByRole('button', { name: 'Submit' })
    expect(button).toHaveAttribute('type', 'submit')
  })

  it('shows default loading text', () => {
    render(<SubmitButton loading={true}>Submit</SubmitButton>)
    
    expect(screen.getByText('Submitting...')).toBeInTheDocument()
  })

  it('shows custom loading text', () => {
    render(
      <SubmitButton loading={true} loadingText="Saving...">
        Submit
      </SubmitButton>
    )
    
    expect(screen.getByText('Saving...')).toBeInTheDocument()
  })

  it('shows default children text', () => {
    render(<SubmitButton />)
    
    expect(screen.getByText('Submit')).toBeInTheDocument()
  })

  it('shows custom children text', () => {
    render(<SubmitButton>Save Changes</SubmitButton>)
    
    expect(screen.getByText('Save Changes')).toBeInTheDocument()
  })
})