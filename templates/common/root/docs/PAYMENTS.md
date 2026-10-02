# Payments

{{#if IAP}}- **In-app purchases:** {{IAP_PROVIDER_NAME}}
{{/if}}{{#if GATEWAY}}- **Payment gateway:** {{GATEWAY_NAME}}
{{/if}}
All the code is in `{{DIR_PAYMENTS}}` (screens, hooks, services, API calls). The app holds **no
secret key** – the backend creates orders, verifies purchases and decides who has access.

## Using it

- **Store screen:** Profile → Premium (route `Main › Store`). It lists the products from the backend
  (admin panel → Payments → Products){{#if IAP}}, with the store's localized prices,{{/if}} and buys them{{#if IAP}}; "Restore purchases" is at the bottom (required by Apple){{/if}}.
- **Unlocking features** anywhere:

  ```tsx
  import { useAccess } from '{{DIR_PAYMENTS}}/hooks/useAccess';

  const { hasAccess } = useAccess();
  if (!hasAccess('premium')) navigation.navigate('Main', { screen: 'Store' });
  ```

  `accessLevels` come from `GET /payments/me` – refreshed after every purchase and when the user signs in.
{{#if IAP}}
{{#if GATEWAY}}
- **Which way a product is bought:** products with an App Store / Google Play id are bought in the
  store (in-app purchase); the others through {{GATEWAY_NAME}}.
{{/if}}
{{/if}}
{{#if IAP_NATIVE}}

## In-app purchases (react-native-iap)

1. Create the products in **App Store Connect** (Monetization → In-App Purchases / Subscriptions) and
   **Play Console** (Monetize → Products), then add them to the catalog with the same ids.
2. iOS: Xcode → target → Signing & Capabilities → **+ In-App Purchase**. Test with a Sandbox account
   (Settings → App Store → Sandbox Account) on a real device, or a StoreKit configuration file.
3. Android: upload a build to a testing track (internal testing is enough) – Play Billing only works
   for apps installed from Play with a tester account. The BILLING permission comes with the library.
4. Every purchase is sent to the backend (`POST /payments/iap/verify`, which asks Apple / Google) and
   only then finished. Purchases left open (app closed, network down) are verified on the next start.
{{/if}}
{{#if IAP_ADAPTY}}

## In-app purchases (Adapty)

1. `.env`: `ADAPTY_PUBLIC_SDK_KEY` (Adapty → App settings → API keys → Public SDK key) and
   `ADAPTY_PLACEMENT_ID` (the placement whose paywall products the Store screen sells, default `premium`).
   With the `REPLACE_ME` value in-app purchases stay off (a warning is logged).
2. Connect the stores in Adapty (App Store Connect API key, Google Play service account), create the
   products, an **access level** per catalog access level (`premium`…), a paywall and the placement.
3. Add the products to the catalog with their store ids. The app identifies the user with
   `adapty.identify(<user id>)` at sign-in and logs out at sign-out; the backend mirrors the access
   levels (webhook + `POST /payments/adapty/sync` after each purchase / restore).
{{/if}}
{{#if GATEWAY_STRIPE}}

## Stripe

Stripe's **PaymentSheet** (cards, Apple Pay, Google Pay…). The publishable key comes from the backend
with each checkout – nothing to set in the app. Test card `4242 4242 4242 4242`.
For payment methods that redirect (3-D Secure in a browser, bank redirects) register the URL scheme
`{{APP_SLUG}}` (iOS: Info.plist URL types; Android: an intent filter) – the PaymentSheet's `returnURL`
is `{{APP_SLUG}}://stripe-redirect`. Apple Pay additionally needs a merchant id
(`initStripe({ merchantIdentifier })` in `services/gatewayCheckout.ts`).
{{/if}}
{{#if GATEWAY_RAZORPAY}}

## Razorpay

Razorpay **Checkout** (cards, UPI, net banking, wallets). The key id comes from the backend with each
checkout – nothing to set in the app. In test mode use Razorpay's test cards / UPI ids.
The success callback's payment id + signature are verified by the backend.
{{/if}}
{{#if GATEWAY_PAYPAL}}

## PayPal

PayPal's approval page opens in a web view (`PayPalCheckoutScreen`). When PayPal sends the buyer to
the backend's return URL the screen closes and the backend captures the order; closing the screen
cancels. Test with a sandbox buyer account (developer.paypal.com → Sandbox accounts).
{{/if}}

## Store rules

Digital content and subscriptions used inside the app must be sold with **in-app purchases** (App Store
Review Guideline 3.1.1, Google Play Payments policy).
{{#if GATEWAY}}
{{GATEWAY_NAME}} is for physical goods and real-world services – not for app features.
{{/if}}
