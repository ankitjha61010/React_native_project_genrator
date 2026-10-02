{{#if GATEWAY_STRIPE}}
import { initPaymentSheet, initStripe, PaymentSheetError, presentPaymentSheet } from '@stripe/stripe-react-native';
{{/if}}
{{#if GATEWAY_RAZORPAY}}
import RazorpayCheckout from 'react-native-razorpay';
{{/if}}
import { paymentsApi } from '../paymentsApi';
import type { Checkout, PurchaseOutcome } from '../types/payments.types';
import { accessStore } from './accessStore';

/** The provider's checkout ended without a payment. */
export class CheckoutCancelled extends Error {}
{{#if GATEWAY_PAYPAL}}

// ── PayPal: the approval page runs in PayPalCheckoutScreen (a web view) ───────

export interface PayPalApproval {
  paymentId: string;
  approvalUrl: string;
  returnUrl: string;
  cancelUrl: string;
}

const pendingPayPal = new Map<string, (approved: boolean) => void>();

/** Called by PayPalCheckoutScreen when PayPal sends the buyer to the return (true) or cancel (false) URL. */
export function settlePayPal(paymentId: string, approved: boolean): void {
  pendingPayPal.get(paymentId)?.(approved);
  pendingPayPal.delete(paymentId);
}
{{/if}}

/** What the screen provides to the checkout (PayPal opens its own screen). */
export interface CheckoutUi {
{{#if GATEWAY_PAYPAL}}
  openPayPal: (approval: PayPalApproval) => void;
{{/if}}
{{#if GATEWAY_RAZORPAY}}
  /** Razorpay Checkout's accent color. */
  themeColor?: string;
{{/if}}
}

/** Opens the provider's checkout; resolves with the proof the backend checks (or throws CheckoutCancelled). */
async function runProviderCheckout(checkout: Checkout, ui: CheckoutUi): Promise<Record<string, string>> {
  const client = checkout.client;
{{#if GATEWAY_STRIPE}}
  // Stripe PaymentSheet: cards, Apple Pay, Google Pay… (the publishable key comes with the checkout).
  await initStripe({ publishableKey: String(client.publishableKey), urlScheme: '{{APP_SLUG}}' });
  const init = await initPaymentSheet({
    merchantDisplayName: '{{DISPLAY_NAME}}',
    paymentIntentClientSecret: String(client.clientSecret),
    returnURL: '{{APP_SLUG}}://stripe-redirect',
  });
  if (init.error) throw new Error(init.error.message);
  const result = await presentPaymentSheet();
  if (result.error) {
    if (result.error.code === PaymentSheetError.Canceled) throw new CheckoutCancelled();
    throw new Error(result.error.message);
  }
  void ui;
  return {};
{{/if}}
{{#if GATEWAY_RAZORPAY}}
  // Razorpay Checkout: cards, UPI, net banking, wallets.
  try {
    const result = await RazorpayCheckout.open({
      key: String(client.keyId),
      order_id: String(client.orderId),
      amount: Number(client.amount),
      currency: String(client.currency),
      name: String(client.name),
      description: String(client.description ?? ''),
      prefill: client.email ? { email: String(client.email) } : undefined,
      theme: ui.themeColor ? { color: ui.themeColor } : undefined,
    });
    return { razorpayPaymentId: result.razorpay_payment_id, razorpaySignature: result.razorpay_signature };
  } catch (error) {
    // Razorpay rejects with { code, description }; code 0 (Android) / 2 (iOS) = closed by the user.
    const { code, description } = (error ?? {}) as { code?: number; description?: string };
    if (code === 0 || code === 2) throw new CheckoutCancelled();
    throw new Error(description || 'Payment failed');
  }
{{/if}}
{{#if GATEWAY_PAYPAL}}
  // PayPal: the buyer approves on PayPal's page; the backend captures it in confirm.
  const approved = await new Promise<boolean>(resolve => {
    pendingPayPal.set(checkout.paymentId, resolve);
    ui.openPayPal({ paymentId: checkout.paymentId, approvalUrl: String(client.approvalUrl), returnUrl: String(client.returnUrl), cancelUrl: String(client.cancelUrl) });
  });
  if (!approved) throw new CheckoutCancelled();
  return {};
{{/if}}
}

/**
 * Buys a catalog product through {{GATEWAY_NAME}}: create the order (backend) → the provider's checkout →
 * the backend asks the provider whether it is paid → the access levels are refreshed.
 */
export async function payWithGateway(productId: string, ui: CheckoutUi): Promise<PurchaseOutcome> {
  const checkout = await paymentsApi.checkout(productId);
  let proof: Record<string, string>;
  try {
    proof = await runProviderCheckout(checkout, ui);
  } catch (error) {
    if (error instanceof CheckoutCancelled) return 'cancelled';
    throw error;
  }
  const payment = await paymentsApi.confirm(checkout.paymentId, proof);
  if (payment.status === 'failed') throw new Error('Payment failed');
  await accessStore.refresh();
  // Some methods (bank transfers, UPI collect…) settle later – the webhook finishes them.
  return payment.status === 'paid' ? 'purchased' : 'pending';
}
