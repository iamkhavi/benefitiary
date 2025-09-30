"use client"

import { useState, useCallback } from 'react'

interface RetryOptions {
  maxAttempts?: number
  delay?: number
  backoffMultiplier?: number
  onRetry?: (attempt: number, error: Error) => void
}

interface RetryState {
  isRetrying: boolean
  attempt: number
  lastError: Error | null
}

export function useRetry<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  options: RetryOptions = {}
) {
  const {
    maxAttempts = 3,
    delay = 1000,
    backoffMultiplier = 2,
    onRetry
  } = options

  const [retryState, setRetryState] = useState<RetryState>({
    isRetrying: false,
    attempt: 0,
    lastError: null
  })

  const executeWithRetry = useCallback(
    async (...args: T): Promise<R> => {
      let currentAttempt = 0
      let currentDelay = delay

      while (currentAttempt < maxAttempts) {
        try {
          setRetryState({
            isRetrying: currentAttempt > 0,
            attempt: currentAttempt + 1,
            lastError: null
          })

          const result = await fn(...args)
          
          // Reset state on success
          setRetryState({
            isRetrying: false,
            attempt: 0,
            lastError: null
          })
          
          return result
        } catch (error) {
          currentAttempt++
          const isLastAttempt = currentAttempt >= maxAttempts
          const errorObj = error instanceof Error ? error : new Error(String(error))

          setRetryState({
            isRetrying: !isLastAttempt,
            attempt: currentAttempt,
            lastError: errorObj
          })

          if (isLastAttempt) {
            throw errorObj
          }

          // Call retry callback
          if (onRetry) {
            onRetry(currentAttempt, errorObj)
          }

          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, currentDelay))
          currentDelay *= backoffMultiplier
        }
      }

      throw new Error('Max retry attempts reached')
    },
    [fn, maxAttempts, delay, backoffMultiplier, onRetry]
  )

  const reset = useCallback(() => {
    setRetryState({
      isRetrying: false,
      attempt: 0,
      lastError: null
    })
  }, [])

  return {
    execute: executeWithRetry,
    ...retryState,
    reset
  }
}