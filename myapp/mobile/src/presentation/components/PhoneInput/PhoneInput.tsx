import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, TextInput, View } from 'react-native';
import type { Country } from '@assets/flags/countries';
import { AppText } from '@presentation/components/AppText';
import { CountryPicker } from '@presentation/components/CountryPicker';
import { useStyles, useTheme } from '@presentation/hooks/useTheme';
import { intlRef, translate, type IntlKey } from '@infrastructure/i18n';
import type { Theme } from '@presentation/theme';

export interface PhoneInputProps {
  country: Country;
  onCountryChange: (country: Country) => void;
  /** National number as typed (spaces allowed). */
  value: string;
  onChangeText: (value: string) => void;
  onBlur?: () => void;
  labelValue?: IntlKey<'auth'>;
  /** Validation error as an `auth` translation key. */
  errorValue?: IntlKey<'auth'>;
  editable?: boolean;
}

/** Country (flag + dial code, opens the picker) + mobile number, styled like AppInput. */
export function PhoneInput({ country, onCountryChange, value, onChangeText, onBlur, labelValue = 'phoneNumber', errorValue, editable = true }: PhoneInputProps): React.JSX.Element {
  const { theme } = useTheme();
  const styles = useStyles(createStyles);
  const [picking, setPicking] = useState(false);
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.container}>
      <AppText fontFamily="medium" color="textSecondary" intlType="auth" value={labelValue} />
      <View style={[styles.field, focused && styles.fieldFocused, errorValue && styles.fieldError]}>
        <Pressable accessibilityRole="button" accessibilityLabel={translate('auth', 'countryCode')} disabled={!editable} style={styles.country} onPress={() => setPicking(true)}>
          <Image source={country.flag} style={styles.flag} />
          <AppText fontFamily="medium" text={country.dialCode} />
          <AppText color="textSecondary" text="▾" />
        </Pressable>
        <View style={styles.divider} />
        <TextInput
          value={value}
          onChangeText={text => onChangeText(text.replace(/[^\d\s-]/g, ''))}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            onBlur?.();
          }}
          editable={editable}
          placeholder={translate('auth', 'phonePlaceholder')}
          placeholderTextColor={theme.colors.placeholder}
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          autoComplete="tel"
          maxLength={20}
          allowFontScaling={false}
          style={styles.input}
        />
      </View>
      {errorValue ? <AppText fontSize="size12" color="error" {...intlRef('auth', errorValue)} /> : null}
      <CountryPicker visible={picking} selectedCode={country.code} onSelect={onCountryChange} onClose={() => setPicking(false)} />
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: { gap: theme.spacing.spacing4 },
    field: {
      minHeight: theme.spacing.spacing48,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.spacing12,
      borderRadius: theme.borderRadius.radius8,
      borderWidth: theme.spacing.spacing1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      ...theme.shadows.inputShadow,
    },
    fieldFocused: { borderColor: theme.colors.primary },
    fieldError: { borderColor: theme.colors.error },
    country: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.spacing4, paddingVertical: theme.spacing.spacing8 },
    flag: { width: theme.spacing.spacing20, height: theme.spacing.spacing20, borderRadius: theme.spacing.spacing10 },
    divider: { width: theme.spacing.spacing1, alignSelf: 'stretch', marginHorizontal: theme.spacing.spacing8, backgroundColor: theme.colors.border },
    input: {
      flex: theme.flexs.flexFull,
      fontFamily: theme.typography.fontFamily.regular,
      fontSize: theme.typography.fontSize.size14,
      color: theme.colors.text,
      paddingVertical: theme.spacing.spacing8,
      // Phone numbers are always left-to-right, also in RTL layouts.
      writingDirection: 'ltr',
    },
  });
