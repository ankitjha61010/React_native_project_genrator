import React from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { AppButton } from '{{IMPORT:components.AppButton}}';
import { AppText } from '{{IMPORT:components.AppText}}';
import { useStyles, useTheme } from '{{IMPORT:hooks.useTheme}}';
import { translate } from '{{IMPORT:i18n.index}}';
import type { Theme } from '{{IMPORT:theme.index}}';
import { useStore } from '../../hooks/useStore';
import type { StoreItem } from '../../types/payments.types';

const formatDate = (iso: string) => new Date(iso).toLocaleDateString();

/** Store / Premium: what the user has, what they can buy{{#if IAP}}, and "Restore purchases"{{/if}}. */
export function StoreScreen(): React.JSX.Element {
  const styles = useStyles(createStyles);
  const { theme } = useTheme();
  const { items, loading, buyingId, buy, {{#if IAP}}restoring, restore, {{/if}}reload, access } = useStore();

  const renderItem = ({ item }: { item: StoreItem }) => {
    const { product } = item;
    const owned = access.accessLevels.includes(product.accessLevel);
    const term =
      product.kind === 'subscription'
        ? translate('payments', 'subscription')
        : product.durationDays
          ? translate('payments', 'forDays', { value1: product.durationDays })
          : translate('payments', 'lifetime');
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <AppText fontFamily="bold" fontSize="size16" text={product.name} style={styles.flex} />
          {owned ? (
            <View style={styles.badge}>
              <AppText fontFamily="semiBold" fontSize="size11" color="primary" intlType="payments" value="active" />
            </View>
          ) : null}
        </View>
        {product.description ? <AppText fontSize="size13" color="textSecondary" text={product.description} /> : null}
        <View style={styles.priceRow}>
          <AppText fontFamily="bold" fontSize="size20" text={item.displayPrice} />
          <AppText fontSize="size12" color="textSecondary" text={term} />
        </View>
        <AppButton
          title={translate('payments', owned && product.durationDays ? 'extend' : 'buy')}
          loading={buyingId === product.id}
          disabled={buyingId !== null}
          onPress={() => buy(item)}
        />
      </View>
    );
  };

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.content}
      data={items}
      keyExtractor={item => item.product.id}
      renderItem={renderItem}
      refreshControl={<RefreshControl refreshing={false} onRefresh={reload} tintColor={theme.colors.primary} />}
      ListHeaderComponent={
        <View style={styles.accessCard}>
          <AppText fontFamily="semiBold" fontSize="size13" color="onPrimary" intlType="payments" value="yourAccess" />
          {access.entitlements.length ? (
            access.entitlements.map(e => (
              <AppText
                key={e.id}
                fontFamily="bold"
                fontSize="size16"
                color="onPrimary"
                text={`${e.accessLevel} · ${e.expiresAt ? translate('payments', 'until', { value1: formatDate(e.expiresAt) }) : translate('payments', 'noExpiry')}`}
              />
            ))
          ) : (
            <AppText fontFamily="bold" fontSize="size16" color="onPrimary" intlType="payments" value="freePlan" />
          )}
        </View>
      }
      ListEmptyComponent={
        loading ? (
          <ActivityIndicator style={styles.loader} color={theme.colors.primary} />
        ) : (
          <AppText color="textSecondary" align="center" intlType="payments" value="noProducts" style={styles.empty} />
        )
      }
{{#if IAP}}
      ListFooterComponent={
        <View style={styles.footer}>
          <AppButton variant="ghost" title={translate('payments', 'restore')} loading={restoring} onPress={restore} />
          <AppText fontSize="size11" color="textSecondary" align="center" intlType="payments" value="storeTerms" />
        </View>
      }
{{/if}}
    />
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    list: { flex: 1, backgroundColor: theme.colors.background },
    content: { padding: theme.spacing.spacing16, gap: theme.spacing.spacing12 },
    flex: { flex: 1 },
    accessCard: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.radius16,
      padding: theme.spacing.spacing16,
      gap: theme.spacing.spacing4,
      marginBottom: theme.spacing.spacing4,
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.radius16,
      padding: theme.spacing.spacing16,
      gap: theme.spacing.spacing8,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.spacing8 },
    badge: {
      borderWidth: 1,
      borderColor: theme.colors.primary,
      borderRadius: theme.borderRadius.radius100,
      paddingHorizontal: theme.spacing.spacing8,
      paddingVertical: theme.spacing.spacing2,
    },
    priceRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
    loader: { marginTop: theme.spacing.spacing32 },
    empty: { marginTop: theme.spacing.spacing32 },
    footer: { gap: theme.spacing.spacing8, marginTop: theme.spacing.spacing8 },
  });
