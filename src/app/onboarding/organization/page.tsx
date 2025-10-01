"use client"

import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useOnboarding } from '@/components/onboarding/onboarding-context'
import { organizationSchema, type OrganizationFormData } from '@/lib/validations/onboarding'
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
import { Building2, Users, Globe, MapPin, Loader2, Check, Search, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSession } from '@/lib/auth-client'

// Comprehensive country list with search
const countries = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria",
  "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan",
  "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi", "Cabo Verde", "Cambodia",
  "Cameroon", "Canada", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo", "Costa Rica",
  "Croatia", "Cuba", "Cyprus", "Czech Republic", "Democratic Republic of the Congo", "Denmark", "Djibouti", "Dominica", "Dominican Republic", "Ecuador",
  "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia", "Fiji", "Finland", "France",
  "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau",
  "Guyana", "Haiti", "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland",
  "Israel", "Italy", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati", "Kuwait", "Kyrgyzstan",
  "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg", "Madagascar",
  "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia",
  "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar", "Namibia", "Nauru", "Nepal",
  "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Korea", "North Macedonia", "Norway", "Oman", "Pakistan",
  "Palau", "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal", "Qatar",
  "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia",
  "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa",
  "South Korea", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria", "Taiwan",
  "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan",
  "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "Uzbekistan", "Vanuatu", "Vatican City",
  "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe"
]

// Organization types with descriptions and icons
const organizationTypes = [
  {
    value: 'Nonprofit',
    label: 'Nonprofit',
    description: '501(c)(3) and other tax-exempt organizations',
    icon: '🏛️',
    examples: 'Charities, foundations, NGOs'
  },
  {
    value: 'SME',
    label: 'Business',
    description: 'For-profit companies, startups, and enterprises',
    icon: '🏢',
    examples: 'Startups, SMEs, corporations'
  },
  {
    value: 'Academic',
    label: 'Academic Institution',
    description: 'Universities, colleges, schools, and research centers',
    icon: '🎓',
    examples: 'Universities, research institutes'
  },
  {
    value: 'Healthcare',
    label: 'Healthcare',
    description: 'Hospitals, clinics, and health organizations',
    icon: '🏥',
    examples: 'Hospitals, health centers, medical research'
  },
  {
    value: 'Other',
    label: 'Other',
    description: 'Specify your organization type',
    icon: '⚡',
    examples: 'Government agencies, consultancies'
  }
]

// Organization sizes with descriptions
const organizationSizes = [
  {
    value: 'Solo',
    label: 'Solo',
    description: 'Individual or freelancer',
    range: '1 person',
    icon: '👤'
  },
  {
    value: 'Micro',
    label: 'Micro',
    description: 'Small team or startup',
    range: '2-9 people',
    icon: '👥'
  },
  {
    value: 'Small',
    label: 'Small',
    description: 'Growing organization',
    range: '10-49 people',
    icon: '🏢'
  },
  {
    value: 'Medium',
    label: 'Medium',
    description: 'Established organization',
    range: '50-249 people',
    icon: '🏬'
  },
  {
    value: 'Large',
    label: 'Large',
    description: 'Enterprise organization',
    range: '250+ people',
    icon: '🏭'
  }
]

