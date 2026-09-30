import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Modal, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { AppButton } from '{{IMPORT:components.AppButton}}';
{{#if VECTOR_ICONS}}
import { AppIcon } from '{{IMPORT:components.AppIcon}}';
{{/if}}
import { AppLoader } from '{{IMPORT:components.AppLoader}}';
import { AppText } from '{{IMPORT:components.AppText}}';
import { MediaPickerModal, type MediaPickerOption } from '{{IMPORT:components.MediaPickerModal}}';
import { useAuthSession } from '{{IMPORT:hooks.useAuthSession}}';
{{#if RTL}}
import { useDirection } from '{{IMPORT:hooks.useDirection}}';
{{/if}}
import { useImagePicker } from '{{IMPORT:hooks.useImagePicker}}';
import { useStyles, useTheme } from '{{IMPORT:hooks.useTheme}}';
import { translate } from '{{IMPORT:i18n.index}}';
import type { MainStackParamList } from '{{IMPORT:navigation.types}}';
import type { Theme } from '{{IMPORT:theme.index}}';
import type { ChatParticipant } from '{{IMPORT:chat.types}}';
import { ChatActions } from '../../components/ChatActions/ChatActions';
import { UserRow } from '../../components/UserRow/UserRow';
import { useGroupInfo } from '../../hooks/useGroupInfo';
import { useUserList } from '../../hooks/useUserList';

interface AddMembersSheetProps {
  visible: boolean;
  /** Already in the group – not offered again. */
  memberIds: string[];
  onClose: () => void;
  onAdd: (userIds: string[]) => void;
}

/** Pick people to add to the group (admins). */
function AddMembersSheet({ visible, memberIds, onClose, onAdd }: AddMembersSheetProps): React.JSX.Element {
  const styles = useStyles(createStyles);
  const { theme } = useTheme();
{{#if RTL}}
  // A Modal is its own native root – it needs the app's direction explicitly.
  const { directionStyle } = useDirection();
{{/if}}
  const people = useUserList();
  const [selected, setSelected] = useState<string[]>([]);
  const toggle = (id: string) => setSelected(ids => (ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]));

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={ {{#if RTL}}[styles.sheet, directionStyle]{{else}}styles.sheet{{/if}} }>
        <View style={styles.sheetHeader}>
          <TouchableOpacity onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel={translate('common', 'close')} style={styles.close}>
{{#if VECTOR_ICONS}}
            <AppIcon name="close" size={24} tintColor={theme.colors.text} />
{{else}}
            <AppText fontSize="size20" text="✕" />
{{/if}}
          </TouchableOpacity>
          <AppText fontFamily="semiBold" fontSize="size16" numberOfLines={1} style={styles.sheetTitle} intlType="common" value="addMembers" />
          <AppButton
            size="small"
            fullWidth={false}
            intlType="common"
            value="add"
            disabled={!selected.length}
            onPress={() => {
              onAdd(selected);
              setSelected([]);
            }}
          />
        </View>
        <TextInput
          value={people.search}
          onChangeText={people.setSearch}
          placeholder={translate('common', 'searchUsers')}
          placeholderTextColor={theme.colors.placeholder}
          autoCapitalize="none"
          style={styles.search}
        />
        <FlatList
          data={people.users.filter(u => !memberIds.includes(u.id))}
          keyExtractor={item => item.id}
          onEndReached={people.loadMore}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={people.loading ? <ActivityIndicator style={styles.spacer} /> : undefined}
          renderItem={({ item }) => (
            <UserRow
              name={item.name}
              avatar={item.avatar}
              onPress={() => toggle(item.id)}
              trailing={<AppText color={selected.includes(item.id) ? 'primary' : 'textSecondary'} text={selected.includes(item.id) ? '●' : '○'} />}
            />
          )}
        />
      </View>
    </Modal>
  );
}

/** Group name, image, members and admins. Admins manage them; everybody can leave. */
export function GroupInfoScreen(): React.JSX.Element {
  const route = useRoute<RouteProp<MainStackParamList, 'GroupInfo'>>();
  const navigation = useNavigation();
  const styles = useStyles(createStyles);
  const { theme } = useTheme();
  const { user } = useAuthSession();
  const { pick } = useImagePicker();
  const info = useGroupInfo(route.params.conversationId);
  const [title, setTitle] = useState('');
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [addingMembers, setAddingMembers] = useState(false);

  useEffect(() => setTitle(info.group?.title ?? ''), [info.group?.title]);

  // Left / removed: back to the chat list.
  useEffect(() => {
    if (info.removed) navigation.goBack();
  }, [info.removed, navigation]);

  if (info.loading || !info.group) return <AppLoader fullScreen />;
  const { group, isAdmin } = info;

  const pickImage = async (option: MediaPickerOption) => {
    setShowImagePicker(false);
    if (option !== 'camera_photo' && option !== 'gallery_photo') return;
    const picked = await pick(option);
    if (picked?.path) await info.changeImage({ uri: picked.path, fileName: picked.filename, mimeType: picked.mime });
  };

  /** Admins: what to do with a member. */
  const manageMember = (member: ChatParticipant) =>
    Alert.alert(member.name, undefined, [
      member.role === 'admin'
        ? { text: translate('common', 'removeAdmin'), onPress: () => info.setRole(member.id, 'member') }
        : { text: translate('common', 'makeAdmin'), onPress: () => info.setRole(member.id, 'admin') },
      { text: translate('common', 'removeMember'), style: 'destructive', onPress: () => info.removeMember(member.id) },
      { text: translate('common', 'cancel'), style: 'cancel' },
    ]);

  const leave = () =>
    Alert.alert(translate('common', 'leaveGroup'), translate('common', 'leaveGroupConfirm'), [
      { text: translate('common', 'cancel'), style: 'cancel' },
      {
        text: translate('common', 'leaveGroup'),
        style: 'destructive',
        onPress: async () => {
          if (await info.leave()) navigation.goBack();
        },
      },
    ]);

  const roleLabel = (role?: string) => (role === 'admin' ? translate('common', 'admin') : undefined);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <TouchableOpacity disabled={!isAdmin || info.busy === 'image'} onPress={() => setShowImagePicker(true)} accessibilityRole="button" accessibilityLabel={translate('common', 'changeGroupImage')}>
          {group.avatar ? (
            <Image source={{ uri: group.avatar }} style={styles.image} />
          ) : (
            <View style={[styles.image, styles.initials]}>
              <AppText fontFamily="bold" fontSize="size32" color="onPrimary" text={group.title.charAt(0).toUpperCase()} />
            </View>
          )}
          {info.busy === 'image' ? <ActivityIndicator style={StyleSheet.absoluteFill} color="#FFFFFF" /> : null}
        </TouchableOpacity>

        {isAdmin ? (
          <View style={styles.titleRow}>
            <TextInput value={title} onChangeText={setTitle} maxLength={120} style={styles.titleInput} placeholder={translate('common', 'groupName')} placeholderTextColor={theme.colors.placeholder} />
            {title.trim() && title.trim() !== group.title ? <AppButton intlType="common" value="save" loading={info.busy === 'title'} onPress={() => info.rename(title.trim())} /> : null}
          </View>
        ) : (
          <AppText fontFamily="bold" fontSize="size20" align="center" text={group.title} />
        )}
        <AppText color="textSecondary" text={translate('common', 'membersCount', { value1: group.participants.length + 1 })} />
      </View>

      <View style={styles.sectionHeader}>
        <AppText fontFamily="semiBold" color="textSecondary" intlType="common" value="members" style={styles.upper} />
        {isAdmin ? (
          <TouchableOpacity onPress={() => setAddingMembers(true)} accessibilityRole="button">
            <AppText color="primary" fontFamily="semiBold" intlType="common" value="addMembers" />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.card}>
        <UserRow name={`${user?.name ?? ''} (${translate('common', 'you')})`} avatar={user?.avatar} subtitle={roleLabel(group.myRole)} />
        {group.participants.map(member => (
          <UserRow
            key={member.id}
            name={member.name}
            avatar={member.avatar}
            subtitle={[roleLabel(member.role), member.isOnline ? translate('common', 'online') : undefined].filter(Boolean).join(' · ') || undefined}
            onPress={isAdmin ? () => manageMember(member) : undefined}
            trailing={info.busy === member.id ? <ActivityIndicator /> : null}
          />
        ))}
      </View>

      {/* Clear chat / Clear all chats – for you only (a group is left, not deleted). */}
      <View style={styles.actions}>
        <ChatActions conversationId={group.id} />
      </View>

      <AppButton
        variant="danger"
{{#if VECTOR_ICONS}}
        icon="exit-to-app"
{{/if}}
        intlType="common"
        value="leaveGroup"
        loading={info.busy === 'leave'}
        onPress={leave}
        style={styles.leave}
      />

      <MediaPickerModal visible={showImagePicker} title={translate('common', 'changeGroupImage')} options={['camera_photo', 'gallery_photo']} onSelect={pickImage} onClose={() => setShowImagePicker(false)} />
      <AddMembersSheet
        visible={addingMembers}
        memberIds={group.participants.map(p => p.id)}
        onClose={() => setAddingMembers(false)}
        onAdd={async userIds => {
          setAddingMembers(false);
          await info.addMembers(userIds);
        }}
      />
    </ScrollView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    content: { paddingBottom: theme.spacing.spacing32 },
    header: { alignItems: 'center', gap: theme.spacing.spacing8, padding: theme.spacing.spacing24 },
    image: { width: 104, height: 104, borderRadius: 52, backgroundColor: theme.colors.primary },
    initials: { alignItems: 'center', justifyContent: 'center' },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.spacing8, alignSelf: 'stretch' },
    titleInput: {
      flex: 1,
      minHeight: theme.spacing.spacing48,
      textAlign: 'center',
      borderBottomWidth: theme.spacing.spacing1,
      borderBottomColor: theme.colors.border,
      color: theme.colors.text,
      fontSize: theme.typography.fontSize.size18,
      fontFamily: theme.typography.fontFamily.semiBold,
    },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: theme.spacing.spacing16, paddingBottom: theme.spacing.spacing8 },
    upper: { textTransform: 'uppercase' },
    card: { backgroundColor: theme.colors.surface, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border },
    leave: { margin: theme.spacing.spacing16 },
    sheet: { flex: 1, backgroundColor: theme.colors.background },
    sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.spacing12, paddingHorizontal: theme.spacing.spacing16, paddingVertical: theme.spacing.spacing12 },
    close: { padding: theme.spacing.spacing4 },
    sheetTitle: { flex: 1 },
    actions: { marginTop: theme.spacing.spacing24 },
    search: {
      marginHorizontal: theme.spacing.spacing16,
      marginBottom: theme.spacing.spacing8,
      paddingHorizontal: theme.spacing.spacing12,
      minHeight: theme.spacing.spacing40,
      borderRadius: theme.borderRadius.radius8,
      borderWidth: theme.spacing.spacing1,
      borderColor: theme.colors.border,
      color: theme.colors.text,
    },
    spacer: { marginVertical: theme.spacing.spacing16 },
  });
