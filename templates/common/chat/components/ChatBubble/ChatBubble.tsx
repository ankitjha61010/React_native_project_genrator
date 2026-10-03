import React, { useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Image,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { Extrapolation, interpolate, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { AppText } from '{{IMPORT:components.AppText}}';
{{#if VECTOR_ICONS}}
import { AppIcon } from '{{IMPORT:components.AppIcon}}';
{{/if}}
import { useStyles } from '{{IMPORT:hooks.useTheme}}';
import type { Theme } from '{{IMPORT:theme.index}}';
import type { ChatMessage } from '{{IMPORT:chat.types}}';
import { translate } from '{{IMPORT:i18n.index}}';
import { callLog, replyPreview, systemMessageText } from '../../utils/chatFormat';
import { AudioMessage } from '../AudioMessage/AudioMessage';
import { ChatNotice } from '../ChatNotice/ChatNotice';

/** Where a message sits on screen (window coordinates) – the long-press menu opens next to it. */
export interface BubbleLayout {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Drag this far (after the 0.7 resistance) to reply. */
const REPLY_THRESHOLD = 45;
const MAX_DRAG = 70;
/**
 * Touches that start this close to the left edge belong to the iOS back swipe, not to "reply".
 * (The full-screen back swipe is switched off for the chat room – see MainNavigator.)
 */
const BACK_SWIPE_EDGE = 28;

export interface ChatBubbleProps {
  message: ChatMessage;
  onPressMedia?: (message: ChatMessage) => void;
  /** Groups: the sender's name above other people's messages. */
  showSender?: boolean;
  /** A message that failed to send: tap to send it again. */
  onRetry?: (message: ChatMessage) => void;
  /** Long press: the message actions (reply, edit, delete) next to the message. */
  onLongPress?: (message: ChatMessage, layout: BubbleLayout) => void;
  /** Horizontal swipe: reply to this message. */
  onReply?: (message: ChatMessage) => void;
  /** Tap on the quote of a reply: jump to the original. */
  onPressReply?: (messageId: string) => void;
  /** Briefly tinted – the original after tapping a reply's quote. */
  highlighted?: boolean;
  /** Your user id – system messages say "You added …". */
  myId?: string;
  /** Tap on a call in the chat: call back. */
  onPressCall?: (message: ChatMessage) => void;
}

export function ChatBubble({ message, onPressMedia, showSender = false, onRetry, onLongPress, onReply, onPressReply, highlighted = false, myId, onPressCall }: ChatBubbleProps): React.JSX.Element {
  const styles = useStyles(createStyles);
  const isMe = message.isMe ?? (myId ? message.senderId === myId : false);
  const rowRef = useRef<React.ComponentRef<typeof View>>(null);
  const dragX = useSharedValue(0);

  const reply = useCallback(() => onReply?.(message), [onReply, message]);

  // Swipe right to reply. A native gesture (not a JS PanResponder), so it wins over the
  // list's scrolling and never fights the navigation stack for the touch.
  const swipe = usePanGesture({
    enabled: Boolean(onReply) && message.status !== 'sending' && message.status !== 'failed',
    activeOffsetX: 12,
    failOffsetY: [-12, 12],
    hitSlop: { left: -BACK_SWIPE_EDGE },
    onUpdate: event => {
      'worklet';
      dragX.value = Math.min(Math.max(event.translationX, 0) * 0.7, MAX_DRAG);
    },
    onDeactivate: event => {
      'worklet';
      if (!event.canceled && Math.max(event.translationX, 0) * 0.7 >= REPLY_THRESHOLD) {
        scheduleOnRN(reply);
      }
    },
    onFinalize: () => {
      'worklet';
      dragX.value = withSpring(0, { damping: 18, stiffness: 220 });
    },
  });

  const bubbleStyle = useAnimatedStyle(() => ({ transform: [{ translateX: dragX.value }] }));
  const replyIconStyle = useAnimatedStyle(() => ({
    opacity: interpolate(dragX.value, [0, 20, REPLY_THRESHOLD], [0, 0.6, 1], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(dragX.value, [0, 25, REPLY_THRESHOLD + 5], [0.5, 0.8, 1], Extrapolation.CLAMP) }],
  }));

  /** Measure the row first – the menu is drawn right below (or above) this message. */
  const handleLongPress = () => {
    if (!onLongPress) return;
    const row = rowRef.current;
    if (!row) return;
    row.measureInWindow((x, y, width, height) => onLongPress(message, { x, y, width, height }));
  };

  const timeFormatted = new Date(message.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  // A call: a small bubble on the caller's side ("Missed voice call", "Video call · 2:14") – tap to call back.
  const call = callLog(message);
  if (call) {
    const iCalled = message.actor?.id === myId;
    const missed = !call.answered && !iCalled;
    const text = systemMessageText(message, myId);
{{#if VECTOR_ICONS}}
    const iconStyle = missed ? styles.callIconMissed : iCalled ? styles.callIconMe : styles.callIconOther;
{{/if}}
    return (
      <View style={[styles.container, iCalled ? styles.containerMe : styles.containerOther]}>
        <TouchableOpacity
          activeOpacity={0.8}
          disabled={!onPressCall}
          onPress={() => onPressCall?.(message)}
          style={[styles.bubble, styles.callBubble, iCalled ? styles.bubbleMe : styles.bubbleOther]}
          accessibilityRole="button"
          accessibilityLabel={`${text}. ${translate('common', 'tapToCallBack')}`}>
{{#if VECTOR_ICONS}}
          <View style={[styles.callIcon, iconStyle]}>
            <AppIcon
              name={call.callType === 'video' ? (missed ? 'video-off-outline' : 'video-outline') : iCalled ? 'phone-outgoing' : missed ? 'phone-missed' : 'phone-incoming'}
              size={20}
              tintColor={iconStyle.color}
            />
          </View>
{{/if}}
          <View>
            <AppText fontFamily="semiBold" style={iCalled ? styles.textMe : styles.textOther} text={text} />
            <AppText style={[styles.time, iCalled ? styles.timeMe : styles.timeOther]} text={timeFormatted} />
          </View>
        </TouchableOpacity>
      </View>
    );
  }

  // "Jane added John" – a notice in the middle, not a bubble.
  if (message.type === 'system') {
    return <ChatNotice text={systemMessageText(message, myId)} time={timeFormatted} />;
  }

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
    <GestureDetector gesture={swipe}>
    <View ref={rowRef} collapsable={false} style={[styles.container, isMe ? styles.containerMe : styles.containerOther, highlighted && styles.highlighted]}>
      <Animated.View pointerEvents="none" style={[styles.replyIconContainer, replyIconStyle]}>
{{#if VECTOR_ICONS}}
        <AppIcon name="reply" size={16} tintColor={styles.quoteName.color} />
{{else}}
        <AppText text="↩" />
{{/if}}
      </Animated.View>
      <Animated.View style={[styles.bubbleWrap, isMe ? styles.bubbleWrapMe : styles.bubbleWrapOther, bubbleStyle]}>
        <Pressable
          onPress={message.status === 'failed' ? () => onRetry?.(message) : undefined}
          onLongPress={onLongPress && message.status !== 'sending' ? handleLongPress : undefined}
          delayLongPress={300}
          style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther, message.status === 'failed' && styles.bubbleFailed]}>
        {showSender && !isMe ? <AppText fontSize="size12" fontFamily="semiBold" color="primary" numberOfLines={1} text={message.senderName} /> : null}
        {/* Reply: the quoted message – tap to jump to it. */}
        {message.replyTo ? (
          <Pressable
            onPress={() => message.replyTo && onPressReply?.(message.replyTo.messageId)}
            disabled={!onPressReply || message.replyTo.deleted}
            accessibilityRole="button"
            accessibilityLabel={translate('common', 'replyingTo', { value1: message.replyTo.senderName })}
            style={[styles.quote, isMe ? styles.quoteMe : styles.quoteOther]}>
            <AppText fontSize="size12" fontFamily="semiBold" style={isMe ? styles.textMe : styles.quoteName} numberOfLines={1} text={message.replyTo.senderName} />
            <AppText fontSize="size12" style={isMe ? styles.metaMe : styles.docMeta} numberOfLines={2} text={replyPreview(message.replyTo)} />
          </Pressable>
        ) : null}
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
            {message.thumbnailUrl ? (
              <Image source={{ uri: message.thumbnailUrl }} style={styles.imageMedia} resizeMode="cover" />
            ) : (
              <View style={[styles.imageMedia, styles.videoPoster]}>
{{#if VECTOR_ICONS}}
                <AppIcon name="movie-outline" size={42} tintColor="#FFFFFF40" />
{{/if}}
              </View>
            )}
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

        {/* Media: Voice message */}
        {message.type === 'audio' && message.mediaUrl ? <AudioMessage uri={message.mediaUrl} duration={message.duration} inverted={isMe} /> : null}

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
                {message.fileName || translate('common', 'document')}
              </AppText>
              <AppText style={[styles.docMeta, isMe && styles.metaMe]}>
                {message.fileSize || ''}
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
                name={message.status === 'read' ? 'check-all' : message.status === 'sending' ? 'clock-outline' : message.status === 'failed' ? 'alert-circle-outline' : 'check'}
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
        {message.status === 'failed' ? <AppText fontSize="size12" color="error" text={translate('common', 'sendFailed')} /> : null}
      </Pressable>
      </Animated.View>
    </View>
    </GestureDetector>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      marginVertical: 4,
      paddingHorizontal: 12,
      flexDirection: 'row',
    },
    replyIconContainer: {
      position: 'absolute',
      left: 14,
      top: '50%',
      marginTop: -14,
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: theme.colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 2,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.15,
      shadowRadius: 2,
      zIndex: 5,
    },
    // The bubble's maxWidth (82%) is relative to this full-width wrapper.
    bubbleWrap: {
      flex: 1,
      flexDirection: 'row',
    },
    bubbleWrapMe: {
      justifyContent: 'flex-end',
    },
    bubbleWrapOther: {
      justifyContent: 'flex-start',
    },
    containerMe: {
      justifyContent: 'flex-end',
    },
    containerOther: {
      justifyContent: 'flex-start',
    },
    highlighted: {
      backgroundColor: theme.colors.primarySoft,
    },
    quote: {
      borderStartWidth: 3,
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 4,
      marginBottom: 4,
      minWidth: 120,
    },
    quoteMe: {
      backgroundColor: '#FFFFFF26',
      borderStartColor: '#FFFFFF',
    },
    quoteOther: {
      backgroundColor: theme.colors.background,
      borderStartColor: theme.colors.primary,
    },
    quoteName: {
      color: theme.colors.primary,
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
      borderBottomEndRadius: 2,
    },
    bubbleFailed: {
      opacity: 0.7,
    },
    bubbleOther: {
      backgroundColor: theme.colors.surface,
      borderBottomStartRadius: 2,
    },
    callBubble: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    callIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    callIconMe: {
      backgroundColor: '#FFFFFF26',
      color: '#FFFFFF',
    },
    callIconOther: {
      backgroundColor: theme.colors.primarySoft,
      color: theme.colors.primary,
    },
    callIconMissed: {
      backgroundColor: theme.colors.background,
      color: theme.colors.error,
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
    videoPoster: {
      backgroundColor: '#1C1C24',
      justifyContent: 'center',
      alignItems: 'center',
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
      end: 8,
      backgroundColor: '#00000099',
      color: '#FFFFFF',
      fontSize: 11,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
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
      marginStart: 2,
    },
    ticks: {
      fontSize: 11,
      color: '#FFFFFF99',
    },
    ticksRead: {
      color: '#34B7F1',
    },
  });
