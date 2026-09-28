import React, { useMemo, useState } from 'react';
import { FlatList, Image, Modal, Pressable, SafeAreaView, StyleSheet, TextInput, View } from 'react-native';
import { COUNTRIES, type Country } from '{{IMPORT:assets.countries}}';
import { AppText } from '{{IMPORT:components.AppText}}';
import { useStyles, useTheme } from '{{IMPORT:hooks.useTheme}}';
import { translate } from '{{IMPORT:i18n.index}}';
import type { Theme } from '{{IMPORT:theme.index}}';

export interface CountryPickerProps {
  visible: boolean;
  selectedCode?: string;
  onSelect: (country: Country) => void;
  onClose: () => void;
}

/** Full-screen, searchable list of countries (flag · dial code · name). */
export function CountryPicker({ visible, selectedCode, onSelect, onClose }: CountryPickerProps): React.JSX.Element {
  const { theme } = useTheme();
  const styles = useStyles(createStyles);
  const [query, setQuery] = useState('');

  const countries = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRIES;
    const digits = q.replace(/\D/g, '');
    return COUNTRIES.filter(c => c.name.toLowerCase().includes(q) || c.code.toLowerCase() === q || (digits && c.dialCode.includes(digits)));
  }, [query]);

  const close = () => {
    setQuery('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={close}>
      <SafeAreaView style={styles.screen}>
        <View style={styles.header}>
          <AppText fontFamily="semiBold" fontSize="size16" intlType="auth" value="countryCode" />
          <Pressable accessibilityRole="button" hitSlop={theme.spacing.spacing8} onPress={close}>
            <AppText fontFamily="medium" color="primary" intlType="common" value="cancel" />
          </Pressable>
        </View>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={translate('auth', 'searchCountry')}
          placeholderTextColor={theme.colors.placeholder}
          autoCorrect={false}
          style={styles.search}
        />
        <FlatList
          data={countries}
          keyExtractor={item => item.code}
          initialNumToRender={20}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={<AppText style={styles.empty} color="textSecondary" align="center" intlType="auth" value="noCountryFound" />}
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              style={[styles.row, item.code === selectedCode && styles.rowSelected]}
              onPress={() => {
                onSelect(item);
                close();
              }}
            >
              <Image source={item.flag} style={styles.flag} />
              <AppText style={styles.dial} fontFamily="medium" text={item.dialCode} />
              <AppText style={styles.name} numberOfLines={1} text={item.name} />
            </Pressable>
          )}
        />
      </SafeAreaView>
    </Modal>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    screen: { flex: theme.flexs.flexFull, backgroundColor: theme.colors.background },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.spacing16,
      paddingVertical: theme.spacing.spacing12,
    },
    search: {
      marginHorizontal: theme.spacing.spacing16,
      marginBottom: theme.spacing.spacing8,
      paddingHorizontal: theme.spacing.spacing12,
      minHeight: theme.spacing.spacing48,
      borderRadius: theme.borderRadius.radius8,
      borderWidth: theme.spacing.spacing1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      color: theme.colors.text,
      fontFamily: theme.typography.fontFamily.regular,
      fontSize: theme.typography.fontSize.size14,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.spacing12,
      paddingHorizontal: theme.spacing.spacing16,
      paddingVertical: theme.spacing.spacing12,
    },
    rowSelected: { backgroundColor: theme.colors.surface },
    flag: { width: theme.spacing.spacing24, height: theme.spacing.spacing24, borderRadius: theme.spacing.spacing12 },
    dial: { minWidth: theme.spacing.spacing48 },
    name: { flex: theme.flexs.flexFull },
    empty: { marginTop: theme.spacing.spacing24 },
  });
