import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Image,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
{{#if PHONE_INPUT}}
import { defaultCountry, findCountryByDialCode, type Country } from '{{IMPORT:assets.countries}}';
import { PhoneInput } from '{{IMPORT:components.PhoneInput}}';
{{/if}}
import { AppScreen } from '{{IMPORT:components.AppScreen}}';
import { AppText } from '{{IMPORT:components.AppText}}';
{{#if VECTOR_ICONS}}
import { AppIcon } from '{{IMPORT:components.AppIcon}}';
{{/if}}
import { AppInput } from '{{IMPORT:components.AppInput}}';
import { AppButton } from '{{IMPORT:components.AppButton}}';
import { FadeInView } from '{{IMPORT:components.FadeInView}}';
{{#if GOOGLE_LOCATION}}
import { LocationPicker } from '{{IMPORT:components.LocationPicker}}';
{{/if}}
import { MediaPickerModal, type MediaPickerOption } from '{{IMPORT:components.MediaPickerModal}}';
import { MediaEditorModal, type MediaItem } from '{{IMPORT:components.MediaEditorModal}}';
import { useImagePicker } from '{{IMPORT:hooks.useImagePicker}}';
import { useProfile } from '{{IMPORT:hooks.useProfile}}';
import { useStyles } from '{{IMPORT:hooks.useTheme}}';
import type { Theme } from '{{IMPORT:theme.index}}';

export function EditProfileScreen(): React.JSX.Element {
  const navigation = useNavigation<any>();
  const styles = useStyles(createStyles);
  const { user, saving, saveProfile } = useProfile();
  const { pick } = useImagePicker();

  const [name, setName] = useState(user?.name ?? '');
  const email = user?.email ?? '';
{{#if PHONE_INPUT}}
  const [country, setCountry] = useState<Country>(() => (user?.countryCode && findCountryByDialCode(user.countryCode)) || defaultCountry());
{{/if}}
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [location, setLocation] = useState(user?.location ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');

  const [avatarUri, setAvatarUri] = useState<string | null>(user?.avatar ?? null);
  /** A newly picked image (a local file) that still has to be uploaded. */
  const [pickedAvatar, setPickedAvatar] = useState<{ uri: string; fileName?: string } | null>(null);
  const [avatarCrop, setAvatarCrop] = useState<MediaItem['crop'] | undefined>(undefined);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [editingMedia, setEditingMedia] = useState<MediaItem | null>(null);

  const handleMediaOption = async (option: MediaPickerOption) => {
    setShowImagePicker(false);
    if (option === 'camera_photo') {
      const res = await pick('camera_photo');
      if (res?.path) {
        setEditingMedia({
          uri: res.path,
          type: 'image',
          fileName: res.filename,
        });
      }
    } else if (option === 'gallery_photo') {
      const res = await pick('gallery_photo');
      if (res?.path) {
        setEditingMedia({
          uri: res.path,
          type: 'image',
          fileName: res.filename,
        });
      }
    }
  };

  const handleApplyEditedAvatar = (editedMedia: MediaItem) => {
    setAvatarUri(editedMedia.uri);
    setAvatarCrop(editedMedia.crop);
    setPickedAvatar({ uri: editedMedia.uri, fileName: editedMedia.fileName });
    setEditingMedia(null);
  };

  const getAvatarFilterStyle = () => {
    if (!avatarCrop?.filter) return null;
    switch (avatarCrop.filter) {
      case 'warm':
        return { backgroundColor: '#ff9800', opacity: 0.15 };
      case 'cool':
        return { backgroundColor: '#2196f3', opacity: 0.15 };
      case 'mono':
        return { backgroundColor: '#000000', opacity: 0.25 };
      default:
        return null;
    }
  };

  /** Backend → the updated user → every screen (useProfile). */
  const handleSave = async () => {
    const digits = phone.replace(/\D/g, '');
    const saved = await saveProfile(
      {
        name: name.trim(),
{{#if PHONE_INPUT}}
        ...(digits ? { countryCode: country.dialCode, phone: digits } : { phone: null }),
{{else}}
        ...(digits ? {} : { phone: null }),
{{/if}}
        location: location.trim() || null,
        bio: bio.trim() || null,
      },
      pickedAvatar,
    );
    if (saved) navigation.goBack();
  };

  return (
    <AppScreen edges={[]}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Avatar Edit Section */}
          <FadeInView style={styles.avatarSection}>
            <View style={styles.avatarWrapper}>
              <View style={styles.avatarContainer}>
                <Image
                  source={{ uri: avatarUri || undefined }}
                  style={[
                    styles.avatar,
                    {
                      transform: avatarCrop?.rotation ? [{ rotate: `${avatarCrop.rotation}deg` }] : undefined,
                    },
                  ]}
                />
                {getAvatarFilterStyle() && <View style={[StyleSheet.absoluteFill, getAvatarFilterStyle()]} />}
              </View>
              <TouchableOpacity
                style={styles.changeBadge}
                activeOpacity={0.8}
                onPress={() => setShowImagePicker(true)}
                accessibilityLabel="Change profile image">
{{#if VECTOR_ICONS}}
                <AppIcon name="camera" size={18} tintColor="#FFFFFF" />
{{else}}
                <AppText style={{ fontSize: 14 }}>📷</AppText>
{{/if}}
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={() => setShowImagePicker(true)}>
              <AppText fontFamily="semiBold" fontSize="size14" color="primary" style={styles.changePhotoText}>
                Change Profile Photo
              </AppText>
            </TouchableOpacity>
          </FadeInView>

          {/* Form Fields */}
          <FadeInView delay={60} style={styles.formSection}>
            <View style={styles.inputGroup}>
              <AppText fontFamily="semiBold" fontSize="size13" color="textSecondary" style={styles.fieldLabel}>
                FULL NAME
              </AppText>
              <AppInput
                value={name}
                onChangeText={setName}
                placeholder="Full Name"
{{#if VECTOR_ICONS}}
                leftIcon="account-outline"
{{/if}}
              />
            </View>

            <View style={styles.inputGroup}>
              <AppText fontFamily="semiBold" fontSize="size13" color="textSecondary" style={styles.fieldLabel}>
                EMAIL ADDRESS
              </AppText>
              <AppInput
                value={email}
                editable={false}
                placeholder="Email Address"
{{#if VECTOR_ICONS}}
                leftIcon="email-outline"
{{/if}}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
{{#if PHONE_INPUT}}
              <PhoneInput country={country} onCountryChange={setCountry} value={phone} onChangeText={setPhone} />
{{else}}
              <AppText fontFamily="semiBold" fontSize="size13" color="textSecondary" style={styles.fieldLabel}>
                PHONE NUMBER
              </AppText>
              <AppInput
                value={phone}
                onChangeText={setPhone}
                placeholder="Phone Number"
{{#if VECTOR_ICONS}}
                leftIcon="phone-outline"
{{/if}}
                keyboardType="phone-pad"
              />
{{/if}}
            </View>

            <View style={styles.inputGroup}>
              <AppText fontFamily="semiBold" fontSize="size13" color="textSecondary" style={styles.fieldLabel}>
                LOCATION
              </AppText>
{{#if GOOGLE_LOCATION}}
              {/* Google Places suggestions + "Use current location" (Google Location SDK). */}
              <LocationPicker value={location} onChange={setLocation} placeholder="Location" />
{{else}}
              <AppInput
                value={location}
                onChangeText={setLocation}
                placeholder="Location"
{{#if VECTOR_ICONS}}
                leftIcon="map-marker-outline"
{{/if}}
              />
{{/if}}
            </View>

            <View style={styles.inputGroup}>
              <AppText fontFamily="semiBold" fontSize="size13" color="textSecondary" style={styles.fieldLabel}>
                BIO
              </AppText>
              <AppInput
                value={bio}
                onChangeText={setBio}
                placeholder="About you"
{{#if VECTOR_ICONS}}
                leftIcon="text"
{{/if}}
                multiline
              />
            </View>
          </FadeInView>

          {/* Action Buttons */}
          <FadeInView delay={120} style={styles.buttonSection}>
            <AppButton
              variant="primary"
              title="Save Changes"
              loading={saving}
              onPress={handleSave}
            />
            <AppButton
              variant="outline"
              title="Cancel"
              style={styles.cancelBtn}
              onPress={() => navigation.goBack()}
            />
          </FadeInView>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Reusable Image Source Selection Modal */}
      <MediaPickerModal
        visible={showImagePicker}
        title="Choose Image Source"
        options={['camera_photo', 'gallery_photo']}
        onSelect={handleMediaOption}
        onClose={() => setShowImagePicker(false)}
      />

      {/* Image Crop & Edit Tool Modal for Profile Avatar */}
      <MediaEditorModal
        visible={Boolean(editingMedia)}
        media={editingMedia}
        enableCropper={true}
        onClose={() => setEditingMedia(null)}
        onSend={handleApplyEditedAvatar}
      />
    </AppScreen>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: 32,
    },
    avatarSection: {
      alignItems: 'center',
      paddingVertical: theme.spacing.spacing16,
      marginBottom: theme.spacing.spacing12,
    },
    avatarWrapper: {
      position: 'relative',
      marginBottom: theme.spacing.spacing10,
    },
    avatarContainer: {
      width: 104,
      height: 104,
      borderRadius: 52,
      overflow: 'hidden',
      backgroundColor: theme.colors.primary,
    },
    avatar: {
      width: 104,
      height: 104,
      borderRadius: 52,
      backgroundColor: theme.colors.primary,
    },
    changeBadge: {
      position: 'absolute',
      bottom: 0,
      end: 0,
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2.5,
      borderColor: theme.colors.surface,
      elevation: 3,
    },
    changePhotoText: {
      marginTop: 4,
    },
    formSection: {
      gap: theme.spacing.spacing16,
      marginBottom: theme.spacing.spacing24,
    },
    inputGroup: {
      gap: theme.spacing.spacing6,
    },
    fieldLabel: {
      marginStart: 4,
      letterSpacing: 0.5,
    },
    buttonSection: {
      gap: theme.spacing.spacing12,
    },
    cancelBtn: {
      marginTop: 4,
    },
  });
