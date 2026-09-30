import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { errorMessage } from '@data/api/apiErrors';
import { legalApi, type LegalLinks as Links } from '@data/api/legalApi';
import { AppText } from '@presentation/components/AppText';
import { forDevice } from '@infrastructure/config/env';
import { useStyles } from '@presentation/hooks/useTheme';
import { translate } from '@infrastructure/i18n';
import type { Theme } from '@presentation/theme';
import { flash } from '@utils/flashMessage';

export type LegalPage = 'terms' | 'privacy';

/** Which link of GET /legal each page opens (the backend decides the URLs – see its TERMS_URL). */
const LEGAL_LINK: Record<LegalPage, keyof Links> = { terms: 'termsUrl', privacy: 'privacyPolicyUrl' };

const LEGAL_TITLES: Record<LegalPage, () => string> = {
  terms: () => translate('common', 'termsAndConditions'),
  privacy: () => translate('common', 'privacyPolicy'),
};

/** Both the Auth and the Main stack register a `WebView` screen with these params. */
type WebViewNavigation = NativeStackNavigationProp<{ WebView: { url: string; title?: string } }>;

/**
 * Opens Terms & Conditions / Privacy Policy in the in-app WebView. The URLs come from the
 * backend, so they can change without an app release. Works signed in and signed out.
 */
export function useLegalPages() {
  const navigation = useNavigation<WebViewNavigation>();

  const open = useCallback(
    async (page: LegalPage) => {
      try {
        const links = await legalApi.getLinks();
        const url = links[LEGAL_LINK[page]];
        if (url) navigation.navigate('WebView', { url: forDevice(url), title: LEGAL_TITLES[page]() });
      } catch (error) {
        flash.error({ message: errorMessage(error) });
      }
    },
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
