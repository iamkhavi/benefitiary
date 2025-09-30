"use client"

import { useEffect } from 'react'
import { initializePerformanceMonitoring } from '@/lib/performance'

export function PerformanceMonitor() {
  useEffect(() => {
    initializePerformanceMonitoring()
  }, [])

  return null
}