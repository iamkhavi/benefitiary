import { axe, toHaveNoViolations } from 'jest-axe'
import { render, RenderResult } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Extend Jest matchers
expect.extend(toHaveNoViolations)

/**
 * Utility functions for accessibility testing
 */

/**
 * Test component for accessibility violations using axe-core
 */
export async function testAccessibility(component: React.ReactElement) {
  const { container } = render(component)
  const results = await axe(container)
  expect(results).toHaveNoViolations()
  return { container }
}

/**
 * Test keyboard navigation through focusable elements
 */
export async function testKeyboardNavigation(
  renderResult: RenderResult,
  expectedFocusableElements: string[]
) {
  const user = userEvent.setup()
  const { container } = renderResult

  // Get all focusable elements
  const focusableElements = container.querySelectorAll(
    'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])'
  )

  expect(focusableElements).toHaveLength(expectedFocusableElements.length)

  // Tab through each element
  for (let i = 0; i < focusableElements.length; i++) {
    await user.tab()
    expect(focusableElements[i]).toHaveFocus()
  }
}

/**
 * Test screen reader announcements
 */
export function testScreenReaderAnnouncements(
  renderResult: RenderResult,
  expectedAnnouncements: string[]
) {
  const { container } = renderResult

  expectedAnnouncements.forEach(announcement => {
    const element = container.querySelector(`[aria-live], [role="alert"], [role="status"]`)
    expect(element).toBeInTheDocument()
  })
}

/**
 * Test form accessibility features
 */
export function testFormAccessibility(renderResult: RenderResult) {
  const { container } = renderResult

  // Check for proper form structure
  const form = container.querySelector('form')
  expect(form).toBeInTheDocument()

  // Check for fieldsets and legends
  const fieldsets = container.querySelectorAll('fieldset')
  fieldsets.forEach(fieldset => {
    const legend = fieldset.querySelector('legend')
    expect(legend).toBeInTheDocument()
  })

  // Check for proper labeling
  const inputs = container.querySelectorAll('input, select, textarea')
  inputs.forEach(input => {
    const id = input.getAttribute('id')
    if (id) {
      const label = container.querySelector(`label[for="${id}"]`)
      expect(label).toBeInTheDocument()
    }
  })

  // Check for error handling
  const errorElements = container.querySelectorAll('[role="alert"]')
  errorElements.forEach(error => {
    expect(error).toHaveAttribute('aria-live')
  })
}

/**
 * Test color contrast (basic check)
 */
export function testColorContrast(renderResult: RenderResult) {
  const { container } = renderResult

  // Check for text elements that should have sufficient contrast
  const textElements = container.querySelectorAll('p, span, label, button, a, h1, h2, h3, h4, h5, h6')
  
  textElements.forEach(element => {
    // Basic visibility check - in production you'd use more sophisticated tools
    expect(element).toBeVisible()
  })
}

/**
 * Test responsive accessibility
 */
export function testResponsiveAccessibility(
  component: React.ReactElement,
  viewports: { width: number; height: number }[]
) {
  viewports.forEach(viewport => {
    // Mock viewport size
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: viewport.width,
    })
    
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: viewport.height,
    })

    const renderResult = render(component)
    
    // Basic accessibility checks should pass at all viewport sizes
    testFormAccessibility(renderResult)
    testColorContrast(renderResult)
  })
}

/**
 * Test focus management
 */
export async function testFocusManagement(renderResult: RenderResult) {
  const user = userEvent.setup()
  const { container } = renderResult

  // Test focus trap (if applicable)
  const focusableElements = container.querySelectorAll(
    'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])'
  )

  if (focusableElements.length > 1) {
    const firstElement = focusableElements[0] as HTMLElement
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

    // Focus last element and tab forward - should wrap to first
    lastElement.focus()
    await user.tab()
    expect(firstElement).toHaveFocus()

    // Focus first element and shift+tab - should wrap to last
    firstElement.focus()
    await user.tab({ shift: true })
    expect(lastElement).toHaveFocus()
  }
}

/**
 * Test ARIA attributes
 */
export function testAriaAttributes(renderResult: RenderResult) {
  const { container } = renderResult

  // Check for required ARIA attributes
  const elementsWithAriaLabel = container.querySelectorAll('[aria-label]')
  elementsWithAriaLabel.forEach(element => {
    expect(element.getAttribute('aria-label')).toBeTruthy()
  })

  const elementsWithAriaDescribedBy = container.querySelectorAll('[aria-describedby]')
  elementsWithAriaDescribedBy.forEach(element => {
    const describedById = element.getAttribute('aria-describedby')
    if (describedById) {
      const describingElement = container.querySelector(`#${describedById}`)
      expect(describingElement).toBeInTheDocument()
    }
  })

  const elementsWithAriaLabelledBy = container.querySelectorAll('[aria-labelledby]')
  elementsWithAriaLabelledBy.forEach(element => {
    const labelledById = element.getAttribute('aria-labelledby')
    if (labelledById) {
      const labellingElement = container.querySelector(`#${labelledById}`)
      expect(labellingElement).toBeInTheDocument()
    }
  })
}

/**
 * Comprehensive accessibility test suite
 */
export async function runAccessibilityTestSuite(
  component: React.ReactElement,
  options: {
    testKeyboard?: boolean
    testScreenReader?: boolean
    testFocus?: boolean
    testResponsive?: boolean
    expectedFocusableElements?: string[]
    expectedAnnouncements?: string[]
    viewports?: { width: number; height: number }[]
  } = {}
) {
  const {
    testKeyboard = true,
    testScreenReader = true,
    testFocus = true,
    testResponsive = false,
    expectedFocusableElements = [],
    expectedAnnouncements = [],
    viewports = [
      { width: 375, height: 667 }, // Mobile
      { width: 768, height: 1024 }, // Tablet
      { width: 1920, height: 1080 }, // Desktop
    ]
  } = options

  // Core accessibility test
  const { container } = await testAccessibility(component)
  const renderResult = { container } as RenderResult

  // Form accessibility
  testFormAccessibility(renderResult)

  // ARIA attributes
  testAriaAttributes(renderResult)

  // Color contrast
  testColorContrast(renderResult)

  // Keyboard navigation
  if (testKeyboard && expectedFocusableElements.length > 0) {
    await testKeyboardNavigation(renderResult, expectedFocusableElements)
  }

  // Screen reader announcements
  if (testScreenReader && expectedAnnouncements.length > 0) {
    testScreenReaderAnnouncements(renderResult, expectedAnnouncements)
  }

  // Focus management
  if (testFocus) {
    await testFocusManagement(renderResult)
  }

  // Responsive accessibility
  if (testResponsive) {
    testResponsiveAccessibility(component, viewports)
  }

  return renderResult
}