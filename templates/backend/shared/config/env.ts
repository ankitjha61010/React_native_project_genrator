import { existsSync } from 'node:fs';
import { z } from 'zod';

// Local development: load `.env` (Node's built-in loader). Variables that are already set
// in the environment (Docker, CI, the hosting platform) always win.
if (process.env.NODE_ENV !== 'production' && existsSync('.env')) {
  process.loadEnvFile('.env');
}

const boolean = z.enum(['true', 'false']).transform(value => value === 'true');
{{#if AUTH}}
const duration = z.string().regex(/^\d+(ms|s|m|h|d)$/, 'use a duration like 15m, 12h or 30d');
{{/if}}
{{#if ENV_LIST}}
const list = z.string().transform(value =>
  value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean),
);
{{/if}}

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default({{PORT}}),
  HOST: z.string().default('0.0.0.0'),
  APP_URL: z.url().default('http://localhost:3000'),
  API_PREFIX: z.string().regex(/^[a-z0-9-]+$/).default('api'),
  API_VERSION: z.string().regex(/^v\d+$/, 'e.g. v1').default('v1'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  TRUST_PROXY: boolean.default(false),
{{#if SEC_CORS}}
  CORS_ORIGINS: list.default([]),
{{/if}}
{{#if SEC_BODY_LIMIT}}
  BODY_LIMIT: z.string().regex(/^\d+(b|kb|mb)$/i, 'e.g. 1mb').default('1mb'),
{{/if}}
{{#if SEC_RATE_LIMIT}}
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
{{/if}}
{{#if SEC_AUTH_RATE_LIMIT}}
  AUTH_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900_000),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
{{/if}}
  DATABASE_URL: z.string().min(1),
{{#if REDIS}}
  /** Empty = no Redis (the tests use in-memory fallbacks). */
  REDIS_URL: z.string().default('redis://localhost:6379'),
{{/if}}
{{#if AUTH}}
  JWT_ACCESS_SECRET: z.string().min(32, 'must be at least 32 characters'),
{{#if AUTH_JWT_ONLY}}
  JWT_ACCESS_EXPIRES_IN: duration.default('1d'),
{{else}}
  JWT_ACCESS_EXPIRES_IN: duration.default('15m'),
  JWT_REFRESH_SECRET: z.string().min(32, 'must be at least 32 characters'),
  JWT_REFRESH_EXPIRES_IN: duration.default('30d'),
{{/if}}
  JWT_ISSUER: z.string().default('{{JWT_ISSUER}}'),
  JWT_AUDIENCE: z.string().default('{{JWT_ISSUER}}-app'),
  /** Lifetime of the 6-digit codes sent by email / SMS. */
  VERIFICATION_CODE_TTL: duration.default('10m'),
  /** Minimum delay before a new code can be requested for the same email / number. */
  VERIFICATION_CODE_RESEND_AFTER: duration.default('60s'),
  VERIFICATION_CODE_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(20).default(5),
{{#if AUTH_EMAIL}}
  /** smtp://user:pass@host:587 – when empty, emails are written to the log (development). */
  SMTP_URL: z.string().default(''),
  MAIL_FROM: z.string().default('{{DISPLAY_NAME}} <no-reply@example.com>'),
{{/if}}
{{#if AUTH_OTP}}
  /** Twilio credentials – when empty, SMS codes are written to the log (development). */
  TWILIO_ACCOUNT_SID: z.string().default(''),
  TWILIO_AUTH_TOKEN: z.string().default(''),
  TWILIO_FROM: z.string().default(''),
{{/if}}
{{#if SOCIAL_GOOGLE}}
  /** OAuth client ids whose ID tokens are accepted (web + iOS + Android). */
  GOOGLE_CLIENT_IDS: list.default([]),
{{/if}}
{{#if SOCIAL_FACEBOOK}}
  FACEBOOK_APP_ID: z.string().default(''),
  FACEBOOK_APP_SECRET: z.string().default(''),
{{/if}}
{{#if SOCIAL_APPLE}}
  /** Audience of Sign in with Apple identity tokens (the iOS bundle id). */
  APPLE_CLIENT_IDS: list.default(['{{APP_PACKAGE}}']),
{{/if}}
{{#if UPLOADS}}
  UPLOAD_DIR: z.string().default('uploads'),
  UPLOAD_MAX_MB: z.coerce.number().positive().max(500).default(25),
{{/if}}
{{#if NOTIFICATIONS}}
  /** Path to (or JSON of) a Firebase service account – when empty, pushes are only logged. */
  FIREBASE_SERVICE_ACCOUNT: z.string().default(''),
{{else}}
{{#if HAS_CALLING}}
  /** Path to (or JSON of) a Firebase service account for VoIP/push wakeups – when empty, pushes are only logged. */
  FIREBASE_SERVICE_ACCOUNT: z.string().default(''),
{{/if}}
{{/if}}
{{#if HAS_CALLING}}
  /** Agora App ID for audio/video calling. */
  AGORA_APP_ID: z.string().default(''),
  /** Agora App Certificate (keep secret, never expose to client). */
  AGORA_APP_CERTIFICATE: z.string().default(''),
  /** Ringing timeout in seconds before call is marked missed. */
  CALL_TIMEOUT_SECONDS: z.coerce.number().int().positive().default(60),
{{#if VOIP_PUSH}}
  // iOS VoIP pushes (APNs token auth). Empty / REPLACE_ME values count as "not set" – VoIP pushes are then skipped.
  APNS_KEY_ID: z.string().default(''),
  APNS_TEAM_ID: z.string().default(''),
  /** Path to the AuthKey_XXXX.p8 file (or the PEM itself). */
  APNS_KEY_PATH: z.string().default('./keys/AuthKey_REPLACE_ME.p8'),
  /** The iOS bundle id – VoIP pushes go to the `<bundle id>.voip` topic. */
  APNS_BUNDLE_ID: z.string().default('{{APP_PACKAGE}}'),
  /** api.push.apple.com instead of api.sandbox.push.apple.com. */
  APNS_PRODUCTION: boolean.default(false),
{{/if}}
{{/if}}
{{#if GATEWAY_STRIPE}}
  // Stripe (dashboard → Developers → API keys / Webhooks). Values containing REPLACE_ME count as "not set".
  STRIPE_SECRET_KEY: z.string().default(''),
  STRIPE_PUBLISHABLE_KEY: z.string().default(''),
  STRIPE_WEBHOOK_SECRET: z.string().default(''),
{{/if}}
{{#if GATEWAY_RAZORPAY}}
  // Razorpay (dashboard → Account & Settings → API Keys / Webhooks).
  RAZORPAY_KEY_ID: z.string().default(''),
  RAZORPAY_KEY_SECRET: z.string().default(''),
  RAZORPAY_WEBHOOK_SECRET: z.string().default(''),
{{/if}}
{{#if GATEWAY_PAYPAL}}
  // PayPal (developer.paypal.com → Apps & Credentials, and the app's webhook id).
  PAYPAL_CLIENT_ID: z.string().default(''),
  PAYPAL_CLIENT_SECRET: z.string().default(''),
  PAYPAL_WEBHOOK_ID: z.string().default(''),
  PAYPAL_MODE: z.enum(['sandbox', 'live']).default('sandbox'),
{{/if}}
{{#if IAP_NATIVE}}
  // App Store Server API (App Store Connect → Users and Access → Integrations → In-App Purchase).
  APPLE_IAP_ISSUER_ID: z.string().default(''),
  APPLE_IAP_KEY_ID: z.string().default(''),
  /** Path to the SubscriptionKey_XXXX.p8 file (or the PEM itself). */
  APPLE_IAP_PRIVATE_KEY: z.string().default(''),
  /** The iOS bundle id. */
  APPLE_BUNDLE_ID: z.string().default('{{APP_PACKAGE}}'),
  /** Path to (or JSON of) a service account with access to the Google Play Developer API. */
  GOOGLE_PLAY_SERVICE_ACCOUNT: z.string().default(''),
  /** The Android application id. */
  GOOGLE_PLAY_PACKAGE_NAME: z.string().default('{{APP_PACKAGE}}'),
  /** Development only: trust purchases without asking Apple / Google (refused in production). */
  IAP_SKIP_VERIFICATION: boolean.default(false),
{{/if}}
{{#if IAP_ADAPTY}}
  // Adapty (app settings → API keys: the secret key; Integrations → Webhooks: the authorization token).
  ADAPTY_SECRET_KEY: z.string().default(''),
  ADAPTY_WEBHOOK_TOKEN: z.string().default(''),
{{/if}}
{{#if HASH_CONFIGURABLE}}
  PASSWORD_HASH_ALGORITHM: z.enum(['argon2', 'bcrypt']).default('argon2'),
{{/if}}
{{#if HASH_CONFIGURABLE}}
  BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(12),
{{/if}}
{{#if HASH_BCRYPT}}
  BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(12),
{{/if}}
{{#if SEC_LOCKOUT}}
  ACCOUNT_LOCKOUT_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
  ACCOUNT_LOCKOUT_MINUTES: z.coerce.number().int().positive().default(15),
{{/if}}
  SEED_ADMIN_EMAIL: z.email().optional(),
{{#if AUTH_EMAIL}}
  SEED_ADMIN_PASSWORD: z.string().optional(),
{{/if}}
{{#if AUTH_OTP}}
  SEED_ADMIN_COUNTRY_CODE: z.string().optional(),
  SEED_ADMIN_PHONE: z.string().optional(),
{{/if}}
  SEED_ADMIN_NAME: z.string().default('Administrator'),
{{/if}}
{{#if LEGAL}}
  /** Empty: the pages in public/ served by this API (APP_URL/terms-and-conditions …). */
  TERMS_URL: z.union([z.url(), z.literal('')]).default(''),
  PRIVACY_POLICY_URL: z.union([z.url(), z.literal('')]).default(''),
{{#if DELETE_ACCOUNT}}
  DELETE_ACCOUNT_URL: z.union([z.url(), z.literal('')]).default(''),
{{/if}}
{{/if}}
{{#if API_ENCRYPTION}}
  API_ENCRYPTION_ENABLED: boolean.default(true),
  API_ENCRYPTION_KEY: z.string().length(32, 'must be exactly 32 characters'),
  API_ENCRYPTION_IV: z.string().length(16, 'must be exactly 16 characters'),
{{/if}}
{{#if SWAGGER}}
  SWAGGER_ENABLED: boolean.default(true),
  SWAGGER_PATH: z.string().regex(/^[a-z0-9/-]+$/).default('docs'),
{{/if}}
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  const problems = parsed.error.issues.map(issue => `  - ${issue.path.join('.')}: ${issue.message}`).join('\n');
  // The logger depends on this config, so this is the one place that writes to stderr directly.
  process.stderr.write(`Invalid environment configuration:\n${problems}\n\nSee .env.example.\n`);
  process.exit(1);
}
const env = parsed.data;
{{#if AUTH}}
{{#if AUTH_REFRESH}}
if (env.JWT_ACCESS_SECRET === env.JWT_REFRESH_SECRET) {
  process.stderr.write('Invalid environment configuration: JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must differ.\n');
  process.exit(1);
}
{{/if}}
{{/if}}
{{#if IAP_NATIVE}}
if (env.NODE_ENV === 'production' && env.IAP_SKIP_VERIFICATION) {
  process.stderr.write('Invalid environment configuration: IAP_SKIP_VERIFICATION must not be true in production.\n');
  process.exit(1);
}
{{/if}}

/** Typed, validated configuration – the only place that reads `process.env`. */
export const config = {
  env: env.NODE_ENV,
  isProduction: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',
  port: env.PORT,
  host: env.HOST,
  appUrl: env.APP_URL.replace(/\/$/, ''),
  api: {
    prefix: env.API_PREFIX,
    version: env.API_VERSION,
    /** e.g. `/api/v1` */
    basePath: `/${env.API_PREFIX}/${env.API_VERSION}`,
  },
  log: { level: env.LOG_LEVEL },
  http: {
    trustProxy: env.TRUST_PROXY,
{{#if SEC_CORS}}
    corsOrigins: env.CORS_ORIGINS,
{{/if}}
{{#if SEC_BODY_LIMIT}}
    bodyLimit: env.BODY_LIMIT,
{{/if}}
  },
{{#if SEC_RATE_LIMIT}}
  rateLimit: { windowMs: env.RATE_LIMIT_WINDOW_MS, max: env.RATE_LIMIT_MAX },
{{/if}}
{{#if SEC_AUTH_RATE_LIMIT}}
  authRateLimit: { windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS, max: env.AUTH_RATE_LIMIT_MAX },
{{/if}}
  database: { url: env.DATABASE_URL },
{{#if REDIS}}
  redis: { url: env.REDIS_URL },
{{/if}}
{{#if AUTH}}
  jwt: {
    accessSecret: env.JWT_ACCESS_SECRET,
    accessExpiresIn: env.JWT_ACCESS_EXPIRES_IN,
{{#if AUTH_REFRESH}}
    refreshSecret: env.JWT_REFRESH_SECRET,
    refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
{{/if}}
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
  },
  codes: {
    ttl: env.VERIFICATION_CODE_TTL,
    resendAfter: env.VERIFICATION_CODE_RESEND_AFTER,
    maxAttempts: env.VERIFICATION_CODE_MAX_ATTEMPTS,
  },
{{#if AUTH_EMAIL}}
  mail: { smtpUrl: env.SMTP_URL, from: env.MAIL_FROM },
{{/if}}
{{#if AUTH_OTP}}
  sms: { twilioAccountSid: env.TWILIO_ACCOUNT_SID, twilioAuthToken: env.TWILIO_AUTH_TOKEN, twilioFrom: env.TWILIO_FROM },
{{/if}}
{{#if SOCIAL}}
  social: {
{{#if SOCIAL_GOOGLE}}
    googleClientIds: env.GOOGLE_CLIENT_IDS,
{{/if}}
{{#if SOCIAL_FACEBOOK}}
    facebookAppId: env.FACEBOOK_APP_ID,
    facebookAppSecret: env.FACEBOOK_APP_SECRET,
{{/if}}
{{#if SOCIAL_APPLE}}
    appleClientIds: env.APPLE_CLIENT_IDS,
{{/if}}
  },
{{/if}}
{{#if AUTH_EMAIL}}
  password: {
{{#if HASH_CONFIGURABLE}}
    algorithm: env.PASSWORD_HASH_ALGORITHM,
{{/if}}
{{#if HASH_CONFIGURABLE}}
    bcryptRounds: env.BCRYPT_ROUNDS,
{{/if}}
{{#if HASH_BCRYPT}}
    bcryptRounds: env.BCRYPT_ROUNDS,
{{/if}}
{{#if HASH_ARGON2}}
    maxLength: 128,
{{else}}
    /** bcrypt only uses the first 72 bytes of a password. */
    maxLength: 72,
{{/if}}
    minLength: 8,
  },
{{/if}}
{{#if SEC_LOCKOUT}}
  lockout: { maxAttempts: env.ACCOUNT_LOCKOUT_MAX_ATTEMPTS, minutes: env.ACCOUNT_LOCKOUT_MINUTES },
{{/if}}
  seed: {
    adminEmail: env.SEED_ADMIN_EMAIL,
{{#if AUTH_EMAIL}}
    adminPassword: env.SEED_ADMIN_PASSWORD,
{{/if}}
{{#if AUTH_OTP}}
    adminCountryCode: env.SEED_ADMIN_COUNTRY_CODE,
    adminPhone: env.SEED_ADMIN_PHONE,
{{/if}}
    adminName: env.SEED_ADMIN_NAME,
  },
{{/if}}
{{#if UPLOADS}}
  uploads: { dir: env.UPLOAD_DIR, maxBytes: Math.round(env.UPLOAD_MAX_MB * 1024 * 1024), publicPath: '/uploads' },
{{/if}}
{{#if NOTIFICATIONS}}
  firebase: { serviceAccount: env.FIREBASE_SERVICE_ACCOUNT },
{{else}}
{{#if HAS_CALLING}}
  firebase: { serviceAccount: env.FIREBASE_SERVICE_ACCOUNT },
{{/if}}
{{/if}}
{{#if HAS_CALLING}}
  calling: {
    agoraAppId: env.AGORA_APP_ID,
    agoraAppCertificate: env.AGORA_APP_CERTIFICATE,
    callTimeoutSeconds: env.CALL_TIMEOUT_SECONDS,
  },
{{/if}}
{{#if VOIP_PUSH}}
  apns: {
    keyId: env.APNS_KEY_ID,
    teamId: env.APNS_TEAM_ID,
    keyPath: env.APNS_KEY_PATH,
    bundleId: env.APNS_BUNDLE_ID,
    production: env.APNS_PRODUCTION,
  },
{{/if}}
{{#if LEGAL}}
  /** Links the app opens (GET /legal) – change them here, not in the app. */
  legal: {
    termsUrl: env.TERMS_URL || `${env.APP_URL.replace(/\/$/, '')}/terms-and-conditions`,
    privacyPolicyUrl: env.PRIVACY_POLICY_URL || `${env.APP_URL.replace(/\/$/, '')}/privacy-policy`,
{{#if DELETE_ACCOUNT}}
    /** A web page explaining how to delete an account (Google Play asks for one). */
    deleteAccountUrl: env.DELETE_ACCOUNT_URL || `${env.APP_URL.replace(/\/$/, '')}/delete-account`,
{{/if}}
  },
{{/if}}
{{#if PAYMENTS}}
  payments: {
    appName: '{{DISPLAY_NAME}}',
{{#if GATEWAY_STRIPE}}
    stripe: { secretKey: env.STRIPE_SECRET_KEY, publishableKey: env.STRIPE_PUBLISHABLE_KEY, webhookSecret: env.STRIPE_WEBHOOK_SECRET },
{{/if}}
{{#if GATEWAY_RAZORPAY}}
    razorpay: { keyId: env.RAZORPAY_KEY_ID, keySecret: env.RAZORPAY_KEY_SECRET, webhookSecret: env.RAZORPAY_WEBHOOK_SECRET },
{{/if}}
{{#if GATEWAY_PAYPAL}}
    paypal: {
      clientId: env.PAYPAL_CLIENT_ID,
      clientSecret: env.PAYPAL_CLIENT_SECRET,
      webhookId: env.PAYPAL_WEBHOOK_ID,
      apiUrl: env.PAYPAL_MODE === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com',
      /** PayPal sends the buyer back here – the app's web view watches for it. */
      returnUrl: `${env.APP_URL.replace(/\/$/, '')}/payments/paypal/return`,
      cancelUrl: `${env.APP_URL.replace(/\/$/, '')}/payments/paypal/cancel`,
    },
{{/if}}
{{#if IAP_NATIVE}}
    apple: { issuerId: env.APPLE_IAP_ISSUER_ID, keyId: env.APPLE_IAP_KEY_ID, privateKey: env.APPLE_IAP_PRIVATE_KEY, bundleId: env.APPLE_BUNDLE_ID },
    google: { serviceAccount: env.GOOGLE_PLAY_SERVICE_ACCOUNT, packageName: env.GOOGLE_PLAY_PACKAGE_NAME },
    skipVerification: env.IAP_SKIP_VERIFICATION,
{{/if}}
{{#if IAP_ADAPTY}}
    adapty: { secretKey: env.ADAPTY_SECRET_KEY, webhookToken: env.ADAPTY_WEBHOOK_TOKEN },
{{/if}}
  },
{{/if}}
{{#if API_ENCRYPTION}}
  encryption: { enabled: env.API_ENCRYPTION_ENABLED, key: env.API_ENCRYPTION_KEY, iv: env.API_ENCRYPTION_IV },
{{/if}}
{{#if SWAGGER}}
  swagger: { enabled: env.SWAGGER_ENABLED, path: env.SWAGGER_PATH },
{{/if}}
} as const;

export type AppConfig = typeof config;
