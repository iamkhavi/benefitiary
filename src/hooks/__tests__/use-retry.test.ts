import { renderHook, act } from '@testing-library/react'
import { vi } from 'vitest'
import { useRetry } from '../use-retry'

describe('useRetry', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('executes function successfully on first attempt', async () => {
    const mockFn = vi.fn().mockResolvedValue('success')
    const { result } = renderHook(() => useRetry(mockFn))

    let response: string
    await act(async () => {
      response = await result.current.execute('arg1', 'arg2')
    })

    expect(response!).toBe('success')
    expect(mockFn).toHaveBeenCalledTimes(1)
    expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2')
    expect(result.current.isRetrying).toBe(false)
    expect(result.current.attempt).toBe(0)
    expect(result.current.lastError).toBeNull()
  })

  it('retries on failure and eventually succeeds', async () => {
    const mockFn = vi.fn()
      .mockRejectedValueOnce(new Error('First failure'))
      .mockRejectedValueOnce(new Error('Second failure'))
      .mockResolvedValue('success')

    const { result } = renderHook(() => useRetry(mockFn, { delay: 10 }))

    let response: string
    await act(async () => {
      response = await result.current.execute('test')
    })

    expect(response!).toBe('success')
    expect(mockFn).toHaveBeenCalledTimes(3)
    expect(result.current.isRetrying).toBe(false)
    expect(result.current.attempt).toBe(0)
  })

  it('fails after max attempts', async () => {
    const mockFn = vi.fn().mockRejectedValue(new Error('Persistent failure'))
    const { result } = renderHook(() => useRetry(mockFn, { maxAttempts: 2, delay: 10 }))

    let error: Error | undefined
    await act(async () => {
      try {
        await result.current.execute('test')
      } catch (e) {
        error = e as Error
      }
    })

    expect(error?.message).toBe('Persistent failure')
    expect(mockFn).toHaveBeenCalledTimes(2)
    expect(result.current.isRetrying).toBe(false)
    expect(result.current.attempt).toBe(2)
    expect(result.current.lastError?.message).toBe('Persistent failure')
  })

  it('calls onRetry callback on each retry', async () => {
    const mockFn = vi.fn()
      .mockRejectedValueOnce(new Error('First failure'))
      .mockResolvedValue('success')

    const onRetry = vi.fn()
    const { result } = renderHook(() => useRetry(mockFn, { onRetry, delay: 10 }))

    await act(async () => {
      await result.current.execute('test')
    })

    expect(onRetry).toHaveBeenCalledTimes(1)
    expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error))
  })

  it('applies exponential backoff', async () => {
    const mockFn = vi.fn()
      .mockRejectedValueOnce(new Error('First failure'))
      .mockRejectedValueOnce(new Error('Second failure'))
      .mockResolvedValue('success')

    const startTime = Date.now()
    const { result } = renderHook(() => 
      useRetry(mockFn, { delay: 100, backoffMultiplier: 2 })
    )

    await act(async () => {
      await result.current.execute('test')
    })

    const endTime = Date.now()
    const totalTime = endTime - startTime

    // Should have waited at least 100ms + 200ms = 300ms
    expect(totalTime).toBeGreaterThan(250)
  })

  it('resets state correctly', async () => {
    const mockFn = vi.fn().mockRejectedValue(new Error('Failure'))
    const { result } = renderHook(() => useRetry(mockFn, { maxAttempts: 1, delay: 10 }))

    await act(async () => {
      try {
        await result.current.execute('test')
      } catch (e) {
        // Expected to fail
      }
    })

    expect(result.current.attempt).toBe(1)
    expect(result.current.lastError).toBeTruthy()

    act(() => {
      result.current.reset()
    })

    expect(result.current.attempt).toBe(0)
    expect(result.current.lastError).toBeNull()
    expect(result.current.isRetrying).toBe(false)
  })

  it('handles non-Error objects', async () => {
    const mockFn = vi.fn().mockRejectedValue('String error')
    const { result } = renderHook(() => useRetry(mockFn, { maxAttempts: 1, delay: 10 }))

    let error: Error | undefined
    await act(async () => {
      try {
        await result.current.execute('test')
      } catch (e) {
        error = e as Error
      }
    })

    expect(error?.message).toBe('String error')
    expect(result.current.lastError?.message).toBe('String error')
  })
})