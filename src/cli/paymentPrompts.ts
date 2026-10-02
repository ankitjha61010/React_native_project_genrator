import fs from 'node:fs';
import { input, select } from '@inquirer/prompts';
import chalk from 'chalk';
import {
  GATEWAY_KEYS,
  GATEWAY_LABELS,
  IAP_KEYS,
  IAP_LABELS,
  type InAppPurchaseProvider,
  type PaymentCredentials,
  type PaymentGateway,
} from '../config/payments.js';
import { resolveUserPath } from '../utils/paths.js';
import type { CliFlags } from './args.js';
import { log } from './logger.js';

export interface PaymentAnswers {
  inAppPurchase: InAppPurchaseProvider;
  paymentGateway: PaymentGateway;
  paymentCredentials: PaymentCredentials;
}

/** Keys that are file paths – checked to exist (they are copied into the backend's keys/ folder). */
const FILE_KEYS = new Set<keyof PaymentCredentials>(['appleIapPrivateKeyPath', 'googlePlayServiceAccountPath']);

function validateFile(key: keyof PaymentCredentials) {
  return (value: string): string | true => {
    const trimmed = value.trim();
    if (!trimmed) return true;
    const resolved = resolveUserPath(trimmed);
    if (!fs.existsSync(resolved)) return `File not found at ${resolved}`;
    if (key === 'googlePlayServiceAccountPath') {
      try {
        const json = JSON.parse(fs.readFileSync(resolved, 'utf8')) as { client_email?: string; private_key?: string };
        if (!json.client_email || !json.private_key) return 'Not a service account key (client_email / private_key missing).';
      } catch {
        return 'File is not valid JSON.';
      }
    } else if (!fs.readFileSync(resolved, 'utf8').includes('PRIVATE KEY')) {
      return 'Not a .p8 private key file.';
    }
    return true;
  };
}

/** "Configure now" asks every key of the provider; an empty answer keeps the dummy value. */
async function askKeys(keys: Array<{ key: keyof PaymentCredentials; label: string }>, credentials: PaymentCredentials, provider: string): Promise<void> {
  const choice = await select<'configure' | 'skip'>({
    message: `${provider} keys?`,
    choices: [
      { name: '1. Configure now', value: 'configure', description: 'Enter the keys – an empty answer keeps a dummy value for that key' },
      { name: '2. Skip – use dummy keys', value: 'skip', description: 'Put the real keys in the .env files later (docs/PAYMENTS.md lists every one)' },
    ],
    default: 'skip',
  });
  if (choice === 'skip') return;
  for (const { key, label } of keys) {
    const value = (await input({ message: `${label} (leave empty for a dummy value):`, validate: FILE_KEYS.has(key) ? validateFile(key) : undefined })).trim();
    if (value) credentials[key] = FILE_KEYS.has(key) ? resolveUserPath(value) : value;
  }
}

/**
 * In-app purchases (react-native-iap / Adapty) and a payment gateway (Stripe / Razorpay / PayPal).
 * Asked by the app wizard and the backend wizard – the same questions in both.
 */
export async function askPayments(flags: CliFlags, interactive: boolean): Promise<PaymentAnswers> {
  const paymentCredentials: PaymentCredentials = {};

  let inAppPurchase: InAppPurchaseProvider;
  if (flags.iap) {
    inAppPurchase = flags.iap;
    log.success(`In-app purchases: ${chalk.cyan(IAP_LABELS[inAppPurchase])}`);
  } else if (interactive) {
    inAppPurchase = await select<InAppPurchaseProvider>({
      message: 'Do you want In-App Purchases (store products / subscriptions)?',
      choices: [
        { name: 'No', value: 'none' },
        { name: 'Yes – react-native-iap', value: 'iap', description: 'StoreKit 2 + Google Play Billing directly; the backend verifies every purchase with Apple / Google' },
        { name: 'Yes – Adapty', value: 'adapty', description: 'Managed subscriptions, paywalls and analytics; the backend syncs access levels from Adapty' },
      ],
      default: 'none',
    });
    if (inAppPurchase !== 'none') await askKeys(IAP_KEYS[inAppPurchase], paymentCredentials, IAP_LABELS[inAppPurchase]);
  } else {
    inAppPurchase = 'none';
  }

  let paymentGateway: PaymentGateway;
  if (flags.paymentGateway) {
    paymentGateway = flags.paymentGateway;
    log.success(`Payment gateway: ${chalk.cyan(GATEWAY_LABELS[paymentGateway])}`);
  } else if (interactive) {
    paymentGateway = await select<PaymentGateway>({
      message: 'Do you want a Payment Gateway (cards / UPI / wallets)?',
      choices: [
        { name: 'No', value: 'none' },
        { name: 'Yes – Stripe', value: 'stripe', description: 'PaymentSheet (cards, Apple Pay, Google Pay), webhooks, refunds' },
        { name: 'Yes – Razorpay', value: 'razorpay', description: 'Razorpay Checkout (cards, UPI, net banking, wallets), webhooks, refunds' },
        { name: 'Yes – PayPal', value: 'paypal', description: 'PayPal Checkout (orders API) in a web view, webhooks, refunds' },
      ],
      default: 'none',
    });
    if (paymentGateway !== 'none') await askKeys(GATEWAY_KEYS[paymentGateway], paymentCredentials, GATEWAY_LABELS[paymentGateway]);
  } else {
    paymentGateway = 'none';
  }

  return { inAppPurchase, paymentGateway, paymentCredentials };
}
