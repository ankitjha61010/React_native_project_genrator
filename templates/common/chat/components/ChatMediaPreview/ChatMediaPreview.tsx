import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  StyleSheet,
  View,
  TouchableOpacity,
  SafeAreaView,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ImageZoom } from '@likashefqet/react-native-image-zoom';
import { WebView } from 'react-native-webview';
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

  useEffect(() => {
    imageSettled.current = false;
    setLoading(false);
  }, [visible, message?.id]);

  const settleImage = () => {
    imageSettled.current = true;
    setLoading(false);
  };

  if (!message) return null;

  const handleOpenExternal = () => {
    if (message.mediaUrl) {
      Linking.openURL(message.mediaUrl).catch(() => {});
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
        return (
          <View style={styles.webMediaContainer}>
            <WebView
              originWhitelist={['*']}
              allowsInlineMediaPlayback
              mediaPlaybackRequiresUserAction={false}
              javaScriptEnabled
              domStorageEnabled
              allowFileAccess
              allowFileAccessFromFileURLs
              allowUniversalAccessFromFileURLs
              mixedContentMode="always"
              source={{
                html: `
                  <!DOCTYPE html>
                  <html>
                    <head>
                      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
                      <style>
                        body {
                          margin: 0;
                          padding: 0;
                          background-color: #000000;
                          display: flex;
                          align-items: center;
                          justify-content: center;
                          height: 100vh;
                          overflow: hidden;
                        }
                        video {
                          width: 100%;
                          max-height: 100vh;
                          outline: none;
                        }
                        .error-card {
                          display: none;
                          color: #FFFFFF;
                          text-align: center;
                          padding: 24px;
                          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        }
                        .error-title {
                          font-size: 16px;
                          font-weight: 600;
                          margin-bottom: 8px;
                        }
                        .error-sub {
                          font-size: 13px;
                          color: #AAAAAA;
                        }
                      </style>
                    </head>
                    <body>
                      <video
                        src="${message.mediaUrl}"
                        controls
                        autoplay
                        playsinline
                        controlsList="nodownload"
                        onerror="document.getElementById('video-error').style.display='block';">
                      </video>
                      <div id="video-error" class="error-card">
                        <div class="error-title">Unable to play video directly</div>
                        <div class="error-sub">Tap 'Open' at the top right to view this video in your device player.</div>
                      </div>
                    </body>
                  </html>
                `,
              }}
              style={styles.webView}
              onLoadStart={() => setLoading(true)}
              onLoadEnd={() => setLoading(false)}
            />
          </View>
        );

      case 'audio':
        return (
          <View style={styles.webMediaContainer}>
            <WebView
              originWhitelist={['*']}
              allowsInlineMediaPlayback
              mediaPlaybackRequiresUserAction={false}
              javaScriptEnabled
              domStorageEnabled
              source={{
                html: `
                  <!DOCTYPE html>
                  <html>
                    <head>
                      <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
                      <style>
                        body {
                          margin: 0;
                          padding: 24px;
                          background-color: #121212;
                          display: flex;
                          flex-direction: column;
                          align-items: center;
                          justify-content: center;
                          height: 85vh;
                          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                          color: #FFFFFF;
                        }
                        .audio-card {
                          background: #1E1E1E;
                          padding: 24px;
                          border-radius: 16px;
                          width: 90%;
                          max-width: 360px;
                          display: flex;
                          flex-direction: column;
                          align-items: center;
                          box-shadow: 0 4px 16px rgba(0,0,0,0.5);
                        }
                        .icon {
                          font-size: 48px;
                          margin-bottom: 16px;
                        }
                        .title {
                          font-size: 16px;
                          font-weight: 600;
                          margin-bottom: 20px;
                          text-align: center;
                        }
                        audio {
                          width: 100%;
                          outline: none;
                        }
                      </style>
                    </head>
                    <body>
                      <div class="audio-card">
                        <div class="icon">🎵</div>
                        <div class="title">${message.fileName || 'Voice Note / Audio'}</div>
                        <audio src="${message.mediaUrl}" controls autoplay></audio>
                      </div>
                    </body>
                  </html>
                `,
              }}
              style={styles.webView}
              onLoadStart={() => setLoading(true)}
              onLoadEnd={() => setLoading(false)}
            />
          </View>
        );

      case 'document': {
        const isPdf = (message.mediaUrl || message.fileName || '').toLowerCase().includes('.pdf');
        const docViewerUrl = isPdf && message.mediaUrl?.startsWith('http')
          ? `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(message.mediaUrl)}`
          : message.mediaUrl;

        return (
          <View style={styles.webMediaContainer}>
            {docViewerUrl ? (
              <WebView
                originWhitelist={['*']}
                source={{ uri: docViewerUrl }}
                style={styles.webView}
                startInLoadingState
                renderLoading={() => (
                  <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color="#FFFFFF" />
                  </View>
                )}
                onLoadStart={() => setLoading(true)}
                onLoadEnd={() => setLoading(false)}
              />
            ) : (
              <View style={styles.docBox}>
{{#if VECTOR_ICONS}}
                <AppIcon name="file-document-outline" size={64} tintColor="#FFFFFF" />
{{/if}}
                <AppText style={styles.docName}>{message.fileName || 'Document'}</AppText>
                <AppText style={styles.docSize}>{message.fileSize}</AppText>
                <TouchableOpacity style={styles.downloadBtn} onPress={handleOpenExternal}>
                  <AppText style={styles.downloadBtnText}>Open Document</AppText>
                </TouchableOpacity>
              </View>
            )}
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
                {message.type === 'video'
                  ? 'Video Player'
                  : message.type === 'audio'
                  ? 'Audio Player'
                  : message.type === 'document'
                  ? 'Document Viewer'
                  : message.senderName}
              </AppText>
              <AppText style={styles.timeText}>
                {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </AppText>
            </View>

            <TouchableOpacity onPress={handleOpenExternal} style={styles.headerButton}>
{{#if VECTOR_ICONS}}
              <AppIcon name="open-in-new" size={22} tintColor="#FFFFFF" />
{{else}}
              <AppText style={styles.btnText}>Open</AppText>
{{/if}}
            </TouchableOpacity>
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
    webMediaContainer: {
      width: '100%',
      height: '100%',
      backgroundColor: '#000000',
    },
    webView: {
      flex: 1,
      backgroundColor: '#000000',
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
