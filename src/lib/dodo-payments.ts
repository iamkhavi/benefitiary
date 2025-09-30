import DodoPayments from "dodopayments";

let dodoClient: DodoPayments | null = null;

function getDodoClient(): DodoPayments {
  if (!dodoClient) {
    const apiKey = process.env.DODO_PAYMENTS_API_KEY;
    if (!apiKey) {
      throw new Error("DODO_PAYMENTS_API_KEY environment variable is required");
    }
    
    dodoClient = new DodoPayments({
      bearerToken: apiKey,
      environment: process.env.NODE_ENV === "production" ? "live_mode" : "test_mode",
    });
  }
  
  return dodoClient;
}

export interface CheckoutOptions {
  productId: string;
  successUrl?: string;
  cancelUrl?: string;
  customerId?: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: "month" | "year";
  features: string[];
}

export interface DodoCustomer {
  id: string;
  email: string;
  name?: string;
  created_at: string;
}

export interface DodoCheckout {
  id: string;
  url: string;
  product_id: string;
  customer_id?: string;
}

export interface DodoPortal {
  url: string;
}

export const subscriptionPlans: SubscriptionPlan[] = [
  {
    id: "pdt_basic_plan",
    name: "Basic",
    price: 29,
    currency: "USD",
    interval: "month",
    features: [
      "Access to grant database",
      "Basic search filters",
      "Email notifications",
      "Up to 5 saved grants"
    ]
  },
  {
    id: "pdt_premium_plan", 
    name: "Premium",
    price: 79,
    currency: "USD",
    interval: "month",
    features: [
      "Everything in Basic",
      "Advanced search filters",
      "AI proposal assistance",
      "Unlimited saved grants",
      "Priority support"
    ]
  },
  {
    id: "pdt_enterprise_plan",
    name: "Enterprise", 
    price: 199,
    currency: "USD",
    interval: "month",
    features: [
      "Everything in Premium",
      "Team collaboration",
      "Custom integrations",
      "Dedicated account manager",
      "Advanced analytics"
    ]
  }
];

/**
 * Create a checkout session for a subscription plan
 */
export async function createCheckoutSession(options: CheckoutOptions): Promise<DodoCheckout> {
  try {
    const client = getDodoClient();
    // Note: This is a placeholder implementation
    // The actual DodoPayments API structure may differ
    const checkout = await (client as any).checkout?.create({
      product_id: options.productId,
      success_url: options.successUrl || `${process.env.BETTER_AUTH_URL}/dashboard/success`,
      cancel_url: options.cancelUrl || `${process.env.BETTER_AUTH_URL}/billing`,
      customer_id: options.customerId,
    });

    return checkout as DodoCheckout;
  } catch (error) {
    console.error("Error creating checkout session:", error);
    throw error;
  }
}

/**
 * Create a customer portal session
 */
export async function createPortalSession(customerId: string): Promise<DodoPortal> {
  try {
    const client = getDodoClient();
    // Note: This is a placeholder implementation
    // The actual DodoPayments API structure may differ
    const portal = await (client.customers as any).portal?.({
      customer_id: customerId,
      return_url: `${process.env.BETTER_AUTH_URL}/dashboard/billing`,
    });

    return portal as DodoPortal;
  } catch (error) {
    console.error("Error creating portal session:", error);
    throw error;
  }
}

/**
 * Create a customer in DodoPayments
 */
export async function createCustomer(email: string, name?: string): Promise<DodoCustomer> {
  try {
    const client = getDodoClient();
    const customerData: any = { email };
    if (name) {
      customerData.name = name;
    }

    const customer = await client.customers.create(customerData);

    return customer as unknown as DodoCustomer;
  } catch (error) {
    console.error("Error creating customer:", error);
    throw error;
  }
}

/**
 * Get customer subscriptions
 */
export async function getCustomerSubscriptions(customerId: string) {
  try {
    const client = getDodoClient();
    // Note: This is a placeholder implementation
    // The actual DodoPayments API structure may differ
    const subscriptions = await (client as any).subscriptions?.list({
      customer_id: customerId,
    });

    return subscriptions;
  } catch (error) {
    console.error("Error fetching subscriptions:", error);
    throw error;
  }
}

/**
 * Handle webhook events from DodoPayments
 */
export function handleWebhookEvent(payload: any) {
  console.log("DodoPayments Event:", payload.event_type);
  
  switch (payload.event_type) {
    case "subscription.created":
      console.log("Subscription created:", payload.data);
      // Update user subscription status in database
      break;
    case "subscription.updated":
      console.log("Subscription updated:", payload.data);
      // Update user subscription status in database
      break;
    case "subscription.cancelled":
      console.log("Subscription cancelled:", payload.data);
      // Update user subscription status in database
      break;
    case "payment.succeeded":
      console.log("Payment succeeded:", payload.data);
      // Handle successful payment
      break;
    case "payment.failed":
      console.log("Payment failed:", payload.data);
      // Handle failed payment
      break;
    case "invoice.paid":
      console.log("Invoice paid:", payload.data);
      // Handle invoice payment
      break;
    case "customer.deleted":
      console.log("Customer deleted:", payload.data);
      // Handle customer deletion
      break;
    default:
      console.log("Unhandled event type:", payload.event_type);
  }
}