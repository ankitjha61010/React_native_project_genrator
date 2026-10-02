import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';
import { afterAll, describe, expect, it } from 'vitest';
import { prepareGeneration } from '../src/core/context.js';
import { renderPlan } from '../src/generators/fileGenerator.js';
import type { ProjectOptions } from '../src/core/types.js';
import { getProfile, resolveDependencies } from '../src/config/compatibility.js';
import { paymentValues, PAYMENT_PLACEHOLDERS } from '../src/config/payments.js';
import { renderBackend } from '../src/backend/generator.js';
import { planMicroservices } from '../src/backend/microservices.js';
import type { BackendOptions } from '../src/backend/types.js';
import { generateAdminPanel } from '../src/generators/adminGenerator.js';

function app(overrides: Partial<ProjectOptions> = {}): ProjectOptions {
  return {
    appName: 'PayApp',
    displayName: 'Pay App',
    packageName: 'com.pay.app',
    parentDir: '/tmp',
    architecture: 'feature-based',
    stateManagement: 'zustand',
    storage: 'mmkv',
    apiEncryption: false,
    rtl: true,
    themeContext: true,
    vectorIcons: true,
    notifications: true,
    analytics: false,
    authEmail: true,
    authMobile: false,
    socialAuth: { google: false, facebook: false, apple: false },
    socialCredentials: {},
    socket: false,
    chat: false,
    groupChat: false,
    audioCall: false,
    videoCall: false,
    termsAndConditions: true,
    deleteAccount: true,
    googleLocation: false,
    drawer: false,
    ota: false,
    inAppPurchase: 'none',
    paymentGateway: 'none',
    paymentCredentials: {},
    adminPanel: false,
    initGit: false,
    installDependencies: false,
    installPods: false,
    overwrite: true,
    reactNativeVersion: '0.87.1',
    firebase: {},
    ...overrides,
  };
}

function backend(overrides: Partial<BackendOptions> = {}, modules: Partial<BackendOptions['modules']> = {}): BackendOptions {
  return {
    appName: 'pay-api',
    displayName: 'Pay API',
    framework: 'express',
    architecture: 'feature-based',
    database: 'postgresql',
    orm: 'prisma',
    auth: 'refresh-rotation',
    authMethods: { email: true, mobileOtp: false, google: false, facebook: false, apple: false },
    hashing: 'bcrypt',
    swagger: true,
    security: { helmet: true, cors: true, rateLimit: true, authRateLimit: true, bodyLimit: true, sanitize: false, accountLockout: false },
    modules: { chat: false, groupChat: false, audioCall: false, videoCall: false, notifications: false, legal: true, deleteAccount: true, ...modules },
    apiEncryption: false,
    appPackage: 'com.pay.app',
    deployment: 'monolith',
    redis: false,
    docker: false,
    projectDir: '/tmp/pay-api',
    initGit: false,
    installDependencies: false,
    ...overrides,
  };
}

const paths = (files: Array<{ path: string }>) => files.map(f => f.path);
const content = (files: Array<{ path: string; content: unknown }>, end: string) => String(files.find(f => f.path.endsWith(end))?.content ?? '');

describe('payments – app', () => {
  it('adds nothing without payments', async () => {
    const files = await renderPlan(prepareGeneration(app()));
    expect(paths(files).some(p => p.includes('payments'))).toBe(false);
    const deps = resolveDependencies(getProfile('0.87.1'), app()).dependencies;
    expect(Object.keys(deps)).not.toContain('react-native-iap');
  });

  it('react-native-iap + Stripe: store screen, services, translations and SDKs', async () => {
    const options = app({ inAppPurchase: 'iap', paymentGateway: 'stripe' });
    const files = await renderPlan(prepareGeneration(options));
    const list = paths(files);
    for (const file of ['StoreScreen.tsx', 'inAppPurchases.ts', 'gatewayCheckout.ts', 'useAccess.ts', 'locales/en/payments.json', 'locales/ar/payments.json', 'docs/PAYMENTS.md']) {
      expect(list.some(p => p.endsWith(file)), file).toBe(true);
    }
    expect(list.some(p => p.includes('PayPalCheckoutScreen'))).toBe(false);
    expect(content(files, 'gatewayCheckout.ts')).toContain('presentPaymentSheet');
    expect(content(files, 'gatewayCheckout.ts')).not.toContain('{{');
    expect(content(files, 'MainNavigator.tsx')).toContain('name="Store"');

    const deps = Object.keys(resolveDependencies(getProfile('0.87.1'), options).dependencies);
    expect(deps).toEqual(expect.arrayContaining(['react-native-iap', 'react-native-nitro-modules', '@stripe/stripe-react-native']));
    expect(deps).not.toContain('react-native-adapty');
  });

  it('PayPal needs no SDK – a web view screen instead', async () => {
    const options = app({ paymentGateway: 'paypal' });
    const files = await renderPlan(prepareGeneration(options));
    expect(paths(files).some(p => p.endsWith('PayPalCheckoutScreen.tsx'))).toBe(true);
    expect(paths(files).some(p => p.endsWith('inAppPurchases.ts'))).toBe(false);
    const deps = Object.keys(resolveDependencies(getProfile('0.87.1'), options).dependencies);
    expect(deps.filter(d => /stripe|razorpay|iap|adapty/.test(d))).toEqual([]);
  });

  it('Adapty: the public SDK key goes in the app .env (entered or dummy)', async () => {
    const dummy = await renderPlan(prepareGeneration(app({ inAppPurchase: 'adapty' })));
    expect(content(dummy, '.env')).toContain(`ADAPTY_PUBLIC_SDK_KEY=${PAYMENT_PLACEHOLDERS.adaptyPublicSdkKey}`);
    const real = await renderPlan(prepareGeneration(app({ inAppPurchase: 'adapty', paymentCredentials: { adaptyPublicSdkKey: 'public_live_abc' } })));
    expect(content(real, '.env')).toContain('ADAPTY_PUBLIC_SDK_KEY=public_live_abc');
    expect(content(real, 'inAppPurchases.ts')).toContain('adapty.makePurchase');
  });
});

