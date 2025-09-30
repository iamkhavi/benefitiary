import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface FormSkeletonProps {
  fields?: number
  showHeader?: boolean
  showNavigation?: boolean
}

export function FormSkeleton({ 
  fields = 3, 
  showHeader = true, 
  showNavigation = true 
}: FormSkeletonProps) {
  return (
    <Card className="max-w-2xl mx-auto">
      {showHeader && (
        <CardHeader>
          <Skeleton className="h-8 w-3/4 mb-2" />
          <Skeleton className="h-4 w-full" />
        </CardHeader>
      )}
      
      <CardContent className="space-y-6">
        {Array.from({ length: fields }).map((_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
        
        {showNavigation && (
          <div className="flex justify-between pt-4">
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-10 w-24" />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function OnboardingFormSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header skeleton */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-32" />
            <div className="flex items-center space-x-4">
              <Skeleton className="h-2 w-48" />
              <Skeleton className="h-6 w-16" />
            </div>
          </div>
        </div>
      </div>
      
      {/* Main content skeleton */}
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <FormSkeleton fields={4} />
      </main>
    </div>
  )
}