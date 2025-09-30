"use client"

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useOnboarding } from '@/components/onboarding/onboarding-context'
import { organizationSchema, countries, type OrganizationFormData } from '@/lib/validations/onboarding'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2, Users, Globe, MapPin, Loader2 } from 'lucide-react'

export default function OrganizationPage() {
  const { updateData, goNext, goBack, data } = useOnboarding()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  const form = useForm<OrganizationFormData>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      name: data.organization?.name || '',
      orgType: data.organization?.orgType as OrganizationFormData['orgType'] || undefined,
      size: data.organization?.size as OrganizationFormData['size'] || undefined,
      country: data.organization?.country || '',
      region: data.organization?.region || '',
    },
  })

  const onSubmit = async (formData: OrganizationFormData) => {
    setIsSubmitting(true)
    setApiError(null)

    try {
      const { onboardingAPI } = await import('@/lib/api-client')
      const result = await onboardingAPI.createOrganization(formData)

      // Update local state and proceed to next step
      updateData({ organization: formData })
      goNext()

    } catch (error) {
      console.error('Organization submission error:', error)
      
      if (error instanceof (await import('@/lib/api-client')).APIClientError) {
        if (error.code === 'VALIDATION_ERROR' && error.details) {
          // Set field-specific errors
          Object.entries(error.details).forEach(([field, messages]) => {
            const messageArray = Array.isArray(messages) ? messages : [messages]
            if (messageArray.length > 0) {
              form.setError(field as keyof OrganizationFormData, {
                message: messageArray[0]
              })
            }
          })
          return
        }
        setApiError(error.message)
      } else {
        setApiError(error instanceof Error ? error.message : 'An unexpected error occurred')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <Card role="main">
        <CardHeader className="text-center px-4 sm:px-6 py-4 sm:py-6">
          <div 
            className="mx-auto mb-3 sm:mb-4 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg bg-primary/10"
            aria-hidden="true"
          >
            <Building2 className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          </div>
          <CardTitle className="text-xl sm:text-2xl" id="organization-form-title">
            Organization Profile
          </CardTitle>
          <CardDescription className="text-sm sm:text-base" id="organization-form-description">
            Tell us about your organization to help us match you with relevant grants.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
          <Form {...form}>
            <form 
              onSubmit={form.handleSubmit(onSubmit)} 
              className="space-y-4 sm:space-y-6"
              aria-labelledby="organization-form-title"
              aria-describedby="organization-form-description"
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

              <fieldset disabled={isSubmitting} className="space-y-4 sm:space-y-6">
                <legend className="sr-only">Organization information</legend>

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" aria-hidden="true" />
                        Organization Name *
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter your organization name" 
                          {...field}
                          aria-required="true"
                          aria-invalid={!!form.formState.errors.name}
                        />
                      </FormControl>
                      <FormMessage role="alert" aria-live="polite" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="orgType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" aria-hidden="true" />
                        Organization Type *
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger aria-required="true" aria-invalid={!!form.formState.errors.orgType}>
                            <SelectValue placeholder="Select organization type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="SME">SME (Small/Medium Enterprise)</SelectItem>
                          <SelectItem value="Nonprofit">Nonprofit/NGO</SelectItem>
                          <SelectItem value="Academic">Academic Institution</SelectItem>
                          <SelectItem value="Healthcare">Healthcare Organization</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage role="alert" aria-live="polite" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="size"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Users className="h-4 w-4" aria-hidden="true" />
                        Organization Size *
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger aria-required="true" aria-invalid={!!form.formState.errors.size}>
                            <SelectValue placeholder="Select organization size" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Solo">Solo (1 person)</SelectItem>
                          <SelectItem value="Micro">Micro (2-9 people)</SelectItem>
                          <SelectItem value="Small">Small (10-49 people)</SelectItem>
                          <SelectItem value="Medium">Medium (50-249 people)</SelectItem>
                          <SelectItem value="Large">Large (250+ people)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage role="alert" aria-live="polite" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Globe className="h-4 w-4" aria-hidden="true" />
                        Country *
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger aria-required="true" aria-invalid={!!form.formState.errors.country}>
                            <SelectValue placeholder="Select your country" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-h-[200px]">
                          {countries.map((country) => (
                            <SelectItem key={country} value={country}>
                              {country}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage role="alert" aria-live="polite" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="region"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" aria-hidden="true" />
                        Region/State (Optional)
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter your region or state" 
                          {...field}
                          aria-invalid={!!form.formState.errors.region}
                        />
                      </FormControl>
                      <FormMessage role="alert" aria-live="polite" />
                    </FormItem>
                  )}
                />
              </fieldset>

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
                  aria-label="Go back to previous step"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:flex-1 min-h-[44px]"
                  aria-label={isSubmitting ? "Saving organization profile" : "Continue to role selection"}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                      <span aria-live="polite">Saving...</span>
                    </>
                  ) : (
                    <>
                      <span className="sm:hidden">Continue</span>
                      <span className="hidden sm:inline">Continue to Role Selection</span>
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