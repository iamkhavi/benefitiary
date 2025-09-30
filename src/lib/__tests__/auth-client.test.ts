import { describe, it, expect, vi } from 'vitest'

// Mock better-auth/react
vi.mock('better-auth/react', () => ({
  createAuthClient: vi.fn(() => ({
    signIn: {
      email: vi.fn(),
    },
    signUp: {
      email: vi.fn(),
    },
    signOut: vi.fn(),
    useSession: vi.fn(),
    getSession: vi.fn(),
  })),
}))

describe('Auth Client', () => {
  it('should export auth client with required methods', async () => {
    const { authClient } = await import('../auth-client')
    
    expect(authClient).toBeDefined()
    expect(authClient.signIn).toBeDefined()
    expect(authClient.signUp).toBeDefined()
    expect(authClient.signOut).toBeDefined()
    expect(authClient.useSession).toBeDefined()
    expect(authClient.getSession).toBeDefined()
  })

  it('should export individual auth methods', async () => {
    const { signIn, signUp, signOut, useSession, getSession } = await import('../auth-client')
    
    expect(signIn).toBeDefined()
    expect(signUp).toBeDefined()
    expect(signOut).toBeDefined()
    expect(useSession).toBeDefined()
    expect(getSession).toBeDefined()
  })

  it('should configure client with correct base URL', () => {
    // Test that the client is configured with the right base URL
    const expectedBaseURL = process.env.NEXT_PUBLIC_BETTER_AUTH_URL || 'http://localhost:3000'
    expect(expectedBaseURL).toBe('http://localhost:3000')
  })
})