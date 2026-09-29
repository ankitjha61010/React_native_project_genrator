import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AppScreen } from '{{IMPORT:components.AppScreen}}';
import { AppText } from '{{IMPORT:components.AppText}}';
{{#if VECTOR_ICONS}}
import { AppIcon, type AppIconName } from '{{IMPORT:components.AppIcon}}';
{{/if}}
import { AppButton } from '{{IMPORT:components.AppButton}}';
import { FadeInView } from '{{IMPORT:components.FadeInView}}';
import { LanguageSwitcher } from '{{IMPORT:components.LanguageSwitcher}}';
{{#if TERMS}}
import { useLegalPages } from '{{IMPORT:components.LegalLinks}}';
{{/if}}
import { MediaPickerModal, type MediaPickerOption } from '{{IMPORT:components.MediaPickerModal}}';
import { useAuthSession } from '{{IMPORT:hooks.useAuthSession}}';
{{#if RTL}}
{{#if VECTOR_ICONS}}
import { useDirection } from '{{IMPORT:hooks.useDirection}}';
{{/if}}
{{/if}}
import { useImagePicker } from '{{IMPORT:hooks.useImagePicker}}';
import { useProfile } from '{{IMPORT:hooks.useProfile}}';
{{#if THEME_CONTEXT}}
import { useStyles, useTheme } from '{{IMPORT:hooks.useTheme}}';
{{else}}
import { useStyles } from '{{IMPORT:hooks.useTheme}}';
{{/if}}
import { translate } from '{{IMPORT:i18n.index}}';
import { resetToAuth } from '{{IMPORT:navigation.ref}}';
import type { RootNavigation } from '{{IMPORT:navigation.types}}';
import type { Theme } from '{{IMPORT:theme.index}}';

interface RowProps {
{{#if VECTOR_ICONS}}
  icon: AppIconName;
{{/if}}
  label: string;
  /** Shown at the end of the row (details); rows with `onPress` show a chevron instead. */
  value?: string;
  onPress?: () => void;
  danger?: boolean;
}

/** One line of a card: icon, label and a value or a chevron. */
function Row({ {{#if VECTOR_ICONS}}icon, {{/if}}label, value, onPress, danger }: RowProps): React.JSX.Element {
  const styles = useStyles(createStyles);
{{#if RTL}}
{{#if VECTOR_ICONS}}
  const { forwardIcon } = useDirection();
{{/if}}
{{/if}}
  const content = (
    <>
      <View style={styles.rowStart}>
{{#if VECTOR_ICONS}}
        <AppIcon name={icon} size={20} tintColor={danger ? styles.danger.color : styles.muted.color} />
{{/if}}
        <AppText fontSize="size14" fontFamily="medium" color={danger ? 'error' : 'text'} text={label} />
      </View>
      {value !== undefined ? <AppText fontSize="size14" color="textSecondary" numberOfLines={1} style={styles.rowValue} text={value} /> : null}
{{#if VECTOR_ICONS}}
      {onPress ? <AppIcon name={ {{#if RTL}}forwardIcon{{else}}'chevron-right'{{/if}} } size={20} tintColor={styles.muted.color} /> : null}
{{/if}}
    </>
  );
  return onPress ? (
    <TouchableOpacity style={styles.row} onPress={onPress} accessibilityRole="button">
      {content}
    </TouchableOpacity>
  ) : (
    <View style={styles.row}>{content}</View>
  );
}

/**
 * The signed-in user's profile. UI only – changes go through useProfile (backend → updated user
 * → every screen).
 */
export function ProfileScreen(): React.JSX.Element {
  const navigation = useNavigation<RootNavigation>();
  const styles = useStyles(createStyles);
{{#if THEME_CONTEXT}}
  const { themeMode, toggleTheme } = useTheme();
{{/if}}
  const { signOut } = useAuthSession();
  const { user, uploadingAvatar, changeAvatar{{#if DELETE_ACCOUNT}}, deletingAccount, deleteAccount{{/if}} } = useProfile();
  const { pick } = useImagePicker();
{{#if TERMS}}
  const legal = useLegalPages();
{{/if}}
  const [showImagePicker, setShowImagePicker] = useState(false);
  const phone = user?.phone ? `${user.countryCode ?? ''} ${user.phone}`.trim() : '—';

  /** Uploads the picked photo right away. */
  const handleMediaOption = async (option: MediaPickerOption) => {
    setShowImagePicker(false);
    if (option !== 'camera_photo' && option !== 'gallery_photo') return;
    const picked = await pick(option);
    if (picked?.path) await changeAvatar({ uri: picked.path, fileName: picked.filename ?? undefined, mimeType: picked.mime });
  };

  const logout = () =>
    Alert.alert(translate('common', 'logout'), translate('common', 'logoutConfirm'), [
      { text: translate('common', 'cancel'), style: 'cancel' },
      {
        text: translate('common', 'logout'),
        style: 'destructive',
        onPress: async () => {
          await signOut();
          resetToAuth();
        },
      },
    ]);
{{#if DELETE_ACCOUNT}}

  /** Asks for confirmation first: the account and its data are gone for good. */
  const confirmDeleteAccount = () =>
    Alert.alert(translate('common', 'deleteAccountTitle'), translate('common', 'deleteAccountMessage'), [
      { text: translate('common', 'cancel'), style: 'cancel' },
      {
        text: translate('common', 'deleteAccountConfirm'),
        style: 'destructive',
        onPress: async () => {
          if (await deleteAccount()) resetToAuth();
        },
      },
    ]);
{{/if}}

  return (
    <AppScreen edges={[]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <FadeInView style={styles.profileCard}>
          <TouchableOpacity
            style={styles.avatarContainer}
            activeOpacity={0.8}
            onPress={() => setShowImagePicker(true)}
            disabled={uploadingAvatar}
            accessibilityRole="button"
            accessibilityLabel="Change profile photo">
            {user?.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatarImage, styles.avatarInitials]}>
                <AppText fontFamily="bold" fontSize="size24" color="onPrimary" text={(user?.name ?? '?').charAt(0).toUpperCase()} />
              </View>
            )}
            {uploadingAvatar ? (
              <View style={[StyleSheet.absoluteFill, styles.avatarOverlay]}>
                <ActivityIndicator color="#FFFFFF" />
              </View>
            ) : null}
            <View style={styles.cameraBadge}>
{{#if VECTOR_ICONS}}
              <AppIcon name="camera" size={16} tintColor="#FFFFFF" />
{{else}}
              <AppText fontSize="size12" text="📷" />
{{/if}}
            </View>
          </TouchableOpacity>

          <AppText fontFamily="bold" fontSize="size20" text={user?.name ?? ''} />
          {user?.bio ? <AppText fontSize="size14" color="textSecondary" align="center" text={user.bio} /> : null}
          <AppButton variant="outline" intlType="common" value="editProfile" style={styles.editButton} onPress={() => navigation.navigate('Main', { screen: 'EditProfile' })} />
        </FadeInView>

        <FadeInView delay={60} style={styles.section}>
          <AppText fontFamily="semiBold" fontSize="size14" color="textSecondary" intlType="common" value="account" style={styles.sectionTitle} />
          <View style={styles.card}>
            <Row {{#if VECTOR_ICONS}}icon="email-outline" {{/if}}label="Email" value={user?.email || '—'} />
            <View style={styles.divider} />
            <Row {{#if VECTOR_ICONS}}icon="phone-outline" {{/if}}label="Phone" value={phone} />
            <View style={styles.divider} />
            <Row {{#if VECTOR_ICONS}}icon="map-marker-outline" {{/if}}label="Location" value={user?.location || '—'} />
{{#if AUTH_EMAIL}}
            {user?.hasPassword !== false ? (
              <>
                <View style={styles.divider} />
                <Row {{#if VECTOR_ICONS}}icon="lock-reset" {{/if}}label={translate('common', 'changePassword')} onPress={() => navigation.navigate('Main', { screen: 'ChangePassword' })} />
              </>
            ) : null}
{{/if}}
          </View>
        </FadeInView>

        <FadeInView delay={100} style={styles.section}>
          <AppText fontFamily="semiBold" fontSize="size14" color="textSecondary" intlType="home" value="switchLanguage" style={styles.sectionTitle} />
          <View style={styles.card}>
            <View style={styles.cardPadding}>
              <LanguageSwitcher />
            </View>
          </View>
        </FadeInView>

{{#if THEME_CONTEXT}}
        <FadeInView delay={140} style={styles.section}>
          <AppText fontFamily="semiBold" fontSize="size14" color="textSecondary" intlType="common" value="appearance" style={styles.sectionTitle} />
          <View style={styles.card}>
            <View style={styles.cardPadding}>
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
          </View>
        </FadeInView>

{{/if}}
{{#if TERMS}}
        {/* Terms & Conditions / Privacy Policy – the links come from the backend (GET /legal). */}
        <FadeInView delay={160} style={styles.section}>
          <AppText fontFamily="semiBold" fontSize="size14" color="textSecondary" intlType="common" value="legal" style={styles.sectionTitle} />
          <View style={styles.card}>
            {legal.pages.map(({ page, title, open }, index) => (
              <React.Fragment key={page}>
                {index > 0 && <View style={styles.divider} />}
                <Row {{#if VECTOR_ICONS}}icon={page === 'terms' ? 'file-document-outline' : 'shield-lock-outline'} {{/if}}label={title} onPress={open} />
              </React.Fragment>
            ))}
          </View>
        </FadeInView>

{{/if}}
        <FadeInView delay={180} style={styles.section}>
          <View style={styles.card}>
            <Row {{#if VECTOR_ICONS}}icon="logout" {{/if}}label={translate('common', 'logout')} onPress={logout} danger />
{{#if DELETE_ACCOUNT}}
            <View style={styles.divider} />
            {deletingAccount ? (
              <ActivityIndicator style={styles.deleting} />
            ) : (
              <Row {{#if VECTOR_ICONS}}icon="account-remove-outline" {{/if}}label={translate('common', 'deleteAccount')} onPress={confirmDeleteAccount} danger />
            )}
{{/if}}
          </View>
        </FadeInView>
      </ScrollView>

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
      paddingBottom: theme.spacing.spacing24,
    },
    profileCard: {
      alignItems: 'center',
      gap: theme.spacing.spacing4,
      padding: theme.spacing.spacing24,
      borderRadius: theme.borderRadius.radius16,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      marginBottom: theme.spacing.spacing20,
      ...theme.shadows.profileCardShadow,
    },
    avatarContainer: {
      marginBottom: theme.spacing.spacing10,
    },
    avatarImage: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: theme.colors.primary,
    },
    avatarInitials: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarOverlay: {
      borderRadius: 48,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.35)',
    },
    cameraBadge: {
      position: 'absolute',
      bottom: 0,
      // `end` (not `right`) – the badge moves to the other side in RTL.
      end: 0,
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: theme.colors.surface,
    },
    editButton: {
      marginTop: theme.spacing.spacing12,
      alignSelf: 'stretch',
    },
    section: {
      marginBottom: theme.spacing.spacing20,
    },
    sectionTitle: {
      marginBottom: theme.spacing.spacing8,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    card: {
      paddingHorizontal: theme.spacing.spacing16,
      borderRadius: theme.borderRadius.radius14,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      ...theme.shadows.activityCardShadow,
    },
    cardPadding: {
      paddingVertical: theme.spacing.spacing12,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.spacing8,
      paddingVertical: theme.spacing.spacing14,
    },
    rowStart: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.spacing10,
    },
    rowValue: {
      flexShrink: 1,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.border,
    },
    deleting: {
      paddingVertical: theme.spacing.spacing14,
    },
    muted: {
      color: theme.colors.textSecondary,
    },
    danger: {
      color: theme.colors.error,
    },
  });
