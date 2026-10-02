import React, { useEffect, useState } from 'react';
import { Image, Platform, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AppButton } from '{{IMPORT:components.AppButton}}';
import { AppScreen } from '{{IMPORT:components.AppScreen}}';
import { AppText } from '{{IMPORT:components.AppText}}';
import { FadeInView } from '{{IMPORT:components.FadeInView}}';
import { MediaPickerModal, type MediaPickerOption } from '{{IMPORT:components.MediaPickerModal}}';
import { useAuthSession } from '{{IMPORT:hooks.useAuthSession}}';
import { useImagePicker } from '{{IMPORT:hooks.useImagePicker}}';
import { useStyles } from '{{IMPORT:hooks.useTheme}}';
import type { RootNavigation } from '{{IMPORT:navigation.types}}';
{{#if NOTIFICATIONS}}
import { notificationService } from '{{IMPORT:notification.service}}';
import { flash } from '{{IMPORT:utils.flashMessage}}';
{{/if}}
{{#if HAS_CALLING}}
import { syncVoipTokenWithBackend } from '{{IMPORT:calling.voipPushService}}';
{{/if}}
import type { Theme } from '{{IMPORT:theme.index}}';

/** Main dashboard screen displaying app architecture status, quick action tools, and live previews. */
export function HomeScreen(): React.JSX.Element {
  const navigation = useNavigation<RootNavigation>();
  const styles = useStyles(createStyles);
  const { user } = useAuthSession();
  const { image, picking, pick } = useImagePicker();
  const [showMediaModal, setShowMediaModal] = useState(false);

{{#if HAS_CALLING}}
  // On iOS, ensure VoIP push token is registered and synced with backend for incoming CallKit calls
  useEffect(() => {
    if (Platform.OS === 'ios') {
      syncVoipTokenWithBackend();
    }
  }, []);
{{/if}}

{{#if NOTIFICATIONS}}
  const enableNotifications = async () => {
    if (await notificationService.requestPermission()) {
      flash.success({ intlType: 'home', value: 'notificationsEnabled' });
    }
  };
{{/if}}

  const handleMediaOption = async (option: MediaPickerOption) => {
    setShowMediaModal(false);
    if (option === 'camera_photo') {
      await pick('camera_photo');
    } else if (option === 'gallery_photo') {
      await pick('gallery_photo');
    }
  };

  return (
    <AppScreen edges={[]}>
      {/* Hero Welcome Banner */}
      <FadeInView style={styles.heroCard}>
        <View style={styles.heroHeader}>
          <View style={styles.heroTextContainer}>
            <AppText fontFamily="bold" fontSize="size22" color="onPrimary" intlType="home" value="welcomeUser" value1={user?.name ?? 'Developer'} />
            <AppText fontSize="size13" color="onPrimary" style={styles.heroSubtitle} intlType="home" value="starterReady" value1="{{ARCHITECTURE_NAME}}" />
          </View>
          <View style={styles.badge}>
            <AppText fontFamily="semiBold" fontSize="size12" color="primary" text="Active" />
          </View>
        </View>
      </FadeInView>

      {/* Quick Action Tools */}
      <FadeInView delay={60} style={styles.section}>
        <AppText fontFamily="semiBold" fontSize="size16" intlType="home" value="starterTools" style={styles.sectionTitle} />
        
        <View style={styles.toolsGrid}>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
{{#if VECTOR_ICONS}}
              <AppButton
                variant="secondary"
                icon="web"
                intlType="home"
                value="openWebView"
                onPress={() =>
                  navigation.navigate('Main', {
                    screen: 'WebView',
                    params: { url: 'https://reactnative.dev', title: 'React Native' },
                  })
                }
              />
{{else}}
              <AppButton
                variant="secondary"
                intlType="home"
                value="openWebView"
                onPress={() =>
                  navigation.navigate('Main', {
                    screen: 'WebView',
                    params: { url: 'https://reactnative.dev', title: 'React Native' },
                  })
                }
              />
{{/if}}
            </View>

            <View style={styles.cardDivider} />

            <View style={styles.cardHeader}>
{{#if VECTOR_ICONS}}
              <AppButton
                variant="secondary"
                icon="image-outline"
                intlType="home"
                value="pickImage"
                loading={picking}
                onPress={() => setShowMediaModal(true)}
              />
{{else}}
              <AppButton
                variant="secondary"
                intlType="home"
                value="pickImage"
                loading={picking}
                onPress={() => setShowMediaModal(true)}
              />
{{/if}}
            </View>

            {image ? (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: image.path }} style={styles.avatar} />
                <View style={styles.imageDetails}>
                  <AppText fontFamily="medium" fontSize="size13" intlType="home" value="imageSelected" value1={image.width} value2={image.height} />
                  <AppText fontSize="size11" color="textSecondary" text="Ready for upload" />
                </View>
              </View>
            ) : null}

{{#if NOTIFICATIONS}}
            <View style={styles.cardDivider} />

            <View style={styles.cardHeader}>
{{#if VECTOR_ICONS}}
              <AppButton
                variant="outline"
                icon="bell-outline"
                intlType="home"
                value="enableNotifications"
                onPress={enableNotifications}
              />
{{else}}
              <AppButton
                variant="outline"
                intlType="home"
                value="enableNotifications"
                onPress={enableNotifications}
              />
{{/if}}
            </View>
{{/if}}
          </View>
        </View>
      </FadeInView>

      {/* Translations & Internationalization Preview */}
      <FadeInView delay={120} style={styles.section}>
        <AppText fontFamily="semiBold" fontSize="size16" intlType="home" value="translationSamples" style={styles.sectionTitle} />
        
        <View style={styles.card}>
          <View style={styles.sampleItem}>
            <AppText color="textSecondary" fontSize="size13" text="Product Action:" />
            <AppText fontFamily="medium" fontSize="size14" intlType="product" value="addToCart" />
          </View>
          <View style={styles.cardDivider} />
          <View style={styles.sampleItem}>
            <AppText color="textSecondary" fontSize="size13" text="Plural Localization:" />
            <AppText fontFamily="medium" fontSize="size14" intlType="product" value="productCount" count={3} />
          </View>
          <View style={styles.cardDivider} />
          <View style={styles.sampleItem}>
            <AppText color="textSecondary" fontSize="size13" text="Order Status:" />
            <AppText fontFamily="medium" fontSize="size14" color="primary" intlType="order" value="orderDelivered" />
          </View>
        </View>
      </FadeInView>

      {/* Reusable Image Source Selection Modal */}
      <MediaPickerModal
        visible={showMediaModal}
        title="Choose Image Source"
        options={['camera_photo', 'gallery_photo']}
        onSelect={handleMediaOption}
        onClose={() => setShowMediaModal(false)}
      />
    </AppScreen>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    heroCard: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.radius16,
      padding: theme.spacing.spacing20,
      marginBottom: theme.spacing.spacing20,
      ...theme.shadows.activityCardShadow,
    },
    heroHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    heroTextContainer: {
      flex: theme.flexs.flexFull,
      gap: theme.spacing.spacing4,
    },
    heroSubtitle: {
      opacity: theme.opacity.opacityFull - theme.opacity.opacity2,
    },
    badge: {
      backgroundColor: theme.colors.surface,
      paddingHorizontal: theme.spacing.spacing10,
      paddingVertical: theme.spacing.spacing4,
      borderRadius: theme.borderRadius.radius100,
    },
    section: {
      marginBottom: theme.spacing.spacing20,
    },
    sectionTitle: {
      marginBottom: theme.spacing.spacing8,
    },
    toolsGrid: {
      gap: theme.spacing.spacing12,
    },
    card: {
      padding: theme.spacing.spacing16,
      borderRadius: theme.borderRadius.radius14,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      ...theme.shadows.activityCardShadow,
    },
    cardHeader: {
      paddingVertical: theme.spacing.spacing4,
    },
    cardDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.border,
      marginVertical: theme.spacing.spacing8,
    },
    imagePreviewContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.spacing12,
      paddingVertical: theme.spacing.spacing8,
      paddingHorizontal: theme.spacing.spacing4,
    },
    avatar: {
      width: theme.spacing.spacing48,
      height: theme.spacing.spacing48,
      borderRadius: theme.borderRadius.radius10,
      borderWidth: theme.spacing.spacing1,
      borderColor: theme.colors.border,
    },
    imageDetails: {
      flex: theme.flexs.flexFull,
      gap: theme.spacing.spacing2,
    },
    sampleItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: theme.spacing.spacing6,
    },
  });
