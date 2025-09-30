# BetterAuth + DodoPayments Integration

This document describes the authentication and payment integration setup for Benefitiary.

## Overview

The authentication system uses:
- **BetterAuth** for user authentication, session management, and user data
- **DodoPayments** for subscription billing and payment processing
- **Prisma** with PostgreSQL for data persistence

## Architecture

### Authentication Flow
1. User signs up/logs in via BetterAuth
2. DodoPayments customer is created automatically
3. User completes onboarding wizard
4. User can subscribe to plans via DodoPayments checkout
5. Webhooks update subscription status

### File Structure
```
src/
├── lib/
│   ├── auth.ts                 # BetterAuth configuration
│   ├── auth-client.ts          # Frontend auth client
│   ├── auth-utils.ts           # Server-side auth utilities
│   ├── dodo-payments.ts        # DodoPayments integration
│   └── actions/
│       └── auth-actions.ts     # Server actions for auth
├── app/
│   ├── api/
│   │   ├── auth/[...all]/      # BetterAuth API routes
│   │   └── billing/            # Payment API routes
│   └── auth/                   # Auth pages (login/signup)
└── middleware.ts               # Route protection
```

## Configuration

### Environment Variables
```env
# BetterAuth
BETTER_AUTH_SECRET="your-secret-key"
BETTER_AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_BETTER_AUTH_URL="http://localhost:3000"

# DodoPayments
DODO_PAYMENTS_API_KEY="your-api-key"
DODO_PAYMENTS_WEBHOOK_SECRET="your-webhook-secret"

# Database
DATABASE_URL="postgresql://..."
```

### Database Schema
The Prisma schema includes BetterAuth tables and custom fields:
- `user` - Extended with role, onboarding status
- `account` - BetterAuth account linking
- `session` - BetterAuth sessions
- `verification` - Email verification
- `organizations` - User organization data
- `user_preferences` - Grant category preferences

## Usage

### Frontend Authentication
```typescript
import { authClient, signIn, signUp, signOut, useSession } from "@/lib/auth-client";

// Sign up
await signUp.email({
  email: "user@example.com",
  password: "password",
  name: "User Name"
});

// Sign in
await signIn.email({
  email: "user@example.com", 
  password: "password"
});

// Use session in components
const { data: session } = useSession();
```

### Server-side Authentication
```typescript
import { getServerSession, requireAuth, requireOnboarding } from "@/lib/auth-utils";

// Get session (optional)
const session = await getServerSession();

// Require authentication
const session = await requireAuth(); // Redirects if not authenticated

// Require completed onboarding
const session = await requireOnboarding(); // Redirects if onboarding incomplete
```

### Payment Integration
```typescript
import { createCheckoutSession, createPortalSession } from "@/lib/dodo-payments";

// Create checkout for subscription
const checkout = await createCheckoutSession({
  productId: "pdt_premium_plan",
  customerId: user.id
});

// Create billing portal
const portal = await createPortalSession(user.id);
```

## API Endpoints

### Authentication
BetterAuth handles these endpoints automatically through the `/api/auth/[...all]` route:
- `POST /api/auth/sign-up` - User registration
- `POST /api/auth/sign-in` - User login
- `POST /api/auth/sign-out` - User logout
- `GET /api/auth/session` - Get current session

### Billing
- `POST /api/billing/checkout` - Create checkout session
- `POST /api/billing/portal` - Create billing portal
- `POST /api/billing/webhooks` - Handle DodoPayments webhooks

## Middleware Protection

Routes are automatically protected based on authentication status:
- `/dashboard/*` - Requires authentication
- `/onboarding/*` - Requires authentication
- `/billing/*` - Requires authentication

Users are redirected to appropriate pages based on their onboarding status.

## Testing

Run the test suite:
```bash
npm run test:run
```

Tests cover:
- Auth configuration
- Auth utilities (role checking, redirects)
- Auth client setup
- DodoPayments integration
- Webhook handling

## Security Features

- Secure session management with BetterAuth
- CSRF protection built into Next.js
- Input validation and sanitization
- Rate limiting (to be implemented)
- Webhook signature verification (to be implemented)

## Subscription Plans

Three tiers are configured:
1. **Basic** ($29/month) - Basic grant access
2. **Premium** ($79/month) - Advanced features + AI assistance
3. **Enterprise** ($199/month) - Team features + dedicated support

## Implementation Notes

### DodoPayments Integration
The current DodoPayments integration uses placeholder implementations with type assertions due to potential API structure differences. In production:

1. Verify the actual DodoPayments API structure
2. Update the function implementations to match the real API
3. Add proper error handling and retry logic
4. Implement webhook signature verification

### Type Safety
The implementation uses type assertions (`as any`, `as unknown`) for DodoPayments API calls. This should be replaced with proper types once the actual API structure is confirmed.

## Next Steps

1. Verify and update DodoPayments API implementations
2. Implement webhook signature verification
3. Add rate limiting to auth endpoints
4. Set up email verification in production
5. Add password reset functionality
6. Implement team/organization features for Enterprise plan
7. Add proper error boundaries and user feedback