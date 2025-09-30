import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock DodoPayments
const mockDodoClient = {
  checkout: {
    create: vi.fn(),
  },
  customers: {
    create: vi.fn(),
    portal: vi.fn(),
  },
  subscriptions: {
    list: vi.fn(),
  },
}

vi.mock('dodopayments', () => ({
  default: vi.fn(() => mockDodoClient),
}))

describe('DodoPayments Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should export subscription plans', async () => {
    const { subscriptionPlans } = await import('../dodo-payments')
    
    expect(subscriptionPlans).toBeDefined()
    expect(Array.isArray(subscriptionPlans)).toBe(true)
    expect(subscriptionPlans.length).toBeGreaterThan(0)
    
    // Check that each plan has required properties
    subscriptionPlans.forEach(plan => {
      expect(plan).toHaveProperty('id')
      expect(plan).toHaveProperty('name')
      expect(plan).toHaveProperty('price')
      expect(plan).toHaveProperty('currency')
      expect(plan).toHaveProperty('interval')
      expect(plan).toHaveProperty('features')
    })
  })

  it('should create checkout session', async () => {
    const { createCheckoutSession } = await import('../dodo-payments')
    
    const mockCheckout = { id: 'checkout_123', url: 'https://checkout.url' }
    mockDodoClient.checkout.create.mockResolvedValue(mockCheckout)
    
    const options = {
      productId: 'pdt_basic_plan',
      successUrl: '/success',
      customerId: 'cust_123'
    }
    
    const result = await createCheckoutSession(options)
    
    expect(mockDodoClient.checkout.create).toHaveBeenCalledWith({
      product_id: options.productId,
      success_url: options.successUrl,
      cancel_url: `${process.env.BETTER_AUTH_URL}/billing`,
      customer_id: options.customerId,
    })
    expect(result).toEqual(mockCheckout)
  })

  it('should create customer', async () => {
    const { createCustomer } = await import('../dodo-payments')
    
    const mockCustomer = { id: 'cust_123', email: 'test@example.com' }
    mockDodoClient.customers.create.mockResolvedValue(mockCustomer)
    
    const result = await createCustomer('test@example.com', 'Test User')
    
    expect(mockDodoClient.customers.create).toHaveBeenCalledWith({
      email: 'test@example.com',
      name: 'Test User',
    })
    expect(result).toEqual(mockCustomer)
  })

  it('should create portal session', async () => {
    const { createPortalSession } = await import('../dodo-payments')
    
    const mockPortal = { url: 'https://portal.url' }
    mockDodoClient.customers.portal.mockResolvedValue(mockPortal)
    
    const result = await createPortalSession('cust_123')
    
    expect(mockDodoClient.customers.portal).toHaveBeenCalledWith({
      customer_id: 'cust_123',
      return_url: `${process.env.BETTER_AUTH_URL}/dashboard/billing`,
    })
    expect(result).toEqual(mockPortal)
  })

  it('should get customer subscriptions', async () => {
    const { getCustomerSubscriptions } = await import('../dodo-payments')
    
    const mockSubscriptions = [{ id: 'sub_123', status: 'active' }]
    mockDodoClient.subscriptions.list.mockResolvedValue(mockSubscriptions)
    
    const result = await getCustomerSubscriptions('cust_123')
    
    expect(mockDodoClient.subscriptions.list).toHaveBeenCalledWith({
      customer_id: 'cust_123',
    })
    expect(result).toEqual(mockSubscriptions)
  })

  it('should handle webhook events', async () => {
    const { handleWebhookEvent } = await import('../dodo-payments')
    
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    
    const payload = {
      event_type: 'subscription.created',
      data: { id: 'sub_123' }
    }
    
    handleWebhookEvent(payload)
    
    expect(consoleSpy).toHaveBeenCalledWith('DodoPayments Event:', 'subscription.created')
    expect(consoleSpy).toHaveBeenCalledWith('Subscription created:', payload.data)
    
    consoleSpy.mockRestore()
  })
})