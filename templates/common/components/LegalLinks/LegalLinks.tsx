import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppText } from '{{IMPORT:components.AppText}}';
import { env } from '{{IMPORT:config.env}}';
import { useStyles } from '{{IMPORT:hooks.useTheme}}';
import { translate } from '{{IMPORT:i18n.index}}';
import type { Theme } from '{{IMPORT:theme.index}}';

export type LegalPage = 'terms' | 'privacy';

/** URLs come from `.env` (TERMS_URL / PRIVACY_POLICY_URL). */
const LEGAL_URLS: Record<LegalPage, () => string> = {
  terms: () => env.legal.termsUrl,
  privacy: () => env.legal.privacyPolicyUrl,
};

const LEGAL_TITLES: Record<LegalPage, () => string> = {
  terms: () => translate('common', 'termsAndConditions'),
  privacy: () => translate('common', 'privacyPolicy'),
};

/** Both the Auth and the Main stack register a `WebView` screen with these params. */
type WebViewNavigation = NativeStackNavigationProp<{ WebView: { url: string; title?: string } }>;

/**
 * Opens Terms & Conditions / Privacy Policy in the in-app WebView. Works signed in
 * (Main stack) and signed out (Auth stack).
 */
export function useLegalPages() {
  const navigation = useNavigation<WebViewNavigation>();

  const open = useCallback(
    (page: LegalPage) => navigation.navigate('WebView', { url: LEGAL_URLS[page](), title: LEGAL_TITLES[page]() }),
    [navigation],
  );

  return useMemo(
    () => ({
      open,
      pages: (['terms', 'privacy'] as const).map(page => ({ page, title: LEGAL_TITLES[page](), open: () => open(page) })),
    }),
    [open],
  );
}

export interface LegalLinksProps {
  style?: StyleProp<ViewStyle>;
}

/** "By continuing you agree to our Terms & Conditions and Privacy Policy" – for auth screens. */
export function LegalLinks({ style }: LegalLinksProps): React.JSX.Element {
  const styles = useStyles(createStyles);
  const { open } = useLegalPages();

  return (
    <View style={[styles.container, style]}>
      <AppText fontSize="size12" color="textSecondary" align="center">
        <AppText fontSize="size12" color="textSecondary" intlType="common" value="agreeToTerms" />{' '}
        <AppText
          fontSize="size12"
          fontFamily="semiBold"
          color="primary"
          intlType="common"
          value="termsAndConditions"
          onPress={() => open('terms')}
          accessibilityRole="link"
        />{' '}
        <AppText fontSize="size12" color="textSecondary" intlType="common" value="and" />{' '}
        <AppText
          fontSize="size12"
          fontFamily="semiBold"
          color="primary"
          intlType="common"
          value="privacyPolicy"
          onPress={() => open('privacy')}
          accessibilityRole="link"
        />
      </AppText>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: theme.spacing.spacing16,
    },
  });
