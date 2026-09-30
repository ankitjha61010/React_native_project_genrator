import React from 'react';
import { StyleSheet } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigation } from '@react-navigation/native';
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

const forgotSchema = z.object({
  email: z.string().trim().email('emailInvalid' as IntlKey<'auth'>),
});

type ForgotFormValues = z.infer<typeof forgotSchema>;

export function ForgotPasswordScreen(): React.JSX.Element {
  const navigation = useNavigation<any>();
  const styles = useStyles(createStyles);

  const { control, handleSubmit, formState: { isSubmitting } } = useForm<ForgotFormValues>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = handleSubmit(async data => {
    try {
      // Always succeeds on the server (it doesn't reveal which emails exist).
      await authService.forgotPassword(data.email);
      flash.success({ intlType: 'auth', value: 'codeSent' });
      navigation.navigate('ResetPassword', { email: data.email.trim().toLowerCase() });
    } catch (error) {
      flash.error({ message: errorMessage(error) });
    }
  });

  return (
    <AppScreen contentStyle={styles.content}>
      <FadeInView style={styles.header}>
        <AppText fontFamily="bold" fontSize="size24" intlType="auth" value="forgotPassword" />
        <AppText color="textSecondary" intlType="auth" value="forgotPasswordSubtitle" />
      </FadeInView>

      <FadeInView delay={120} style={styles.form}>
        <Controller
          control={control}
          name="email"
          render={({ field, fieldState }) => (
            <AppInput
              intlType="auth"
              labelValue="email"
              placeholderValue="emailPlaceholder"
              leftIcon="email-outline"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              errorValue={fieldState.error?.message as IntlKey<'auth'> | undefined}
              autoCapitalize="none"
              keyboardType="email-address"
              returnKeyType="done"
              onSubmitEditing={() => onSubmit()}
            />
          )}
        />
        <AppButton intlType="auth" value="sendResetLink" onPress={onSubmit} loading={isSubmitting} />

        <AppButton
          variant="outline"
          intlType="common"
          value="back"
          onPress={() => navigation.goBack()}
        />
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