describe('payments – backend', () => {
  it('real keys go to .env only; skipped ones are REPLACE_ME dummies', async () => {
    const { files, packageJson } = await renderBackend(
      backend({ paymentCredentials: { stripeSecretKey: 'sk_test_real' } }, { paymentGateway: 'stripe' }),
    );
    expect(content(files, '.env')).toContain('STRIPE_SECRET_KEY=sk_test_real');
    expect(content(files, '.env')).toContain('STRIPE_WEBHOOK_SECRET=whsec_REPLACE_ME');
    expect(content(files, '.env.example')).not.toContain('sk_test_real');
    expect(Object.keys((packageJson as { dependencies: Record<string, string> }).dependencies)).toContain('stripe');
  });

  it('only the chosen providers get code and tables', async () => {
    const gatewayOnly = await renderBackend(backend({}, { paymentGateway: 'razorpay' }));
    const list = paths(gatewayOnly.files);
    expect(list.some(p => p.endsWith('razorpay-payment-gateway.ts'))).toBe(true);
    expect(list.some(p => p.endsWith('stripe-payment-gateway.ts') || p.endsWith('store-purchase-verifier.ts'))).toBe(false);
    expect(content(gatewayOnly.files, 'prisma/payments.prisma')).toContain('model Payment ');
    expect(content(gatewayOnly.files, 'prisma/payments.prisma')).not.toContain('StorePurchase');
    expect(Object.keys((gatewayOnly.packageJson as { dependencies: Record<string, string> }).dependencies)).not.toContain('stripe');

    const iapOnly = await renderBackend(backend({ orm: 'typeorm', database: 'mysql' }, { inAppPurchase: 'iap' }));
    const migration = content(iapOnly.files, '1767225600100-Payments.ts');
    expect(migration).toContain('CREATE TABLE \\`store_purchases\\`');
    expect(migration).not.toContain('CREATE TABLE \\`payments\\`');
    expect(content(iapOnly.files, 'payments.routes.ts')).toContain("'/iap/verify'");
    expect(content(iapOnly.files, 'roles.ts')).toContain("'payments:manage'");
  });

  it('no payments without accounts', async () => {
    const { files } = await renderBackend(backend({ auth: 'none' }, { paymentGateway: 'stripe' }));
    expect(paths(files).some(p => p.includes('payments'))).toBe(false);
  });

  it('microservices: payments live in the identity service', () => {
    const plan = planMicroservices(backend({ deployment: 'microservices' }, { notifications: true, inAppPurchase: 'adapty', paymentGateway: 'paypal' }));
    expect(plan.payments).toBe(true);
    const identity = plan.services.find(s => s.service === 'identity')!;
    const notifications = plan.services.find(s => s.service === 'notifications')!;
    expect(identity.modules).toMatchObject({ inAppPurchase: 'adapty', paymentGateway: 'paypal' });
    expect(notifications.modules.paymentGateway ?? 'none').toBe('none');
  });

  it('dummy values cover every key', () => {
    expect(Object.values(paymentValues()).every(v => v.includes('REPLACE_ME') || v.startsWith('./keys/'))).toBe(true);
    expect(paymentValues({ razorpayKeyId: ' rzp_test_x ' }).razorpayKeyId).toBe('rzp_test_x');
  });
});

describe('payments – admin panel', () => {
  const dirs: string[] = [];
  afterAll(async () => {
    for (const dir of dirs) await fs.remove(dir);
  });

  for (const techStack of ['next', 'react'] as const) {
    it(`${techStack}: Payments screens only with payments`, async () => {
      const off = await fs.mkdtemp(path.join(os.tmpdir(), 'admin-off-'));
      const on = await fs.mkdtemp(path.join(os.tmpdir(), 'admin-on-'));
      dirs.push(off, on);
      const base = { techStack, appName: 'pay', displayName: 'Pay', apiBaseUrl: 'http://localhost:3000/api/v1', ota: false };
      await generateAdminPanel({ ...base, adminDir: off });
      await generateAdminPanel({ ...base, adminDir: on, inAppPurchase: 'iap', paymentGateway: 'stripe' });

      expect(await fs.pathExists(path.join(off, 'src/components/PaymentsManager.tsx'))).toBe(false);
      expect(await fs.readFile(path.join(off, 'src/components/Sidebar.tsx'), 'utf8')).not.toContain('Payments');
      const manager = await fs.readFile(path.join(on, 'src/components/PaymentsManager.tsx'), 'utf8');
      expect(manager).toContain('/payments/admin/payments');
      expect(manager).toContain('App Store product id');
      expect(manager).not.toContain('{{');
      expect(await fs.readFile(path.join(on, 'src/components/Sidebar.tsx'), 'utf8')).toContain('Payments');
    });
  }
});