// Function to generate organization name from email
function generateOrgNameFromEmail(email: string): string {
  if (!email) return ''
  
  const domain = email.split('@')[1]
  if (!domain) return ''
  
  // Common email providers - generate random names for these
  const commonProviders = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'aol.com']
  
  if (commonProviders.includes(domain.toLowerCase())) {
    const randomNames = [
      'Innovative Solutions Inc',
      'Future Tech Ventures',
      'Global Impact Foundation',
      'NextGen Enterprises',
      'Sustainable Growth Co',
      'Digital Transformation Hub',
      'Community Development Group',
      'Strategic Consulting Partners',
      'Creative Solutions Network',
      'Impact Driven Organization'
    ]
    return randomNames[Math.floor(Math.random() * randomNames.length)]
  }
  
  // Extract organization name from domain
  const orgName = domain.split('.')[0]
  return orgName
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export default function OrganizationPage() {
  const router = useRouter()
  const { updateData, goNext, goBack, data } = useOnboarding()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [step, setStep] = useState<'type' | 'size' | 'details'>('type')
  const [selectedType, setSelectedType] = useState<string>('')
  const [selectedSize, setSelectedSize] = useState<string>('')

  
  const { data: session } = useSession()

  const form = useForm<OrganizationFormData>({
    resolver: zodResolver(organizationSchema),
    mode: 'onChange',
    defaultValues: {
      name: data.organization?.name || '',
      orgType: data.organization?.orgType as OrganizationFormData['orgType'] || undefined,
      size: data.organization?.size as OrganizationFormData['size'] || undefined,
      position: data.organization?.position as OrganizationFormData['position'] || undefined,
      website: data.organization?.website || '',
      country: data.organization?.country || '',
      region: data.organization?.region || '',
    },
  })

  // Auto-generate organization name when component mounts
  useEffect(() => {
    if (!form.getValues('name') && session?.user?.email) {
      const generatedName = generateOrgNameFromEmail(session.user.email)
      form.setValue('name', generatedName)
    }
  }, [session?.user?.email, form])

  const handleTypeSelect = (type: string) => {
    setSelectedType(type)
    form.setValue('orgType', type as OrganizationFormData['orgType'])
    setStep('size')
  }

  const handleSizeSelect = (size: string) => {
    setSelectedSize(size)
    form.setValue('size', size as OrganizationFormData['size'])
    setStep('details')
  }

  const onSubmit = async (formData: OrganizationFormData) => {
    console.log('Form submission started with data:', formData)
    console.log('Current session:', session)
    console.log('User logged in:', !!session?.user)
    setIsSubmitting(true)
    setApiError(null)

    try {
      const { onboardingAPI } = await import('@/lib/api-client')
      console.log('Calling API with data:', formData)
      const result = await onboardingAPI.createOrganization(formData)
      console.log('API response:', result)

      // Update local state and proceed to next step
      updateData({ organization: formData })
      goNext()
      
      // Navigate to preferences
      router.push('/onboarding/preferences')

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
          setIsSubmitting(false)
          return
        }
        setApiError(error.message)
      } else {
        setApiError(error instanceof Error ? error.message : 'An unexpected error occurred')
      }
      setIsSubmitting(false)
    }
  }

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      <div className="flex items-center space-x-2">
        <div className={cn(
          "w-8 h-1 rounded-full transition-colors",
          step === 'type' ? "bg-primary" : "bg-primary/30"
        )} />
        <div className={cn(
          "w-8 h-1 rounded-full transition-colors",
          step === 'size' ? "bg-primary" : step === 'details' ? "bg-primary/30" : "bg-gray-200"
        )} />
        <div className={cn(
          "w-8 h-1 rounded-full transition-colors",
          step === 'details' ? "bg-primary" : "bg-gray-200"
        )} />
      </div>
    </div>
  )

  if (step === 'type') {
    return (
      <div className="w-full max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Welcome to Benefitiary
          </h1>
          <p className="text-gray-600 text-lg">
            Find perfect funding opportunities with AI-powered matching in minutes, not months
          </p>
        </div>

        {renderStepIndicator()}

        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            What type of organization are you?
          </h2>
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-6">
            <Globe className="h-4 w-4" />
            <span>Why This Matters</span>
          </div>
          <p className="text-gray-600 mb-8">
            Different organization types are eligible for different funding sources. This helps us show the only relevant 
            opportunities and understand your nonprofit status.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {organizationTypes.map((type) => (
            <Card
              key={type.value}
              className={cn(
                "cursor-pointer transition-all duration-200 hover:shadow-md border-2",
                selectedType === type.value 
                  ? "border-primary bg-primary/5" 
                  : "border-gray-200 hover:border-gray-300"
              )}
              onClick={() => handleTypeSelect(type.value)}
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="text-2xl">{type.icon}</div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">{type.label}</h3>
                    <p className="text-gray-600 text-sm mb-2">{type.description}</p>
                    <p className="text-xs text-gray-500">{type.examples}</p>
                  </div>
                  {selectedType === type.value && (
                    <Check className="h-5 w-5 text-primary" />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex justify-between">
          <Button variant="outline" onClick={goBack}>
            Back
          </Button>
          <Button 
            onClick={() => selectedType && setStep('size')} 
            disabled={!selectedType}
          >
            Continue
          </Button>
        </div>
      </div>
    )
  }

  if (step === 'size') {
    return (
      <div className="w-full max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Organization Size
          </h1>
          <p className="text-gray-600 text-lg">
            Help us understand the scale of your organization
          </p>
        </div>

        {renderStepIndicator()}

        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            How many people work at your organization?
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {organizationSizes.map((size) => (
            <Card
              key={size.value}
              className={cn(
                "cursor-pointer transition-all duration-200 hover:shadow-md border-2",
                selectedSize === size.value 
                  ? "border-primary bg-primary/5" 
                  : "border-gray-200 hover:border-gray-300"
              )}
              onClick={() => handleSizeSelect(size.value)}
            >
              <CardContent className="p-6 text-center">
                <div className="text-3xl mb-3">{size.icon}</div>
                <h3 className="font-semibold text-gray-900 mb-1">{size.label}</h3>
                <p className="text-sm text-gray-600 mb-2">{size.description}</p>
                <p className="text-xs text-gray-500 font-medium">{size.range}</p>
                {selectedSize === size.value && (
                  <Check className="h-5 w-5 text-primary mx-auto mt-3" />
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setStep('type')}>
            Back
          </Button>
          <Button 
            onClick={() => selectedSize && setStep('details')} 
            disabled={!selectedSize}
          >
            Continue
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-4">
      <div className="text-center mb-8">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <MapPin className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          Organization Details
        </h1>
        <p className="text-gray-600 text-lg">
          Complete your organization profile
        </p>
      </div>

      {renderStepIndicator()}

      <Card>
        <CardContent className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {apiError && (
                <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive" role="alert">
                  <strong>Error:</strong> {apiError}
                </div>
              )}

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Organization Name *
                      {session?.user?.email && field.value && (
                        <div className="ml-auto flex items-center gap-1 text-xs text-gray-500">
                          <Sparkles className="h-3 w-3" />
                          Auto-suggested (editable)
                        </div>
                      )}
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder={field.value ? "" : "Enter your organization name"}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="position"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Your Position *
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your position" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="CEO">CEO</SelectItem>
                        <SelectItem value="Founder">Founder</SelectItem>
                        <SelectItem value="Program Manager">Program Manager</SelectItem>
                        <SelectItem value="Development Manager">Development Manager</SelectItem>
                        <SelectItem value="Grant Writer">Grant Writer</SelectItem>
                        <SelectItem value="Operations Manager">Operations Manager</SelectItem>
                        <SelectItem value="Project Coordinator">Project Coordinator</SelectItem>
                        <SelectItem value="Research Director">Research Director</SelectItem>
                        <SelectItem value="Finance Manager">Finance Manager</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Website (Optional)
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="https://yourorganization.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Country *
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your country" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-[300px]">
                        <div className="sticky top-0 bg-background p-2 border-b">
                          <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="Search countries..."
                              className="pl-8"
                              onChange={(e) => {
                                const searchTerm = e.target.value.toLowerCase()
                                const items = document.querySelectorAll('[data-country-item]')
                                items.forEach((item) => {
                                  const countryName = item.textContent?.toLowerCase() || ''
                                  if (countryName.includes(searchTerm)) {
                                    (item as HTMLElement).style.display = 'block'
                                  } else {
                                    (item as HTMLElement).style.display = 'none'
                                  }
                                })
                              }}
                            />
                          </div>
                        </div>
                        {countries.map((country) => (
                          <SelectItem key={country} value={country} data-country-item>
                            {country}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="position"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Your Position/Role *
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your position" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="CEO">CEO/Executive Director</SelectItem>
                        <SelectItem value="Founder">Founder</SelectItem>
                        <SelectItem value="Program Manager">Program Manager</SelectItem>
                        <SelectItem value="Development Manager">Development Manager</SelectItem>
                        <SelectItem value="Grant Writer">Grant Writer</SelectItem>
                        <SelectItem value="Operations Manager">Operations Manager</SelectItem>
                        <SelectItem value="Project Coordinator">Project Coordinator</SelectItem>
                        <SelectItem value="Research Director">Research Director</SelectItem>
                        <SelectItem value="Finance Manager">Finance Manager</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Organization Website (Optional)
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="https://yourorganization.com" 
                        {...field}
                        type="url"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="region"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Region/State (Optional)
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your region or state" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-between pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep('size')}
                  disabled={isSubmitting}
                >
                  Back
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  onClick={() => {
                    console.log('Submit button clicked')
                    console.log('Form values:', form.getValues())
                    console.log('Form errors:', form.formState.errors)
                    console.log('Form is valid:', form.formState.isValid)
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Continue to Preferences'
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}