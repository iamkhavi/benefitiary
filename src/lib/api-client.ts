"use client"

export interface APIError {
  error: string
  code: 'VALIDATION_ERROR' | 'AUTH_ERROR' | 'DATABASE_ERROR' | 'EXTERNAL_API_ERROR' | 'NETWORK_ERROR'
  details?: Record<string, string | string[]>
  statusCode?: number
}

export class APIClientError extends Error {
  public readonly code: APIError['code']
  public readonly details?: APIError['details']
  public readonly statusCode?: number

  constructor(apiError: APIError) {
    super(apiError.error)
    this.name = 'APIClientError'
    this.code = apiError.code
    this.details = apiError.details
    this.statusCode = apiError.statusCode
  }

  static fromResponse(response: Response, data: any): APIClientError {
    const error: APIError = {
      error: data.error || `HTTP ${response.status}: ${response.statusText}`,
      code: data.code || 'NETWORK_ERROR',
      details: data.details,
      statusCode: response.status
    }
    return new APIClientError(error)
  }
}

interface RequestOptions extends RequestInit {
  timeout?: number
  retries?: number
  retryDelay?: number
}

class APIClient {
  private baseURL: string

  constructor(baseURL: string = '') {
    this.baseURL = baseURL
  }

  private async makeRequest<T>(
    endpoint: string, 
    options: RequestOptions = {}
  ): Promise<T> {
    const {
      timeout = 10000,
      retries = 3,
      retryDelay = 1000,
      ...fetchOptions
    } = options

    const url = `${this.baseURL}${endpoint}`
    
    // Set default headers
    const headers = {
      'Content-Type': 'application/json',
      ...fetchOptions.headers
    }

    let lastError: Error | null = null

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        // Create abort controller for timeout
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), timeout)

        const response = await fetch(url, {
          ...fetchOptions,
          headers,
          credentials: 'include', // Include cookies for authentication
          signal: controller.signal
        })

        clearTimeout(timeoutId)

        // Parse response
        let data: any
        const contentType = response.headers.get('content-type')
        
        if (contentType?.includes('application/json')) {
          data = await response.json()
        } else {
          data = await response.text()
        }

        // Handle HTTP errors
        if (!response.ok) {
          throw APIClientError.fromResponse(response, data)
        }

        return data as T
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))

        // Don't retry on certain errors
        if (error instanceof APIClientError) {
          const nonRetryableCodes = ['VALIDATION_ERROR', 'AUTH_ERROR']
          if (nonRetryableCodes.includes(error.code) || error.statusCode === 401) {
            throw error
          }
        }

        // Don't retry on last attempt
        if (attempt === retries) {
          break
        }

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)))
      }
    }

    throw lastError || new Error('Request failed after retries')
  }

  async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.makeRequest<T>(endpoint, { ...options, method: 'GET' })
  }

  async post<T>(endpoint: string, data?: any, options?: RequestOptions): Promise<T> {
    return this.makeRequest<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    })
  }

  async patch<T>(endpoint: string, data?: any, options?: RequestOptions): Promise<T> {
    return this.makeRequest<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined
    })
  }

  async put<T>(endpoint: string, data?: any, options?: RequestOptions): Promise<T> {
    return this.makeRequest<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined
    })
  }

  async delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.makeRequest<T>(endpoint, { ...options, method: 'DELETE' })
  }
}

// Create singleton instance
export const apiClient = new APIClient()

// Export the class for testing
export { APIClient }

// Onboarding-specific API methods
export const onboardingAPI = {
  createOrganization: (data: any) => 
    apiClient.post('/api/onboarding/organization', data),
  
  updateRole: (data: any) => 
    apiClient.patch('/api/onboarding/role', data),
  
  savePreferences: (data: any) => 
    apiClient.post('/api/onboarding/preferences', data)
}