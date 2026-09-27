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
import { flash } from '{{IMPORT:utils.flashMessage}}';
import type { Theme } from '{{IMPORT:theme.index}}';
import type { IntlKey } from '{{IMPORT:i18n.index}}';

const mobileSchema = z.object({
  phone: z.string().min(8, 'phoneMin' as IntlKey<'auth'>),
});

type MobileFormValues = z.infer<typeof mobileSchema>;

export function MobileLoginScreen(): React.JSX.Element {
  const navigation = useNavigation<any>();
  const styles = useStyles(createStyles);

  const { control, handleSubmit, formState: { isSubmitting } } = useForm<MobileFormValues>({
    resolver: zodResolver(mobileSchema),
    defaultValues: { phone: '' },
  });

  const onSubmit = handleSubmit(async data => {
    // Simulated SMS OTP send request
    await new Promise(res => setTimeout(res, 800));
    flash.success({ message: 'OTP sent to ' + data.phone });
    navigation.navigate('OtpVerify', { phone: data.phone });
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
            <AppInput
              intlType="auth"
              labelValue="phoneNumber"
              placeholderValue="phonePlaceholder"
{{#if VECTOR_ICONS}}
              leftIcon="phone-outline"
{{/if}}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              errorValue={fieldState.error?.message as IntlKey<'auth'> | undefined}
              keyboardType="phone-pad"
              autoComplete="tel"
              returnKeyType="done"
              onSubmitEditing={() => onSubmit()}
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
