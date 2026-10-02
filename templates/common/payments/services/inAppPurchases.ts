import { Platform } from 'react-native';
{{#if IAP_NATIVE}}
import {
  endConnection,
  ErrorCode,
  fetchProducts,
  finishTransaction,
  getAvailablePurchases,
  initConnection,
  purchaseErrorListener,
  purchaseUpdatedListener,
  requestPurchase,
  type EventSubscription,
  type Product,
  type ProductSubscription,
  type Purchase,
} from 'react-native-iap';
import { ApiError } from '{{IMPORT:api.errors}}';
{{/if}}
{{#if IAP_ADAPTY}}
import { adapty, type AdaptyPaywallProduct } from 'react-native-adapty';
import { env } from '{{IMPORT:config.env}}';
{{/if}}
import { logger } from '{{IMPORT:utils.logger}}';
import { paymentsApi } from '../paymentsApi';
import type { Access, CatalogProduct, PurchaseOutcome } from '../types/payments.types';
import { accessStore } from './accessStore';

/** The store id of a catalog product on this platform (App Store / Google Play). */
export const storeIdOf = (product: CatalogProduct): string | null => (Platform.OS === 'ios' ? product.appleProductId : product.googleProductId);
{{#if IAP_NATIVE}}

// ── react-native-iap (StoreKit 2 / Google Play Billing) ──────────────────────
//
// Every purchase goes to the backend first (POST /payments/iap/verify asks Apple / Google);
// finishTransaction() only runs after that – unfinished purchases are delivered again by the store.

let connected: Promise<boolean> | null = null;
let subscriptions: EventSubscription[] = [];
const storeProducts = new Map<string, Product | ProductSubscription>();
const pending = new Map<string, { resolve: (outcome: PurchaseOutcome) => void; reject: (error: unknown) => void }>();

/** A 4xx from the backend is final (not in the catalog, another account…); anything else may succeed later. */
const isFinal = (error: unknown) => error instanceof ApiError && error.status !== undefined && error.status >= 400 && error.status < 500;

async function verifyAndFinish(purchase: Purchase): Promise<void> {
  const subscription = storeProducts.get(purchase.productId)?.type === 'subs';
  try {
    const { access } = await paymentsApi.verifyPurchase(
      Platform.OS === 'ios'
        ? { platform: 'ios', productId: purchase.productId, transactionId: 'transactionId' in purchase && purchase.transactionId ? purchase.transactionId : purchase.id }
        : { platform: 'android', productId: purchase.productId, purchaseToken: purchase.purchaseToken ?? '', type: subscription ? 'subs' : 'in-app' },
    );
    accessStore.set(access);
    await finishTransaction({ purchase, isConsumable: false });
    pending.get(purchase.productId)?.resolve('purchased');
  } catch (error) {
    logger.warn('Verifying the purchase failed', error);
    // Final answers are finished so the store stops redelivering them; the others retry next launch.
    if (isFinal(error)) await finishTransaction({ purchase, isConsumable: false }).catch(() => undefined);
    pending.get(purchase.productId)?.reject(error);
  } finally {
    pending.delete(purchase.productId);
  }
}

async function connect(): Promise<boolean> {
  connected ??= initConnection()
    .then(ok => {
      subscriptions = [
        purchaseUpdatedListener(purchase => void verifyAndFinish(purchase)),
        purchaseErrorListener(error => {
          const productId = error.productId ?? [...pending.keys()][0];
          if (!productId) return;
          const waiting = pending.get(productId);
          pending.delete(productId);
          if (error.code === ErrorCode.UserCancelled) waiting?.resolve('cancelled');
          else waiting?.reject(new Error(error.message));
        }),
      ];
      return ok;
    })
    .catch(error => {
      connected = null;
      throw error;
    });
  return connected;
}

async function loadStoreProducts(skus: string[]): Promise<void> {
  const missing = skus.filter(sku => !storeProducts.has(sku));
  if (!missing.length || !(await connect())) return;
  const found = ((await fetchProducts({ skus: missing, type: 'all' })) ?? []) as Array<Product | ProductSubscription>;
  for (const product of found) storeProducts.set(product.id, product);
}

export const inAppPurchases = {
  /** Signed in: connect to the store and finish purchases that were left open (e.g. the app was closed). */
  async start(_userId: string): Promise<void> {
    try {
      if (await connect()) await inAppPurchases.restore(true);
    } catch (error) {
      logger.warn('Connecting to the store failed', error);
    }
  },

  async stop(): Promise<void> {
    subscriptions.forEach(subscription => subscription.remove());
    subscriptions = [];
    storeProducts.clear();
    if (connected) await endConnection().catch(() => undefined);
    connected = null;
  },

  /** The store's localized prices, by catalog product id. */
  async prices(products: CatalogProduct[]): Promise<Map<string, string>> {
    const skus = products.map(storeIdOf).filter((sku): sku is string => Boolean(sku));
    await loadStoreProducts(skus);
    return new Map(products.flatMap(p => {
      const store = storeProducts.get(storeIdOf(p) ?? '');
      return store ? [[p.id, store.displayPrice] as [string, string]] : [];
    }));
  },

  async buy(product: CatalogProduct): Promise<PurchaseOutcome> {
    const sku = storeIdOf(product);
    if (!sku) throw new Error('This product has no store product id for this platform.');
    await loadStoreProducts([sku]);
    const storeProduct = storeProducts.get(sku);
    if (!storeProduct) throw new Error(`"${sku}" was not found in the store – check App Store Connect / Play Console.`);

    const outcome = new Promise<PurchaseOutcome>((resolve, reject) => pending.set(sku, { resolve, reject }));
    if (storeProduct.type === 'subs') {
      // Google Play needs the offer (base plan) to buy.
      const offerToken = 'subscriptionOffers' in storeProduct ? storeProduct.subscriptionOffers?.find(offer => offer.offerTokenAndroid)?.offerTokenAndroid : undefined;
      await requestPurchase({
        type: 'subs',
        request: { apple: { sku }, google: { skus: [sku], subscriptionOffers: offerToken ? [{ sku, offerToken }] : undefined } },
      });
    } else {
      await requestPurchase({ type: 'in-app', request: { apple: { sku }, google: { skus: [sku] } } });
    }
    return outcome;
  },

  /** "Restore purchases": every purchase the store still holds is verified again. */
  async restore(quiet = false): Promise<Access> {
    if (!(await connect())) return accessStore.refresh();
    const purchases = await getAvailablePurchases();
    for (const purchase of purchases) await verifyAndFinish(purchase).catch(error => !quiet && logger.warn('Restoring a purchase failed', error));
    return accessStore.refresh();
  },
};
{{/if}}
{{#if IAP_ADAPTY}}

// ── Adapty ───────────────────────────────────────────────────────────────────
//
// Adapty talks to the stores and validates receipts. The app identifies the user with our user id;
// the backend mirrors the Adapty access levels (webhook + POST /payments/adapty/sync).

let activated = false;
let paywallProducts: AdaptyPaywallProduct[] | null = null;

const missingKey = () => !env.adapty.publicSdkKey || env.adapty.publicSdkKey.includes('REPLACE_ME');

async function syncAccess(): Promise<Access> {
  try {
    accessStore.set(await paymentsApi.syncAdapty());
  } catch (error) {
    logger.warn('Syncing the Adapty access failed', error);
  }
  return accessStore.get();
}

async function loadPaywallProducts(): Promise<AdaptyPaywallProduct[]> {
  if (!paywallProducts) {
    const flow = await adapty.getFlow(env.adapty.placementId);
    paywallProducts = await adapty.getPaywallProducts(flow);
  }
  return paywallProducts;
}

export const inAppPurchases = {
  async start(userId: string): Promise<void> {
    if (missingKey()) {
      logger.warn('ADAPTY_PUBLIC_SDK_KEY is not set (.env) – in-app purchases are off');
      return;
    }
    try {
      if (!activated) {
        await adapty.activate(env.adapty.publicSdkKey, { customerUserId: userId });
        activated = true;
      } else {
        await adapty.identify(userId);
      }
      await syncAccess();
    } catch (error) {
      logger.warn('Starting Adapty failed', error);
    }
  },

  async stop(): Promise<void> {
    paywallProducts = null;
    if (activated) await adapty.logout().catch(() => undefined);
  },

  /** The store's localized prices (from the Adapty placement), by catalog product id. */
  async prices(products: CatalogProduct[]): Promise<Map<string, string>> {
    if (!activated) return new Map();
    const store = await loadPaywallProducts().catch(() => []);
    return new Map(products.flatMap(p => {
      const match = store.find(item => item.vendorProductId === storeIdOf(p));
      return match?.price?.localizedString ? [[p.id, match.price.localizedString] as [string, string]] : [];
    }));
  },

  async buy(product: CatalogProduct): Promise<PurchaseOutcome> {
    if (!activated) throw new Error('In-app purchases are not set up (ADAPTY_PUBLIC_SDK_KEY).');
    const sku = storeIdOf(product);
    const match = (await loadPaywallProducts()).find(item => item.vendorProductId === sku);
    if (!match) throw new Error(`"${sku}" is not in the Adapty placement "${env.adapty.placementId}".`);
    const result = await adapty.makePurchase(match);
    if (result.type === 'user_cancelled') return 'cancelled';
    if (result.type === 'pending') return 'pending';
    await syncAccess();
    return 'purchased';
  },

  async restore(): Promise<Access> {
    if (!activated) return accessStore.refresh();
    await adapty.restorePurchases();
    return syncAccess();
  },
};
{{/if}}
