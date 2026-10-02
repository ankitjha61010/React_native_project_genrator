import { useCallback, useEffect, useState } from 'react';
{{#if GATEWAY_PAYPAL}}
import { useNavigation } from '@react-navigation/native';
import type { RootNavigation } from '{{IMPORT:navigation.types}}';
{{/if}}
{{#if GATEWAY_RAZORPAY}}
import { useTheme } from '{{IMPORT:hooks.useTheme}}';
{{/if}}
import { errorMessage } from '{{IMPORT:api.errors}}';
import { flash } from '{{IMPORT:utils.flashMessage}}';
import { paymentsApi } from '../paymentsApi';
{{#if GATEWAY}}
import { payWithGateway } from '../services/gatewayCheckout';
{{/if}}
{{#if IAP}}
import { inAppPurchases, storeIdOf } from '../services/inAppPurchases';
{{/if}}
import type { PurchaseOutcome, StoreItem } from '../types/payments.types';
import { useAccess } from './useAccess';

/**
 * The Store screen: catalog (GET /payments/products){{#if IAP}} with the store's prices{{/if}}, buying, restoring.
{{#if IAP}}
{{#if GATEWAY}}
 * Products with an App Store / Google Play id are bought in the store (digital content must be);
 * the others through {{GATEWAY_NAME}} (physical goods, services).
{{else}}
 * Only products with a store id for this platform are shown (App Store / Google Play).
{{/if}}
{{/if}}
 */
export function useStore() {
{{#if GATEWAY_PAYPAL}}
  const navigation = useNavigation<RootNavigation>();
{{/if}}
{{#if GATEWAY_RAZORPAY}}
  const { theme } = useTheme();
{{/if}}
  const access = useAccess();
  const [items, setItems] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [buyingId, setBuyingId] = useState<string | null>(null);
{{#if IAP}}
  const [restoring, setRestoring] = useState(false);
{{/if}}

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [products] = await Promise.all([paymentsApi.products(), access.refresh()]);
{{#if IAP}}
      const prices = await inAppPurchases.prices(products).catch(() => new Map<string, string>());
{{/if}}
      setItems(
        products.flatMap((product): StoreItem[] => {
{{#if IAP}}
          if (storeIdOf(product)) return [{ product, channel: 'store', displayPrice: prices.get(product.id) ?? product.displayPrice }];
{{/if}}
{{#if GATEWAY}}
          return product.price > 0 ? [{ product, channel: 'gateway', displayPrice: product.displayPrice }] : [];
{{else}}
          return [];
{{/if}}
        }),
      );
    } catch (error) {
      flash.error({ message: errorMessage(error) });
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const report = (outcome: PurchaseOutcome) => {
    if (outcome === 'purchased') flash.success({ intlType: 'payments', value: 'purchased' });
    else if (outcome === 'pending') flash.info({ intlType: 'payments', value: 'pending' });
  };

  const buy = useCallback(
    async (item: StoreItem) => {
      setBuyingId(item.product.id);
      try {
{{#if IAP}}
{{#if GATEWAY}}
        report(
          item.channel === 'store'
            ? await inAppPurchases.buy(item.product)
            : await payWithGateway(item.product.id, { {{#if GATEWAY_PAYPAL}}openPayPal: approval => navigation.navigate('Main', { screen: 'PayPalCheckout', params: approval }){{/if}}{{#if GATEWAY_RAZORPAY}}themeColor: theme.colors.primary{{/if}} }),
        );
{{else}}
        report(await inAppPurchases.buy(item.product));
{{/if}}
{{else}}
        report(await payWithGateway(item.product.id, { {{#if GATEWAY_PAYPAL}}openPayPal: approval => navigation.navigate('Main', { screen: 'PayPalCheckout', params: approval }){{/if}}{{#if GATEWAY_RAZORPAY}}themeColor: theme.colors.primary{{/if}} }));
{{/if}}
      } catch (error) {
        flash.error({ message: errorMessage(error) });
      } finally {
        setBuyingId(null);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
{{#if IAP}}

  const restore = useCallback(async () => {
    setRestoring(true);
    try {
      await inAppPurchases.restore();
      flash.success({ intlType: 'payments', value: 'restored' });
    } catch (error) {
      flash.error({ message: errorMessage(error) });
    } finally {
      setRestoring(false);
    }
  }, []);
{{/if}}

  return { items, loading, buyingId, buy, {{#if IAP}}restoring, restore, {{/if}}reload: load, access };
}
