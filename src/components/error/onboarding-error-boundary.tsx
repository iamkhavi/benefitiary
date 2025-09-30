"use client"

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, Home, RefreshCw } from 'lucide-react'
import Link from 'next/link'

interface Props {
  children: ReactNode
  onReset?: () => void
}

interface State {
  hasError: boolean
  error?: Error
  errorId: string
}

export class OnboardingErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { 
      hasError: false,
      errorId: Math.random().toString(36).substr(2, 9)
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { 
      hasError: true, 
      error,
      errorId: Math.random().toString(36).substr(2, 9)
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('OnboardingErrorBoundary caught an error:', {
      error: error.toString(),
      errorInfo,
      errorId: this.state.errorId,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    })

    // In a real app, you might want to send this to an error reporting service
    // Example: Sentry.captureException(error, { contexts: { errorInfo } })
  }

  handleStartOver = () => {
    // Clear onboarding data from localStorage
    try {
      localStorage.removeItem('benefitiary-onboarding-data')
    } catch (e) {
      console.warn('Failed to clear localStorage:', e)
    }

    // Reset error state
    this.setState({ hasError: false, error: undefined })
    
    // Call optional reset handler
    if (this.props.onReset) {
      this.props.onReset()
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="max-w-lg w-full">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-8 h-8 text-destructive" />
              </div>
              <CardTitle className="text-2xl">Onboarding Error</CardTitle>
              <CardDescription className="text-base">
                We encountered an issue during your onboarding process. 
                Don't worry - your progress may have been saved.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">
                  <strong>Error ID:</strong> {this.state.errorId}
                </p>
                <p className="text-sm text-muted-foreground">
                  Please include this ID if you contact support.
                </p>
              </div>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="text-sm bg-muted p-3 rounded-md">
                  <summary className="cursor-pointer font-medium mb-2">
                    Technical Details (Development)
                  </summary>
                  <pre className="whitespace-pre-wrap text-xs overflow-auto max-h-32">
                    {this.state.error.toString()}
                  </pre>
                </details>
              )}

              <div className="grid gap-3">
                <Button 
                  onClick={this.handleRetry}
                  className="w-full flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </Button>
                
                <Button 
                  onClick={this.handleStartOver}
                  variant="outline"
                  className="w-full"
                >
                  Start Onboarding Over
                </Button>
                
                <Button 
                  asChild
                  variant="ghost"
                  className="w-full flex items-center gap-2"
                >
                  <Link href="/">
                    <Home className="w-4 h-4" />
                    Return to Home
                  </Link>
                </Button>
              </div>

              <div className="text-center text-sm text-muted-foreground">
                <p>
                  Still having trouble?{' '}
                  <a 
                    href="mailto:support@benefitiary.com" 
                    className="text-primary hover:underline"
                  >
                    Contact Support
                  </a>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}