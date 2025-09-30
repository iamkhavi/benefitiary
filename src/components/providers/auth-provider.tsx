"use client";

import { ReactNode } from "react";

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  // BetterAuth doesn't need a provider wrapper like other auth libraries
  // The useSession hook works directly with the auth client
  return <>{children}</>;
}