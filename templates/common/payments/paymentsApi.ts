import { api } from '{{IMPORT:api.client}}';
import type { Access, CatalogProduct{{#if GATEWAY}}, Checkout, Payment{{/if}} } from './types/payments.types';

/** The backend's /payments endpoints used by the app (the admin ones live in the admin panel). */
export const paymentsApi = {
  products: () => api.get<CatalogProduct[]>('/payments/products'),
  access: () => api.get<Access>('/payments/me'),
{{#if GATEWAY}}
  checkout: (productId: string) => api.post<Checkout>('/payments/checkout', { productId }),
  /** `input`: provider specific proof (Razorpay payment id + signature); Stripe / PayPal need none. */
  confirm: (paymentId: string, input: Record<string, string> = {}) => api.post<Payment>(`/payments/${encodeURIComponent(paymentId)}/confirm`, input),
  history: (page = 1) => api.page<Payment>('/payments/history', { params: { page, limit: 20 } }),
{{/if}}
{{#if IAP_NATIVE}}
  verifyPurchase: (input: { platform: 'ios' | 'android'; productId: string; transactionId?: string; purchaseToken?: string; type?: 'in-app' | 'subs' }) =>
    api.post<{ access: Access }>('/payments/iap/verify', input),
{{/if}}
{{#if IAP_ADAPTY}}
  syncAdapty: () => api.post<Access>('/payments/adapty/sync'),
{{/if}}
};
