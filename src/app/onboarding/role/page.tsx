"use client"

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useOnboarding } from '@/components/onboarding/onboarding-context'
import { roleSchema, type RoleFormData } from '@/lib/validations/onboarding'
import { Button } from '@/components/ui/button'
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Search, PenTool, DollarSign, Loader2, Users } from 'lucide-react'

interface RoleOption {
  value: 'seeker' | 'writer' | 'funder'
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  features: string[]
}

const roleOptions: RoleOption[] = [
  {
    value: 'seeker',
    title: 'Grant Seeker',
    description: 'Find grants for your organization',
    icon: Search,
    features: [
      'Discover relevant grants based on your profile',
      'Track application deadlines and status',
      'Get AI assistance with proposal writing',
      'Access grant writing resources and templates'
    ]
  },
  {
    value: 'writer',
    title: 'Grant Writer',
    description: 'Offer proposal writing services',
    icon: PenTool,
    features: [
      'Connect with organizations seeking writing help',
      'Manage multiple client projects',
      'Access advanced writing and editing tools',
      'Build your professional portfolio'
    ]
  },
  {
    value: 'funder',
    title: 'Funder',
    description: 'Post grant opportunities',
    icon: DollarSign,
    features: [
      'Publish and manage grant opportunities',
      'Review and evaluate applications',
      'Find qualified organizations and applicants',
      'Track funding impact and outcomes'
    ]
  }
]

export default function RolePage() {
  const { updateData, goNext, goBack, data } = useOnboarding()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  const form = useForm<RoleFormData>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      role: data.role as RoleFormData['role'] || undefined,
    },
  })

  const onSubmit = async (formData: RoleFormData) => {
    setIsSubmitting(true)
    setApiError(null)

    try {
      const response = await fetch('/api/onboarding/role', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const result = await response.json()

      if (!response.ok) {
        if (result.code === 'VALIDATION_ERROR' && result.details) {
          // Set field-specific errors
          Object.entries(result.details).forEach(([field, messages]) => {
            if (Array.isArray(messages) && messages.length > 0) {
              form.setError(field as keyof RoleFormData, {
                message: messages[0]
              })
            }
          })
          return
        }
        throw new Error(result.error || 'Failed to update role')
      }

      // Update local state and proceed to next step
      updateData({ role: formData.role })
      goNext()

    } catch (error) {
      console.error('Role submission error:', error)
      setApiError(error instanceof Error ? error.message : 'An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-3xl mx-auto">
      <Card role="main">
        <CardHeader className="text-center px-4 sm:px-6 py-4 sm:py-6">
          <div 
            className="mx-auto mb-3 sm:mb-4 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg bg-primary/10"
            aria-hidden="true"
          >
            <Users className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          </div>
          <CardTitle className="text-xl sm:text-2xl" id="role-form-title">
            Select Your Role
          </CardTitle>
          <CardDescription className="text-sm sm:text-base" id="role-form-description">
            Choose how you'll primarily use Benefitiary. You can change this later in your settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
          <Form {...form}>
            <form 
              onSubmit={form.handleSubmit(onSubmit)} 
              className="space-y-4 sm:space-y-6"
              aria-labelledby="role-form-title"
              aria-describedby="role-form-description"
              noValidate
            >
              {apiError && (
                <div 
                  className="rounded-md bg-destructive/15 p-3 text-sm text-destructive"
                  role="alert"
                  aria-live="assertive"
                >
                  <strong>Error:</strong> {apiError}
                </div>
              )}

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel 
                      className="text-base font-medium"
                      id="role-selection-label"
                    >
                      How will you use Benefitiary? *
                    </FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="grid gap-3 sm:gap-4"
                        aria-labelledby="role-selection-label"
                        aria-required="true"
                        role="radiogroup"
                      >
                        {roleOptions.map((role, index) => {
                          const Icon = role.icon
                          const isSelected = field.value === role.value
                          return (
                            <div key={role.value} className="relative">
                              <RadioGroupItem
                                value={role.value}
                                id={role.value}
                                className="absolute top-4 right-4 z-10"
                                aria-describedby={`${role.value}-description`}
                              />
                              <FormLabel
                                htmlFor={role.value}
                                className="cursor-pointer block"
                              >
                                <Card 
                                  className={`hover:bg-accent/50 transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 ${
                                    isSelected 
                                      ? 'ring-2 ring-primary border-primary bg-accent/30' 
                                      : ''
                                  }`}
                                  tabIndex={-1}
                                >
                                  <CardHeader className="pb-2 sm:pb-3 px-4 sm:px-6 pt-4 sm:pt-6">
                                    <div className="flex items-start gap-3 sm:gap-4 pr-6 sm:pr-8">
                                      <div 
                                        className="p-2 sm:p-3 rounded-lg bg-primary/10 mt-1 flex-shrink-0"
                                        aria-hidden="true"
                                      >
                                        <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <CardTitle className="text-lg sm:text-xl mb-1">
                                          {role.title}
                                        </CardTitle>
                                        <CardDescription 
                                          className="text-sm sm:text-base"
                                          id={`${role.value}-description`}
                                        >
                                          {role.description}
                                        </CardDescription>
                                      </div>
                                    </div>
                                  </CardHeader>
                                  <CardContent className="pt-0 px-4 sm:px-6 pb-4 sm:pb-6">
                                    <ul 
                                      className="space-y-1.5 sm:space-y-2 ml-8 sm:ml-10"
                                      aria-label={`Features for ${role.title}`}
                                    >
                                      {role.features.map((feature, featureIndex) => (
                                        <li 
                                          key={featureIndex} 
                                          className="flex items-start gap-2 text-xs sm:text-sm text-muted-foreground"
                                        >
                                          <div 
                                            className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 sm:mt-2 flex-shrink-0" 
                                            aria-hidden="true"
                                          />
                                          <span className="leading-relaxed">{feature}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </CardContent>
                                </Card>
                              </FormLabel>
                            </div>
                          )
                        })}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage role="alert" aria-live="polite" />
                  </FormItem>
                )}
              />

              <nav 
                className="flex flex-col sm:flex-row gap-3 pt-4 sm:pt-6"
                role="navigation"
                aria-label="Form navigation"
              >
                <Button
                  type="button"
                  variant="outline"
                  onClick={goBack}
                  className="w-full sm:flex-1 min-h-[44px]"
                  disabled={isSubmitting}
                  aria-label="Go back to organization profile"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || !form.watch('role')}
                  className="w-full sm:flex-1 min-h-[44px]"
                  aria-label={isSubmitting ? "Saving role selection" : "Continue to preferences"}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                      <span aria-live="polite">Saving...</span>
                    </>
                  ) : (
                    <>
                      <span className="sm:hidden">Continue</span>
                      <span className="hidden sm:inline">Continue to Preferences</span>
                    </>
                  )}
                </Button>
              </nav>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}