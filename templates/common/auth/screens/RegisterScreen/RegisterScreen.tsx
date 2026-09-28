import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigation } from '@react-navigation/native';
import { userMessage } from '{{IMPORT:api.errors}}';
import { defaultCountry, type Country } from '{{IMPORT:assets.countries}}';
import { {{SYMBOL:auth.service}} } from '{{IMPORT:auth.service}}';
import { AppButton } from '{{IMPORT:components.AppButton}}';
import { AppInput } from '{{IMPORT:components.AppInput}}';
import { AppScreen } from '{{IMPORT:components.AppScreen}}';
import { AppText } from '{{IMPORT:components.AppText}}';
import { FadeInView } from '{{IMPORT:components.FadeInView}}';
import { PhoneInput } from '{{IMPORT:components.PhoneInput}}';
import { useStyles } from '{{IMPORT:hooks.useTheme}}';
import { useAuthSession } from '{{IMPORT:hooks.useAuthSession}}';
import { flash } from '{{IMPORT:utils.flashMessage}}';
import type { Theme } from '{{IMPORT:theme.index}}';
import type { IntlKey } from '{{IMPORT:i18n.index}}';

const key = (value: IntlKey<'auth'>) => value;

/** Same rules as the backend (8+ characters, letters and numbers). */
const registerSchema = z
  .object({
    name: z.string().trim().min(2, key('nameMin')),
    email: z.string().trim().email(key('emailInvalid')),
    /** Optional – the country comes from the picker. */
    phone: z.string().refine(value => !value || /^\d{4,15}$/.test(value.replace(/\D/g, '')), key('phoneMin')),
    password: z.string().min(8, key('passwordMin')).regex(/[a-z]/i, key('passwordWeak')).regex(/\d/, key('passwordWeak')),
    confirmPassword: z.string().min(1, key('passwordRequired')),
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
  const [country, setCountry] = useState<Country>(defaultCountry);

  const { control, handleSubmit, formState: { isSubmitting } } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = handleSubmit(async data => {
    try {
      const phone = data.phone.replace(/\D/g, '');
      const session = await {{SYMBOL:auth.service}}.register({
        name: data.name,
        email: data.email.toLowerCase(),
        password: data.password,
        ...(phone ? { countryCode: country.dialCode, phone } : {}),
      });
      await signIn(session);
      flash.success({ message: 'Account created successfully!' });
      navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
    } catch (error) {
      // e.g. "Email is already registered" / "Mobile number is already registered".
      flash.error({ message: userMessage(error) ?? 'Registration failed, please try again.' });
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
          name="phone"
          render={({ field, fieldState }) => (
            <PhoneInput
              labelValue="phoneOptional"
              country={country}
              onCountryChange={setCountry}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              errorValue={fieldState.error?.message as IntlKey<'auth'> | undefined}
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
