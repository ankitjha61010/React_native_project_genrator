# Payments

{{#if IAP}}- **In-app purchases:** {{IAP_PROVIDER_NAME}}
{{/if}}{{#if GATEWAY}}- **Payment gateway:** {{GATEWAY_NAME}}
{{/if}}
Everything lives in the `payments` feature (catalog, entitlements, the provider adapters behind
interfaces, routes, messages, tests). Secret keys live **only** in this backend's `.env`.

## How it works

1. **Products** (admin panel → Payments → Products) are what the app sells. A price is an integer
   in the currency's minor unit (`999` + `USD` = 9.99 USD). A product **unlocks an access level**
   (e.g. `premium`) for `durationDays` days (empty = forever).
2. **Entitlements** are what a user has: `GET /payments/me` → `{ accessLevels: ["premium"], entitlements }`.
   The app unlocks features from `accessLevels` – access is only granted from what the provider /
   store confirms, never from the app's word.
{{#if GATEWAY}}
3. **{{GATEWAY_NAME}} checkout:** `POST /payments/checkout` creates a provider order and a `pending`
   payment → the app opens {{GATEWAY_NAME}}'s checkout → `POST /payments/:id/confirm` makes the backend
   ask {{GATEWAY_NAME}} → `paid` grants the entitlement. The **webhook** does the same if the app never
   comes back. Whichever arrives first wins; the other changes nothing (idempotent).
   Refunds (admin) call {{GATEWAY_NAME}}; a **full** refund removes the access it gave.
{{/if}}
{{#if IAP_NATIVE}}
4. **In-app purchases (react-native-iap):** the app buys with StoreKit / Play Billing, then sends the
   transaction id (iOS) / purchase token (Android) to `POST /payments/iap/verify`. The backend asks
   **Apple's App Store Server API / Google Play Developer API**, records the purchase and grants the
   access level of the catalog product with that store id. Only then does the app finish the transaction.
   One store transaction can only unlock one account (`409` for any other).
{{/if}}
{{#if IAP_ADAPTY}}
4. **In-app purchases (Adapty):** the app sells Adapty paywall products and identifies itself with
   `adapty.identify(<our user id>)`. Adapty validates the receipts; this backend mirrors the profile's
   **access levels** (Adapty access level id = our access level) – on every webhook and when the app
   calls `POST /payments/adapty/sync` after a purchase / restore.
{{/if}}

## Endpoints (`/api/v1/payments`)

| Method | Path | Who | What |
| --- | --- | --- | --- |
| GET | `/products` | user | active products |
| GET | `/me` | user | the user's access levels |
{{#if GATEWAY}}
| POST | `/checkout` | user | `{ productId }` → `{ paymentId, client: {…} }` for the app's checkout |
| POST | `/:id/confirm` | user | ask {{GATEWAY_NAME}} whether it is paid{{#if GATEWAY_RAZORPAY}} (`{ razorpayPaymentId, razorpaySignature }`){{/if}} |
| GET | `/history` | user | the user's payments |
| POST | `/webhooks/{{GATEWAY_ID}}` | {{GATEWAY_NAME}} | signed webhook (no token) |
{{/if}}
{{#if IAP_NATIVE}}
| POST | `/iap/verify` | user | `{ platform, productId, transactionId \| purchaseToken, type? }` |
{{/if}}
{{#if IAP_ADAPTY}}
| POST | `/adapty/sync` | user | re-read the user's Adapty access levels |
| POST | `/webhooks/adapty` | Adapty | `Authorization: ADAPTY_WEBHOOK_TOKEN` |
{{/if}}
| GET | `/admin/stats` | `payments:manage` | totals{{#if GATEWAY}}, revenue per currency{{/if}} |
| GET / POST / PATCH / DELETE | `/admin/products[/:id]` | `payments:manage` | the catalog |
| GET / POST / DELETE | `/admin/entitlements[/:id]` | `payments:manage` | list / grant / revoke access by hand |
{{#if GATEWAY}}
| GET | `/admin/payments?status=&userId=` | `payments:manage` | transactions |
| POST | `/admin/payments/:id/refund` | `payments:manage` | `{ amount? }` (minor units, empty = all left) |
{{/if}}
{{#if IAP}}
| GET | `/admin/purchases?userId=` | `payments:manage` | store purchases |
{{/if}}

Admins have `payments:manage` (src: roles). Every text the API answers lives in `payments.messages.ts`.

## Keys (`.env`)

Values containing `REPLACE_ME` are dummies written by the generator: the API runs, and payment calls
answer `503 PAYMENTS_NOT_CONFIGURED – set … in the backend .env` until the real key is there.
{{#if GATEWAY_STRIPE}}

### Stripe

| Variable | Where |
| --- | --- |
| `STRIPE_SECRET_KEY` | Dashboard → Developers → API keys (`sk_test_…` / `sk_live_…`) |
| `STRIPE_PUBLISHABLE_KEY` | same page (`pk_…`) – sent to the app with each checkout |
| `STRIPE_WEBHOOK_SECRET` | Developers → Webhooks → add endpoint `<APP_URL>/api/v1/payments/webhooks/stripe` with **payment_intent.succeeded, payment_intent.payment_failed, charge.refunded** → signing secret (`whsec_…`) |

Local webhooks: `stripe listen --forward-to localhost:3000/api/v1/payments/webhooks/stripe` (prints a `whsec_…`).
Test card: `4242 4242 4242 4242`, any future date / CVC.
{{/if}}
{{#if GATEWAY_RAZORPAY}}

### Razorpay

| Variable | Where |
| --- | --- |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Dashboard → Account & Settings → API Keys (test mode: `rzp_test_…`) |
| `RAZORPAY_WEBHOOK_SECRET` | Webhooks → add `<APP_URL>/api/v1/payments/webhooks/razorpay` with **payment.captured, payment.failed, refund.processed** and a secret you choose |

The app's checkout result (payment id + signature) is verified with the key secret (HMAC-SHA256) and
the payment is fetched (and captured if your account captures manually).
{{/if}}
{{#if GATEWAY_PAYPAL}}

### PayPal

| Variable | Where |
| --- | --- |
| `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` | developer.paypal.com → Apps & Credentials (sandbox or live app) |
| `PAYPAL_WEBHOOK_ID` | the app → Webhooks → `<APP_URL>/api/v1/payments/webhooks/paypal` with **PAYMENT.CAPTURE.COMPLETED, PAYMENT.CAPTURE.DENIED, PAYMENT.CAPTURE.REFUNDED** → its id |
| `PAYPAL_MODE` | `sandbox` or `live` |

The app opens PayPal's approval page in a web view. PayPal sends the buyer back to
`<APP_URL>/payments/paypal/return` (or `/cancel`) – the web view stops there and the backend captures
the order. Webhook signatures are verified by PayPal (`/v1/notifications/verify-webhook-signature`).
{{/if}}
{{#if IAP_NATIVE}}

### App Store / Google Play (react-native-iap)

| Variable | Where |
| --- | --- |
| `APPLE_IAP_ISSUER_ID`, `APPLE_IAP_KEY_ID` | App Store Connect → Users and Access → Integrations → **In-App Purchase** keys |
| `APPLE_IAP_PRIVATE_KEY` | path to the downloaded `SubscriptionKey_XXXX.p8` (keys entered while generating were copied to `keys/`, git-ignored) |
| `APPLE_BUNDLE_ID` | the iOS bundle id (`{{APP_PACKAGE}}`) |
| `GOOGLE_PLAY_SERVICE_ACCOUNT` | path to a Google Cloud service account JSON. Enable the **Google Play Android Developer API**, then invite the account in Play Console → Users and permissions (View financial data, Manage orders and subscriptions) |
| `GOOGLE_PLAY_PACKAGE_NAME` | the Android application id (`{{APP_PACKAGE}}`) |
| `IAP_SKIP_VERIFICATION` | `true` = trust the app without asking the stores – **development only**, refused in production |

Create the products in App Store Connect / Play Console, then add them to the catalog with the same
ids (admin panel → Payments → Products → App Store / Google Play product id). Sandbox purchases are
verified too (Apple: the production API is asked first, then the sandbox).
{{/if}}
{{#if IAP_ADAPTY}}

### Adapty

| Variable | Where |
| --- | --- |
| `ADAPTY_SECRET_KEY` | Adapty → App settings → API keys → **Secret** key (the public SDK key goes in the app's `.env`) |
| `ADAPTY_WEBHOOK_TOKEN` | generated for you – Adapty → Integrations → **Webhooks**: URL `<APP_URL>/api/v1/payments/webhooks/adapty`, this value as the *Authorization header value* (production and sandbox) |

Name the Adapty **access levels** like the catalog's (`premium`…) – they become entitlements 1:1.
Add catalog products with the store product ids too, so purchases are linked to products in the admin panel.
{{/if}}

## Store rules

Apple and Google require **in-app purchases** for digital content and subscriptions used in the app.
{{#if GATEWAY}}
Use {{GATEWAY_NAME}} for physical goods and real-world services (orders, bookings, deliveries) –
selling app features through a gateway gets an app rejected.
{{/if}}

## Tests

`test/unit/payments.spec.ts` and `test/e2e/payments.e2e-spec.ts` run with fakes of every provider
(test/support/fakes.ts) – no network, no keys.
