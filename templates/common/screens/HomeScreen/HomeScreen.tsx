import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AppButton } from '{{IMPORT:components.AppButton}}';
import { AppScreen } from '{{IMPORT:components.AppScreen}}';
import { AppText } from '{{IMPORT:components.AppText}}';
import { FadeInView } from '{{IMPORT:components.FadeInView}}';
import { useAuthSession } from '{{IMPORT:hooks.useAuthSession}}';
import { useImagePicker } from '{{IMPORT:hooks.useImagePicker}}';
import { useStyles } from '{{IMPORT:hooks.useTheme}}';
import type { RootNavigation } from '{{IMPORT:navigation.types}}';
import { notificationService } from '{{IMPORT:notification.service}}';
import type { Theme } from '{{IMPORT:theme.index}}';
import { flash } from '{{IMPORT:utils.flashMessage}}';

/** First tab. The header and tab bar come from BottomTabNavigator. */
export function HomeScreen(): React.JSX.Element {
  const navigation = useNavigation<RootNavigation>();
  const styles = useStyles(createStyles);
  const { user } = useAuthSession();
  const { image, picking, pickFromGallery } = useImagePicker();

  const enableNotifications = async () => {
    if (await notificationService.requestPermission()) {
      flash.success({ intlType: 'home', value: 'notificationsEnabled' });
    }
  };

  return (
    <AppScreen edges={[]}>
      <FadeInView style={styles.hero}>
        <AppText fontFamily="bold" fontSize="size24" intlType="home" value="welcomeUser" value1={user?.name ?? ''} />
        <AppText color="textSecondary" intlType="home" value="starterReady" value1="{{ARCHITECTURE_NAME}}" />
      </FadeInView>

      <FadeInView delay={80} style={styles.card}>
        <AppText fontFamily="semiBold" fontSize="size16" intlType="home" value="starterTools" />
        <AppButton
          variant="secondary"
{{#if VECTOR_ICONS}}
          icon="web"
{{/if}}
          intlType="home"
          value="openWebView"
          onPress={() =>
            navigation.navigate('Main', {
              screen: 'WebView',
              params: { url: 'https://reactnative.dev', title: 'React Native' },
            })
          }
        />
        <AppButton
          variant="secondary"
{{#if VECTOR_ICONS}}
          icon="image-outline"
{{/if}}
          intlType="home"
          value="pickImage"
          loading={picking}
          onPress={() => pickFromGallery({ maxWidth: 600, maxHeight: 600 })}
        />
        {image ? (
          <View style={styles.preview}>
            <Image source={{ uri: image.path }} style={styles.avatar} />
            <AppText fontSize="size12" color="textSecondary" intlType="home" value="imageSelected" value1={image.width} value2={image.height} />
          </View>
        ) : null}
        <AppButton
          variant="outline"
{{#if VECTOR_ICONS}}
          icon="bell-outline"
{{/if}}
          intlType="home"
          value="enableNotifications"
          onPress={enableNotifications}
        />
      </FadeInView>

      <FadeInView delay={160} style={styles.card}>
        <AppText fontFamily="semiBold" fontSize="size16" intlType="home" value="translationSamples" />
        {/* Texts below come from locales/<language>/product.json and order.json */}
        <AppText intlType="product" value="addToCart" />
        <AppText intlType="product" value="productCount" count={3} />
        <AppText intlType="order" value="orderDelivered" />
      </FadeInView>
    </AppScreen>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    hero: {
      gap: theme.spacing.spacing4,
      marginBottom: theme.spacing.spacing24,
    },
    card: {
      gap: theme.spacing.spacing12,
      padding: theme.spacing.spacing16,
      marginBottom: theme.spacing.spacing16,
      borderRadius: theme.borderRadius.radius12,
      backgroundColor: theme.colors.surface,
      ...theme.shadows.activityCardShadow,
    },
    preview: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.spacing12,
    },
    avatar: {
      width: theme.spacing.spacing56,
      height: theme.spacing.spacing56,
      borderRadius: theme.borderRadius.radius1000,
    },
  });
