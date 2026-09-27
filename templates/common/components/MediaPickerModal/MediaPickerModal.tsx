import React from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  TouchableWithoutFeedback,
} from 'react-native';
import { AppText } from '{{IMPORT:components.AppText}}';
{{#if VECTOR_ICONS}}
import { AppIcon, type AppIconName } from '{{IMPORT:components.AppIcon}}';
{{/if}}
import { useStyles } from '{{IMPORT:hooks.useTheme}}';
import type { Theme } from '{{IMPORT:theme.index}}';

export type MediaPickerOption = 'camera_photo' | 'gallery_photo' | 'camera_video' | 'gallery_video' | 'document';

export interface MediaPickerOptionConfig {
  key: MediaPickerOption;
  label: string;
{{#if VECTOR_ICONS}}
  icon: AppIconName;
{{else}}
  icon: string;
{{/if}}
  emoji: string;
  color: string;
}

export interface MediaPickerModalProps {
  visible: boolean;
  title?: string;
  options?: MediaPickerOption[];
  onSelect: (option: MediaPickerOption) => void;
  onClose: () => void;
}

const DEFAULT_OPTIONS_CONFIG: Record<MediaPickerOption, MediaPickerOptionConfig> = {
  camera_photo: {
    key: 'camera_photo',
    label: 'Camera',
    icon: 'camera',
    emoji: '📷',
    color: '#00897B',
  },
  gallery_photo: {
    key: 'gallery_photo',
    label: 'Gallery',
    icon: 'image',
    emoji: '🖼️',
    color: '#7B1FA2',
  },
  camera_video: {
    key: 'camera_video',
    label: 'Record Video',
    icon: 'video',
    emoji: '🎥',
    color: '#E53935',
  },
  gallery_video: {
    key: 'gallery_video',
    label: 'Video Library',
    icon: 'video-outline',
    emoji: '🎬',
    color: '#FF6F00',
  },
  document: {
    key: 'document',
    label: 'Document',
    icon: 'file-document',
    emoji: '📄',
    color: '#1E88E5',
  },
};

export function MediaPickerModal({
  visible,
  title = 'Choose Source',
  options = ['camera_photo', 'gallery_photo'],
  onSelect,
  onClose,
}: MediaPickerModalProps): React.JSX.Element {
  const styles = useStyles(createStyles);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <SafeAreaView style={styles.sheet}>
              <View style={styles.handle} />
              <AppText style={styles.title}>{title}</AppText>

              <View style={styles.grid}>
                {options.map(optKey => {
                  const cfg = DEFAULT_OPTIONS_CONFIG[optKey];
                  if (!cfg) return null;
                  return (
                    <TouchableOpacity
                      key={cfg.key}
                      style={styles.gridItem}
                      activeOpacity={0.7}
                      onPress={() => {
                        onClose();
                        onSelect(cfg.key);
                      }}>
                      <View style={[styles.iconCircle, { backgroundColor: cfg.color }]}>
{{#if VECTOR_ICONS}}
                        <AppIcon name={cfg.icon} size={26} tintColor="#FFFFFF" />
{{else}}
                        <AppText style={styles.emoji}>{cfg.emoji}</AppText>
{{/if}}
                      </View>
                      <AppText style={styles.label}>{cfg.label}</AppText>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.7}>
                <AppText style={styles.cancelText}>Cancel</AppText>
              </TouchableOpacity>
            </SafeAreaView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: '#00000077',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 24,
      alignItems: 'center',
    },
    handle: {
      width: 36,
      height: 4,
      backgroundColor: theme.colors.border,
      borderRadius: 2,
      marginBottom: 16,
    },
    title: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 20,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-around',
      width: '100%',
      gap: 16,
      marginBottom: 20,
    },
    gridItem: {
      alignItems: 'center',
      minWidth: 70,
      gap: 8,
    },
    iconCircle: {
      width: 58,
      height: 58,
      borderRadius: 29,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 3,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
    },
    emoji: {
      fontSize: 24,
    },
    label: {
      fontSize: 12,
      fontWeight: '500',
      color: theme.colors.text,
    },
    cancelBtn: {
      width: '100%',
      paddingVertical: 14,
      borderRadius: 14,
      backgroundColor: theme.colors.background,
      alignItems: 'center',
      marginTop: 4,
    },
    cancelText: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.textSecondary,
    },
  });
