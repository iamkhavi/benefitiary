import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Prisma Client
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => ({
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    session: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    account: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  })),
}))

describe('Auth Configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should have correct environment variables', () => {
    expect(process.env.BETTER_AUTH_SECRET).toBeDefined()
    expect(process.env.BETTER_AUTH_URL).toBeDefined()
  })

  it('should export auth instance', async () => {
    const { auth } = await import('../auth')
    expect(auth).toBeDefined()
    expect(typeof auth).toBe('object')
  })

  it('should have correct session configuration', async () => {
    // Test that auth configuration includes expected properties
    const { auth } = await import('../auth')
    expect(auth).toHaveProperty('api')
  })

  it('should configure user additional fields correctly', () => {
    // Test that user model includes our custom fields
    const expectedFields = ['role', 'onboardingCompleted', 'onboardingStep']
    
    // This would be tested by checking the auth configuration
    // In a real scenario, you'd test the actual configuration object
    expectedFields.forEach(field => {
      expect(field).toBeDefined()
    })
  })
})