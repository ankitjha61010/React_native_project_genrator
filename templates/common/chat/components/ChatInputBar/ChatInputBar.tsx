import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  I18nManager,
} from 'react-native';
{{#if VECTOR_ICONS}}
import { AppIcon } from '{{IMPORT:components.AppIcon}}';
{{else}}
import { AppText } from '{{IMPORT:components.AppText}}';
{{/if}}
import { useStyles } from '{{IMPORT:hooks.useTheme}}';
import type { Theme } from '{{IMPORT:theme.index}}';
import { MediaPickerModal, type MediaPickerOption } from '{{IMPORT:components.MediaPickerModal}}';
import { useImagePicker } from '{{IMPORT:hooks.useImagePicker}}';
import type { ChatMessage } from '{{IMPORT:chat.types}}';
import { MediaEditorModal, type MediaItem } from '{{IMPORT:components.MediaEditorModal}}';

export interface ChatInputBarProps {
  onSendMessage: (msg: Partial<ChatMessage>) => void;
  onTyping?: () => void;
}

export function ChatInputBar({ onSendMessage, onTyping }: ChatInputBarProps): React.JSX.Element {
  const styles = useStyles(createStyles);
  const [text, setText] = useState('');
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [editingMedia, setEditingMedia] = useState<MediaItem | null>(null);

  const { pick } = useImagePicker();

  const handleSend = () => {
    if (!text.trim()) return;
    onSendMessage({
      type: 'text',
      text: text.trim(),
    });
    setText('');
  };

  const handleCameraCapture = async () => {
    const res = await pick('camera_photo');
    if (res?.path) {
      setEditingMedia({
        uri: res.path,
        type: 'image',
        fileName: res.filename,
        fileSize: res.size ? `${(res.size / 1024 / 1024).toFixed(1)} MB` : undefined,
      });
    }
  };

  const handleMediaOption = async (option: MediaPickerOption) => {
    setShowAttachMenu(false);
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
    } else if (option === 'camera_video') {
      const res = await pick('camera_video');
      if (res?.path) {
        setEditingMedia({
          uri: res.path,
          type: 'video',
          fileName: res.filename,
          duration: res.duration || 15,
        });
      }
    } else if (option === 'gallery_video') {
      const res = await pick('gallery_video');
      if (res?.path) {
        setEditingMedia({
          uri: res.path,
          type: 'video',
          fileName: res.filename,
          duration: res.duration || 15,
        });
      }
    } else if (option === 'document') {
      onSendMessage({
        type: 'document',
        fileName: 'Project_Specification.pdf',
        fileSize: '1.8 MB',
        mediaUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      });
    }
  };

  const handleSendEditedMedia = (media: MediaItem) => {
    if (media.type === 'image') {
      onSendMessage({
        type: 'image',
        text: media.fileName || 'Photo attachment',
        mediaUrl: media.uri,
        crop: media.crop,
      });
    } else if (media.type === 'video') {
      onSendMessage({
        type: 'video',
        text: media.fileName || 'Video attachment',
        mediaUrl: media.uri,
        thumbnailUrl: 'https://images.unsplash.com/photo-1536240478700-b869070f9279?w=600',
        duration: media.duration,
      });
    }
  };

  const handleVoiceRecord = () => {
    if (isRecording) {
      setIsRecording(false);
      onSendMessage({
        type: 'audio',
        mediaUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
        duration: 12,
      });
    } else {
      setIsRecording(true);
      Alert.alert('Recording Voice Note', 'Tap the mic again to send simulated voice audio.');
    }
  };

  return (
    <View style={styles.container}>
      {/* 📷 Direct Camera Capture Button on Left */}
      <TouchableOpacity
        style={styles.actionBtn}
        onPress={handleCameraCapture}
        accessibilityLabel="Camera">
{{#if VECTOR_ICONS}}
        <AppIcon name="camera" size={22} tintColor="#666666" />
{{else}}
        <AppText style={{ fontSize: 18 }}>📷</AppText>
{{/if}}
      </TouchableOpacity>

      {/* Attachment Menu Button */}
      <TouchableOpacity
        style={styles.actionBtn}
        onPress={() => setShowAttachMenu(true)}
        accessibilityLabel="Attach media">
{{#if VECTOR_ICONS}}
        <AppIcon name="paperclip" size={22} tintColor="#666666" />
{{else}}
        <AppText style={{ fontSize: 18 }}>📎</AppText>
{{/if}}
      </TouchableOpacity>

      {/* Input Field */}
      <TextInput
        style={styles.input}
        placeholder="Type a message…"
        placeholderTextColor="#888888"
        value={text}
        onChangeText={val => {
          setText(val);
          onTyping?.();
        }}
        multiline
        // RTL: cursor and text flow from the correct side
        textAlign={I18nManager.isRTL ? 'right' : 'left'}
        writingDirection={I18nManager.isRTL ? 'rtl' : 'ltr'}
      />

      {/* Action Button: Send or Mic */}
      {text.trim().length > 0 ? (
        <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
{{#if VECTOR_ICONS}}
          <AppIcon name="send" size={20} tintColor="#FFFFFF" />
{{else}}
          <AppText style={{ color: '#FFFFFF', fontSize: 16 }}>➤</AppText>
{{/if}}
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.micBtn, isRecording && styles.micBtnActive]}
          onPress={handleVoiceRecord}>
{{#if VECTOR_ICONS}}
          <AppIcon name="microphone" size={22} tintColor={isRecording ? '#FFFFFF' : '#666666'} />
{{else}}
          <AppText style={{ fontSize: 18 }}>{isRecording ? '🔴' : '🎙️'}</AppText>
{{/if}}
        </TouchableOpacity>
      )}

      {/* Reusable Attachment Modal */}
      <MediaPickerModal
        visible={showAttachMenu}
        title="Share Content"
        options={['camera_photo', 'gallery_photo', 'camera_video', 'gallery_video', 'document']}
        onSelect={handleMediaOption}
        onClose={() => setShowAttachMenu(false)}
      />

      {/* Reusable Media Editor (Trimming video, Cropping & rotating photo) */}
      <MediaEditorModal
        visible={Boolean(editingMedia)}
        media={editingMedia}
        onClose={() => setEditingMedia(null)}
        onSend={handleSendEditedMedia}
      />
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      paddingHorizontal: 8,
      paddingVertical: 6,
      backgroundColor: theme.colors.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
      gap: 4,
    },
    actionBtn: {
      padding: 8,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 2,
    },
    input: {
      flex: 1,
      minHeight: 40,
      maxHeight: 100,
      backgroundColor: theme.colors.background,
      borderRadius: 20,
      paddingHorizontal: 14,
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
    micBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    micBtnActive: {
      backgroundColor: '#E53935',
    },
  });
