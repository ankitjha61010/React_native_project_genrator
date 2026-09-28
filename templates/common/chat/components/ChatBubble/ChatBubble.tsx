import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Image,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { AppText } from '{{IMPORT:components.AppText}}';
{{#if VECTOR_ICONS}}
import { AppIcon } from '{{IMPORT:components.AppIcon}}';
{{/if}}
import { useStyles } from '{{IMPORT:hooks.useTheme}}';
import type { Theme } from '{{IMPORT:theme.index}}';
import type { ChatMessage } from '{{IMPORT:chat.types}}';

export interface ChatBubbleProps {
  message: ChatMessage;
  onPressMedia?: (message: ChatMessage) => void;
}

export function ChatBubble({ message, onPressMedia }: ChatBubbleProps): React.JSX.Element {
  const styles = useStyles(createStyles);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const isMe = message.isMe;

  const timeFormatted = new Date(message.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const getImageDimensions = () => {
    if (!message.crop) {
      return { width: 240, height: 180 };
    }
    const { outputWidth, outputHeight, aspectRatio } = message.crop;
    const baseW = 240;
    // mediaUrl is already the cropped file — size the bubble by its real pixels.
    if (outputWidth && outputHeight) {
      const calculatedHeight = Math.max(100, Math.min(320, (baseW * outputHeight) / outputWidth));
      return { width: baseW, height: calculatedHeight };
    }
    if (aspectRatio === '1:1') return { width: baseW, height: baseW };
    if (aspectRatio === '4:5') return { width: baseW, height: baseW * 1.25 };
    if (aspectRatio === '16:9') return { width: baseW, height: (baseW * 9) / 16 };
    if (aspectRatio === '3:2') return { width: baseW, height: (baseW * 2) / 3 };
    return { width: 240, height: 180 };
  };

  const getFilterStyle = () => {
    if (!message.crop?.filter) return null;
    switch (message.crop.filter) {
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

  const imageDims = getImageDimensions();

  return (
    <View style={[styles.container, isMe ? styles.containerMe : styles.containerOther]}>
      <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
        {/* Media: Image */}
        {message.type === 'image' && message.mediaUrl && (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => onPressMedia?.(message)}
            style={[styles.mediaContainer, { width: imageDims.width, height: imageDims.height }]}>
            <Image
              source={{ uri: message.mediaUrl }}
              style={[
                styles.imageMedia,
                {
                  width: imageDims.width,
                  height: imageDims.height,
                  transform: message.crop?.rotation ? [{ rotate: `${message.crop.rotation}deg` }] : undefined,
                },
              ]}
              resizeMode="cover"
            />
            {getFilterStyle() && <View style={[StyleSheet.absoluteFill, getFilterStyle()]} />}
          </TouchableOpacity>
        )}

        {/* Media: Video */}
        {message.type === 'video' && (
          <TouchableOpacity activeOpacity={0.9} onPress={() => onPressMedia?.(message)} style={styles.mediaContainer}>
            <Image source={{ uri: message.thumbnailUrl || message.mediaUrl }} style={styles.imageMedia} resizeMode="cover" />
            <View style={styles.videoPlayOverlay}>
{{#if VECTOR_ICONS}}
              <AppIcon name="play-circle" size={40} tintColor="#FFFFFF" />
{{else}}
              <AppText style={styles.playIcon}>▶</AppText>
{{/if}}
              {Boolean(message.duration) && (
                <AppText style={styles.durationBadge}>{message.duration}s</AppText>
              )}
            </View>
          </TouchableOpacity>
        )}

        {/* Media: Audio / Voice Note Player */}
        {message.type === 'audio' && (
          <TouchableOpacity activeOpacity={0.85} onPress={() => onPressMedia?.(message)} style={styles.audioContainer}>
            <TouchableOpacity onPress={() => onPressMedia?.(message)} style={styles.audioPlayBtn}>
{{#if VECTOR_ICONS}}
              <AppIcon name={isPlayingAudio ? 'pause' : 'play'} size={24} tintColor={isMe ? '#FFFFFF' : '#25D366'} />
{{else}}
              <AppText style={styles.audioPlayIcon}>{isPlayingAudio ? '⏸' : '▶'}</AppText>
{{/if}}
            </TouchableOpacity>

            <View style={styles.waveformContainer}>
              <View style={[styles.waveformBar, { height: 12, backgroundColor: isMe ? '#FFFFFF99' : '#888888' }]} />
              <View style={[styles.waveformBar, { height: 20, backgroundColor: isMe ? '#FFFFFF99' : '#888888' }]} />
              <View style={[styles.waveformBar, { height: 16, backgroundColor: isMe ? '#FFFFFF99' : '#888888' }]} />
              <View style={[styles.waveformBar, { height: 26, backgroundColor: isMe ? '#FFFFFF' : '#25D366' }]} />
              <View style={[styles.waveformBar, { height: 18, backgroundColor: isMe ? '#FFFFFF99' : '#888888' }]} />
              <View style={[styles.waveformBar, { height: 22, backgroundColor: isMe ? '#FFFFFF99' : '#888888' }]} />
              <View style={[styles.waveformBar, { height: 14, backgroundColor: isMe ? '#FFFFFF99' : '#888888' }]} />
              <View style={[styles.waveformBar, { height: 8, backgroundColor: isMe ? '#FFFFFF99' : '#888888' }]} />
            </View>

            <AppText style={[styles.audioDurationText, isMe && styles.textMe]}>
              0:{message.duration ? (message.duration < 10 ? `0${message.duration}` : message.duration) : '15'}
            </AppText>
          </TouchableOpacity>
        )}

        {/* Media: Document */}
        {message.type === 'document' && (
          <Pressable onPress={() => onPressMedia?.(message)} style={styles.docContainer}>
            <View style={styles.docIconBox}>
{{#if VECTOR_ICONS}}
              <AppIcon name="file-document" size={28} tintColor="#FFFFFF" />
{{else}}
              <AppText style={styles.docEmoji}>📄</AppText>
{{/if}}
            </View>
            <View style={styles.docInfo}>
              <AppText numberOfLines={1} style={[styles.docName, isMe && styles.textMe]}>
                {message.fileName || 'Attachment.pdf'}
              </AppText>
              <AppText style={[styles.docMeta, isMe && styles.metaMe]}>
                {message.fileSize || 'PDF Document'}
              </AppText>
            </View>
          </Pressable>
        )}

        {/* Text Message */}
        {Boolean(message.text) && (
          <AppText style={[styles.text, isMe ? styles.textMe : styles.textOther]}>
            {message.text}
          </AppText>
        )}

        {/* Footer: Timestamp + Read ticks */}
        <View style={styles.footer}>
          <AppText style={[styles.time, isMe ? styles.timeMe : styles.timeOther]}>
            {timeFormatted}
          </AppText>
          {isMe && (
            <View style={styles.ticksContainer}>
{{#if VECTOR_ICONS}}
              <AppIcon
                name={message.status === 'read' ? 'check-all' : 'check'}
                size={14}
                tintColor={message.status === 'read' ? '#34B7F1' : '#FFFFFF99'}
              />
{{else}}
              <AppText style={[styles.ticks, message.status === 'read' && styles.ticksRead]}>
                {message.status === 'read' ? '✓✓' : '✓'}
              </AppText>
{{/if}}
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      marginVertical: 4,
      paddingHorizontal: 12,
      flexDirection: 'row',
    },
    containerMe: {
      justifyContent: 'flex-end',
    },
    containerOther: {
      justifyContent: 'flex-start',
    },
    bubble: {
      maxWidth: '82%',
      borderRadius: 16,
      padding: 8,
      elevation: 1,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.12,
      shadowRadius: 1,
    },
    bubbleMe: {
      backgroundColor: theme.colors.primary,
      borderBottomRightRadius: 2,
    },
    bubbleOther: {
      backgroundColor: theme.colors.surface,
      borderBottomLeftRadius: 2,
    },
    text: {
      fontSize: 15,
      lineHeight: 20,
      marginHorizontal: 4,
      marginTop: 2,
    },
    textMe: {
      color: '#FFFFFF',
    },
    textOther: {
      color: theme.colors.text,
    },
    mediaContainer: {
      borderRadius: 12,
      overflow: 'hidden',
      marginBottom: 4,
    },
    imageMedia: {
      width: 240,
      height: 180,
      borderRadius: 12,
    },
    videoPlayOverlay: {
      ...StyleSheet.absoluteFill,
      backgroundColor: '#00000040',
      justifyContent: 'center',
      alignItems: 'center',
    },
    playIcon: {
      fontSize: 32,
      color: '#FFFFFF',
    },
    durationBadge: {
      position: 'absolute',
      bottom: 6,
      right: 8,
      backgroundColor: '#00000099',
      color: '#FFFFFF',
      fontSize: 11,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    audioContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 4,
      paddingHorizontal: 4,
      minWidth: 200,
      gap: 8,
    },
    audioPlayBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: '#00000015',
      justifyContent: 'center',
      alignItems: 'center',
    },
    audioPlayIcon: {
      fontSize: 16,
    },
    waveformContainer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      height: 28,
    },
    waveformBar: {
      width: 3,
      borderRadius: 2,
    },
    audioDurationText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    docContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#00000015',
      padding: 8,
      borderRadius: 10,
      gap: 10,
      minWidth: 200,
      marginBottom: 4,
    },
    docIconBox: {
      width: 40,
      height: 40,
      borderRadius: 8,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    docEmoji: {
      fontSize: 20,
    },
    docInfo: {
      flex: 1,
    },
    docName: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
    },
    docMeta: {
      fontSize: 11,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    metaMe: {
      color: '#FFFFFFCC',
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      marginTop: 4,
      gap: 4,
    },
    time: {
      fontSize: 11,
    },
    timeMe: {
      color: '#FFFFFFCC',
    },
    timeOther: {
      color: theme.colors.textSecondary,
    },
    ticksContainer: {
      marginLeft: 2,
    },
    ticks: {
      fontSize: 11,
      color: '#FFFFFF99',
    },
    ticksRead: {
      color: '#34B7F1',
    },
  });
