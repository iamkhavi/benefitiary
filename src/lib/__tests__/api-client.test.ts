import { vi } from 'vitest'
import { APIClient, APIClientError, apiClient } from '../api-client'

// Mock fetch
global.fetch = vi.fn()

describe('APIClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.clearAllTimers()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('APIClientError', () => {
    it('creates error from API response', () => {
      const response = { status: 400, statusText: 'Bad Request' } as Response
      const data = {
        error: 'Validation failed',
        code: 'VALIDATION_ERROR' as const,
        details: { name: ['Required'] }
      }

      const error = APIClientError.fromResponse(response, data)

      expect(error.message).toBe('Validation failed')
      expect(error.code).toBe('VALIDATION_ERROR')
      expect(error.details).toEqual({ name: ['Required'] })
      expect(error.statusCode).toBe(400)
    })

    it('handles missing error message', () => {
      const response = { status: 500, statusText: 'Internal Server Error' } as Response
      const data = {}

      const error = APIClientError.fromResponse(response, data)

      expect(error.message).toBe('HTTP 500: Internal Server Error')
      expect(error.code).toBe('NETWORK_ERROR')
    })
  })

  describe('makeRequest', () => {
    it('makes successful GET request', async () => {
      const mockResponse = { success: true, data: 'test' }
      ;(fetch as any).mockResolvedValue({
        ok: true,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve(mockResponse)
      })

      const client = new APIClient()
      const result = await client.get('/test')

      expect(result).toEqual(mockResponse)
      expect(fetch).toHaveBeenCalledWith('/test', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })
    })

    it('makes successful POST request with data', async () => {
      const mockResponse = { success: true }
      const postData = { name: 'test' }
      
      ;(fetch as any).mockResolvedValue({
        ok: true,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve(mockResponse)
      })

      const client = new APIClient()
      const result = await client.post('/test', postData)

      expect(result).toEqual(mockResponse)
      expect(fetch).toHaveBeenCalledWith('/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postData)
      })
    })

    it('handles API error responses', async () => {
      const errorData = {
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: { name: ['Required'] }
      }
      
      ;(fetch as any).mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve(errorData)
      })

      const client = new APIClient()
      
      await expect(client.get('/test')).rejects.toThrow(APIClientError)
      
      try {
        await client.get('/test')
      } catch (error) {
        expect(error).toBeInstanceOf(APIClientError)
        expect((error as APIClientError).code).toBe('VALIDATION_ERROR')
        expect((error as APIClientError).details).toEqual({ name: ['Required'] })
      }
    })

    it('retries on network errors', async () => {
      ;(fetch as any)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue({
          ok: true,
          headers: { get: () => 'application/json' },
          json: () => Promise.resolve({ success: true })
        })

      const client = new APIClient()
      
      const promise = client.get('/test', { retries: 2, retryDelay: 100 })
      
      // Fast-forward timers to simulate delays
      vi.advanceTimersByTime(100)
      await Promise.resolve() // Let first retry happen
      vi.advanceTimersByTime(200)
      await Promise.resolve() // Let second retry happen
      
      const result = await promise
      expect(result).toEqual({ success: true })
      expect(fetch).toHaveBeenCalledTimes(3)
    })

    it('does not retry on validation errors', async () => {
      const errorData = {
        error: 'Validation failed',
        code: 'VALIDATION_ERROR'
      }
      
      ;(fetch as any).mockResolvedValue({
        ok: false,
        status: 400,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve(errorData)
      })

      const client = new APIClient()
      
      await expect(client.get('/test', { retries: 2 })).rejects.toThrow(APIClientError)
      expect(fetch).toHaveBeenCalledTimes(1)
    })

    it('handles timeout', async () => {
      ;(fetch as any).mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 15000))
      )

      const client = new APIClient()
      
      const promise = client.get('/test', { timeout: 5000 })
      
      vi.advanceTimersByTime(5000)
      
      await expect(promise).rejects.toThrow()
      expect(fetch).toHaveBeenCalledTimes(1)
    })

    it('handles non-JSON responses', async () => {
      ;(fetch as any).mockResolvedValue({
        ok: true,
        headers: { get: () => 'text/plain' },
        text: () => Promise.resolve('Plain text response')
      })

      const client = new APIClient()
      const result = await client.get('/test')

      expect(result).toBe('Plain text response')
    })
  })

  describe('HTTP methods', () => {
    beforeEach(() => {
      ;(fetch as any).mockResolvedValue({
        ok: true,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({ success: true })
      })
    })

    it('makes PATCH request', async () => {
      const client = new APIClient()
      const data = { name: 'updated' }
      
      await client.patch('/test', data)
      
      expect(fetch).toHaveBeenCalledWith('/test', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
    })

    it('makes PUT request', async () => {
      const client = new APIClient()
      const data = { name: 'replaced' }
      
      await client.put('/test', data)
      
      expect(fetch).toHaveBeenCalledWith('/test', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
    })

    it('makes DELETE request', async () => {
      const client = new APIClient()
      
      await client.delete('/test')
      
      expect(fetch).toHaveBeenCalledWith('/test', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      })
    })
  })
})