import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Controller, type Control } from 'react-hook-form';
import type { LoginFormValues } from '{{IMPORT:auth.schema}}';
import { AppButton } from '{{IMPORT:components.AppButton}}';
import { AppInput } from '{{IMPORT:components.AppInput}}';
import { useStyles } from '{{IMPORT:hooks.useTheme}}';
import type { IntlKey } from '{{IMPORT:i18n.index}}';
import type { Theme } from '{{IMPORT:theme.index}}';

export interface LoginFormProps {
  control: Control<LoginFormValues>;
  onSubmit: () => void;
  submitting?: boolean;
}

/** Presentational form – validation rules live in the zod schema. */
export function LoginForm({ control, onSubmit, submitting = false }: LoginFormProps): React.JSX.Element {
  const styles = useStyles(createStyles);
  return (
    <View style={styles.form}>
      <Controller
        control={control}
        name="email"
        render={({ field, fieldState }) => (
          <AppInput
            intlType="auth"
            labelValue="email"
            placeholderValue="emailPlaceholder"
{{#if VECTOR_ICONS}}
            leftIcon="email-outline"
{{/if}}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            errorValue={fieldState.error?.message as IntlKey<'auth'> | undefined}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            returnKeyType="next"
          />
        )}
      />
      <Controller
        control={control}
        name="password"
        render={({ field, fieldState }) => (
          <AppInput
            intlType="auth"
            labelValue="password"
            placeholderValue="passwordPlaceholder"
{{#if VECTOR_ICONS}}
            leftIcon="lock-outline"
{{/if}}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            errorValue={fieldState.error?.message as IntlKey<'auth'> | undefined}
            secureTextEntry
            autoComplete="password"
            textContentType="password"
            returnKeyType="done"
            onSubmitEditing={onSubmit}
          />
        )}
      />
      <AppButton intlType="auth" value="login" onPress={onSubmit} loading={submitting} testID="login-submit" />
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    form: {
      gap: theme.spacing.spacing16,
    },
  });
