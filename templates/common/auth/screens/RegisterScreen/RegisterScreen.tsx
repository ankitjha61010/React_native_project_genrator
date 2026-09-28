import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigation } from '@react-navigation/native';
import { AppButton } from '{{IMPORT:components.AppButton}}';
import { AppInput } from '{{IMPORT:components.AppInput}}';
import { AppScreen } from '{{IMPORT:components.AppScreen}}';
import { AppText } from '{{IMPORT:components.AppText}}';
import { FadeInView } from '{{IMPORT:components.FadeInView}}';
import { useStyles } from '{{IMPORT:hooks.useTheme}}';
import { useAuthSession } from '{{IMPORT:hooks.useAuthSession}}';
import { flash } from '{{IMPORT:utils.flashMessage}}';
import type { Theme } from '{{IMPORT:theme.index}}';
import type { IntlKey } from '{{IMPORT:i18n.index}}';

const registerSchema = z
  .object({
    name: z.string().min(2, 'nameMin' as IntlKey<'auth'>),
    email: z.string().email('emailInvalid' as IntlKey<'auth'>),
    password: z.string().min(6, 'passwordMin' as IntlKey<'auth'>),
    confirmPassword: z.string().min(6, 'passwordMin' as IntlKey<'auth'>),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: 'passwordMismatch' as IntlKey<'auth'>,
    path: ['confirmPassword'],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

export function RegisterScreen(): React.JSX.Element {
  const navigation = useNavigation<any>();
  const { signIn } = useAuthSession();
  const styles = useStyles(createStyles);

  const { control, handleSubmit, formState: { isSubmitting } } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = handleSubmit(async data => {
    try {
      // Replace with your real registration endpoint
      await new Promise<void>(res => setTimeout(res, 800));
      await signIn({
        token: 'registered_sample_token',
        user: { id: 'usr_new', name: data.name, email: data.email },
      });
      flash.success({ message: 'Account created successfully!' });
    } catch {
      flash.error({ message: 'Registration failed.' });
    }
  });

  return (
    <AppScreen contentStyle={styles.content}>
      <FadeInView style={styles.header}>
        <AppText fontFamily="bold" fontSize="size24" intlType="auth" value="createAccount" />
        <AppText color="textSecondary" intlType="auth" value="registerSubtitle" />
      </FadeInView>

      <FadeInView delay={120} style={styles.form}>
        <Controller
          control={control}
          name="name"
          render={({ field, fieldState }) => (
            <AppInput
              intlType="auth"
              labelValue="name"
              placeholderValue="namePlaceholder"
{{#if VECTOR_ICONS}}
              leftIcon="account-outline"
{{/if}}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              errorValue={fieldState.error?.message as IntlKey<'auth'> | undefined}
              autoCapitalize="words"
              returnKeyType="next"
            />
          )}
        />
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
              keyboardType="email-address"
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
              returnKeyType="next"
            />
          )}
        />
        <Controller
          control={control}
          name="confirmPassword"
          render={({ field, fieldState }) => (
            <AppInput
              intlType="auth"
              labelValue="confirmPassword"
              placeholderValue="confirmPasswordPlaceholder"
{{#if VECTOR_ICONS}}
              leftIcon="lock-check-outline"
{{/if}}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              errorValue={fieldState.error?.message as IntlKey<'auth'> | undefined}
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={() => onSubmit()}
            />
          )}
        />
        <AppButton intlType="auth" value="signUp" onPress={onSubmit} loading={isSubmitting} />

        <View style={styles.loginRow}>
          <AppText color="textSecondary" intlType="auth" value="alreadyHaveAccount" />
          <AppButton
            variant="ghost"
            intlType="auth"
            value="login"
            onPress={() => navigation.navigate('Login')}
          />
        </View>
      </FadeInView>
    </AppScreen>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    content: {
      justifyContent: 'center',
      gap: theme.spacing.spacing24,
    },
    header: {
      gap: theme.spacing.spacing4,
    },
    form: {
      gap: theme.spacing.spacing16,
    },
    loginRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: theme.spacing.spacing8,
    },
  });
