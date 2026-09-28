import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigation, useRoute } from '@react-navigation/native';
import { userMessage } from '{{IMPORT:api.errors}}';
import { {{SYMBOL:auth.service}} } from '{{IMPORT:auth.service}}';
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

const otpSchema = z.object({
  otp: z.string().trim().regex(/^\d{6}$/, 'otpLength' as IntlKey<'auth'>),
});

type OtpFormValues = z.infer<typeof otpSchema>;

export function OtpVerifyScreen(): React.JSX.Element {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const countryCode: string = route.params?.countryCode ?? '';
  const phone: string = route.params?.phone ?? '';
  const { signIn } = useAuthSession();
  const styles = useStyles(createStyles);
  const [resending, setResending] = useState(false);
  // Seconds until "Resend" may be pressed (the backend throttles codes).
  const [wait, setWait] = useState<number>(route.params?.resendIn ?? 60);

  useEffect(() => {
    if (wait <= 0) return undefined;
    const timer = setTimeout(() => setWait(value => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);

  const { control, handleSubmit, formState: { isSubmitting } } = useForm<OtpFormValues>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: '' },
  });

  const onSubmit = handleSubmit(async data => {
    try {
      // Creates the account on the first login.
      const session = await {{SYMBOL:auth.service}}.verifyOtp({ countryCode, phone, otp: data.otp.trim() });
      await signIn(session);
      flash.success({ message: 'Logged in successfully!' });
      navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
    } catch (error) {
      // e.g. "Wrong code, 4 attempts left".
      flash.error({ message: userMessage(error) ?? 'Invalid verification code.' });
    }
  });

  const onResend = async () => {
    if (wait > 0) return;
    setResending(true);
    try {
      const sent = await {{SYMBOL:auth.service}}.sendOtp({ countryCode, phone });
      setWait(sent.resendIn);
      flash.success({ intlType: 'auth', value: 'codeSent' });
    } catch (error) {
      flash.error({ message: userMessage(error) ?? 'Could not send the code, please try again.' });
    } finally {
      setResending(false);
    }
  };

  return (
    <AppScreen contentStyle={styles.content}>
      <FadeInView style={styles.header}>
        <AppText fontFamily="bold" fontSize="size24" intlType="auth" value="verifyOtp" />
        <AppText color="textSecondary" intlType="auth" value="otpSubtitle" />
        {Boolean(phone) && <AppText fontFamily="semiBold" color="primary">{`${countryCode} ${phone}`}</AppText>}
      </FadeInView>

      <FadeInView delay={120} style={styles.form}>
        <Controller
          control={control}
          name="otp"
          render={({ field, fieldState }) => (
            <AppInput
              intlType="auth"
              labelValue="otpCode"
              placeholderValue="otpPlaceholder"
{{#if VECTOR_ICONS}}
              leftIcon="shield-key-outline"
{{/if}}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              errorValue={fieldState.error?.message as IntlKey<'auth'> | undefined}
              keyboardType="number-pad"
              maxLength={6}
              returnKeyType="done"
              onSubmitEditing={() => onSubmit()}
            />
          )}
        />
        <AppButton intlType="auth" value="verify" onPress={onSubmit} loading={isSubmitting} />

        <View style={styles.resendRow}>
          <AppButton
            variant="ghost"
            intlType="auth"
            value="resendOtp"
            loading={resending}
            disabled={wait > 0}
            onPress={onResend}
          />
          {wait > 0 ? <AppText color="textSecondary" text={`${wait}s`} /> : null}
          <AppButton
            variant="ghost"
            intlType="common"
            value="back"
            onPress={() => navigation.goBack()}
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
    resendRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: theme.spacing.spacing8,
    },
  });
