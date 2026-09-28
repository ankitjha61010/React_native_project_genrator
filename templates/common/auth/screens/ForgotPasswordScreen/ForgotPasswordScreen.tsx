import React from 'react';
import { StyleSheet } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigation } from '@react-navigation/native';
import { userMessage } from '{{IMPORT:api.errors}}';
import { {{SYMBOL:auth.service}} } from '{{IMPORT:auth.service}}';
import { AppButton } from '{{IMPORT:components.AppButton}}';
import { AppInput } from '{{IMPORT:components.AppInput}}';
import { AppScreen } from '{{IMPORT:components.AppScreen}}';
import { AppText } from '{{IMPORT:components.AppText}}';
import { FadeInView } from '{{IMPORT:components.FadeInView}}';
import { useStyles } from '{{IMPORT:hooks.useTheme}}';
import { flash } from '{{IMPORT:utils.flashMessage}}';
import type { Theme } from '{{IMPORT:theme.index}}';
import type { IntlKey } from '{{IMPORT:i18n.index}}';

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
      await {{SYMBOL:auth.service}}.forgotPassword(data.email);
      flash.success({ intlType: 'auth', value: 'codeSent' });
      navigation.navigate('ResetPassword', { email: data.email.trim().toLowerCase() });
    } catch (error) {
      flash.error({ message: userMessage(error) ?? 'Could not send the code, please try again.' });
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
{{#if VECTOR_ICONS}}
              leftIcon="email-outline"
{{/if}}
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
