import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { PATCH } from '../route'
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
    users: {
      update: vi.fn(),
    },
  },
}))

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue({}),
}))

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

describe('/api/onboarding/role', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('updates user role successfully', async () => {
    const mockSession = {
      user: { id: 'user-123' }
    }

    const mockUser = {
      id: 'user-123',
      role: 'seeker',
      updated_at: new Date(),
    }

    ;(auth.api.getSession as any).mockResolvedValue(mockSession)
    ;(prisma.users.update as any).mockResolvedValue(mockUser)

    const request = new NextRequest('http://localhost:3000/api/onboarding/role', {
      method: 'PATCH',
      body: JSON.stringify({
        role: 'seeker'
      }),
    })

    const response = await PATCH(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.user.role).toBe('seeker')

    expect(prisma.users.update).toHaveBeenCalledWith({
      where: { id: 'user-123' },
      data: {
        role: 'seeker',
        updated_at: expect.any(Date),
      }
    })
  })

  it('returns 401 when user is not authenticated', async () => {
    ;(auth.api.getSession as any).mockResolvedValue(null)

    const request = new NextRequest('http://localhost:3000/api/onboarding/role', {
      method: 'PATCH',
      body: JSON.stringify({
        role: 'writer'
      }),
    })

    const response = await PATCH(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
    expect(data.code).toBe('AUTH_ERROR')
  })

  it('returns 400 for invalid role', async () => {
    const mockSession = {
      user: { id: 'user-123' }
    }

    ;(auth.api.getSession as any).mockResolvedValue(mockSession)

    const request = new NextRequest('http://localhost:3000/api/onboarding/role', {
      method: 'PATCH',
      body: JSON.stringify({
        role: 'invalid_role'
      }),
    })

    const response = await PATCH(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Validation failed')
    expect(data.code).toBe('VALIDATION_ERROR')
    expect(data.details).toBeDefined()
  })

  it('returns 400 for missing role', async () => {
    const mockSession = {
      user: { id: 'user-123' }
    }

    ;(auth.api.getSession as any).mockResolvedValue(mockSession)

    const request = new NextRequest('http://localhost:3000/api/onboarding/role', {
      method: 'PATCH',
      body: JSON.stringify({}),
    })

    const response = await PATCH(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Validation failed')
    expect(data.code).toBe('VALIDATION_ERROR')
  })

  it('handles database errors', async () => {
    const mockSession = {
      user: { id: 'user-123' }
    }

    ;(auth.api.getSession as any).mockResolvedValue(mockSession)
    ;(prisma.users.update as any).mockRejectedValue(new Error('Database connection failed'))

    const request = new NextRequest('http://localhost:3000/api/onboarding/role', {
      method: 'PATCH',
      body: JSON.stringify({
        role: 'funder'
      }),
    })

    const response = await PATCH(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal server error')
    expect(data.code).toBe('DATABASE_ERROR')
  })

  it('updates role for all valid role types', async () => {
    const mockSession = {
      user: { id: 'user-123' }
    }

    const roles = ['seeker', 'writer', 'funder']

    for (const role of roles) {
      ;(auth.api.getSession as any).mockResolvedValue(mockSession)
      ;(prisma.users.update as any).mockResolvedValue({
        id: 'user-123',
        role,
        updated_at: new Date(),
      })

      const request = new NextRequest('http://localhost:3000/api/onboarding/role', {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      })

      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.user.role).toBe(role)
    }
  })

  it('handles malformed JSON', async () => {
    const mockSession = {
      user: { id: 'user-123' }
    }

    ;(auth.api.getSession as any).mockResolvedValue(mockSession)

    const request = new NextRequest('http://localhost:3000/api/onboarding/role', {
      method: 'PATCH',
      body: 'invalid json',
    })

    const response = await PATCH(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid JSON')
    expect(data.code).toBe('VALIDATION_ERROR')
  })

  it('handles empty request body', async () => {
    const mockSession = {
      user: { id: 'user-123' }
    }

    ;(auth.api.getSession as any).mockResolvedValue(mockSession)

    const request = new NextRequest('http://localhost:3000/api/onboarding/role', {
      method: 'PATCH',
      body: '',
    })

    const response = await PATCH(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid JSON')
    expect(data.code).toBe('VALIDATION_ERROR')
  })
})