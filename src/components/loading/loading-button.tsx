"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LoadingButtonProps extends React.ComponentProps<typeof Button> {
  loading?: boolean
  loadingText?: string
  icon?: React.ReactNode
}

export function LoadingButton({
  loading = false,
  loadingText,
  icon,
  children,
  disabled,
  className,
  ...props
}: LoadingButtonProps) {
  return (
    <Button
      disabled={disabled || loading}
      className={cn(className)}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {loadingText || children}
        </>
      ) : (
        <>
          {icon && <span className="mr-2">{icon}</span>}
          {children}
        </>
      )}
    </Button>
  )
}

export function SubmitButton({
  loading = false,
  loadingText = "Submitting...",
  children = "Submit",
  ...props
}: Omit<LoadingButtonProps, 'type'>) {
  return (
    <LoadingButton
      type="submit"
      loading={loading}
      loadingText={loadingText}
      {...props}
    >
      {children}
    </LoadingButton>
  )
}