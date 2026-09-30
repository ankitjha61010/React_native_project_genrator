import React from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';
import { AppIcon } from '@presentation/components/AppIcon';
import { AppInput } from '@presentation/components/AppInput';
import { AppText } from '@presentation/components/AppText';
import { useStyles, useTheme } from '@presentation/hooks/useTheme';
import { translate } from '@infrastructure/i18n';
import { useLocationSearch } from '@infrastructure/location/useLocationSearch';
import { permissionService } from '@infrastructure/permissions/permissionService';
import type { Theme } from '@presentation/theme';

export interface LocationPickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

/**
 * Google Location SDK field: type to get Google Places suggestions ("Pune · Maharashtra, India"),
 * or "Use current location" to fill in the city of the device's position.
 */
export function LocationPicker({ value, onChange, placeholder }: LocationPickerProps): React.JSX.Element {
  const styles = useStyles(createStyles);
  const { theme } = useTheme();
  const search = useLocationSearch(value, onChange);

  return (
    <View style={styles.container}>
      <AppInput
        value={value}
        onChangeText={search.type}
        placeholder={placeholder ?? translate('common', 'searchLocation')}
        leftIcon="map-marker-outline"
        autoCorrect={false}
      />

      {search.suggestions.length > 0 ? (
        <View style={styles.suggestions}>
          {search.suggestions.map(suggestion => (
            <TouchableOpacity key={suggestion.placeId} style={styles.suggestion} onPress={() => search.select(suggestion)} accessibilityRole="button">
              <AppText fontFamily="medium" numberOfLines={1} text={suggestion.primaryText} />
              {suggestion.secondaryText ? <AppText fontSize="size12" color="textSecondary" numberOfLines={1} text={suggestion.secondaryText} /> : null}
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      <View style={styles.row}>
        <TouchableOpacity style={styles.current} onPress={search.useCurrentLocation} disabled={search.locating} accessibilityRole="button">
          {search.locating ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : (
            <AppIcon name="crosshairs-gps" size={18} tintColor={theme.colors.primary} />
          )}
          <AppText fontSize="size14" fontFamily="semiBold" color="primary" intlType="common" value="useCurrentLocation" />
        </TouchableOpacity>
        {search.searching ? <ActivityIndicator size="small" color={theme.colors.textSecondary} /> : null}
      </View>

      {search.error ? (
        <View style={styles.row}>
          <AppText fontSize="size12" color="error" style={styles.grow} intlType="common" value={search.error} />
          {search.error === 'locationPermissionBlocked' ? (
            <TouchableOpacity onPress={() => permissionService.openSettings()} accessibilityRole="button">
              <AppText fontSize="size12" fontFamily="semiBold" color="primary" intlType="common" value="openSettings" />
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      gap: theme.spacing.spacing8,
    },
    suggestions: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.radius8,
      backgroundColor: theme.colors.surface,
      overflow: 'hidden',
    },
    suggestion: {
      paddingHorizontal: theme.spacing.spacing12,
      paddingVertical: theme.spacing.spacing10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.spacing8,
    },
    current: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.spacing6,
      paddingVertical: theme.spacing.spacing4,
    },
    grow: {
      flex: 1,
    },
  });
