import React, { useState } from 'react';
import { StyleSheet, View, Image, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AppScreen } from '{{IMPORT:components.AppScreen}}';
import { AppText } from '{{IMPORT:components.AppText}}';
{{#if VECTOR_ICONS}}
import { AppIcon } from '{{IMPORT:components.AppIcon}}';
{{/if}}
import { AppButton } from '{{IMPORT:components.AppButton}}';
import { FadeInView } from '{{IMPORT:components.FadeInView}}';
import { LanguageSwitcher } from '{{IMPORT:components.LanguageSwitcher}}';
import { MediaPickerModal, type MediaPickerOption } from '{{IMPORT:components.MediaPickerModal}}';
import { useAuthSession } from '{{IMPORT:hooks.useAuthSession}}';
import { useImagePicker } from '{{IMPORT:hooks.useImagePicker}}';
{{#if THEME_CONTEXT}}
import { useStyles, useTheme } from '{{IMPORT:hooks.useTheme}}';
{{else}}
import { useStyles } from '{{IMPORT:hooks.useTheme}}';
{{/if}}
import type { RootNavigation } from '{{IMPORT:navigation.types}}';
import type { Theme } from '{{IMPORT:theme.index}}';
import { flash } from '{{IMPORT:utils.flashMessage}}';

export function ProfileScreen(): React.JSX.Element {
  const navigation = useNavigation<RootNavigation>();
  const styles = useStyles(createStyles);
{{#if THEME_CONTEXT}}
  const { themeMode, toggleTheme } = useTheme();
{{/if}}
  const { user, signOut } = useAuthSession();
  const { pick } = useImagePicker();

  const [avatarUri, setAvatarUri] = useState<string | null>(
    user?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200'
  );
  const [showImagePicker, setShowImagePicker] = useState(false);

  const handleMediaOption = async (option: MediaPickerOption) => {
    setShowImagePicker(false);
    if (option === 'camera_photo') {
      const res = await pick('camera_photo');
      if (res?.path) {
        setAvatarUri(res.path);
        flash.success({ intlType: 'common', value: 'ok' });
      }
    } else if (option === 'gallery_photo') {
      const res = await pick('gallery_photo');
      if (res?.path) {
        setAvatarUri(res.path);
        flash.success({ intlType: 'common', value: 'ok' });
      }
    }
  };

  const logout = async () => {
    await signOut();
    navigation.reset({ index: 0, routes: [{ name: 'Auth' }] });
  };

  return (
    <AppScreen edges={[]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Card with Avatar & Pencil Edit Badge (Navigates to Edit Profile) */}
        <FadeInView style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <Image source={{ uri: avatarUri || undefined }} style={styles.avatarImage} />
            <TouchableOpacity
              style={styles.editAvatarBadge}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('Main', { screen: 'EditProfile' } as any)}
              accessibilityLabel="Edit Profile">
{{#if VECTOR_ICONS}}
              <AppIcon name="pencil" size={16} tintColor="#FFFFFF" />
{{else}}
              <AppText style={{ fontSize: 12 }}>✏️</AppText>
{{/if}}
            </TouchableOpacity>
          </View>

          <AppText fontFamily="bold" fontSize="size20" style={styles.userName}>
            {user?.name ?? 'Alex Johnson'}
          </AppText>
          <AppText fontSize="size14" color="textSecondary" style={styles.userRole}>
            Senior Mobile Engineer
          </AppText>
          <AppText fontSize="size13" color="textSecondary">
            {user?.email ?? 'alex.johnson@example.com'}
          </AppText>
        </FadeInView>

        {/* User Details & Contact Info */}
        <FadeInView delay={60} style={styles.section}>
          <AppText fontFamily="semiBold" fontSize="size14" color="textSecondary" style={styles.sectionTitle}>
            ACCOUNT DETAILS
          </AppText>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <View style={styles.infoLeft}>
{{#if VECTOR_ICONS}}
                <AppIcon name="email-outline" size={20} tintColor="#888888" />
{{/if}}
                <AppText fontSize="size14" color="textSecondary">Email</AppText>
              </View>
              <AppText fontSize="size14" fontFamily="medium">{user?.email ?? 'alex.johnson@example.com'}</AppText>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={styles.infoLeft}>
{{#if VECTOR_ICONS}}
                <AppIcon name="phone-outline" size={20} tintColor="#888888" />
{{/if}}
                <AppText fontSize="size14" color="textSecondary">Phone</AppText>
              </View>
              <AppText fontSize="size14" fontFamily="medium">+1 (555) 234-5678</AppText>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={styles.infoLeft}>
{{#if VECTOR_ICONS}}
                <AppIcon name="map-marker-outline" size={20} tintColor="#888888" />
{{/if}}
                <AppText fontSize="size14" color="textSecondary">Location</AppText>
              </View>
              <AppText fontSize="size14" fontFamily="medium">San Francisco, CA</AppText>
            </View>
          </View>
        </FadeInView>

        {/* Language Preferences */}
        <FadeInView delay={100} style={styles.section}>
          <AppText fontFamily="semiBold" fontSize="size14" color="textSecondary" intlType="home" value="switchLanguage" style={styles.sectionTitle} />
          <View style={styles.card}>
            <LanguageSwitcher />
          </View>
        </FadeInView>

{{#if THEME_CONTEXT}}
        {/* Appearance & Theme Toggle */}
        <FadeInView delay={140} style={styles.section}>
          <AppText fontFamily="semiBold" fontSize="size14" color="textSecondary" text="Appearance" style={styles.sectionTitle} />
          <View style={styles.card}>
            <AppButton
              variant="secondary"
{{#if VECTOR_ICONS}}
              icon="theme-light-dark"
{{/if}}
              intlType="home"
              value="toggleTheme"
              value1={themeMode}
              onPress={toggleTheme}
            />
          </View>
        </FadeInView>

{{/if}}
        {/* Session Management (Log out) */}
        <FadeInView delay={180} style={styles.section}>
          <AppButton
            variant="danger"
{{#if VECTOR_ICONS}}
            icon="logout"
{{/if}}
            intlType="common"
            value="logout"
            onPress={logout}
          />
        </FadeInView>
      </ScrollView>

      {/* Reusable Image Source Picker */}
      <MediaPickerModal
        visible={showImagePicker}
        title="Choose Image Source"
        options={['camera_photo', 'gallery_photo']}
        onSelect={handleMediaOption}
        onClose={() => setShowImagePicker(false)}
      />
    </AppScreen>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    scrollContent: {
      paddingBottom: 24,
    },
    profileCard: {
      alignItems: 'center',
      padding: theme.spacing.spacing24,
      borderRadius: theme.borderRadius.radius16,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      marginBottom: theme.spacing.spacing20,
      ...theme.shadows.profileCardShadow,
    },
    avatarContainer: {
      position: 'relative',
      marginBottom: theme.spacing.spacing14,
    },
    avatarImage: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: theme.colors.primary,
    },
    editAvatarBadge: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: theme.colors.surface,
      elevation: 2,
    },
    userName: {
      marginBottom: 2,
    },
    userRole: {
      marginBottom: 4,
    },
    section: {
      marginBottom: theme.spacing.spacing20,
    },
    sectionTitle: {
      marginBottom: theme.spacing.spacing8,
      letterSpacing: 0.5,
    },
    card: {
      paddingHorizontal: theme.spacing.spacing16,
      paddingVertical: theme.spacing.spacing8,
      borderRadius: theme.borderRadius.radius14,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      ...theme.shadows.activityCardShadow,
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: theme.spacing.spacing12,
    },
    infoLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.border,
    },
  });
