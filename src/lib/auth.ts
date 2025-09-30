import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { PrismaClient } from "@prisma/client";
import { authRateLimit } from "./security/rate-limiting";

const prisma = new PrismaClient();

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: process.env.NODE_ENV === 'production', // Require verification in production
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
  } : {},
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
  },
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL!,
  trustedOrigins: process.env.NODE_ENV === 'production' 
    ? [process.env.BETTER_AUTH_URL!]
    : [process.env.BETTER_AUTH_URL!, 'http://localhost:3000'],
  rateLimit: {
    enabled: true,
    window: 15 * 60, // 15 minutes
    max: 5, // 5 attempts per window
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "SEEKER",
        input: false, // Don't allow direct input, will be set during onboarding
      },
      onboardingCompleted: {
        type: "boolean",
        defaultValue: false,
        input: false,
      },
      onboardingStep: {
        type: "number",
        defaultValue: 0,
        input: false,
      },
      lastLoginAt: {
        type: "date",
        input: false,
      },
      loginAttempts: {
        type: "number",
        defaultValue: 0,
        input: false,
      },
      lockedUntil: {
        type: "date",
        input: false,
        required: false,
      },
    },
  },
  advanced: {
    crossSubDomainCookies: {
      enabled: false, // Disable for security
    },
    useSecureCookies: process.env.NODE_ENV === 'production',
  },
});

export type Session = typeof auth.$Infer.Session;