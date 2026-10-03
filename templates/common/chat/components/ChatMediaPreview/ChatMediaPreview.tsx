import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  StyleSheet,
  View,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ImageZoom } from '@likashefqet/react-native-image-zoom';
import Pdf from 'react-native-pdf';
import { AppText } from '{{IMPORT:components.AppText}}';
{{#if VECTOR_ICONS}}
import { AppIcon } from '{{IMPORT:components.AppIcon}}';
{{/if}}
{{#if RTL}}
import { useDirection } from '{{IMPORT:hooks.useDirection}}';
{{/if}}
import { useStyles } from '{{IMPORT:hooks.useTheme}}';
import type { Theme } from '{{IMPORT:theme.index}}';
import type { ChatMessage } from '{{IMPORT:chat.types}}';
import { translate } from '{{IMPORT:i18n.index}}';
import { AudioMessage } from '../AudioMessage/AudioMessage';
import { ChatVideoPlayer } from '../ChatVideoPlayer/ChatVideoPlayer';
import { isPdf, openInSystemViewer, toFileUri } from '../../utils/mediaFiles';

export interface ChatMediaPreviewProps {
  visible: boolean;
  message: ChatMessage | null;
  onClose: () => void;
}

export function ChatMediaPreview({ visible, message, onClose }: ChatMediaPreviewProps): React.JSX.Element | null {
  const styles = useStyles(createStyles);
{{#if RTL}}
  // A Modal is a separate native root – it needs the app's direction explicitly.
  const { directionStyle } = useDirection();
{{/if}}
  const [loading, setLoading] = useState(false);
  // iOS can fire onLoadStart AFTER onLoad/onLoadEnd for local or cached images, which
  // left the spinner running forever. Once the image has finished, ignore late starts.
  const imageSettled = useRef(false);

  /** The PDF could not be rendered in the app – offer the system viewer instead. */
  const [pdfFailed, setPdfFailed] = useState(false);
  const [opening, setOpening] = useState(false);
  const [openFailed, setOpenFailed] = useState(false);

  useEffect(() => {
    imageSettled.current = false;
    setLoading(false);
    setPdfFailed(false);
    setOpening(false);
    setOpenFailed(false);
  }, [visible, message?.id]);

  const settleImage = () => {
    imageSettled.current = true;
    setLoading(false);
  };

  if (!message) return null;

  /** Documents: QuickLook on iOS, the installed viewer app on Android. */
  const openDocument = async () => {
    if (!message.mediaUrl || opening) return;
    setOpening(true);
    setOpenFailed(false);
    try {
      await openInSystemViewer(message.mediaUrl, message.fileName);
    } catch {
      setOpenFailed(true);
    } finally {
      setOpening(false);
    }
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

  const renderMediaContent = () => {
    switch (message.type) {
      case 'image':
        return (
          <View style={styles.imagePreviewWrapper}>
            <ImageZoom
              uri={message.mediaUrl}
              minScale={0.8}
              maxScale={5}
              doubleTapScale={3}
              isSingleTapEnabled
              isDoubleTapEnabled
              isPinchEnabled
              isPanEnabled
              style={[
                styles.fullImage,
                {
                  transform: message.crop?.rotation ? [{ rotate: `${message.crop.rotation}deg` }] : undefined,
                },
              ]}
              resizeMode="contain"
              onLoadStart={() => {
                if (!imageSettled.current) setLoading(true);
              }}
              onLoad={settleImage}
              onError={settleImage}
              onLoadEnd={settleImage}
            />
            {getFilterStyle() && <View style={[StyleSheet.absoluteFill, getFilterStyle()]} pointerEvents="none" />}
          </View>
        );

      case 'video':
        return message.mediaUrl ? <ChatVideoPlayer uri={message.mediaUrl} /> : null;

      case 'audio':
        return message.mediaUrl ? (
          <View style={styles.audioCard}>
{{#if VECTOR_ICONS}}
            <AppIcon name="music-note" size={48} tintColor="#FFFFFF" />
{{/if}}
            <AppText style={styles.docName} numberOfLines={2} text={message.fileName || translate('common', 'voiceMessage')} />
            <View style={styles.audioPlayer}>
              <AudioMessage uri={message.mediaUrl} duration={message.duration} inverted />
            </View>
          </View>
        ) : null;

      case 'document': {
        // PDFs open right here (pinch / double-tap to zoom); anything else in the system viewer.
        if (message.mediaUrl && isPdf(message.fileName, message.mediaUrl) && !pdfFailed) {
          const remote = /^https?:\/\//i.test(message.mediaUrl);
          return (
            <Pdf
              source={remote ? { uri: message.mediaUrl, cache: true } : { uri: toFileUri(message.mediaUrl) }}
              style={styles.pdf}
              minScale={1}
              maxScale={5}
              enableDoubleTapZoom
              renderActivityIndicator={() => <ActivityIndicator size="large" color="#FFFFFF" />}
              onError={() => setPdfFailed(true)}
            />
          );
        }
        return (
          <View style={styles.docBox}>
{{#if VECTOR_ICONS}}
            <AppIcon name="file-document-outline" size={64} tintColor="#FFFFFF" />
{{/if}}
            <AppText style={styles.docName} numberOfLines={3} text={message.fileName || translate('common', 'document')} />
            {message.fileSize ? <AppText style={styles.docSize} text={message.fileSize} /> : null}
            {openFailed ? <AppText style={styles.docError} text={translate('common', 'documentOpenFailed')} /> : null}
            <TouchableOpacity style={styles.downloadBtn} onPress={openDocument} disabled={opening || !message.mediaUrl} accessibilityRole="button">
              {opening ? <ActivityIndicator size="small" color="#FFFFFF" /> : null}
              <AppText style={styles.downloadBtnText} text={translate('common', opening ? 'downloadingDocument' : 'openDocument')} />
            </TouchableOpacity>
          </View>
        );
      }

      default:
        return null;
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <GestureHandlerRootView style={styles.gestureRoot}>
        <SafeAreaView style={ {{#if RTL}}[styles.backdrop, directionStyle]{{else}}styles.backdrop{{/if}} }>
          {/* Header Bar */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.headerButton}>
{{#if VECTOR_ICONS}}
              <AppIcon name="close" size={24} tintColor="#FFFFFF" />
{{else}}
              <AppText style={styles.btnText}>✕</AppText>
{{/if}}
            </TouchableOpacity>

            <View style={styles.titleBox}>
              <AppText style={styles.senderText} numberOfLines={1}>
                {message.type === 'document' ? message.fileName || translate('common', 'document') : message.senderName}
              </AppText>
              <AppText style={styles.timeText}>
                {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </AppText>
            </View>

            {/* Documents: also open in the system viewer (share, print, other apps). */}
            {message.type === 'document' ? (
              <TouchableOpacity onPress={openDocument} style={styles.headerButton} disabled={opening} accessibilityRole="button" accessibilityLabel={translate('common', 'openDocument')}>
{{#if VECTOR_ICONS}}
                <AppIcon name="open-in-new" size={22} tintColor="#FFFFFF" />
{{else}}
                <AppText style={styles.btnText}>↗</AppText>
{{/if}}
              </TouchableOpacity>
            ) : (
              <View style={styles.headerButtonSpacer} />
            )}
          </View>

          {/* Media Viewer Area */}
          <View style={styles.content}>
            {renderMediaContent()}
            {loading && (
              <View style={styles.loadingOverlay} pointerEvents="none">
                <ActivityIndicator size="large" color="#FFFFFF" />
              </View>
            )}
          </View>
        </SafeAreaView>
      </GestureHandlerRootView>
    </Modal>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    gestureRoot: {
      flex: 1,
    },
    backdrop: {
      flex: 1,
      backgroundColor: '#000000FA',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: '#333333',
    },
    headerButton: {
      padding: 8,
    },
    btnText: {
      color: '#FFFFFF',
      fontSize: 16,
    },
    titleBox: {
      flex: 1,
      alignItems: 'center',
      marginHorizontal: 12,
    },
    senderText: {
      color: '#FFFFFF',
      fontWeight: '600',
      fontSize: 15,
    },
    timeText: {
      color: '#AAAAAA',
      fontSize: 12,
    },
    content: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    imagePreviewWrapper: {
      width: '100%',
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
    },
    fullImage: {
      width: '100%',
      height: '100%',
    },
    headerButtonSpacer: {
      width: 40,
    },
    pdf: {
      flex: 1,
      width: '100%',
      backgroundColor: '#000000',
    },
    audioCard: {
      width: '90%',
      maxWidth: 360,
      padding: 24,
      gap: 16,
      borderRadius: 16,
      alignItems: 'center',
      backgroundColor: '#1E1E1E',
    },
    audioPlayer: {
      alignSelf: 'stretch',
      padding: 8,
      borderRadius: 12,
      backgroundColor: theme.colors.primary,
    },
    docError: {
      color: '#FF8A80',
      fontSize: 13,
      textAlign: 'center',
    },
    docBox: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 12,
      padding: 24,
    },
    docName: {
      color: '#FFFFFF',
      fontSize: 18,
      fontWeight: '600',
      textAlign: 'center',
    },
    docSize: {
      color: '#AAAAAA',
      fontSize: 14,
    },
    downloadBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 8,
      marginTop: 12,
    },
    downloadBtnText: {
      color: '#FFFFFF',
      fontWeight: '600',
    },
    loadingOverlay: {
      ...StyleSheet.absoluteFill,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.4)',
    },
  });
