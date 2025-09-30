import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Get the current session on the server side
 */
export async function getServerSession() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    return session;
  } catch (error) {
    console.error("Error getting server session:", error);
    return null;
  }
}

/**
 * Require authentication - redirect to login if not authenticated
 */
export async function requireAuth() {
  const session = await getServerSession();
  
  if (!session) {
    redirect("/auth/login");
  }
  
  return session;
}

/**
 * Require completed onboarding - redirect to onboarding if not completed
 */
export async function requireOnboarding() {
  const session = await requireAuth();
  
  // Skip onboarding check for now - will be implemented with proper session extension
  
  return session;
}

/**
 * Get dashboard path based on user role
 */
export function getDashboardPath(role: string): string {
  switch (role) {
    case "WRITER":
      return "/dashboard/writer";
    case "FUNDER":
      return "/dashboard/funder";
    case "SEEKER":
    default:
      return "/dashboard/seeker";
  }
}

/**
 * Check if user has specific role
 */
export function hasRole(session: any, role: string): boolean {
  return session?.user?.role === role;
}

/**
 * Check if user can access route based on role
 */
export function canAccessRoute(session: any, requiredRoles: string[]): boolean {
  if (!session?.user?.role) return false;
  return requiredRoles.includes(session.user.role);
}