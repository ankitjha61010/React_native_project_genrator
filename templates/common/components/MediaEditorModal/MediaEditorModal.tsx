import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Image,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  ScrollView,
  Dimensions,
  PanResponder,
} from 'react-native';
import { AppText } from '{{IMPORT:components.AppText}}';
{{#if VECTOR_ICONS}}
import { AppIcon } from '{{IMPORT:components.AppIcon}}';
{{/if}}
import { useStyles } from '{{IMPORT:hooks.useTheme}}';
import type { Theme } from '{{IMPORT:theme.index}}';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PREVIEW_MAX_WIDTH = SCREEN_WIDTH - 32;
const PREVIEW_MAX_HEIGHT = 380;
const MIN_CROP_SIZE = 100;

export interface MediaCropData {
  width: number;
  height: number;
  aspectRatio: AspectRatio;
  rotation?: number;
  filter?: 'normal' | 'warm' | 'cool' | 'mono';
}

export interface MediaItem {
  uri: string;
  type: 'image' | 'video';
  fileName?: string;
  fileSize?: string;
  duration?: number;
  crop?: MediaCropData;
}

export interface MediaEditorModalProps {
  visible: boolean;
  media: MediaItem | null;
  enableCropper?: boolean;
  onClose: () => void;
  onSend: (editedMedia: MediaItem) => void;
}

export type AspectRatio = 'free' | '1:1' | '4:5' | '16:9' | '3:2';

export function MediaEditorModal({
  visible,
  media,
  enableCropper = true,
  onClose,
  onSend,
}: MediaEditorModalProps): React.JSX.Element | null {
  const styles = useStyles(createStyles);

  // Editor states
  const [rotation, setRotation] = useState<number>(0);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('free');
  const [filter, setFilter] = useState<'normal' | 'warm' | 'cool' | 'mono'>('normal');

  // Flexible Crop box dimensions (for 'free' mode)
  const [cropBoxWidth, setCropBoxWidth] = useState<number>(PREVIEW_MAX_WIDTH);
  const [cropBoxHeight, setCropBoxHeight] = useState<number>(300);

  // Ref tracking current crop box size for gesture calculations
  const cropSizeRef = useRef({ width: PREVIEW_MAX_WIDTH, height: 300 });
  cropSizeRef.current = { width: cropBoxWidth, height: cropBoxHeight };

  // Video trim states (in seconds)
  const [trimStart, setTrimStart] = useState<number>(0);
  const [trimEnd, setTrimEnd] = useState<number>(media?.duration || 15);

  // Reset editor states whenever a new media is loaded or modal is opened
  useEffect(() => {
    if (visible && media) {
      setRotation(0);
      setAspectRatio('free');
      setFilter('normal');
      setCropBoxWidth(PREVIEW_MAX_WIDTH);
      setCropBoxHeight(300);
      setTrimStart(0);
      setTrimEnd(media.duration || 15);
    }
  }, [visible, media?.uri]);

  const resetCropState = () => {
    setRotation(0);
    setAspectRatio('free');
    setFilter('normal');
    setCropBoxWidth(PREVIEW_MAX_WIDTH);
    setCropBoxHeight(300);
    setTrimStart(0);
    setTrimEnd(15);
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const getComputedCropSize = () => {
    switch (aspectRatio) {
      case '1:1':
        return { width: PREVIEW_MAX_WIDTH, height: PREVIEW_MAX_WIDTH };
      case '4:5':
        return { width: PREVIEW_MAX_WIDTH * 0.8, height: PREVIEW_MAX_WIDTH };
      case '16:9':
        return { width: PREVIEW_MAX_WIDTH, height: (PREVIEW_MAX_WIDTH * 9) / 16 };
      case '3:2':
        return { width: PREVIEW_MAX_WIDTH, height: (PREVIEW_MAX_WIDTH * 2) / 3 };
      case 'free':
      default:
        return { width: cropBoxWidth, height: cropBoxHeight };
    }
  };

  const handleSend = () => {
    if (!media) return;
    const isVideo = media.type === 'video';
    const computedSize = getComputedCropSize();
    const edited: MediaItem = {
      ...media,
      duration: isVideo ? Math.max(1, trimEnd - trimStart) : media.duration,
      crop: !isVideo
        ? {
            width: Math.round(computedSize.width),
            height: Math.round(computedSize.height),
            aspectRatio,
            rotation,
            filter,
          }
        : undefined,
    };
    resetCropState();
    onSend(edited);
    onClose();
  };

  const handleClose = () => {
    resetCropState();
    onClose();
  };

  const getFilterStyle = () => {
    switch (filter) {
      case 'warm':
        return { tintColor: '#ff9800', opacity: 0.15 };
      case 'cool':
        return { tintColor: '#2196f3', opacity: 0.15 };
      case 'mono':
        return { tintColor: '#000000', opacity: 0.25 };
      default:
        return null;
    }
  };

  const getCropContainerStyle = () => {
    switch (aspectRatio) {
      case '1:1':
        return { width: PREVIEW_MAX_WIDTH, height: PREVIEW_MAX_WIDTH };
      case '4:5':
        return { width: PREVIEW_MAX_WIDTH * 0.8, height: PREVIEW_MAX_WIDTH };
      case '16:9':
        return { width: PREVIEW_MAX_WIDTH, height: (PREVIEW_MAX_WIDTH * 9) / 16 };
      case '3:2':
        return { width: PREVIEW_MAX_WIDTH, height: (PREVIEW_MAX_WIDTH * 2) / 3 };
      case 'free':
      default:
        return { width: cropBoxWidth, height: cropBoxHeight };
    }
  };

  // Helper function to update crop size within bounds
  const updateCropSize = (newW: number, newH: number) => {
    setCropBoxWidth(Math.min(PREVIEW_MAX_WIDTH, Math.max(MIN_CROP_SIZE, newW)));
    setCropBoxHeight(Math.min(PREVIEW_MAX_HEIGHT, Math.max(MIN_CROP_SIZE, newH)));
  };

  // Draggable Corner PanResponders
  const startDragSize = useRef({ width: PREVIEW_MAX_WIDTH, height: 300 });

  const panBottomRight = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          startDragSize.current = { ...cropSizeRef.current };
        },
        onPanResponderMove: (_, gestureState) => {
          const newW = startDragSize.current.width + gestureState.dx * 2;
          const newH = startDragSize.current.height + gestureState.dy * 2;
          updateCropSize(newW, newH);
        },
      }),
    []
  );

  const panBottomLeft = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          startDragSize.current = { ...cropSizeRef.current };
        },
        onPanResponderMove: (_, gestureState) => {
          const newW = startDragSize.current.width - gestureState.dx * 2;
          const newH = startDragSize.current.height + gestureState.dy * 2;
          updateCropSize(newW, newH);
        },
      }),
    []
  );

  const panTopRight = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          startDragSize.current = { ...cropSizeRef.current };
        },
        onPanResponderMove: (_, gestureState) => {
          const newW = startDragSize.current.width + gestureState.dx * 2;
          const newH = startDragSize.current.height - gestureState.dy * 2;
          updateCropSize(newW, newH);
        },
      }),
    []
  );

  const panTopLeft = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          startDragSize.current = { ...cropSizeRef.current };
        },
        onPanResponderMove: (_, gestureState) => {
          const newW = startDragSize.current.width - gestureState.dx * 2;
          const newH = startDragSize.current.height - gestureState.dy * 2;
          updateCropSize(newW, newH);
        },
      }),
    []
  );

  if (!media) return null;

  const isVideo = media.type === 'video';
  const totalDuration = media.duration || 15;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={handleClose}>
      <SafeAreaView style={styles.container}>
        {/* Top Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.iconBtn}>
{{#if VECTOR_ICONS}}
            <AppIcon name="close" size={24} tintColor="#FFFFFF" />
{{else}}
            <AppText style={{ color: '#FFFFFF', fontSize: 18 }}>✕</AppText>
{{/if}}
          </TouchableOpacity>

          <AppText style={styles.headerTitle}>
            {isVideo ? 'Trim & Edit Video' : 'Crop & Edit Photo'}
          </AppText>

          <TouchableOpacity onPress={handleSend} style={styles.doneBtn}>
            <AppText style={styles.doneBtnText}>Send</AppText>
{{#if VECTOR_ICONS}}
            <AppIcon name="send" size={16} tintColor="#FFFFFF" />
{{/if}}
          </TouchableOpacity>
        </View>

        {/* Media Preview Box with Draggable Interactive Crop Handles */}
        <View style={styles.previewContainer}>
          <View style={[styles.cropFrame, getCropContainerStyle()]}>
            <Image
              source={{ uri: media.uri }}
              style={[
                styles.previewMedia,
                { transform: [{ rotate: `${rotation}deg` }] },
              ]}
              resizeMode="cover"
            />
            {getFilterStyle() && <View style={[styles.filterOverlay, getFilterStyle()]} />}
            {isVideo && (
              <View style={styles.playOverlay}>
{{#if VECTOR_ICONS}}
                <AppIcon name="play-circle" size={48} tintColor="#FFFFFF" />
{{else}}
                <AppText style={{ fontSize: 36, color: '#FFFFFF' }}>▶</AppText>
{{/if}}
              </View>
            )}

            {/* Viewfinder Corner Overlays & Grid */}
            {!isVideo && (
              <View style={styles.gridOverlay} pointerEvents="box-none">
                <View style={styles.gridLineH1} pointerEvents="none" />
                <View style={styles.gridLineH2} pointerEvents="none" />
                <View style={styles.gridLineV1} pointerEvents="none" />
                <View style={styles.gridLineV2} pointerEvents="none" />

                {/* 4 Interactive Draggable Corner Touch Areas */}
                <View {...panTopLeft.panHandlers} style={[styles.touchCorner, styles.cornerTopLeft]}>
                  <View style={[styles.cornerHandle, styles.handleTopLeft]} />
                </View>
                <View {...panTopRight.panHandlers} style={[styles.touchCorner, styles.cornerTopRight]}>
                  <View style={[styles.cornerHandle, styles.handleTopRight]} />
                </View>
                <View {...panBottomLeft.panHandlers} style={[styles.touchCorner, styles.cornerBottomLeft]}>
                  <View style={[styles.cornerHandle, styles.handleBottomLeft]} />
                </View>
                <View {...panBottomRight.panHandlers} style={[styles.touchCorner, styles.cornerBottomRight]}>
                  <View style={[styles.cornerHandle, styles.handleBottomRight]} />
                </View>
              </View>
            )}
          </View>

          {/* Quick preset dimension controls / reset */}
          {!isVideo && aspectRatio === 'free' && (
            <View style={styles.freeAdjustBar}>
              <AppText style={styles.freeAdjustLabel}>Drag corners or tap below to adjust:</AppText>
              <View style={styles.freeAdjustButtons}>
                <TouchableOpacity style={styles.adjustPill} onPress={() => updateCropSize(cropBoxWidth - 30, cropBoxHeight)}>
                  <AppText style={styles.adjustPillText}>W -</AppText>
                </TouchableOpacity>
                <TouchableOpacity style={styles.adjustPill} onPress={() => updateCropSize(cropBoxWidth + 30, cropBoxHeight)}>
                  <AppText style={styles.adjustPillText}>W +</AppText>
                </TouchableOpacity>
                <TouchableOpacity style={styles.adjustPill} onPress={() => updateCropSize(cropBoxWidth, cropBoxHeight - 30)}>
                  <AppText style={styles.adjustPillText}>H -</AppText>
                </TouchableOpacity>
                <TouchableOpacity style={styles.adjustPill} onPress={() => updateCropSize(cropBoxWidth, cropBoxHeight + 30)}>
                  <AppText style={styles.adjustPillText}>H +</AppText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.adjustPill, styles.adjustPillReset]}
                  onPress={() => {
                    setCropBoxWidth(PREVIEW_MAX_WIDTH);
                    setCropBoxHeight(300);
                  }}>
                  <AppText style={styles.adjustPillText}>Reset</AppText>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Controls Section */}
        <View style={styles.controlsSection}>
          {isVideo ? (
            /* Video Trimmer Controls */
            <View style={styles.trimContainer}>
              <View style={styles.trimHeader}>
                <AppText style={styles.controlSectionTitle}>Video Trimming</AppText>
                <AppText style={styles.trimDurationBadge}>
                  {trimStart}s - {trimEnd}s (Length: {Math.max(1, trimEnd - trimStart)}s)
                </AppText>
              </View>

              <View style={styles.trimTrack}>
                <View
                  style={[
                    styles.trimSelectedRange,
                    {
                      left: `${(trimStart / totalDuration) * 100}%`,
                      width: `${((trimEnd - trimStart) / totalDuration) * 100}%`,
                    },
                  ]}
                />
              </View>

              <View style={styles.trimButtonsRow}>
                <TouchableOpacity
                  style={styles.trimAdjBtn}
                  onPress={() => setTrimStart(prev => Math.max(0, prev - 1))}>
                  <AppText style={styles.trimBtnText}>- Start</AppText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.trimAdjBtn}
                  onPress={() => setTrimStart(prev => Math.min(trimEnd - 1, prev + 1))}>
                  <AppText style={styles.trimBtnText}>+ Start</AppText>
                </TouchableOpacity>
                <View style={{ width: 16 }} />
                <TouchableOpacity
                  style={styles.trimAdjBtn}
                  onPress={() => setTrimEnd(prev => Math.max(trimStart + 1, prev - 1))}>
                  <AppText style={styles.trimBtnText}>- End</AppText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.trimAdjBtn}
                  onPress={() => setTrimEnd(prev => Math.min(totalDuration, prev + 1))}>
                  <AppText style={styles.trimBtnText}>+ End</AppText>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            /* Photo Editing Controls: Rotate, Crop Ratios & Filters */
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Aspect Ratio / Crop */}
              <View style={styles.toolSection}>
                <View style={styles.toolSectionHeader}>
                  <AppText style={styles.controlSectionTitle}>Crop Aspect Ratio</AppText>
                  <TouchableOpacity onPress={handleRotate} style={styles.rotateActionBtn}>
{{#if VECTOR_ICONS}}
                    <AppIcon name="rotate-right" size={20} tintColor="#2196F3" />
{{/if}}
                    <AppText style={styles.rotateActionText}>Rotate 90° ({rotation}°)</AppText>
                  </TouchableOpacity>
                </View>

                <View style={styles.ratioRow}>
                  {(['free', '1:1', '4:5', '16:9', '3:2'] as AspectRatio[]).map(ratio => (
                    <TouchableOpacity
                      key={ratio}
                      style={[styles.ratioChip, aspectRatio === ratio && styles.ratioChipActive]}
                      onPress={() => setAspectRatio(ratio)}>
                      <AppText
                        style={[
                          styles.ratioChipText,
                          aspectRatio === ratio && styles.ratioChipTextActive,
                        ]}>
                        {ratio.toUpperCase()}
                      </AppText>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Preset Filters */}
              <View style={styles.toolSection}>
                <AppText style={styles.controlSectionTitle}>Filters</AppText>
                <View style={styles.ratioRow}>
                  {(['normal', 'warm', 'cool', 'mono'] as const).map(f => (
                    <TouchableOpacity
                      key={f}
                      style={[styles.ratioChip, filter === f && styles.ratioChipActive]}
                      onPress={() => setFilter(f)}>
                      <AppText
                        style={[
                          styles.ratioChipText,
                          filter === f && styles.ratioChipTextActive,
                        ]}>
                        {f.toUpperCase()}
                      </AppText>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#121212',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: '#2C2C2C',
    },
    iconBtn: {
      padding: 6,
    },
    headerTitle: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
    doneBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 18,
      gap: 6,
    },
    doneBtnText: {
      color: '#FFFFFF',
      fontWeight: '600',
      fontSize: 14,
    },
    previewContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16,
    },
    cropFrame: {
      borderRadius: 12,
      overflow: 'hidden',
      backgroundColor: '#1E1E1E',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1.5,
      borderColor: '#383838',
      position: 'relative',
    },
    previewMedia: {
      width: '100%',
      height: '100%',
    },
    filterOverlay: {
      ...StyleSheet.absoluteFill,
      backgroundColor: '#ff9800',
    },
    playOverlay: {
      ...StyleSheet.absoluteFill,
      backgroundColor: '#00000040',
      justifyContent: 'center',
      alignItems: 'center',
    },
    gridOverlay: {
      ...StyleSheet.absoluteFill,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.4)',
    },
    gridLineH1: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: '33.33%',
      height: 1,
      backgroundColor: 'rgba(255,255,255,0.25)',
    },
    gridLineH2: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: '66.66%',
      height: 1,
      backgroundColor: 'rgba(255,255,255,0.25)',
    },
    gridLineV1: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: '33.33%',
      width: 1,
      backgroundColor: 'rgba(255,255,255,0.25)',
    },
    gridLineV2: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: '66.66%',
      width: 1,
      backgroundColor: 'rgba(255,255,255,0.25)',
    },
    touchCorner: {
      position: 'absolute',
      width: 44,
      height: 44,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 10,
    },
    cornerTopLeft: {
      top: -6,
      left: -6,
    },
    cornerTopRight: {
      top: -6,
      right: -6,
    },
    cornerBottomLeft: {
      bottom: -6,
      left: -6,
    },
    cornerBottomRight: {
      bottom: -6,
      right: -6,
    },
    cornerHandle: {
      position: 'absolute',
      width: 26,
      height: 26,
      borderColor: '#FFFFFF',
    },
    handleTopLeft: {
      top: 6,
      left: 6,
      borderTopWidth: 4,
      borderLeftWidth: 4,
    },
    handleTopRight: {
      top: 6,
      right: 6,
      borderTopWidth: 4,
      borderRightWidth: 4,
    },
    handleBottomLeft: {
      bottom: 6,
      left: 6,
      borderBottomWidth: 4,
      borderLeftWidth: 4,
    },
    handleBottomRight: {
      bottom: 6,
      right: 6,
      borderBottomWidth: 4,
      borderRightWidth: 4,
    },
    freeAdjustBar: {
      marginTop: 12,
      alignItems: 'center',
    },
    freeAdjustLabel: {
      color: '#AAAAAA',
      fontSize: 12,
      marginBottom: 6,
      fontWeight: '500',
    },
    freeAdjustButtons: {
      flexDirection: 'row',
      gap: 8,
    },
    adjustPill: {
      backgroundColor: '#2A2A2A',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: '#3D3D3D',
    },
    adjustPillReset: {
      backgroundColor: '#3E3E3E',
    },
    adjustPillText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '600',
    },
    controlsSection: {
      backgroundColor: '#1E1E1E',
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      paddingBottom: 28,
      maxHeight: 280,
    },
    toolSection: {
      marginBottom: 16,
    },
    toolSectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    controlSectionTitle: {
      color: '#AAAAAA',
      fontSize: 13,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    rotateActionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    rotateActionText: {
      color: '#2196F3',
      fontSize: 13,
      fontWeight: '500',
    },
    ratioRow: {
      flexDirection: 'row',
      gap: 10,
    },
    ratioChip: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: '#2A2A2A',
      alignItems: 'center',
      justifyContent: 'center',
    },
    ratioChipActive: {
      backgroundColor: theme.colors.primary,
    },
    ratioChipText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '600',
    },
    ratioChipTextActive: {
      color: '#FFFFFF',
    },
    trimContainer: {
      gap: 14,
    },
    trimHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    trimDurationBadge: {
      color: '#2196F3',
      fontSize: 13,
      fontWeight: '600',
    },
    trimTrack: {
      height: 28,
      backgroundColor: '#2A2A2A',
      borderRadius: 6,
      overflow: 'hidden',
      position: 'relative',
    },
    trimSelectedRange: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      backgroundColor: theme.colors.primary,
      opacity: 0.7,
      borderLeftWidth: 3,
      borderRightWidth: 3,
      borderColor: '#FFFFFF',
    },
    trimButtonsRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 8,
    },
    trimAdjBtn: {
      backgroundColor: '#2A2A2A',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
    },
    trimBtnText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '500',
    },
  });
