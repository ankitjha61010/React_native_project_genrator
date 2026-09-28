import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
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
  ActivityIndicator,
  type GestureResponderEvent,
  type PanResponderGestureState,
} from 'react-native';
import ImageEditor from '@react-native-community/image-editor';
import {
  Canvas,
  ColorMatrix,
  Image as SkiaImage,
  ImageFormat,
  Skia,
  useImage,
} from '@shopify/react-native-skia';
import { Dirs, FileSystem } from 'react-native-file-access';
import { AppText } from '{{IMPORT:components.AppText}}';
{{#if VECTOR_ICONS}}
import { AppIcon } from '{{IMPORT:components.AppIcon}}';
{{/if}}
import { useStyles } from '{{IMPORT:hooks.useTheme}}';
import type { Theme } from '{{IMPORT:theme.index}}';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
/** The image preview fills this width minus outer padding */
const PREVIEW_W = SCREEN_WIDTH - 32;
const PREVIEW_H = 320;
const MIN_CROP = 60; // px – smallest allowed crop dimension

export interface MediaCropData {
  /** Crop box left offset relative to the preview image (0-1 normalised). */
  x: number;
  /** Crop box top offset relative to the preview image (0-1 normalised). */
  y: number;
  width: number;
  height: number;
  aspectRatio: AspectRatio;
  rotation?: number;
  filter?: 'normal' | 'warm' | 'cool' | 'mono';
  /** Pixel size of the cropped output file (the `uri` is already cropped). */
  outputWidth?: number;
  outputHeight?: number;
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

// ─── helpers ────────────────────────────────────────────────────────────────

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

/** Returns fixed crop {x,y,w,h} for non-free aspect ratios (centred on image). */
function presetCrop(ratio: AspectRatio): { x: number; y: number; w: number; h: number } {
  switch (ratio) {
    case '1:1': {
      const s = Math.min(PREVIEW_W, PREVIEW_H);
      return { x: (PREVIEW_W - s) / 2, y: (PREVIEW_H - s) / 2, w: s, h: s };
    }
    case '4:5': {
      const w = PREVIEW_W * 0.8;
      const h = Math.min(PREVIEW_H, w * (5 / 4));
      return { x: (PREVIEW_W - w) / 2, y: (PREVIEW_H - h) / 2, w, h };
    }
    case '16:9': {
      const h = (PREVIEW_W * 9) / 16;
      return { x: 0, y: (PREVIEW_H - h) / 2, w: PREVIEW_W, h };
    }
    case '3:2': {
      const h = (PREVIEW_W * 2) / 3;
      return { x: 0, y: (PREVIEW_H - h) / 2, w: PREVIEW_W, h };
    }
    default:
      return { x: 0, y: 0, w: PREVIEW_W, h: PREVIEW_H };
  }
}

/** Image picker paths may come without a scheme; the native cropper needs one. */
function toFileUri(uri: string) {
  return uri.startsWith('/') ? `file://${uri}` : uri;
}

/**
 * Maps the crop box (preview-frame pixels) to a rect in the source image's pixels.
 * Accounts for `resizeMode="cover"` scaling/offset and the preview rotation
 * (the image view is rotated around the frame centre).
 */
function previewBoxToImageRect(
  box: { x: number; y: number; w: number; h: number },
  rotation: number,
  imgW: number,
  imgH: number,
) {
  const cx = PREVIEW_W / 2;
  const cy = PREVIEW_H / 2;
  const rad = (rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  // Undo the (clockwise) view rotation for each crop-box corner.
  const corners = [
    [box.x, box.y],
    [box.x + box.w, box.y],
    [box.x, box.y + box.h],
    [box.x + box.w, box.y + box.h],
  ].map(([px, py]) => {
    const a = px - cx;
    const b = py - cy;
    return [cx + a * cos + b * sin, cy - a * sin + b * cos];
  });
  const xs = corners.map(c => c[0]);
  const ys = corners.map(c => c[1]);

  // resizeMode="cover": uniform scale so the image fills the frame, centred.
  const scale = Math.max(PREVIEW_W / imgW, PREVIEW_H / imgH);
  const offX = (PREVIEW_W - imgW * scale) / 2;
  const offY = (PREVIEW_H - imgH * scale) / 2;

  const left = clamp((Math.min(...xs) - offX) / scale, 0, imgW);
  const top = clamp((Math.min(...ys) - offY) / scale, 0, imgH);
  const right = clamp((Math.max(...xs) - offX) / scale, 0, imgW);
  const bottom = clamp((Math.max(...ys) - offY) / scale, 0, imgH);

  return {
    x: Math.round(left),
    y: Math.round(top),
    width: Math.max(1, Math.round(right - left)),
    height: Math.max(1, Math.round(bottom - top)),
  };
}

type FilterId = NonNullable<MediaCropData['filter']>;

/**
 * 4×5 colour matrices (RGBA rows, last column is an offset in 0-1).
 * Used for both the live Skia preview and the full-resolution output, so what
 * the user sees is exactly what gets sent.
 */
const FILTER_MATRICES: Record<Exclude<FilterId, 'normal'>, number[]> = {
  warm: [
    1.1, 0, 0, 0, 0.03,
    0, 1.0, 0, 0, 0.01,
    0, 0, 0.85, 0, -0.02,
    0, 0, 0, 1, 0,
  ],
  cool: [
    0.9, 0, 0, 0, -0.02,
    0, 1.0, 0, 0, 0,
    0, 0, 1.15, 0, 0.03,
    0, 0, 0, 1, 0,
  ],
  // True greyscale (Rec. 709 luminance).
  mono: [
    0.2126, 0.7152, 0.0722, 0, 0,
    0.2126, 0.7152, 0.0722, 0, 0,
    0.2126, 0.7152, 0.0722, 0, 0,
    0, 0, 0, 1, 0,
  ],
};

/**
 * Applies a colour filter to every pixel of the image at its full resolution
 * (no screenshot / downscale) and writes the result to a cache file.
 */
async function applyFilterToFile(uri: string, filter: Exclude<FilterId, 'normal'>) {
  const data = await Skia.Data.fromURI(uri);
  const image = Skia.Image.MakeImageFromEncoded(data);
  if (!image) throw new Error('Could not decode image');

  const width = image.width();
  const height = image.height();
  const surface = Skia.Surface.Make(width, height);
  if (!surface) throw new Error('Could not create drawing surface');

  const paint = Skia.Paint();
  paint.setColorFilter(Skia.ColorFilter.MakeMatrix(FILTER_MATRICES[filter]));
  surface.getCanvas().drawImage(image, 0, 0, paint);
  surface.flush();

  const base64 = surface.makeImageSnapshot().encodeToBase64(ImageFormat.JPEG, 95);
  const path = `${Dirs.CacheDir}/media_${Date.now()}.jpg`;
  await FileSystem.writeFile(path, base64, 'base64');
  return { uri: `file://${path}`, width, height };
}

// ─── types ───────────────────────────────────────────────────────────────────

/** Which crop handle the user is currently dragging. */
type HandleId =
  | 'tl' | 'tc' | 'tr'
  | 'ml' | 'mr'
  | 'bl' | 'bc' | 'br';

interface CropBox { x: number; y: number; w: number; h: number }

// ─── component ───────────────────────────────────────────────────────────────

export function MediaEditorModal({
  visible,
  media,
  enableCropper = true,
  onClose,
  onSend,
}: MediaEditorModalProps): React.JSX.Element | null {
  const styles = useStyles(createStyles);

  // ── editor state ──────────────────────────────────────────────────────────
  const [rotation, setRotation] = useState(0);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('free');
  const [filter, setFilter] = useState<FilterId>('normal');
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(media?.duration || 15);
  const [isProcessing, setIsProcessing] = useState(false);

  // ── crop box (pixel-space inside the preview area) ────────────────────────
  // Use both state (for rendering) and ref (for PanResponder closures).
  const initialBox: CropBox = { x: 0, y: 0, w: PREVIEW_W, h: PREVIEW_H };
  const [cropBox, setCropBox] = useState<CropBox>(initialBox);
  const cropBoxRef = useRef<CropBox>(initialBox);

  // Snapshot of the crop box taken when a gesture starts.
  const gestureStart = useRef<CropBox>(initialBox);

  // ── reset when a new image is opened ─────────────────────────────────────
  useEffect(() => {
    if (visible && media) {
      const box: CropBox = { x: 0, y: 0, w: PREVIEW_W, h: PREVIEW_H };
      cropBoxRef.current = box;
      setCropBox(box);
      setRotation(0);
      setAspectRatio('free');
      setFilter('normal');
      setTrimStart(0);
      setTrimEnd(media.duration || 15);
      setIsProcessing(false);
    }
    // Intentionally depend on media?.uri so reopening with a NEW image resets.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, media?.uri]);

  // ── apply preset aspect ratio ─────────────────────────────────────────────
  const applyRatio = useCallback((ratio: AspectRatio) => {
    setAspectRatio(ratio);
    if (ratio === 'free') return;
    const p = presetCrop(ratio);
    const box: CropBox = { x: p.x, y: p.y, w: p.w, h: p.h };
    cropBoxRef.current = box;
    setCropBox(box);
  }, []);

  // ── send ──────────────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!media || isProcessing) return;

    if (media.type === 'video') {
      onSend({ ...media, duration: Math.max(1, trimEnd - trimStart) });
      onClose();
      return;
    }

    const box = cropBoxRef.current;
    const crop: MediaCropData = {
      x: box.x / PREVIEW_W,
      y: box.y / PREVIEW_H,
      width: box.w / PREVIEW_W,
      height: box.h / PREVIEW_H,
      aspectRatio,
      rotation,
      filter,
    };

    if (!enableCropper && filter === 'normal') {
      onSend({ ...media, crop });
      onClose();
      return;
    }

    setIsProcessing(true);
    try {
      // Produce a real edited file so consumers receive the cropped/filtered
      // image, not the original one plus edit metadata.
      let output: { uri: string; width?: number; height?: number; name?: string } = {
        uri: toFileUri(media.uri),
      };

      if (enableCropper) {
        const { width: imgW, height: imgH } = await Image.getSize(output.uri);
        const rect = previewBoxToImageRect(box, rotation, imgW, imgH);
        output = await ImageEditor.cropImage(output.uri, {
          offset: { x: rect.x, y: rect.y },
          size: { width: rect.width, height: rect.height },
          format: 'jpeg',
          quality: 1,
        });
      }

      if (filter !== 'normal') {
        output = { ...output, ...(await applyFilterToFile(output.uri, filter)) };
      }

      onSend({
        ...media,
        uri: output.uri,
        fileName: output.name || media.fileName,
        crop: {
          ...crop,
          // The filter is now part of the file — consumers must not overlay it again.
          filter: 'normal',
          outputWidth: output.width,
          outputHeight: output.height,
        },
      });
      onClose();
    } catch (e) {
      console.warn('[MediaEditorModal] Failed to edit image', e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => onClose();

  // ── live filter preview (Skia, same matrix as the output) ────────────────
  const previewImage = useImage(media ? toFileUri(media.uri) : null);

  // ── PanResponder factory ──────────────────────────────────────────────────
  /**
   * Creates a PanResponder for one of the 8 resize handles.
   * The IMAGE IS NEVER MOVED — only the crop box edges change.
   *
   * Handle IDs (t=top, b=bottom, l=left, r=right, c=center):
   *   tl  tc  tr
   *   ml      mr
   *   bl  bc  br
   */
  const makePan = useCallback((handle: HandleId) =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => aspectRatio === 'free',
      onMoveShouldSetPanResponder:  () => aspectRatio === 'free',
      onPanResponderGrant: () => {
        gestureStart.current = { ...cropBoxRef.current };
      },
      onPanResponderMove: (_: GestureResponderEvent, gs: PanResponderGestureState) => {
        const s = gestureStart.current;
        let { x, y, w, h } = s;
        const dx = gs.dx;
        const dy = gs.dy;

        // Each handle mutates the relevant edge(s).
        if (handle === 'tl') { x += dx; y += dy; w -= dx; h -= dy; }
        if (handle === 'tc') {           y += dy;           h -= dy; }
        if (handle === 'tr') {           y += dy; w += dx;  h -= dy; }
        if (handle === 'ml') { x += dx;           w -= dx;           }
        if (handle === 'mr') {                     w += dx;           }
        if (handle === 'bl') { x += dx;            w -= dx; h += dy;  }
        if (handle === 'bc') {                              h += dy;  }
        if (handle === 'br') {                     w += dx; h += dy;  }

        // Enforce minimum size
        w = Math.max(MIN_CROP, w);
        h = Math.max(MIN_CROP, h);

        // Clamp to preview bounds
        x = clamp(x, 0, PREVIEW_W - MIN_CROP);
        y = clamp(y, 0, PREVIEW_H - MIN_CROP);
        if (x + w > PREVIEW_W) w = PREVIEW_W - x;
        if (y + h > PREVIEW_H) h = PREVIEW_H - y;

        const box: CropBox = { x, y, w, h };
        cropBoxRef.current = box;
        setCropBox(box);
      },
    }),
    // Only recreate when aspect ratio changes (free ↔ preset toggle).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [aspectRatio]
  );

  // Create all 8 handles once (memoised per-ratio).
  const panTL = useMemo(() => makePan('tl'), [makePan]);
  const panTC = useMemo(() => makePan('tc'), [makePan]);
  const panTR = useMemo(() => makePan('tr'), [makePan]);
  const panML = useMemo(() => makePan('ml'), [makePan]);
  const panMR = useMemo(() => makePan('mr'), [makePan]);
  const panBL = useMemo(() => makePan('bl'), [makePan]);
  const panBC = useMemo(() => makePan('bc'), [makePan]);
  const panBR = useMemo(() => makePan('br'), [makePan]);

  if (!media) return null;

  const isVideo = media.type === 'video';
  const totalDuration = media.duration || 15;
  const { x: cx, y: cy, w: cw, h: ch } = cropBox;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={handleClose}>
      <SafeAreaView style={styles.container}>

        {/* ── Top Header ─────────────────────────────────────────────── */}
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

          <TouchableOpacity onPress={handleSend} style={styles.doneBtn} disabled={isProcessing}>
            <AppText style={styles.doneBtnText}>Send</AppText>
            {isProcessing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
{{#if VECTOR_ICONS}}
            ) : (
              <AppIcon name="send" size={16} tintColor="#FFFFFF" />
            )}
{{else}}
            ) : null}
{{/if}}
          </TouchableOpacity>
        </View>

        {/* ── Image Preview + Free Crop Overlay ──────────────────────── */}
        <View style={styles.previewContainer}>
          {/*
            The image is FIXED. It never moves.
            The crop overlay (positioned absolute) indicates the selected region.
            Each handle is draggable and resizes the crop box.
          */}
          <View style={styles.imageFrame} pointerEvents="box-none">
            {/* Fixed background image — NOT wrapped in any pan responder */}
            <Image
              source={{ uri: media.uri }}
              style={[
                styles.previewImage,
                { transform: [{ rotate: `${rotation}deg` }] },
              ]}
              resizeMode="cover"
            />

            {/* Filter preview — drawn on top of the image with the real colour matrix */}
            {!isVideo && filter !== 'normal' && previewImage && (
              <Canvas
                pointerEvents="none"
                style={[StyleSheet.absoluteFill, { transform: [{ rotate: `${rotation}deg` }] }]}>
                <SkiaImage image={previewImage} x={0} y={0} width={PREVIEW_W} height={PREVIEW_H} fit="cover">
                  <ColorMatrix matrix={FILTER_MATRICES[filter]} />
                </SkiaImage>
              </Canvas>
            )}

            {/* Video play indicator */}
            {isVideo && (
              <View style={styles.playOverlay} pointerEvents="none">
{{#if VECTOR_ICONS}}
                <AppIcon name="play-circle" size={48} tintColor="#FFFFFF" />
{{else}}
                <AppText style={{ fontSize: 36, color: '#FFFFFF' }}>▶</AppText>
{{/if}}
              </View>
            )}

            {/* ── Crop overlay (only for images in free mode) ───────── */}
            {!isVideo && enableCropper && (
              <>
                {/* Dimmed areas outside crop box */}
                {/* top */}
                <View style={[styles.dim, { top: 0, left: 0, right: 0, height: cy }]} pointerEvents="none" />
                {/* bottom */}
                <View style={[styles.dim, { top: cy + ch, left: 0, right: 0, bottom: 0 }]} pointerEvents="none" />
                {/* left */}
                <View style={[styles.dim, { top: cy, left: 0, width: cx, height: ch }]} pointerEvents="none" />
                {/* right */}
                <View style={[styles.dim, { top: cy, left: cx + cw, right: 0, height: ch }]} pointerEvents="none" />

                {/* Crop box border */}
                <View
                  pointerEvents="none"
                  style={[
                    styles.cropBorder,
                    { left: cx, top: cy, width: cw, height: ch },
                  ]}
                />

                {/* Rule-of-thirds grid lines */}
                <View pointerEvents="none" style={[styles.gridLineH, { top: cy + ch / 3, left: cx, width: cw }]} />
                <View pointerEvents="none" style={[styles.gridLineH, { top: cy + (ch * 2) / 3, left: cx, width: cw }]} />
                <View pointerEvents="none" style={[styles.gridLineV, { left: cx + cw / 3, top: cy, height: ch }]} />
                <View pointerEvents="none" style={[styles.gridLineV, { left: cx + (cw * 2) / 3, top: cy, height: ch }]} />

                {/* ── 8 draggable handles ─────────────────────────────── */}
                {/* Top-left corner */}
                <View
                  {...panTL.panHandlers}
                  style={[styles.handle, styles.cornerHandle,
                    { top: cy - 10, left: cx - 10, borderTopWidth: 3, borderLeftWidth: 3 }]}
                />
                {/* Top-center edge */}
                <View
                  {...panTC.panHandlers}
                  style={[styles.handle, styles.edgeHandle,
                    { top: cy - 8, left: cx + cw / 2 - 14, width: 28 }]}
                />
                {/* Top-right corner */}
                <View
                  {...panTR.panHandlers}
                  style={[styles.handle, styles.cornerHandle,
                    { top: cy - 10, left: cx + cw - 10, borderTopWidth: 3, borderRightWidth: 3 }]}
                />
                {/* Middle-left edge */}
                <View
                  {...panML.panHandlers}
                  style={[styles.handle, styles.edgeHandle, styles.edgeHandleV,
                    { top: cy + ch / 2 - 14, left: cx - 8, height: 28 }]}
                />
                {/* Middle-right edge */}
                <View
                  {...panMR.panHandlers}
                  style={[styles.handle, styles.edgeHandle, styles.edgeHandleV,
                    { top: cy + ch / 2 - 14, left: cx + cw - 8, height: 28 }]}
                />
                {/* Bottom-left corner */}
                <View
                  {...panBL.panHandlers}
                  style={[styles.handle, styles.cornerHandle,
                    { top: cy + ch - 10, left: cx - 10, borderBottomWidth: 3, borderLeftWidth: 3 }]}
                />
                {/* Bottom-center edge */}
                <View
                  {...panBC.panHandlers}
                  style={[styles.handle, styles.edgeHandle,
                    { top: cy + ch - 8, left: cx + cw / 2 - 14, width: 28 }]}
                />
                {/* Bottom-right corner */}
                <View
                  {...panBR.panHandlers}
                  style={[styles.handle, styles.cornerHandle,
                    { top: cy + ch - 10, left: cx + cw - 10, borderBottomWidth: 3, borderRightWidth: 3 }]}
                />
              </>
            )}
          </View>

          {/* Hint text below the preview */}
          {!isVideo && aspectRatio === 'free' && (
            <AppText style={styles.hintText}>Drag the handles to resize the crop area</AppText>
          )}
        </View>

        {/* ── Controls ────────────────────────────────────────────────── */}
        <View style={styles.controlsSection}>
          {isVideo ? (
            /* Video Trimmer */
            <View style={styles.trimContainer}>
              <View style={styles.trimHeader}>
                <AppText style={styles.controlSectionTitle}>Video Trimming</AppText>
                <AppText style={styles.trimDurationBadge}>
                  {trimStart}s – {trimEnd}s ({Math.max(1, trimEnd - trimStart)}s)
                </AppText>
              </View>

              <View style={styles.trimTrack}>
                <View
                  style={[
                    styles.trimSelectedRange,
                    {
                      left: `${(trimStart / totalDuration) * 100}%` as any,
                      width: `${((trimEnd - trimStart) / totalDuration) * 100}%` as any,
                    },
                  ]}
                />
              </View>

              <View style={styles.trimButtonsRow}>
                <TouchableOpacity style={styles.trimAdjBtn} onPress={() => setTrimStart(p => Math.max(0, p - 1))}>
                  <AppText style={styles.trimBtnText}>– Start</AppText>
                </TouchableOpacity>
                <TouchableOpacity style={styles.trimAdjBtn} onPress={() => setTrimStart(p => Math.min(trimEnd - 1, p + 1))}>
                  <AppText style={styles.trimBtnText}>+ Start</AppText>
                </TouchableOpacity>
                <View style={{ width: 16 }} />
                <TouchableOpacity style={styles.trimAdjBtn} onPress={() => setTrimEnd(p => Math.max(trimStart + 1, p - 1))}>
                  <AppText style={styles.trimBtnText}>– End</AppText>
                </TouchableOpacity>
                <TouchableOpacity style={styles.trimAdjBtn} onPress={() => setTrimEnd(p => Math.min(totalDuration, p + 1))}>
                  <AppText style={styles.trimBtnText}>+ End</AppText>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Aspect Ratio + Rotate */}
              <View style={styles.toolSection}>
                <View style={styles.toolSectionHeader}>
                  <AppText style={styles.controlSectionTitle}>Crop Ratio</AppText>
                  <TouchableOpacity onPress={() => setRotation(r => (r + 90) % 360)} style={styles.rotateActionBtn}>
{{#if VECTOR_ICONS}}
                    <AppIcon name="rotate-right" size={18} tintColor="#2196F3" />
{{/if}}
                    <AppText style={styles.rotateActionText}>Rotate ({rotation}°)</AppText>
                  </TouchableOpacity>
                </View>
                <View style={styles.chipRow}>
                  {(['free', '1:1', '4:5', '16:9', '3:2'] as AspectRatio[]).map(ratio => (
                    <TouchableOpacity
                      key={ratio}
                      style={[styles.chip, aspectRatio === ratio && styles.chipActive]}
                      onPress={() => applyRatio(ratio)}>
                      <AppText style={[styles.chipText, aspectRatio === ratio && styles.chipTextActive]}>
                        {ratio.toUpperCase()}
                      </AppText>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Filters */}
              <View style={styles.toolSection}>
                <AppText style={styles.controlSectionTitle}>Filters</AppText>
                <View style={styles.chipRow}>
                  {(['normal', 'warm', 'cool', 'mono'] as FilterId[]).map(f => (
                    <TouchableOpacity
                      key={f}
                      style={[styles.chip, filter === f && styles.chipActive]}
                      onPress={() => setFilter(f)}>
                      <AppText style={[styles.chipText, filter === f && styles.chipTextActive]}>
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

// ─── styles ───────────────────────────────────────────────────────────────────

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
    // ── Preview ──────────────────────────────────────────────────────────────
    previewContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16,
    },
    imageFrame: {
      width: PREVIEW_W,
      height: PREVIEW_H,
      borderRadius: 10,
      overflow: 'hidden',
      backgroundColor: '#1E1E1E',
      position: 'relative',
    },
    previewImage: {
      // Image is FIXED — fills the frame exactly
      width: '100%',
      height: '100%',
    },
    playOverlay: {
      ...StyleSheet.absoluteFill,
      backgroundColor: '#00000040',
      justifyContent: 'center',
      alignItems: 'center',
    },
    // ── Dim areas outside the crop box ───────────────────────────────────────
    dim: {
      position: 'absolute',
      backgroundColor: 'rgba(0,0,0,0.55)',
    },
    // ── Crop box border ───────────────────────────────────────────────────────
    cropBorder: {
      position: 'absolute',
      borderWidth: 1.5,
      borderColor: '#FFFFFF',
    },
    // ── Grid lines ────────────────────────────────────────────────────────────
    gridLineH: {
      position: 'absolute',
      height: 1,
      backgroundColor: 'rgba(255,255,255,0.3)',
    },
    gridLineV: {
      position: 'absolute',
      width: 1,
      backgroundColor: 'rgba(255,255,255,0.3)',
    },
    // ── Handles ───────────────────────────────────────────────────────────────
    /** Base style shared by all handles */
    handle: {
      position: 'absolute',
      zIndex: 20,
    },
    /** Corner handles — 28×28 px L-shaped border */
    cornerHandle: {
      width: 22,
      height: 22,
      borderColor: '#FFFFFF',
    },
    /** Edge mid-handles — thin pill, horizontal by default */
    edgeHandle: {
      height: 6,
      backgroundColor: '#FFFFFF',
      borderRadius: 3,
    },
    /** Vertical variant for left / right edge handles */
    edgeHandleV: {
      height: 28,
      width: 6,
    },
    hintText: {
      color: '#888888',
      fontSize: 12,
      marginTop: 8,
    },
    // ── Controls section ──────────────────────────────────────────────────────
    controlsSection: {
      backgroundColor: '#1E1E1E',
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      paddingBottom: 28,
      maxHeight: 260,
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
      fontSize: 12,
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
    chipRow: {
      flexDirection: 'row',
      gap: 8,
      flexWrap: 'wrap',
    },
    chip: {
      flex: 1,
      minWidth: 54,
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: '#2A2A2A',
      alignItems: 'center',
      justifyContent: 'center',
    },
    chipActive: {
      backgroundColor: theme.colors.primary,
    },
    chipText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '600',
    },
    chipTextActive: {
      color: '#FFFFFF',
    },
    // ── Video trim ────────────────────────────────────────────────────────────
    trimContainer: { gap: 14 },
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
