import React, { useState } from 'react';
import { ActivityIndicator, FlatList, Image, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppButton } from '@presentation/components/AppButton';
import { AppIcon } from '@presentation/components/AppIcon';
import { AppText } from '@presentation/components/AppText';
import { MediaPickerModal, type MediaPickerOption } from '@presentation/components/MediaPickerModal';
import { useImagePicker } from '@presentation/hooks/useImagePicker';
import { useStyles, useTheme } from '@presentation/hooks/useTheme';
import { translate } from '@infrastructure/i18n';
import type { MainStackParamList } from '@presentation/navigation/navigationTypes';
import type { Theme } from '@presentation/theme';
import { UserRow } from '../../components/UserRow/UserRow';
import { useCreateGroup } from '../../hooks/useCreateGroup';
import { useUserList } from '../../hooks/useUserList';

/** New group: image, name and members (you become the admin). */
export function CreateGroupScreen(): React.JSX.Element {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { theme } = useTheme();
  const styles = useStyles(createStyles);
  const { pick } = useImagePicker();
  const people = useUserList();
  const group = useCreateGroup();
  const [showImagePicker, setShowImagePicker] = useState(false);

  const pickImage = async (option: MediaPickerOption) => {
    setShowImagePicker(false);
    if (option !== 'camera_photo' && option !== 'gallery_photo') return;
    const picked = await pick(option);
    if (picked?.path) group.setImage({ uri: picked.path, fileName: picked.filename, mimeType: picked.mime });
  };

  const create = async () => {
    const conversation = await group.create();
    if (conversation) navigation.replace('ChatRoom', { conversationId: conversation.id, title: conversation.title, avatar: conversation.avatar, isGroup: true });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setShowImagePicker(true)} accessibilityRole="button" accessibilityLabel={translate('common', 'changeGroupImage')}>
          {group.image ? (
            <Image source={{ uri: group.image.uri }} style={styles.image} />
          ) : (
            <View style={[styles.image, styles.imagePlaceholder]}>
              <AppIcon name="camera-plus-outline" size={26} tintColor={theme.colors.textSecondary} />
            </View>
          )}
        </TouchableOpacity>
        <TextInput
          value={group.title}
          onChangeText={group.setTitle}
          placeholder={translate('common', 'groupName')}
          placeholderTextColor={theme.colors.placeholder}
          maxLength={120}
          style={styles.title}
        />
      </View>

      <TextInput
        value={people.search}
        onChangeText={people.setSearch}
        placeholder={translate('common', 'searchUsers')}
        placeholderTextColor={theme.colors.placeholder}
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.search}
      />

      <FlatList
        data={people.users}
        keyExtractor={item => item.id}
        keyboardShouldPersistTaps="handled"
        onEndReached={people.loadMore}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={people.loading ? <ActivityIndicator style={styles.spinner} /> : <AppText style={styles.spinner} color="textSecondary" align="center" intlType="common" value="noUsers" />}
        ListFooterComponent={people.loadingMore ? <ActivityIndicator style={styles.spinner} /> : undefined}
        renderItem={({ item }) => {
          const selected = group.memberIds.includes(item.id);
          return (
            <UserRow
              name={item.name}
              avatar={item.avatar}
              onPress={() => group.toggleMember(item.id)}
              trailing={<AppIcon name={selected ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'} size={24} tintColor={selected ? theme.colors.primary : theme.colors.textSecondary} />}
            />
          );
        }}
      />

      <View style={styles.footer}>
        {!group.memberIds.length ? <AppText fontSize="size12" color="textSecondary" align="center" intlType="common" value="selectMembers" /> : null}
        <AppButton intlType="common" value="create" loading={group.creating} disabled={!group.canCreate} onPress={create} />
      </View>

      <MediaPickerModal
        visible={showImagePicker}
        title={translate('common', 'changeGroupImage')}
        options={['camera_photo', 'gallery_photo']}
        onSelect={pickImage}
        onClose={() => setShowImagePicker(false)}
      />
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    header: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.spacing12, padding: theme.spacing.spacing16 },
    image: { width: 64, height: 64, borderRadius: 32 },
    imagePlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border },
    title: {
      flex: 1,
      minHeight: theme.spacing.spacing48,
      borderBottomWidth: theme.spacing.spacing1,
      borderBottomColor: theme.colors.primary,
      color: theme.colors.text,
      fontFamily: theme.typography.fontFamily.medium,
      fontSize: theme.typography.fontSize.size16,
    },
    search: {
      marginHorizontal: theme.spacing.spacing16,
      marginBottom: theme.spacing.spacing8,
      paddingHorizontal: theme.spacing.spacing12,
      minHeight: theme.spacing.spacing40,
      borderRadius: theme.borderRadius.radius8,
      borderWidth: theme.spacing.spacing1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      color: theme.colors.text,
    },
    spinner: { marginVertical: theme.spacing.spacing16 },
    footer: { gap: theme.spacing.spacing8, padding: theme.spacing.spacing16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border },
  });
