import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { errorCodes, isErrorWithCode, pick as pickDocument, types } from '@react-native-documents/picker';
import { AppIcon } from '@presentation/components/AppIcon';
import { AppText } from '@presentation/components/AppText';
import { MediaEditorModal, type MediaItem } from '@presentation/components/MediaEditorModal';
import { MediaPickerModal, type MediaPickerOption } from '@presentation/components/MediaPickerModal';
import { useDirection } from '@presentation/hooks/useDirection';
import { useImagePicker } from '@presentation/hooks/useImagePicker';
import { useStyles, useTheme } from '@presentation/hooks/useTheme';
import { translate } from '@infrastructure/i18n';
import { permissionService } from '@infrastructure/permissions/permissionService';
import type { Theme } from '@presentation/theme';
import { flash } from '@utils/flashMessage';
import type { ChatMessage } from '@features/chat/types/chat';
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
        <AppIcon name="close" size={20} tintColor={theme.colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );
}

/** The message composer: text, camera, attachments (photo, video, file) and voice messages. */
export function ChatInputBar({ onSend, onTyping, replyTo, onCancelReply }: ChatInputBarProps): React.JSX.Element {
  const styles = useStyles(createStyles);
  const { theme } = useTheme();
  const { pick } = useImagePicker();
  const { direction } = useDirection();
  const [text, setText] = useState('');
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [editingMedia, setEditingMedia] = useState<MediaItem | null>(null);
  /** Seconds recorded, or null when not recording. */
  const [recordingSeconds, setRecordingSeconds] = useState<number | null>(null);
  const [stoppingRecording, setStoppingRecording] = useState(false);

  const sendText = () => {
    const value = text.trim();
    if (!value) return;
    onSend({ type: 'text', text: value });
    setText('');
  };

  // ── photos / videos (edited in MediaEditorModal first) ───────────────────────
  const pickMedia = async (option: Exclude<MediaPickerOption, 'document'>) => {
    const picked = await pick(option);
    if (!picked?.path) return;
    const isVideo = option === 'camera_video' || option === 'gallery_video';
    setEditingMedia({
      uri: picked.path,
      type: isVideo ? 'video' : 'image',
      fileName: picked.filename,
      fileSize: picked.size ? humanSize(picked.size) : undefined,
      duration: picked.duration,
    });
  };

  const sendEditedMedia = (media: MediaItem) => {
    setEditingMedia(null);
    onSend({
      type: media.type,
      mediaUrl: media.uri,
      fileName: media.fileName,
      fileSize: media.fileSize,
      ...(media.type === 'video' ? { duration: media.duration } : { crop: media.crop }),
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
          <AppIcon name="delete-outline" size={24} tintColor={theme.colors.error} />
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
            <AppIcon name="send" size={20} tintColor="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View>
      {replyTo ? <ReplyBar message={replyTo} onCancel={onCancelReply} /> : null}
    <View style={styles.container}>
      <TouchableOpacity style={styles.actionBtn} onPress={() => setShowAttachMenu(true)} accessibilityRole="button" accessibilityLabel="Attach">
        <AppIcon name="plus" size={24} tintColor={theme.colors.textSecondary} />
      </TouchableOpacity>

      <TextInput
        style={ [styles.input, { writingDirection: direction }] }
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
          <AppIcon name="send" size={20} tintColor="#FFFFFF" />
        </TouchableOpacity>
      ) : (
        <>
          <TouchableOpacity style={styles.actionBtn} onPress={() => pickMedia('camera_photo')} accessibilityRole="button" accessibilityLabel="Camera">
            <AppIcon name="camera-outline" size={24} tintColor={theme.colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={startRecording} accessibilityRole="button" accessibilityLabel="Record a voice message">
            <AppIcon name="microphone-outline" size={24} tintColor={theme.colors.textSecondary} />
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
