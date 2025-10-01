import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { PrismaClient } from "@prisma/client";
import { authRateLimit } from "./security/rate-limiting";

const prisma = new PrismaClient();

// Debug environment variables in production
if (process.env.NODE_ENV === 'production') {
  console.log('BetterAuth Config Debug:', {
    hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
    hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
    hasAuthSecret: !!process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL,
    nodeEnv: process.env.NODE_ENV
  });
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Temporarily disabled for testing
    minPasswordLength: 8,
    maxPasswordLength: 128,
    password: {
      hash: async (password: string) => {
        // Use bcrypt with higher rounds for production
        const bcrypt = require('bcryptjs');
        const saltRounds = process.env.NODE_ENV === 'production' ? 12 : 10;
        return await bcrypt.hash(password, saltRounds);
      },
      verify: async (data: { password: string; hash: string }) => {
        const bcrypt = require('bcryptjs');
        return await bcrypt.compare(data.password, data.hash);
      },
    },
  },
  socialProviders: process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    },
  } : undefined,
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
  },
  secret: process.env.BETTER_AUTH_SECRET || 'dev-secret-for-build',
  baseURL: process.env.BETTER_AUTH_URL || 'https://app.benefitiary.com',
  trustedOrigins: process.env.NODE_ENV === 'production' 
    ? ['https://app.benefitiary.com', 'https://benefitiary.com']
    : ['http://localhost:3000', 'https://app.benefitiary.com'],
  rateLimit: {
    enabled: true,
    window: 15 * 60, // 15 minutes
    max: 5, // 5 attempts per window
  },
  // Removed custom user fields to fix user creation issues
  // Will handle role and onboarding through separate database operations
  advanced: {
    crossSubDomainCookies: {
      enabled: false,
    },
    useSecureCookies: process.env.NODE_ENV === 'production',
    generateId: false, // Let BetterAuth handle ID generation
  },
});

export type Session = typeof auth.$Infer.Session;