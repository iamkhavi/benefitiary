"use client"

import { useEffect, useRef } from 'react'

/**
 * Hook for managing focus in onboarding forms
 * Ensures proper focus management for accessibility
 */
export function useFocusManagement() {
  const formRef = useRef<HTMLFormElement>(null)
  const firstErrorRef = useRef<HTMLElement | null>(null)

  /**
   * Focus the first form element or first error if validation fails
   */
  const focusFirstElement = () => {
    if (!formRef.current) return

    // First try to focus the first error
    const firstError = formRef.current.querySelector('[aria-invalid="true"]') as HTMLElement
    if (firstError) {
      firstError.focus()
      return
    }

    // Otherwise focus the first focusable element
    const firstFocusable = formRef.current.querySelector(
      'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    ) as HTMLElement
    
    if (firstFocusable) {
      firstFocusable.focus()
    }
  }

  /**
   * Focus the first error element when validation fails
   */
  const focusFirstError = () => {
    if (!formRef.current) return

    const firstError = formRef.current.querySelector('[aria-invalid="true"]') as HTMLElement
    if (firstError) {
      firstError.focus()
      firstError.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  /**
   * Trap focus within the form for modal-like behavior
   */
  const trapFocus = (event: KeyboardEvent) => {
    if (!formRef.current || event.key !== 'Tab') return

    const focusableElements = formRef.current.querySelectorAll(
      'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
    
    const firstElement = focusableElements[0] as HTMLElement
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

    if (event.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstElement) {
        event.preventDefault()
        lastElement.focus()
      }
    } else {
      // Tab
      if (document.activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
      }
    }
  }

  /**
   * Handle escape key to provide exit option
   */
  const handleEscape = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      // Allow users to escape focus trap if needed
      const skipLink = document.querySelector('a[href="#main-content"]') as HTMLElement
      if (skipLink) {
        skipLink.focus()
      }
    }
  }

  useEffect(() => {
    const form = formRef.current
    if (!form) return

    const handleKeyDown = (event: KeyboardEvent) => {
      trapFocus(event)
      handleEscape(event)
    }

    form.addEventListener('keydown', handleKeyDown)
    
    return () => {
      form.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  return {
    formRef,
    focusFirstElement,
    focusFirstError,
  }
}