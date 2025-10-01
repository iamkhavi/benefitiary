import { createAuthClient } from "better-auth/react";

// Ensure we always use the app subdomain for auth
const getAuthBaseURL = () => {
  if (typeof window !== 'undefined') {
    // Client-side: use current origin if on app subdomain, otherwise use app subdomain
    const currentOrigin = window.location.origin;
    if (currentOrigin.includes('app.benefitiary.com')) {
      return currentOrigin;
    }
  }
  
  // Fallback to environment variable or default app subdomain
  return process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "https://app.benefitiary.com";
};

export const authClient = createAuthClient({
  baseURL: getAuthBaseURL(),
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
} = authClient;