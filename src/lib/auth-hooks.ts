import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Handle post-signup operations for new users
 * This runs after BetterAuth successfully creates a user
 */
export async function handleNewUserSignup(userId: string, email: string, name?: string) {
  try {
    // Update the user with default values for our custom fields
    await prisma.user.update({
      where: { id: userId },
      data: {
        role: "SEEKER", // Default role
        onboardingCompleted: false,
        onboardingStep: 0,
        // Update name if it wasn't set during OAuth
        ...(name && { name }),
      },
    });

    console.log(`New user setup completed for: ${email}`);
  } catch (error) {
    console.error("Error setting up new user:", error);
    // Don't throw error to avoid breaking the signup flow
  }
}

/**
 * Handle user login operations
 */
export async function handleUserLogin(userId: string) {
  try {
    // For now, just log the login - we'll add more fields later
    console.log(`User logged in: ${userId}`);
  } catch (error) {
    console.error("Error updating user login:", error);
    // Don't throw error to avoid breaking the login flow
  }
}