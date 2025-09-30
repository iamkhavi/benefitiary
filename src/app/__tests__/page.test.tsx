import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import Home from '../page'

// Mock Next.js Link component
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

describe('Landing Page', () => {
  it('renders the main hero section with correct heading', () => {
    render(<Home />)
    
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).toBeInTheDocument()
    expect(heading).toHaveTextContent('Find the perfect grants for your organization')
  })

  it('displays the hero description text', () => {
    render(<Home />)
    
    const description = screen.getByText(/Benefitiary connects SMEs, nonprofits, and healthcare organizations/)
    expect(description).toBeInTheDocument()
  })

  it('renders call-to-action buttons in hero section', () => {
    render(<Home />)
    
    const getStartedButton = screen.getByRole('link', { name: /get started free/i })
    const signInButtons = screen.getAllByRole('link', { name: /sign in/i })
    
    expect(getStartedButton).toBeInTheDocument()
    expect(getStartedButton).toHaveAttribute('href', '/auth/signup')
    
    // Should have at least one sign in button
    expect(signInButtons.length).toBeGreaterThan(0)
    expect(signInButtons[0]).toHaveAttribute('href', '/auth/login')
  })

  describe('Value Propositions Section', () => {
    it('renders the section heading', () => {
      render(<Home />)
      
      const sectionHeading = screen.getByRole('heading', { 
        name: /built for every type of organization/i 
      })
      expect(sectionHeading).toBeInTheDocument()
    })

    it('displays SME value proposition card', () => {
      render(<Home />)
      
      const smeTitle = screen.getByText('SMEs & Startups')
      expect(smeTitle).toBeInTheDocument()
      
      const smeDescription = screen.getByText(/Access business growth grants, innovation funding/)
      expect(smeDescription).toBeInTheDocument()
      
      // Check for specific features
      expect(screen.getByText('Business development grants')).toBeInTheDocument()
      expect(screen.getByText('Innovation & R&D funding')).toBeInTheDocument()
      expect(screen.getByText('Export & trade opportunities')).toBeInTheDocument()
    })

    it('displays Nonprofit value proposition card', () => {
      render(<Home />)
      
      const nonprofitTitle = screen.getByText('Nonprofits & NGOs')
      expect(nonprofitTitle).toBeInTheDocument()
      
      const nonprofitDescription = screen.getByText(/Discover grants for social impact initiatives/)
      expect(nonprofitDescription).toBeInTheDocument()
      
      // Check for specific features
      expect(screen.getByText('Social impact funding')).toBeInTheDocument()
      expect(screen.getByText('Community development grants')).toBeInTheDocument()
      expect(screen.getByText('Capacity building support')).toBeInTheDocument()
    })

    it('displays Healthcare value proposition card', () => {
      render(<Home />)
      
      const healthcareTitle = screen.getByText('Healthcare & Public Health')
      expect(healthcareTitle).toBeInTheDocument()
      
      const healthcareDescription = screen.getByText(/Find medical research funding, public health initiatives/)
      expect(healthcareDescription).toBeInTheDocument()
      
      // Check for specific features
      expect(screen.getByText('Medical research grants')).toBeInTheDocument()
      expect(screen.getByText('Public health programs')).toBeInTheDocument()
      expect(screen.getByText('Healthcare innovation')).toBeInTheDocument()
    })
  })

  describe('Feature Highlights Section', () => {
    it('renders the features section heading', () => {
      render(<Home />)
      
      const featuresHeading = screen.getByRole('heading', { 
        name: /everything you need to find and win grants/i 
      })
      expect(featuresHeading).toBeInTheDocument()
    })

    it('displays all six feature highlights', () => {
      render(<Home />)
      
      // Check all feature titles
      expect(screen.getByRole('heading', { name: /smart grant discovery/i })).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: /personalized recommendations/i })).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: /proposal assistance/i })).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: /deadline tracking/i })).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: /verified opportunities/i })).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: /fast setup/i })).toBeInTheDocument()
    })

    it('displays feature descriptions', () => {
      render(<Home />)
      
      expect(screen.getByText(/AI-powered matching connects you with grants/)).toBeInTheDocument()
      expect(screen.getByText(/Get curated grant opportunities based on your organization/)).toBeInTheDocument()
      expect(screen.getByText(/Connect with expert grant writers or use AI-powered tools/)).toBeInTheDocument()
      expect(screen.getByText(/Never miss an opportunity with automated deadline reminders/)).toBeInTheDocument()
      expect(screen.getByText(/All grants are verified and regularly updated/)).toBeInTheDocument()
      expect(screen.getByText(/Get started in minutes with our guided onboarding/)).toBeInTheDocument()
    })
  })

  describe('Call to Action Section', () => {
    it('renders the CTA section heading', () => {
      render(<Home />)
      
      const ctaHeading = screen.getByRole('heading', { 
        name: /ready to find your next grant/i 
      })
      expect(ctaHeading).toBeInTheDocument()
    })

    it('displays CTA buttons with correct links', () => {
      render(<Home />)
      
      const startTrialButton = screen.getByRole('link', { name: /start free trial/i })
      const signInButtons = screen.getAllByRole('link', { name: /sign in/i })
      
      expect(startTrialButton).toBeInTheDocument()
      expect(startTrialButton).toHaveAttribute('href', '/auth/signup')
      
      // Should have multiple sign in buttons, all pointing to login
      expect(signInButtons.length).toBeGreaterThanOrEqual(2)
      signInButtons.forEach(button => {
        expect(button).toHaveAttribute('href', '/auth/login')
      })
    })

    it('displays CTA description text', () => {
      render(<Home />)
      
      const ctaDescription = screen.getByText(/Join thousands of organizations that have already discovered/)
      expect(ctaDescription).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper heading hierarchy', () => {
      render(<Home />)
      
      // Should have one h1
      const h1Elements = screen.getAllByRole('heading', { level: 1 })
      expect(h1Elements).toHaveLength(1)
      
      // Should have multiple h2 elements for sections
      const h2Elements = screen.getAllByRole('heading', { level: 2 })
      expect(h2Elements.length).toBeGreaterThan(0)
      
      // Should have h3 elements for feature titles
      const h3Elements = screen.getAllByRole('heading', { level: 3 })
      expect(h3Elements.length).toBeGreaterThan(0)
    })

    it('has accessible button and link elements', () => {
      render(<Home />)
      
      // All buttons should be accessible
      const buttons = screen.getAllByRole('link')
      buttons.forEach(button => {
        expect(button).toBeInTheDocument()
        expect(button).toHaveAttribute('href')
      })
    })
  })

  describe('Responsive Design Elements', () => {
    it('applies responsive grid classes', () => {
      render(<Home />)
      
      // Check that grid containers have responsive classes
      const valuePropsSection = screen.getByText(/Built for every type of organization/i).closest('section')
      expect(valuePropsSection).toBeInTheDocument()
      
      const featuresSection = screen.getByText(/Everything you need to find and win grants/i).closest('section')
      expect(featuresSection).toBeInTheDocument()
    })
  })
})