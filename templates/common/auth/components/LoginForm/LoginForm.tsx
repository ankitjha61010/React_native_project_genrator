import React, { useState } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { Controller, type Control } from 'react-hook-form';
import { useNavigation } from '@react-navigation/native';
import type { LoginFormValues } from '{{IMPORT:auth.schema}}';
import { AppButton } from '{{IMPORT:components.AppButton}}';
import { AppInput } from '{{IMPORT:components.AppInput}}';
import { AppText } from '{{IMPORT:components.AppText}}';
{{#if VECTOR_ICONS}}
import { AppIcon } from '{{IMPORT:components.AppIcon}}';
{{/if}}
import { useStyles } from '{{IMPORT:hooks.useTheme}}';
import { useAuthSession } from '{{IMPORT:hooks.useAuthSession}}';
{{#if HAS_SOCIAL_AUTH}}
import { socialAuthService } from '{{IMPORT:auth.socialAuth}}';
{{/if}}
import { flash } from '{{IMPORT:utils.flashMessage}}';
import type { IntlKey } from '{{IMPORT:i18n.index}}';
import type { Theme } from '{{IMPORT:theme.index}}';

export interface LoginFormProps {
  control: Control<LoginFormValues>;
  onSubmit: () => void;
  submitting?: boolean;
}

/** Presentational form – validation rules live in the zod schema. */
export function LoginForm({ control, onSubmit, submitting = false }: LoginFormProps): React.JSX.Element {
  const navigation = useNavigation<any>();
  const { signIn } = useAuthSession();
  const styles = useStyles(createStyles);
  const [socialLoading, setSocialLoading] = useState<'google' | 'facebook' | null>(null);

{{#if HAS_SOCIAL_AUTH}}
  const handleGoogleLogin = async () => {
    try {
      setSocialLoading('google');
      const user = await socialAuthService.signInWithGoogle();
      await signIn({ token: user.accessToken, user });
      flash.success({ message: `Signed in as ${user.name}` });
    } catch {
      flash.error({ message: 'Google sign in failed' });
    } finally {
      setSocialLoading(null);
    }
  };

  const handleFacebookLogin = async () => {
    try {
      setSocialLoading('facebook');
      const user = await socialAuthService.signInWithFacebook();
      await signIn({ token: user.accessToken, user });
      flash.success({ message: `Signed in as ${user.name}` });
    } catch {
      flash.error({ message: 'Facebook sign in failed' });
    } finally {
      setSocialLoading(null);
    }
  };
{{/if}}

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

{{#if AUTH_EMAIL}}
      <View style={styles.forgotPasswordRow}>
        <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
          <AppText fontSize="size12" color="primary" intlType="auth" value="forgotPassword" />
        </TouchableOpacity>
      </View>
{{/if}}

      <AppButton intlType="auth" value="login" onPress={onSubmit} loading={submitting} testID="login-submit" />

{{#if AUTH_MOBILE}}
      <AppButton
        variant="outline"
        intlType="auth"
        value="loginWithMobile"
        onPress={() => navigation.navigate('MobileLogin')}
      />
{{/if}}

{{#if HAS_SOCIAL_AUTH}}
      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <AppText fontSize="size12" color="textSecondary" style={styles.dividerText}>or continue with</AppText>
        <View style={styles.dividerLine} />
      </View>

      <View style={styles.socialRow}>
{{#if SOCIAL_GOOGLE}}
        <TouchableOpacity
          style={styles.socialBtn}
          onPress={handleGoogleLogin}
          disabled={Boolean(socialLoading)}>
{{#if VECTOR_ICONS}}
          <AppIcon name="google" size={20} tintColor="#EA4335" />
{{/if}}
          <AppText style={styles.socialBtnText}>Google</AppText>
        </TouchableOpacity>
{{/if}}

{{#if SOCIAL_FACEBOOK}}
        <TouchableOpacity
          style={styles.socialBtn}
          onPress={handleFacebookLogin}
          disabled={Boolean(socialLoading)}>
{{#if VECTOR_ICONS}}
          <AppIcon name="facebook" size={20} tintColor="#1877F2" />
{{/if}}
          <AppText style={styles.socialBtnText}>Facebook</AppText>
        </TouchableOpacity>
{{/if}}
      </View>
{{/if}}

{{#if AUTH_EMAIL}}
      <View style={styles.signUpRow}>
        <AppText color="textSecondary" intlType="auth" value="dontHaveAccount" />
        <AppButton
          variant="ghost"
          intlType="auth"
          value="signUp"
          onPress={() => navigation.navigate('Register')}
        />
      </View>
{{/if}}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    form: {
      gap: theme.spacing.spacing16,
    },
    forgotPasswordRow: {
      alignItems: 'flex-end',
      marginTop: -8,
    },
    dividerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 8,
    },
    dividerLine: {
      flex: 1,
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.border,
    },
    dividerText: {
      marginHorizontal: 12,
    },
    socialRow: {
      flexDirection: 'row',
      gap: 12,
    },
    socialBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      gap: 8,
    },
    socialBtnText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
    },
    signUpRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 4,
    },
  });

