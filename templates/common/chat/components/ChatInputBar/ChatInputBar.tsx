import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, {{#if !RTL}}I18nManager, {{/if}}StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { errorCodes, isErrorWithCode, pick as pickDocument, types } from '@react-native-documents/picker';
{{#if VECTOR_ICONS}}
import { AppIcon } from '{{IMPORT:components.AppIcon}}';
{{/if}}
import { AppText } from '{{IMPORT:components.AppText}}';
import { MediaEditorModal, type MediaItem } from '{{IMPORT:components.MediaEditorModal}}';
import { MediaPickerModal, type MediaPickerOption } from '{{IMPORT:components.MediaPickerModal}}';
{{#if RTL}}
import { useDirection } from '{{IMPORT:hooks.useDirection}}';
{{/if}}
import { useImagePicker } from '{{IMPORT:hooks.useImagePicker}}';
import { useStyles, useTheme } from '{{IMPORT:hooks.useTheme}}';
import { translate } from '{{IMPORT:i18n.index}}';
import { permissionService } from '{{IMPORT:permissions.service}}';
import type { Theme } from '{{IMPORT:theme.index}}';
import { flash } from '{{IMPORT:utils.flashMessage}}';
import type { ChatMessage } from '{{IMPORT:chat.types}}';
import type { MessageDraft } from '../../services/chatService';
import { messagePreview } from '../../utils/chatFormat';
import { voiceService } from '../../services/voiceService';
import { formatDuration } from '../AudioMessage/AudioMessage';

/** 2_516_582 → "2.4 MB". */
const humanSize = (bytes: number) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`);

export interface ChatInputBarProps {
  /** Text, or a local file (photo / video / document / voice note) – the room uploads it. */
  onSend: (draft: MessageDraft) => void;
  onTyping?: () => void;
  /** The message being replied to – shown above the input; the next message quotes it. */
  replyTo?: ChatMessage | null;
  onCancelReply?: () => void;
  /** The message being edited */
  editingMessage?: ChatMessage | null;
  onCancelEdit?: () => void;
  onEdit?: (messageId: string, text: string) => void;
}

/** "Editing Rahul's message..." above the input, with ✕ to cancel. */
function EditBar({ message, onCancel }: { message: ChatMessage; onCancel?: () => void }): React.JSX.Element {
  const styles = useStyles(createStyles);
  const { theme } = useTheme();
  return (
    <View style={styles.replyBar}>
      <View style={styles.replyText}>
        <AppText fontSize="size12" fontFamily="semiBold" color="primary" numberOfLines={1} text={translate('common', 'editMessage')} />
        <AppText fontSize="size12" color="textSecondary" numberOfLines={1} text={message.text ?? ''} />
      </View>
      <TouchableOpacity onPress={onCancel} hitSlop={10} accessibilityRole="button" accessibilityLabel={translate('common', 'cancel')}>
{{#if VECTOR_ICONS}}
        <AppIcon name="close" size={20} tintColor={theme.colors.textSecondary} />
{{else}}
        <AppText color="textSecondary" text="✕" />
{{/if}}
      </TouchableOpacity>
    </View>
  );
}

/** "Replying to Rahul · Hey, are you available today?" above the input, with ✕ to cancel. */
function ReplyBar({ message, onCancel }: { message: ChatMessage; onCancel?: () => void }): React.JSX.Element {
  const styles = useStyles(createStyles);
  const { theme } = useTheme();
  return (
    <View style={styles.replyBar}>
      <View style={styles.replyText}>
        <AppText fontSize="size12" fontFamily="semiBold" color="primary" numberOfLines={1} text={translate('common', 'replyingTo', { value1: message.isMe ? translate('common', 'you') : message.senderName })} />
        <AppText fontSize="size12" color="textSecondary" numberOfLines={1} text={messagePreview(message, undefined)} />
      </View>
      <TouchableOpacity onPress={onCancel} hitSlop={10} accessibilityRole="button" accessibilityLabel={translate('common', 'cancel')}>
{{#if VECTOR_ICONS}}
        <AppIcon name="close" size={20} tintColor={theme.colors.textSecondary} />
{{else}}
        <AppText color="textSecondary" text="✕" />
{{/if}}
      </TouchableOpacity>
    </View>
  );
}

/** The message composer: text, camera, attachments (photo, video, file) and voice messages. */
export function ChatInputBar({ onSend, onTyping, replyTo, onCancelReply, editingMessage, onCancelEdit, onEdit }: ChatInputBarProps): React.JSX.Element {
  const styles = useStyles(createStyles);
  const { theme } = useTheme();
  const { pick } = useImagePicker();
{{#if RTL}}
  const { direction } = useDirection();
{{/if}}
  const [text, setText] = useState('');
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [editingMedia, setEditingMedia] = useState<MediaItem | null>(null);
  /** Seconds recorded, or null when not recording. */
  const [recordingSeconds, setRecordingSeconds] = useState<number | null>(null);
  const [stoppingRecording, setStoppingRecording] = useState(false);

  useEffect(() => {
    if (editingMessage) {
      setText(editingMessage.text ?? '');
    }
  }, [editingMessage]);

  const sendText = () => {
    const value = text.trim();
    if (!value) return;
    if (editingMessage && onEdit) {
      onEdit(editingMessage.id, value);
      setText('');
      onCancelEdit?.();
      return;
    }
    onSend({ type: 'text', text: value, replyToId: replyTo?.id });
    setText('');
    onCancelReply?.();
  };

  // ── photos / videos (edited in MediaEditorModal first) ───────────────────────
  const pickMedia = async (option: Exclude<MediaPickerOption, 'document'>) => {
    const isVideo = option === 'camera_video' || option === 'gallery_video';
    // Chat videos are recorded at medium quality (iPhone: ~1 MB per 10 s instead of 10–20 MB) so they stay under the
    // server's upload limit (UPLOAD_MAX_MB). Android's camera only knows low / high – it keeps high.
    const picked = await pick(option, option === 'camera_video' ? { videoQuality: 'medium', durationLimit: 60 } : undefined);
    if (!picked?.path) return;
    const fallbackExt = isVideo ? '.mp4' : '.jpg';
    let safeName = picked.filename || picked.path.split('/').pop() || (isVideo ? 'video' : 'photo');
    if (!/\.[a-z0-9]{2,6}$/i.test(safeName)) {
      safeName = `${safeName}${fallbackExt}`;
    }
    setEditingMedia({
      uri: picked.path,
      type: isVideo ? 'video' : 'image',
      fileName: safeName,
      fileSize: picked.size ? humanSize(picked.size) : undefined,
      duration: picked.duration,
    });
  };

  const sendEditedMedia = (media: MediaItem) => {
    setEditingMedia(null);
    const isVideo = media.type === 'video';
    const fallbackExt = isVideo ? '.mp4' : '.jpg';
    let safeName = media.fileName || (isVideo ? `video_${Date.now()}.mp4` : `photo_${Date.now()}.jpg`);
    if (!/\.[a-z0-9]{2,6}$/i.test(safeName)) {
      safeName = `${safeName}${fallbackExt}`;
    }
    onSend({
      type: media.type,
      mediaUrl: media.uri,
      fileName: safeName,
      fileSize: media.fileSize,
      mimeType: isVideo ? 'video/mp4' : 'image/jpeg',
      ...(isVideo ? { duration: media.duration } : { crop: media.crop }),
    });
  };

  // ── files ─────────────────────────────────────────────────────────────────────
  const sendDocument = async () => {
    try {
      const [file] = await pickDocument({ type: [types.allFiles] });
      if (!file) return;
      onSend({
        type: 'document',
        mediaUrl: file.uri,
        fileName: file.name ?? 'file',
        fileSize: file.size ? humanSize(file.size) : undefined,
        mimeType: file.type ?? undefined,
      });
    } catch (error) {
      // Closing the picker is not an error.
      if (!(isErrorWithCode(error) && error.code === errorCodes.OPERATION_CANCELED)) flash.error({ intlType: 'common', value: 'genericError' });
    }
  };

  const handleAttachment = (option: MediaPickerOption) => {
    setShowAttachMenu(false);
    if (option === 'document') sendDocument();
    else pickMedia(option);
  };

  // ── voice messages ────────────────────────────────────────────────────────────
  const startRecording = async () => {
    try {
      const started = await voiceService.startRecording(setRecordingSeconds);
      if (started) {
        setRecordingSeconds(0);
        return;
      }
      Alert.alert(translate('common', 'permissionDenied'), translate('common', 'microphonePermission'), [
        { text: translate('common', 'cancel'), style: 'cancel' },
        { text: translate('common', 'openSettings'), onPress: () => permissionService.openSettings() },
      ]);
    } catch {
      setRecordingSeconds(null);
      flash.error({ intlType: 'common', value: 'genericError' });
    }
  };

  const cancelRecording = async () => {
    setRecordingSeconds(null);
    await voiceService.cancelRecording();
  };

  const sendRecording = async () => {
    setStoppingRecording(true);
    try {
      const recording = await voiceService.stopRecording();
      if (recording) onSend({ type: 'audio', mediaUrl: recording.uri, fileName: recording.fileName, mimeType: recording.mimeType, duration: recording.duration });
    } catch {
      flash.error({ intlType: 'common', value: 'genericError' });
    } finally {
      setStoppingRecording(false);
      setRecordingSeconds(null);
    }
  };

  if (recordingSeconds !== null) {
    return (
      <View style={styles.container}>
        <TouchableOpacity style={styles.actionBtn} onPress={cancelRecording} accessibilityRole="button" accessibilityLabel={translate('common', 'cancel')}>
{{#if VECTOR_ICONS}}
          <AppIcon name="delete-outline" size={24} tintColor={theme.colors.error} />
{{else}}
          <AppText color="error" intlType="common" value="cancel" />
{{/if}}
        </TouchableOpacity>
        <View style={styles.recording}>
          <View style={styles.recordingDot} />
          <AppText fontFamily="medium" text={formatDuration(recordingSeconds)} />
          <AppText color="textSecondary" intlType="common" value="recording" />
        </View>
        <TouchableOpacity style={styles.sendBtn} onPress={sendRecording} disabled={stoppingRecording} accessibilityRole="button" accessibilityLabel="Send voice message">
          {stoppingRecording ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
{{#if VECTOR_ICONS}}
            <AppIcon name="send" size={20} tintColor="#FFFFFF" />
{{else}}
            <AppText color="onPrimary" text="➤" />
{{/if}}
          )}
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View>
      {editingMessage ? (
        <EditBar message={editingMessage} onCancel={onCancelEdit} />
      ) : replyTo ? (
        <ReplyBar message={replyTo} onCancel={onCancelReply} />
      ) : null}
      <View style={styles.container}>
      <TouchableOpacity style={styles.actionBtn} onPress={() => setShowAttachMenu(true)} accessibilityRole="button" accessibilityLabel="Attach">
{{#if VECTOR_ICONS}}
        <AppIcon name="plus" size={24} tintColor={theme.colors.textSecondary} />
{{else}}
        <AppText color="textSecondary" text="+" />
{{/if}}
      </TouchableOpacity>

      <TextInput
        style={ {{#if RTL}}[styles.input, { writingDirection: direction }]{{else}}styles.input{{/if}} }
        placeholder={translate('common', 'typeMessage')}
        placeholderTextColor={theme.colors.placeholder}
        value={text}
        onChangeText={value => {
          setText(value);
          onTyping?.();
        }}
        multiline
      />

      {text.trim() ? (
        <TouchableOpacity style={styles.sendBtn} onPress={sendText} accessibilityRole="button" accessibilityLabel="Send">
{{#if VECTOR_ICONS}}
          <AppIcon name="send" size={20} tintColor="#FFFFFF" />
{{else}}
          <AppText color="onPrimary" text="➤" />
{{/if}}
        </TouchableOpacity>
      ) : (
        <>
          <TouchableOpacity style={styles.actionBtn} onPress={() => pickMedia('camera_photo')} accessibilityRole="button" accessibilityLabel="Camera">
{{#if VECTOR_ICONS}}
            <AppIcon name="camera-outline" size={24} tintColor={theme.colors.textSecondary} />
{{else}}
            <AppText text="📷" />
{{/if}}
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={startRecording} accessibilityRole="button" accessibilityLabel="Record a voice message">
{{#if VECTOR_ICONS}}
            <AppIcon name="microphone-outline" size={24} tintColor={theme.colors.textSecondary} />
{{else}}
            <AppText text="🎤" />
{{/if}}
          </TouchableOpacity>
        </>
      )}

      <MediaPickerModal
        visible={showAttachMenu}
        title="Share"
        options={['camera_photo', 'gallery_photo', 'camera_video', 'gallery_video', 'document']}
        onSelect={handleAttachment}
        onClose={() => setShowAttachMenu(false)}
      />

      {/* Crop / rotate photos, trim videos before sending. */}
      <MediaEditorModal visible={Boolean(editingMedia)} media={editingMedia} onClose={() => setEditingMedia(null)} onSend={sendEditedMedia} />
    </View>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: theme.spacing.spacing4,
      paddingHorizontal: theme.spacing.spacing8,
      paddingVertical: theme.spacing.spacing6,
      backgroundColor: theme.colors.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
    },
    actionBtn: {
      height: 40,
      paddingHorizontal: theme.spacing.spacing6,
      justifyContent: 'center',
      alignItems: 'center',
    },
    input: {
      flex: 1,
      // Text and cursor start on the reading side (like AppInput – no textAlign).
{{#if !RTL}}
      writingDirection: I18nManager.getConstants().isRTL ? 'rtl' : 'ltr',
{{/if}}
      minHeight: 40,
      maxHeight: 110,
      backgroundColor: theme.colors.background,
      borderRadius: 20,
      paddingHorizontal: theme.spacing.spacing14,
      paddingTop: 10,
      paddingBottom: 10,
      color: theme.colors.text,
      fontSize: 15,
    },
    sendBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    recording: {
      flex: 1,
      height: 40,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.spacing8,
      paddingHorizontal: theme.spacing.spacing8,
    },
    replyBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.spacing8,
      paddingVertical: theme.spacing.spacing6,
      paddingHorizontal: theme.spacing.spacing12,
      marginHorizontal: theme.spacing.spacing8,
      marginTop: theme.spacing.spacing6,
      borderStartWidth: 3,
      borderStartColor: theme.colors.primary,
      borderRadius: theme.borderRadius.radius8,
      backgroundColor: theme.colors.background,
    },
    replyText: {
      flex: 1,
    },
    recordingDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: theme.colors.error,
    },
  });
