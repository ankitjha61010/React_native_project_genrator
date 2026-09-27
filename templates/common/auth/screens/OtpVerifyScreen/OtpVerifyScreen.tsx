import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigation, useRoute } from '@react-navigation/native';
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
  otp: z.string().length(6, 'otpLength' as IntlKey<'auth'>),
});

type OtpFormValues = z.infer<typeof otpSchema>;

export function OtpVerifyScreen(): React.JSX.Element {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const phone = route.params?.phone ?? '';
  const { signIn } = useAuthSession();
  const styles = useStyles(createStyles);
  const [resending, setResending] = useState(false);

  const { control, handleSubmit, formState: { isSubmitting } } = useForm<OtpFormValues>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: '' },
  });

  const onSubmit = handleSubmit(async data => {
    try {
      await new Promise(res => setTimeout(res, 800));
      await signIn({
        token: 'mobile_sample_token',
        user: { id: 'usr_mobile', name: 'Mobile User', email: 'user@example.com', phone },
      });
      flash.success({ message: 'Logged in successfully!' });
    } catch {
      flash.error({ message: 'Invalid verification code.' });
    }
  });

  const onResend = async () => {
    setResending(true);
    await new Promise(res => setTimeout(res, 800));
    setResending(false);
    flash.success({ message: 'OTP resent to ' + phone });
  };

  return (
    <AppScreen contentStyle={styles.content}>
      <FadeInView style={styles.header}>
        <AppText fontFamily="bold" fontSize="size24" intlType="auth" value="verifyOtp" />
        <AppText color="textSecondary" intlType="auth" value="otpSubtitle" />
        {Boolean(phone) && <AppText fontFamily="semiBold" color="primary">{phone}</AppText>}
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
            onPress={onResend}
          />
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
