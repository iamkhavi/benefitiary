"use server";

import { createCustomer } from "@/lib/dodo-payments";

/**
 * Create DodoPayments customer after user signup
 */
export async function createDodoCustomerOnSignup(userId: string, email: string, name?: string) {
  try {
    // Create customer in DodoPayments
    const customer = await createCustomer(email, name);
    
    // TODO: Store customer ID in user record
    // This would require updating the user table to include dodoCustomerId field
    console.log("Created DodoPayments customer:", customer.id, "for user:", userId);
    
    return { success: true, customerId: customer.id };
  } catch (error) {
    console.error("Failed to create DodoPayments customer:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: errorMessage };
  }
}

/**
 * Update user onboarding status
 */
export async function updateOnboardingStatus(userId: string, step: number, completed: boolean = false) {
  try {
    // This would use the auth API to update user fields
    // For now, we'll just log the action
    console.log("Updating onboarding status for user:", userId, "step:", step, "completed:", completed);
    
    return { success: true };
  } catch (error) {
    console.error("Failed to update onboarding status:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: errorMessage };
  }
}