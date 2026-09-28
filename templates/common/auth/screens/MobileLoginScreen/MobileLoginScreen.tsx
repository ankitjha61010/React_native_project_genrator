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
import { PhoneInput } from '{{IMPORT:components.PhoneInput}}';
import { AppScreen } from '{{IMPORT:components.AppScreen}}';
import { AppText } from '{{IMPORT:components.AppText}}';
import { FadeInView } from '{{IMPORT:components.FadeInView}}';
import { useStyles } from '{{IMPORT:hooks.useTheme}}';
import { flash } from '{{IMPORT:utils.flashMessage}}';
import type { Theme } from '{{IMPORT:theme.index}}';
import type { IntlKey } from '{{IMPORT:i18n.index}}';

const mobileSchema = z.object({
  phone: z.string().refine(value => /^\d{4,15}$/.test(value.replace(/\D/g, '')), 'phoneMin' as IntlKey<'auth'>),
});

type MobileFormValues = z.infer<typeof mobileSchema>;

export function MobileLoginScreen(): React.JSX.Element {
  const navigation = useNavigation<any>();
  const styles = useStyles(createStyles);
  const [country, setCountry] = useState<Country>(defaultCountry);

  const { control, handleSubmit, formState: { isSubmitting } } = useForm<MobileFormValues>({
    resolver: zodResolver(mobileSchema),
    defaultValues: { phone: '' },
  });

  const onSubmit = handleSubmit(async data => {
    const phone = data.phone.replace(/\D/g, '');
    try {
      const sent = await {{SYMBOL:auth.service}}.sendOtp({ countryCode: country.dialCode, phone });
      flash.success({ intlType: 'auth', value: 'codeSent' });
      navigation.navigate('OtpVerify', { countryCode: country.dialCode, phone, resendIn: sent.resendIn });
    } catch (error) {
      // e.g. "Please wait 42 seconds before requesting a new code".
      flash.error({ message: userMessage(error) ?? 'Could not send the code, please try again.' });
    }
  });

  return (
    <AppScreen contentStyle={styles.content}>
      <FadeInView style={styles.header}>
        <AppText fontFamily="bold" fontSize="size24" intlType="auth" value="mobileLogin" />
        <AppText color="textSecondary" intlType="auth" value="mobileSubtitle" />
      </FadeInView>

      <FadeInView delay={120} style={styles.form}>
        <Controller
          control={control}
          name="phone"
          render={({ field, fieldState }) => (
            <PhoneInput
              country={country}
              onCountryChange={setCountry}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              errorValue={fieldState.error?.message as IntlKey<'auth'> | undefined}
            />
          )}
        />
        <AppButton intlType="auth" value="sendOtp" onPress={onSubmit} loading={isSubmitting} />

        <View style={styles.loginRow}>
          <AppButton
            variant="ghost"
            intlType="auth"
            value="loginWithEmail"
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
      alignItems: 'center',
      marginTop: theme.spacing.spacing8,
    },
  });
