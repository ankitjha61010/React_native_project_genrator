import React, { useState } from 'react';
import { StyleSheet, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Controller, type Control } from 'react-hook-form';
import { useNavigation } from '@react-navigation/native';
import type { LoginFormValues } from '@business/validation/loginSchema';
import { AppButton } from '@presentation/components/AppButton';
import { AppInput } from '@presentation/components/AppInput';
import { AppText } from '@presentation/components/AppText';
import { AppIcon } from '@presentation/components/AppIcon';
import { useStyles } from '@presentation/hooks/useTheme';
import { useAuthSession } from '@presentation/hooks/useAuthSession';
import { AppleButton } from '@invertase/react-native-apple-authentication';
import { authService } from '@business/services/authService';
import {
  socialAuthService,
  SocialAuthCancelledError,
  type SocialProvider,
} from '@features/auth/services/socialAuthService';
import { ApiError, errorMessage } from '@data/api/apiErrors';
import { flash } from '@utils/flashMessage';
import type { IntlKey } from '@infrastructure/i18n';
import type { Theme } from '@presentation/theme';

export interface LoginFormProps {
  control: Control<LoginFormValues>;
  onSubmit: () => void;
  submitting?: boolean;
}

/** Presentational form – validation rules live in the zod schema. */
export function LoginForm({ control, onSubmit, submitting = false }: LoginFormProps): React.JSX.Element {
  const navigation = useNavigation<any>();
  const styles = useStyles(createStyles);
  const { signIn } = useAuthSession();
  const [socialLoading, setSocialLoading] = useState<SocialProvider | null>(null);

  /** Provider SDK → your backend (authService.socialLogin) → persisted session. */
  const handleSocialLogin = async (provider: SocialProvider, label: string) => {
    if (socialLoading) return;
    try {
      setSocialLoading(provider);
      const result = await socialAuthService.signIn(provider);
      const session = await authService.socialLogin(result);
      await signIn(session);
      flash.success({ message: `Signed in as ${session.user.name}` });
    } catch (error) {
      // Closing the provider sheet is not an error.
      if (error instanceof SocialAuthCancelledError) return;
      // Backend answers get the readable API message; SDK errors ("not configured"…) keep theirs.
      flash.error({ message: error instanceof ApiError ? errorMessage(error) : error instanceof Error ? error.message : `${label} sign in failed` });
    } finally {
      setSocialLoading(null);
    }
  };

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
            leftIcon="email-outline"
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
            leftIcon="lock-outline"
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

      <View style={styles.forgotPasswordRow}>
        <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
          <AppText fontSize="size12" color="primary" intlType="auth" value="forgotPassword" />
        </TouchableOpacity>
      </View>

      <AppButton intlType="auth" value="login" onPress={onSubmit} loading={submitting} testID="login-submit" />


      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <AppText fontSize="size12" color="textSecondary" style={styles.dividerText}>or continue with</AppText>
        <View style={styles.dividerLine} />
      </View>

      <View style={styles.socialRow}>
        <TouchableOpacity
          style={styles.socialBtn}
          onPress={() => handleSocialLogin('google', 'Google')}
          disabled={Boolean(socialLoading)}
          accessibilityLabel="Continue with Google">
          {socialLoading === 'google' ? (
            <ActivityIndicator size="small" />
          ) : (
            <>
              <AppIcon name="google" size={20} tintColor="#EA4335" />
              <AppText style={styles.socialBtnText}>Google</AppText>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.socialBtn}
          onPress={() => handleSocialLogin('facebook', 'Facebook')}
          disabled={Boolean(socialLoading)}
          accessibilityLabel="Continue with Facebook">
          {socialLoading === 'facebook' ? (
            <ActivityIndicator size="small" />
          ) : (
            <>
              <AppIcon name="facebook" size={20} tintColor="#1877F2" />
              <AppText style={styles.socialBtnText}>Facebook</AppText>
            </>
          )}
        </TouchableOpacity>
      </View>

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

      <View style={styles.signUpRow}>
        <AppText color="textSecondary" intlType="auth" value="dontHaveAccount" />
        <AppButton
          variant="ghost"
          intlType="auth"
          value="signUp"
          onPress={() => navigation.navigate('Register')}
        />
      </View>
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
    appleBtn: {
      width: '100%',
      height: 46,
    },
    disabled: {
      opacity: 0.5,
    },
    signUpRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 4,
    },
  });

