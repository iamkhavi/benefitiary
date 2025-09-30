"use client"

import React from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw, X } from 'lucide-react'
import { APIClientError } from '@/lib/api-client'

interface ErrorDisplayProps {
  error: Error | APIClientError | string | null
  onRetry?: () => void
  onDismiss?: () => void
  title?: string
  className?: string
  variant?: 'default' | 'destructive'
  showRetry?: boolean
  showDismiss?: boolean
}

export function ErrorDisplay({
  error,
  onRetry,
  onDismiss,
  title = "Error",
  className,
  variant = "destructive",
  showRetry = true,
  showDismiss = true
}: ErrorDisplayProps) {
  if (!error) return null

  const errorMessage = typeof error === 'string' ? error : error.message
  const isAPIError = error instanceof APIClientError

  // Get user-friendly error message
  const getUserFriendlyMessage = (error: Error | APIClientError | string): string => {
    if (typeof error === 'string') return error

    if (isAPIError && error instanceof APIClientError) {
      switch (error.code) {
        case 'VALIDATION_ERROR':
          return 'Please check your input and try again.'
        case 'AUTH_ERROR':
          return 'You need to be logged in to perform this action.'
        case 'DATABASE_ERROR':
          return 'We\'re experiencing technical difficulties. Please try again.'
        case 'NETWORK_ERROR':
          return 'Network connection issue. Please check your internet connection.'
        case 'EXTERNAL_API_ERROR':
          return 'External service is temporarily unavailable. Please try again later.'
        default:
          return error.message
      }
    }

    // Handle common error patterns
    if (error.message.includes('fetch')) {
      return 'Network connection issue. Please check your internet connection.'
    }
    
    if (error.message.includes('timeout')) {
      return 'Request timed out. Please try again.'
    }

    return error.message
  }

  const friendlyMessage = getUserFriendlyMessage(error)

  return (
    <Alert variant={variant} className={className}>
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle className="flex items-center justify-between">
        {title}
        {showDismiss && onDismiss && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="h-auto p-1 hover:bg-transparent"
            aria-label="Dismiss error"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </AlertTitle>
      <AlertDescription className="space-y-3">
        <p>{friendlyMessage}</p>
        
        {/* Show validation details for API errors */}
        {isAPIError && error.details && (
          <div className="text-sm">
            <p className="font-medium mb-1">Details:</p>
            <ul className="list-disc list-inside space-y-1">
              {Object.entries(error.details).map(([field, messages]) => (
                <li key={field}>
                  <strong>{field}:</strong>{' '}
                  {Array.isArray(messages) ? messages.join(', ') : messages}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Development error details */}
        {process.env.NODE_ENV === 'development' && (
          <details className="text-xs bg-muted/50 p-2 rounded">
            <summary className="cursor-pointer font-medium">
              Technical Details (Development)
            </summary>
            <pre className="mt-2 whitespace-pre-wrap">
              {isAPIError ? JSON.stringify({
                message: error.message,
                code: error.code,
                statusCode: error.statusCode,
                details: error.details
              }, null, 2) : error.toString()}
            </pre>
          </details>
        )}

        {/* Action buttons */}
        {(showRetry && onRetry) && (
          <div className="flex gap-2 pt-2">
            <Button
              onClick={onRetry}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-3 w-3" />
              Try Again
            </Button>
          </div>
        )}
      </AlertDescription>
    </Alert>
  )
}

// Specialized error displays
export function ValidationErrorDisplay({ 
  error, 
  onDismiss 
}: { 
  error: APIClientError | null
  onDismiss?: () => void 
}) {
  if (!error || error.code !== 'VALIDATION_ERROR') return null

  return (
    <ErrorDisplay
      error={error}
      title="Validation Error"
      onDismiss={onDismiss}
      showRetry={false}
    />
  )
}

export function NetworkErrorDisplay({ 
  error, 
  onRetry, 
  onDismiss 
}: { 
  error: Error | null
  onRetry?: () => void
  onDismiss?: () => void 
}) {
  if (!error) return null

  const isNetworkError = error.message.includes('fetch') || 
                        error.message.includes('network') ||
                        error.message.includes('timeout')

  if (!isNetworkError) return null

  return (
    <ErrorDisplay
      error="Unable to connect to our servers. Please check your internet connection and try again."
      title="Connection Error"
      onRetry={onRetry}
      onDismiss={onDismiss}
    />
  )
}