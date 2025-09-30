import '@testing-library/jest-dom/vitest'

// Mock ResizeObserver for Radix UI components
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Mock environment variables for tests
process.env.BETTER_AUTH_SECRET = 'test-secret-key-for-testing-only'
process.env.BETTER_AUTH_URL = 'http://localhost:3000'
process.env.DODO_PAYMENTS_API_KEY = 'test-api-key'
process.env.DODO_PAYMENTS_WEBHOOK_SECRET = 'test-webhook-secret'
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id'
process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret'