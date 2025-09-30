import { describe, it, expect } from 'vitest'
import { 
  organizationSchema, 
  roleSchema, 
  preferencesSchema 
} from '../onboarding'

describe('Onboarding Validation Schemas', () => {
  describe('organizationSchema', () => {
    it('should validate correct organization data', () => {
      const validData = {
        name: 'Test Organization',
        orgType: 'SME' as const,
        size: 'Small' as const,
        country: 'United States',
        region: 'California'
      }

      const result = organizationSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual(validData)
      }
    })

    it('should validate organization data without region', () => {
      const validData = {
        name: 'Test Organization',
        orgType: 'SME' as const,
        size: 'Small' as const,
        country: 'United States'
      }

      const result = organizationSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject organization name that is too short', () => {
      const invalidData = {
        name: 'A',
        orgType: 'SME' as const,
        size: 'Small' as const,
        country: 'United States'
      }

      const result = organizationSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Organization name must be at least 2 characters')
      }
    })

    it('should reject invalid organization type', () => {
      const invalidData = {
        name: 'Test Organization',
        orgType: 'InvalidType',
        size: 'Small' as const,
        country: 'United States'
      }

      const result = organizationSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject invalid organization size', () => {
      const invalidData = {
        name: 'Test Organization',
        orgType: 'SME' as const,
        size: 'InvalidSize',
        country: 'United States'
      }

      const result = organizationSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject missing required fields', () => {
      const invalidData = {
        name: '',
        orgType: undefined,
        size: undefined,
        country: ''
      }

      const result = organizationSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0)
      }
    })

    it('should validate all organization types', () => {
      const orgTypes = ['SME', 'Nonprofit', 'Academic', 'Healthcare', 'Other'] as const
      
      orgTypes.forEach(orgType => {
        const data = {
          name: 'Test Organization',
          orgType,
          size: 'Small' as const,
          country: 'United States'
        }

        const result = organizationSchema.safeParse(data)
        expect(result.success).toBe(true)
      })
    })

    it('should validate all organization sizes', () => {
      const sizes = ['Solo', 'Micro', 'Small', 'Medium', 'Large'] as const
      
      sizes.forEach(size => {
        const data = {
          name: 'Test Organization',
          orgType: 'SME' as const,
          size,
          country: 'United States'
        }

        const result = organizationSchema.safeParse(data)
        expect(result.success).toBe(true)
      })
    })
  })

  describe('roleSchema', () => {
    it('should validate correct role data', () => {
      const validData = {
        role: 'seeker' as const
      }

      const result = roleSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual(validData)
      }
    })

    it('should validate all valid roles', () => {
      const roles = ['seeker', 'writer', 'funder'] as const
      
      roles.forEach(role => {
        const data = { role }
        const result = roleSchema.safeParse(data)
        expect(result.success).toBe(true)
      })
    })

    it('should reject invalid role', () => {
      const invalidData = {
        role: 'invalid_role'
      }

      const result = roleSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject missing role', () => {
      const invalidData = {}

      const result = roleSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('preferencesSchema', () => {
    it('should validate correct preferences data', () => {
      const validData = {
        categories: ['HEALTHCARE_PUBLIC_HEALTH', 'EDUCATION_TRAINING', 'TECHNOLOGY_INNOVATION']
      }

      const result = preferencesSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual(validData)
      }
    })

    it('should validate single category', () => {
      const validData = {
        categories: ['HEALTHCARE_PUBLIC_HEALTH']
      }

      const result = preferencesSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should validate all available categories', () => {
      const allCategories = [
        'HEALTHCARE_PUBLIC_HEALTH',
        'EDUCATION_TRAINING',
        'AGRICULTURE_FOOD_SECURITY',
        'CLIMATE_ENVIRONMENT',
        'TECHNOLOGY_INNOVATION',
        'WOMEN_YOUTH_EMPOWERMENT',
        'ARTS_CULTURE',
        'COMMUNITY_DEVELOPMENT',
        'HUMAN_RIGHTS_GOVERNANCE',
        'SME_BUSINESS_GROWTH'
      ]

      const validData = {
        categories: allCategories
      }

      const result = preferencesSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject empty categories array', () => {
      const invalidData = {
        categories: []
      }

      const result = preferencesSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Please select at least one category')
      }
    })

    it('should reject missing categories', () => {
      const invalidData = {}

      const result = preferencesSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject invalid category values', () => {
      const invalidData = {
        categories: ['invalid_category', 'another_invalid']
      }

      const result = preferencesSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject non-array categories', () => {
      const invalidData = {
        categories: 'not_an_array'
      }

      const result = preferencesSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })
})