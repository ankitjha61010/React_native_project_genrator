import React from 'react';
import { StyleSheet } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigation, useRoute } from '@react-navigation/native';
import { errorMessage } from '@data/api/apiErrors';
import { authService } from '@business/services/authService';
import { AppButton } from '@presentation/components/AppButton';
import { AppInput } from '@presentation/components/AppInput';
import { AppScreen } from '@presentation/components/AppScreen';
import { AppText } from '@presentation/components/AppText';
import { FadeInView } from '@presentation/components/FadeInView';
import { useStyles } from '@presentation/hooks/useTheme';
import { flash } from '@utils/flashMessage';
import type { Theme } from '@presentation/theme';
import type { IntlKey } from '@infrastructure/i18n';

const resetSchema = z
  .object({
    code: z.string().trim().regex(/^\d{4,8}$/, 'codeMin' as IntlKey<'auth'>),
    newPassword: z
      .string()
      .min(8, 'passwordMin' as IntlKey<'auth'>)
      .regex(/[a-z]/i, 'passwordWeak' as IntlKey<'auth'>)
      .regex(/\d/, 'passwordWeak' as IntlKey<'auth'>),
    confirmPassword: z.string().min(1, 'passwordRequired' as IntlKey<'auth'>),
  })
  .refine(data => data.newPassword === data.confirmPassword, {
    message: 'passwordMismatch' as IntlKey<'auth'>,
    path: ['confirmPassword'],
  });

type ResetFormValues = z.infer<typeof resetSchema>;

export function ResetPasswordScreen(): React.JSX.Element {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const email = route.params?.email;
  const styles = useStyles(createStyles);

  const { control, handleSubmit, formState: { isSubmitting } } = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { code: '', newPassword: '', confirmPassword: '' },
  });

  const onSubmit = handleSubmit(async data => {
    try {
      await authService.resetPassword({ email, code: data.code.trim(), newPassword: data.newPassword });
      flash.success({ intlType: 'auth', value: 'passwordResetDone' });
      navigation.navigate('Login');
    } catch (error) {
      // e.g. "Wrong code, 3 attempts left".
      flash.error({ message: errorMessage(error) });
    }
  });

  return (
    <AppScreen contentStyle={styles.content}>
      <FadeInView style={styles.header}>
        <AppText fontFamily="bold" fontSize="size24" intlType="auth" value="resetPassword" />
        <AppText color="textSecondary" intlType="auth" value="resetPasswordSubtitle" />
      </FadeInView>

      <FadeInView delay={120} style={styles.form}>
        <Controller
          control={control}
          name="code"
          render={({ field, fieldState }) => (
            <AppInput
              intlType="auth"
              labelValue="resetCode"
              placeholderValue="resetCodePlaceholder"
              leftIcon="key-outline"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              errorValue={fieldState.error?.message as IntlKey<'auth'> | undefined}
              keyboardType="number-pad"
              returnKeyType="next"
            />
          )}
        />
        <Controller
          control={control}
          name="newPassword"
          render={({ field, fieldState }) => (
            <AppInput
              intlType="auth"
              labelValue="newPassword"
              placeholderValue="newPasswordPlaceholder"
              leftIcon="lock-outline"
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
              leftIcon="lock-check-outline"
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
        <AppButton intlType="auth" value="updatePassword" onPress={onSubmit} loading={isSubmitting} />
        <AppButton variant="ghost" intlType="auth" value="login" onPress={() => navigation.navigate('Login')} />
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
  });
