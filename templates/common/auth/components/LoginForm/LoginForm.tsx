{{#if HAS_SOCIAL_AUTH}}
import React, { useState } from 'react';
{{else}}
import React from 'react';
{{/if}}
import { StyleSheet, View, TouchableOpacity{{#if HAS_SOCIAL_AUTH}}, ActivityIndicator{{/if}} } from 'react-native';
import { Controller, type Control } from 'react-hook-form';
import { useNavigation } from '@react-navigation/native';
import type { LoginFormValues } from '{{IMPORT:auth.schema}}';
import { AppButton } from '{{IMPORT:components.AppButton}}';
import { AppInput } from '{{IMPORT:components.AppInput}}';
import { AppText } from '{{IMPORT:components.AppText}}';
{{#if VECTOR_ICONS}}
{{#if HAS_SOCIAL_AUTH}}
import { AppIcon } from '{{IMPORT:components.AppIcon}}';
{{/if}}
{{/if}}
import { useStyles } from '{{IMPORT:hooks.useTheme}}';
{{#if HAS_SOCIAL_AUTH}}
import { useAuthSession } from '{{IMPORT:hooks.useAuthSession}}';
{{#if SOCIAL_APPLE}}
import { AppleButton } from '@invertase/react-native-apple-authentication';
{{/if}}
import { {{SYMBOL:auth.service}} } from '{{IMPORT:auth.service}}';
import {
  socialAuthService,
  SocialAuthCancelledError,
  type SocialProvider,
} from '{{IMPORT:auth.socialAuth}}';
{{/if}}
{{#if HAS_SOCIAL_AUTH}}
import { flash } from '{{IMPORT:utils.flashMessage}}';
{{/if}}
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
  const styles = useStyles(createStyles);
{{#if HAS_SOCIAL_AUTH}}
  const { signIn } = useAuthSession();
  const [socialLoading, setSocialLoading] = useState<SocialProvider | null>(null);

  /** Provider SDK → your backend ({{SYMBOL:auth.service}}.socialLogin) → persisted session. */
  const handleSocialLogin = async (provider: SocialProvider, label: string) => {
    if (socialLoading) return;
    try {
      setSocialLoading(provider);
      const result = await socialAuthService.signIn(provider);
      const session = await {{SYMBOL:auth.service}}.socialLogin(result);
      await signIn(session);
      flash.success({ message: `Signed in as ${session.user.name}` });
    } catch (error) {
      // Closing the provider sheet is not an error.
      if (error instanceof SocialAuthCancelledError) return;
      flash.error({ message: error instanceof Error ? error.message : `${label} sign in failed` });
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
          onPress={() => handleSocialLogin('google', 'Google')}
          disabled={Boolean(socialLoading)}
          accessibilityLabel="Continue with Google">
          {socialLoading === 'google' ? (
            <ActivityIndicator size="small" />
          ) : (
            <>
{{#if VECTOR_ICONS}}
              <AppIcon name="google" size={20} tintColor="#EA4335" />
{{/if}}
              <AppText style={styles.socialBtnText}>Google</AppText>
            </>
          )}
        </TouchableOpacity>
{{/if}}

{{#if SOCIAL_FACEBOOK}}
        <TouchableOpacity
          style={styles.socialBtn}
          onPress={() => handleSocialLogin('facebook', 'Facebook')}
          disabled={Boolean(socialLoading)}
          accessibilityLabel="Continue with Facebook">
          {socialLoading === 'facebook' ? (
            <ActivityIndicator size="small" />
          ) : (
            <>
{{#if VECTOR_ICONS}}
              <AppIcon name="facebook" size={20} tintColor="#1877F2" />
{{/if}}
              <AppText style={styles.socialBtnText}>Facebook</AppText>
            </>
          )}
        </TouchableOpacity>
{{/if}}
      </View>

{{#if SOCIAL_APPLE}}
      {/* Apple's own button (required by the App Store guidelines); iOS 13+ only. */}
      {socialAuthService.isAppleSupported && (
        <View pointerEvents={socialLoading ? 'none' : 'auto'} style={socialLoading ? styles.disabled : undefined}>
          <AppleButton
            buttonStyle={AppleButton.Style.BLACK}
            buttonType={AppleButton.Type.CONTINUE}
            style={styles.appleBtn}
            onPress={() => handleSocialLogin('apple', 'Apple')}
          />
        </View>
      )}
{{/if}}
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
{{#if SOCIAL_APPLE}}
    appleBtn: {
      width: '100%',
      height: 46,
    },
    disabled: {
      opacity: 0.5,
    },
{{/if}}
    signUpRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 4,
    },
  });

