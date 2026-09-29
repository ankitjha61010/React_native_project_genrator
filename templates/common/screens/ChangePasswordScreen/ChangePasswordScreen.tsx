import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Controller } from 'react-hook-form';
import { AppButton } from '{{IMPORT:components.AppButton}}';
import { AppInput } from '{{IMPORT:components.AppInput}}';
import { AppScreen } from '{{IMPORT:components.AppScreen}}';
import { AppText } from '{{IMPORT:components.AppText}}';
import { useChangePassword, type ChangePasswordValues } from '{{IMPORT:hooks.useChangePassword}}';
import { useStyles } from '{{IMPORT:hooks.useTheme}}';
import type { IntlKey } from '{{IMPORT:i18n.index}}';
import type { Theme } from '{{IMPORT:theme.index}}';

const FIELDS: Array<{ name: keyof ChangePasswordValues; label: IntlKey<'common'> }> = [
  { name: 'currentPassword', label: 'currentPassword' },
  { name: 'newPassword', label: 'newPassword' },
  { name: 'confirmPassword', label: 'confirmNewPassword' },
];

/** Profile → Change Password. UI only – validation and the request are in useChangePassword. */
export function ChangePasswordScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const styles = useStyles(createStyles);
  const { control, submit, isSubmitting } = useChangePassword();

  return (
    <AppScreen edges={[]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <AppText color="textSecondary" intlType="common" value="passwordRules" />
          {FIELDS.map(({ name, label }) => (
            <Controller
              key={name}
              control={control}
              name={name}
              render={({ field, fieldState }) => (
                <AppInput
                  intlType="common"
                  labelValue={label}
{{#if VECTOR_ICONS}}
                  leftIcon="lock-outline"
{{/if}}
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete={name === 'currentPassword' ? 'current-password' : 'new-password'}
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  errorValue={fieldState.error?.message as IntlKey<'common'> | undefined}
                />
              )}
            />
          ))}
          <AppButton intlType="common" value="changePassword" loading={isSubmitting} onPress={submit(() => navigation.goBack())} style={styles.button} />
        </ScrollView>
      </KeyboardAvoidingView>
    </AppScreen>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    flex: {
      flex: 1,
    },
    content: {
      gap: theme.spacing.spacing16,
      paddingBottom: theme.spacing.spacing24,
    },
    button: {
      marginTop: theme.spacing.spacing8,
    },
  });
