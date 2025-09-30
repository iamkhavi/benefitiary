import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "https://app.benefitiary.com",
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
} = authClient;