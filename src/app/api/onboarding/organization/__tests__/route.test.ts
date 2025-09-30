import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { POST } from '../route'
import { NextRequest } from 'next/server'

// Mock dependencies
vi.mock('@/lib/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    organizations: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue({}),
}))

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

describe('/api/onboarding/organization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('creates new organization successfully', async () => {
    const mockSession = {
      user: { id: 'user-123' }
    }

    const mockOrganization = {
      id: 'org-123',
      user_id: 'user-123',
      name: 'Test Organization',
      industry: 'sme',
      size: 'small_business',
      location: 'United States, California',
    }

    ;(auth.api.getSession as any).mockResolvedValue(mockSession)
    ;(prisma.organizations.findFirst as any).mockResolvedValue(null)
    ;(prisma.organizations.create as any).mockResolvedValue(mockOrganization)

    const request = new NextRequest('http://localhost:3000/api/onboarding/organization', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test Organization',
        orgType: 'SME',
        size: 'Small',
        country: 'United States',
        region: 'California',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.organization).toEqual({
      id: 'org-123',
      name: 'Test Organization',
      orgType: 'SME',
      size: 'Small',
      country: 'United States',
      region: 'California',
    })

    expect(prisma.organizations.create).toHaveBeenCalledWith({
      data: {
        user_id: 'user-123',
        name: 'Test Organization',
        industry: 'sme',
        size: 'small_business',
        location: 'United States, California',
      }
    })
  })

  it('updates existing organization', async () => {
    const mockSession = {
      user: { id: 'user-123' }
    }

    const existingOrg = {
      id: 'org-123',
      user_id: 'user-123',
      name: 'Old Name',
      industry: 'nonprofit',
      size: 'startup',
      location: 'Canada',
    }

    const updatedOrg = {
      ...existingOrg,
      name: 'Updated Organization',
      industry: 'sme',
      size: 'medium_business',
      location: 'United States, New York',
      updated_at: new Date(),
    }

    ;(auth.api.getSession as any).mockResolvedValue(mockSession)
    ;(prisma.organizations.findFirst as any).mockResolvedValue(existingOrg)
    ;(prisma.organizations.update as any).mockResolvedValue(updatedOrg)

    const request = new NextRequest('http://localhost:3000/api/onboarding/organization', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Updated Organization',
        orgType: 'SME',
        size: 'Medium',
        country: 'United States',
        region: 'New York',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(prisma.organizations.update).toHaveBeenCalledWith({
      where: { id: 'org-123' },
      data: {
        name: 'Updated Organization',
        industry: 'sme',
        size: 'medium_business',
        location: 'United States, New York',
        updated_at: expect.any(Date),
      }
    })
  })

  it('returns 401 when user is not authenticated', async () => {
    ;(auth.api.getSession as any).mockResolvedValue(null)

    const request = new NextRequest('http://localhost:3000/api/onboarding/organization', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test Organization',
        orgType: 'SME',
        size: 'Small',
        country: 'United States',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
    expect(data.code).toBe('AUTH_ERROR')
  })

  it('returns 400 for invalid data', async () => {
    const mockSession = {
      user: { id: 'user-123' }
    }

    ;(auth.api.getSession as any).mockResolvedValue(mockSession)

    const request = new NextRequest('http://localhost:3000/api/onboarding/organization', {
      method: 'POST',
      body: JSON.stringify({
        name: '', // Invalid: too short
        orgType: 'InvalidType', // Invalid: not in enum
        size: 'Small',
        country: 'United States',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Validation failed')
    expect(data.code).toBe('VALIDATION_ERROR')
    expect(data.details).toBeDefined()
  })

  it('handles database errors', async () => {
    const mockSession = {
      user: { id: 'user-123' }
    }

    ;(auth.api.getSession as any).mockResolvedValue(mockSession)
    ;(prisma.organizations.findFirst as any).mockResolvedValue(null)
    ;(prisma.organizations.create as any).mockRejectedValue(new Error('Database connection failed'))

    const request = new NextRequest('http://localhost:3000/api/onboarding/organization', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test Organization',
        orgType: 'SME',
        size: 'Small',
        country: 'United States',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal server error')
    expect(data.code).toBe('DATABASE_ERROR')
  })

  it('handles organization without region', async () => {
    const mockSession = {
      user: { id: 'user-123' }
    }

    const mockOrganization = {
      id: 'org-123',
      user_id: 'user-123',
      name: 'Test Organization',
      industry: 'nonprofit',
      size: 'small_business',
      location: 'Canada',
    }

    ;(auth.api.getSession as any).mockResolvedValue(mockSession)
    ;(prisma.organizations.findFirst as any).mockResolvedValue(null)
    ;(prisma.organizations.create as any).mockResolvedValue(mockOrganization)

    const request = new NextRequest('http://localhost:3000/api/onboarding/organization', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test Organization',
        orgType: 'Nonprofit',
        size: 'Small',
        country: 'Canada',
        region: '', // Empty region
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.organization.region).toBe(null)
    expect(prisma.organizations.create).toHaveBeenCalledWith({
      data: {
        user_id: 'user-123',
        name: 'Test Organization',
        industry: 'nonprofit',
        size: 'small_business',
        location: 'Canada', // No region appended
      }
    })
  })

  it('maps organization types correctly', async () => {
    const mockSession = {
      user: { id: 'user-123' }
    }

    ;(auth.api.getSession as any).mockResolvedValue(mockSession)
    ;(prisma.organizations.findFirst as any).mockResolvedValue(null)
    ;(prisma.organizations.create as any).mockResolvedValue({
      id: 'org-123',
      user_id: 'user-123',
      name: 'Test',
      industry: 'healthcare',
      size: 'large_enterprise',
      location: 'US',
    })

    const request = new NextRequest('http://localhost:3000/api/onboarding/organization', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test',
        orgType: 'Healthcare',
        size: 'Large',
        country: 'US',
      }),
    })

    await POST(request)

    expect(prisma.organizations.create).toHaveBeenCalledWith({
      data: {
        user_id: 'user-123',
        name: 'Test',
        industry: 'healthcare',
        size: 'large_enterprise',
        location: 'US',
      }
    })
  })
})