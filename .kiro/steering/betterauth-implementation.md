Here’s a **full `.md` file** version of the BetterAuth + DodoPayments implementation guide for **Benefitiary**. You can drop this directly into your repo (e.g. `docs/betterauth-dodopayments.md`) so **Kiro.dev** or other contributors can follow step by step.

---

# Benefitiary – BetterAuth + DodoPayments Integration Guide

This document explains how to integrate **BetterAuth** with **DodoPayments** in the Benefitiary SaaS platform. It includes installation, setup, environment configuration, backend + frontend usage, and caveats.

---

## 📚 References

* [DodoPayments BetterAuth Adapter Docs](https://docs.dodopayments.com/developer-resources/better-auth-adaptor)
* [BetterAuth DodoPayments Plugin Docs](https://www.better-auth.com/docs/plugins/dodopayments)
* [BetterAuth Database Concepts](https://www.better-auth.com/docs/concepts/database)
* [GitHub Issue: Route conflicts with multiple payment plugins](https://github.com/better-auth/better-auth/issues/3595)

---

## 1. Prerequisites

* Node.js ≥ 20
* Neon (Postgres) DB ready
* BetterAuth installed
* DodoPayments account with API Key + Webhook Secret
* Environment variables support (`.env` or secrets)

---

## 2. Install Dependencies

```bash
npm install @dodopayments/better-auth dodopayments better-auth zod
```

---

## 3. Environment Variables

Add the following to `.env`:

```env
DODO_PAYMENTS_API_KEY=your_api_key_here
DODO_PAYMENTS_WEBHOOK_SECRET=your_webhook_secret_here
BETTER_AUTH_URL=https://benefitiary.com
BETTER_AUTH_SECRET=some_super_secret
```

---

## 4. Backend Setup

Create `src/lib/auth.ts`:

```ts
import { betterAuth } from "better-auth";
import {
  dodopayments,
  checkout,
  portal,
  webhooks
} from "@dodopayments/better-auth";
import DodoPayments from "dodopayments";

const dodoClient = new DodoPayments({
  bearerToken: process.env.DODO_PAYMENTS_API_KEY!,
  environment: "test_mode", // switch to "live_mode" in production
});

export const { auth, endpoints, client } = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET!,
  baseUrl: process.env.BETTER_AUTH_URL,
  plugins: [
    dodopayments({
      client: dodoClient,
      createCustomerOnSignUp: true,
      use: [
        checkout({
          products: [
            { productId: "pdt_premium_plan_123", slug: "premium-plan" },
            { productId: "pdt_basic_plan_abc", slug: "basic-plan" }
          ],
          successUrl: "/dashboard/success",
          authenticatedUsersOnly: true,
        }),
        portal(),
        webhooks({
          webhookKey: process.env.DODO_PAYMENTS_WEBHOOK_SECRET!,
          onPayload: async (payload) => {
            console.log("DodoPayments Event:", payload.event_type);
            // Update local DB tables: payments, subscriptions, etc.
          },
        }),
      ],
    }),
  ],
});
```

---

## 5. Frontend Setup

Create `lib/auth-client.ts`:

```ts
import { createAuthClient } from "better-auth/react";
import { dodopaymentsClient } from "@dodopayments/better-auth";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "http://localhost:3000",
  plugins: [dodopaymentsClient()],
});
```

### Usage in components:

```ts
// Checkout
await authClient.dodopayments.checkout.create({ slug: "premium-plan" });

// Portal
const portal = await authClient.dodopayments.customer.portal();
if (portal?.redirect) window.location.href = portal.url;

// List subscriptions
const { data: subs } = await authClient.dodopayments.customer.subscriptions.list({
  query: { active: true, limit: 5, page: 1 }
});
```

---

## 6. Webhooks

Default route: `/api/auth/dodopayments/webhooks`

* Events handled: `subscription.updated`, `payment.succeeded`, `invoice.paid`, `customer.deleted`
* The plugin verifies signatures automatically.

Update local DB (`payments`, `subscriptions`) in your `onPayload` handler.

---

## 7. Important Notes

* **One provider only**: Do not use Polar + Dodo together → causes route conflicts (`/api/auth/checkout`).
* **Mode**: Use `"test_mode"` in dev, `"live_mode"` in production.
* **Product mapping**: Map real Dodo product IDs → human slugs (`premium-plan`).
* **Secrets**: Keep API keys + webhook secrets secure.

---

## 8. End-to-End Flow in Benefitiary

1. User signs up with BetterAuth.
   → A DodoPayments customer is auto-created.
2. User completes onboarding (industry, size, location).
3. They click **Upgrade** → calls checkout for `premium-plan`.
4. Payment completes → redirect to `/dashboard/success`.
5. Webhook fires → BetterAuth plugin runs `onPayload` → update DB.
6. User accesses billing portal via `authClient.dodopayments.customer.portal()`.

---

## 9. Next Steps

* Generate BetterAuth DB schema via CLI:

  ```bash
  npx @better-auth/cli generate
  ```
* Add core auth tables into Neon migrations.
* Connect Dodo events to your `payments` + `subscriptions` tables.
* Design **UI billing pages** (Upgrade, Billing History, Manage Subscription).

---

✅ With this guide, Benefitiary will have **authentication, payments, and subscriptions fully integrated** using BetterAuth + DodoPayments.

---

Do you want me to also generate a **migration script** for the `subscriptions` table (to complement the `payments` table you already have), so that webhook events have a clean place to store active plan info?
