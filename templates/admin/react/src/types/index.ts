export type UserRole = 'ADMIN' | 'USER';

export interface User {
  id: string;
  email: string | null;
  name: string;
  role: UserRole;
  /** Mirrors PublicUser.isActive – true when account is enabled. */
  isActive?: boolean;
  avatar: string | null;
  countryCode: string | null;
  phone: string | null;
  location: string | null;
  bio: string | null;
  emailVerified: boolean;
  phoneVerified: boolean;
  hasPassword: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Broadcast {
  id: string;
  title: string;
  body: string;
  type: string;
  audience: 'all' | 'users' | 'admins';
  recipientCount: number;
  createdAt: string;
}

/** Matches the backend's OTA release (GET /ota/releases). */
export interface OTARelease {
  id: string;
  version: number;
  nativeVersion: string;
  platform: 'android' | 'ios' | 'all';
  bundleUrl: string;
  bundleSize: number;
  sha256: string;
  signature: string;
  forceUpdate: boolean;
  releaseNotes?: string | null;
  targetRolloutPct: number;
  status: 'active' | 'rolled_back' | 'draft';
  downloadCount: number;
  createdAt: string;
}

export interface LegalLinks {
  termsUrl: string;
  privacyPolicyUrl: string;
  deleteAccountUrl?: string;
}

/** Matches the backend SessionView shape returned from every sign-in endpoint. */
export interface AuthResponse {
  user: User;
  tokens: {
    tokenType: 'Bearer';
    accessToken: string;
    expiresIn: number;
    accessTokenExpiresAt: string;
    refreshToken: string;
    refreshTokenExpiresAt: string;
  };
  isNewUser?: boolean;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T;
}
{{#if PAYMENTS}}

// ── Payments (backend /payments/admin/*) – amounts are in minor units (999 = 9.99) ──

export interface PaymentProduct {
  id: string;
  name: string;
  description: string | null;
  kind: 'one_time' | 'subscription';
  price: number;
  currency: string;
  displayPrice: string;
  accessLevel: string;
  durationDays: number | null;
  appleProductId: string | null;
  googleProductId: string | null;
  active: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface Entitlement {
  id: string;
  userId: string;
  accessLevel: string;
  source: 'gateway' | 'app_store' | 'play_store' | 'adapty' | 'admin';
  productId: string | null;
  referenceId: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  active: boolean;
  createdAt: string;
}

export interface PaymentStats {
  activeEntitlements: number;
  products: number;
  paidPayments?: number;
  revenue?: Array<{ currency: string; amount: number }>;
  purchases?: number;
}
{{#if GATEWAY}}

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'partially_refunded';

export interface Payment {
  id: string;
  userId: string;
  productId: string;
  provider: string;
  providerOrderId: string;
  providerPaymentId: string | null;
  amount: number;
  currency: string;
  displayAmount: string;
  status: PaymentStatus;
  refundedAmount: number;
  failureReason: string | null;
  paidAt: string | null;
  createdAt: string;
}
{{/if}}
{{#if IAP}}

export interface StorePurchase {
  id: string;
  userId: string;
  productId: string | null;
  store: 'app_store' | 'play_store';
  storeProductId: string;
  transactionId: string;
  status: 'active' | 'expired' | 'refunded' | 'pending';
  environment: string | null;
  purchasedAt: string;
  expiresAt: string | null;
}
{{/if}}
{{/if}}
