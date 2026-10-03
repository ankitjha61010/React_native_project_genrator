import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Image,
  TouchableOpacity,
  Modal,
  ScrollView,
  Dimensions,
  PanResponder,
  ActivityIndicator,
  type GestureResponderEvent,
  type PanResponderGestureState,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
{{#if CHAT}}
import Video, { type VideoRef } from 'react-native-video';
import { trim as trimVideo } from 'react-native-video-trim';
{{/if}}
import { AppText } from '{{IMPORT:components.AppText}}';
{{#if VECTOR_ICONS}}
import { AppIcon } from '{{IMPORT:components.AppIcon}}';
{{/if}}
{{#if RTL}}
import { useDirection } from '{{IMPORT:hooks.useDirection}}';
{{/if}}
import { useStyles } from '{{IMPORT:hooks.useTheme}}';
import type { Theme } from '{{IMPORT:theme.index}}';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
/** The image preview fills this width minus outer padding */
const PREVIEW_W = SCREEN_WIDTH - 32;
const PREVIEW_H = 320;
const MIN_CROP = 60; // px – smallest allowed crop dimension
/** Shortest video that can be sent after trimming (seconds). */
const MIN_TRIM = 1;
const TRIM_HANDLE_W = 18;
const TRIM_TRACK_H = 56;

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
  /** Video: the part to keep (seconds from the start). `duration` = trimEnd − trimStart. */
  trimStart?: number;
  trimEnd?: number;
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

// ─── video trimmer ───────────────────────────────────────────────────────────

/** 0:07 / 1:05.3 style label. */
function formatTrimTime(seconds: number, precise = false) {
  const m = Math.floor(seconds / 60);
  const rest = seconds - m * 60;
  const s = precise ? rest.toFixed(1).padStart(4, '0') : Math.floor(rest).toString().padStart(2, '0');
  return `${m}:${s}`;
}

type TrimDrag = 'start' | 'end' | 'window';

interface VideoTrimmerProps {
  duration: number;
  start: number;
  end: number;
  /** Current playback position, drawn as a thin line inside the selection. */
  playhead?: number;
  onChange: (start: number, end: number, dragging: TrimDrag) => void;
  onDragEnd?: () => void;
  styles: ReturnType<typeof createStyles>;
}

/**
 * Drag the left / right handles to choose where the video starts and ends,
 * or drag the selected part itself to slide the whole window.
 */
function VideoTrimmer({ duration, start, end, playhead, onChange, onDragEnd, styles }: VideoTrimmerProps) {
  const [trackW, setTrackW] = useState(1);
  // Latest values for the PanResponder closures (created once).
  const latest = useRef({ duration, start, end, trackW, onChange, onDragEnd });
  latest.current = { duration, start, end, trackW, onChange, onDragEnd };
  const dragStart = useRef({ start: 0, end: 0 });

  const makeTrimPan = useCallback(
    (kind: TrimDrag) =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        // Keep the drag even if the finger wanders vertically over the ScrollView.
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          dragStart.current = { start: latest.current.start, end: latest.current.end };
        },
        onPanResponderMove: (_: GestureResponderEvent, gs: PanResponderGestureState) => {
          const { duration: total, trackW: width, onChange: change } = latest.current;
          const usable = Math.max(1, width - TRIM_HANDLE_W * 2);
          const delta = (gs.dx / usable) * total;
          const s0 = dragStart.current.start;
          const e0 = dragStart.current.end;
          const minLen = Math.min(MIN_TRIM, total);
          if (kind === 'start') {
            change(clamp(s0 + delta, 0, e0 - minLen), e0, kind);
          } else if (kind === 'end') {
            change(s0, clamp(e0 + delta, s0 + minLen, total), kind);
          } else {
            const len = e0 - s0;
            const nextStart = clamp(s0 + delta, 0, total - len);
            change(nextStart, nextStart + len, kind);
          }
        },
        onPanResponderRelease: () => latest.current.onDragEnd?.(),
        onPanResponderTerminate: () => latest.current.onDragEnd?.(),
      }),
    [],
  );
  const startPan = useMemo(() => makeTrimPan('start'), [makeTrimPan]);
  const endPan = useMemo(() => makeTrimPan('end'), [makeTrimPan]);
  const windowPan = useMemo(() => makeTrimPan('window'), [makeTrimPan]);

  const usable = Math.max(1, trackW - TRIM_HANDLE_W * 2);
  const total = Math.max(duration, 0.001);
  const left = (start / total) * usable;
  const right = (end / total) * usable + TRIM_HANDLE_W * 2;
  const playheadX = playhead !== undefined && playhead >= start && playhead <= end ? (playhead / total) * usable + TRIM_HANDLE_W : null;

  return (
    <View style={styles.trimmerTrack} onLayout={e => setTrackW(e.nativeEvent.layout.width)}>
      {/* Film strip look */}
      <View style={styles.filmStrip} pointerEvents="none">
        {Array.from({ length: 14 }).map((_, i) => (
          <View key={i} style={[styles.filmFrame, i % 2 === 1 && styles.filmFrameAlt]} />
        ))}
      </View>

      {/* Cut-away parts */}
      <View pointerEvents="none" style={[styles.trimDim, { left: 0, width: left + TRIM_HANDLE_W / 2 }]} />
      <View pointerEvents="none" style={[styles.trimDim, { left: right - TRIM_HANDLE_W / 2, right: 0 }]} />

      {/* Selected part: drag to slide it */}
      <View {...windowPan.panHandlers} style={[styles.trimWindow, { left, width: right - left }]}>
        {playheadX !== null ? <View pointerEvents="none" style={[styles.playhead, { left: playheadX - left - 1 }]} /> : null}
      </View>

      {/* Handles (wide touch area, slim look) */}
      <View {...startPan.panHandlers} hitSlop={ { left: 14, right: 6, top: 10, bottom: 10 } } style={[styles.trimHandle, styles.trimHandleStart, { left }]}>
        <View style={styles.trimGrip} />
      </View>
      <View {...endPan.panHandlers} hitSlop={ { left: 6, right: 14, top: 10, bottom: 10 } } style={[styles.trimHandle, styles.trimHandleEnd, { left: right - TRIM_HANDLE_W }]}>
        <View style={styles.trimGrip} />
      </View>
    </View>
  );
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
  // React Native's SafeAreaView pads on iOS only – Android (edge-to-edge) drew the header under the status bar.
  const insets = useSafeAreaInsets();
{{#if RTL}}
  // A Modal is a separate native root – it needs the app's direction explicitly.
  const { directionStyle } = useDirection();
{{/if}}

  // ── editor state ──────────────────────────────────────────────────────────
  const [rotation, setRotation] = useState(0);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('free');
  const [filter, setFilter] = useState<FilterId>('normal');
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(media?.duration || 15);
  /** Real length once the player has loaded it (the picker's value can be missing). */
  const [videoDuration, setVideoDuration] = useState(media?.duration || 15);
{{#if CHAT}}
  const videoRef = useRef<VideoRef>(null);
  const [playing, setPlaying] = useState(false);
  const [playhead, setPlayhead] = useState(0);
  const trimRef = useRef({ start: 0, end: media?.duration || 15 });
  trimRef.current = { start: trimStart, end: trimEnd };
{{/if}}
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
      setVideoDuration(media.duration || 15);
{{#if CHAT}}
      setPlaying(false);
      setPlayhead(0);
{{/if}}
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
      const start = Math.round(trimStart * 10) / 10;
      const end = Math.round(trimEnd * 10) / 10;
      const trimmed = { ...media, trimStart: start, trimEnd: end, duration: Math.max(MIN_TRIM, Math.round(end - start)) };
{{#if CHAT}}
      // Only the selected part is sent: cut it into a new file on the device (react-native-video-trim / FFmpeg).
      const cut = start > 0.05 || end < videoDuration - 0.05;
      if (cut) {
        setIsProcessing(true);
        try {
          const result = await trimVideo(toFileUri(media.uri), {
            startTime: Math.round(start * 1000),
            endTime: Math.round(end * 1000),
            type: 'video',
            outputExt: 'mp4',
            saveToPhoto: false,
            // Frame-accurate cut (re-encodes with the hardware encoder) – stream copy can drift to a keyframe.
            enablePreciseTrimming: true,
          });
          if (!result.success || !result.outputPath) throw new Error('Trim failed');
          onSend({
            ...trimmed,
            uri: toFileUri(result.outputPath),
            fileName: `video_${Date.now()}.mp4`,
            // The cut file is smaller – the upload reports its real size.
            fileSize: undefined,
            // The file now holds only the selected part.
            trimStart: 0,
            trimEnd: Math.max(MIN_TRIM, result.duration / 1000),
            duration: Math.max(MIN_TRIM, Math.round(result.duration / 1000)),
          });
          onClose();
        } catch (e) {
          console.warn('[MediaEditorModal] Failed to trim video', e);
        } finally {
          setIsProcessing(false);
        }
        return;
      }
{{/if}}
      onSend(trimmed);
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
  const previewImage = useImage(media && media.type !== 'video' ? toFileUri(media.uri) : null);

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
  const totalDuration = videoDuration;

  /** Dragging a trim handle shows that frame; sliding the window shows its first frame. */
  const changeTrim = (start: number, end: number, dragging: TrimDrag) => {
    setTrimStart(start);
    setTrimEnd(end);
{{#if CHAT}}
    setPlaying(false);
    videoRef.current?.seek(dragging === 'end' ? end : start);
{{/if}}
  };
  const nudge = (edge: 'start' | 'end', by: number) => {
    const minLen = Math.min(MIN_TRIM, totalDuration);
    if (edge === 'start') changeTrim(clamp(trimStart + by, 0, trimEnd - minLen), trimEnd, 'start');
    else changeTrim(trimStart, clamp(trimEnd + by, trimStart + minLen, totalDuration), 'end');
  };
  const { x: cx, y: cy, w: cw, h: ch } = cropBox;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={handleClose}>
      <View style={[styles.container, {{#if RTL}}directionStyle, {{/if}}{ paddingTop: insets.top, paddingBottom: insets.bottom }]}>

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
{{#if CHAT}}
            {isVideo ? (
              /* Plays only the selected part, on a loop – tap to play / pause. */
              <TouchableOpacity activeOpacity={1} style={styles.previewImage} onPress={() => setPlaying(p => !p)}>
                <Video
                  ref={videoRef}
                  source={ { uri: media.uri } }
                  style={styles.previewImage}
                  resizeMode="contain"
                  paused={!playing}
                  muted={false}
                  progressUpdateInterval={100}
                  onLoad={data => {
                    if (!data.duration) return;
                    setVideoDuration(data.duration);
                    // The picker's duration was missing / rounded – select the whole video.
                    setTrimEnd(end => (end > data.duration || !media.duration ? data.duration : end));
                    videoRef.current?.seek(trimRef.current.start);
                  }}
                  onProgress={({ currentTime }) => {
                    setPlayhead(currentTime);
                    if (currentTime >= trimRef.current.end) videoRef.current?.seek(trimRef.current.start);
                  }}
                  onEnd={() => videoRef.current?.seek(trimRef.current.start)}
                  repeat
                />
              </TouchableOpacity>
            ) : (
              /* Fixed background image — NOT wrapped in any pan responder */
              <Image
                source={{ uri: media.uri }}
                style={[
                  styles.previewImage,
                  { transform: [{ rotate: `${rotation}deg` }] },
                ]}
                resizeMode="cover"
              />
            )}
{{else}}
            {/* Fixed background image — NOT wrapped in any pan responder */}
            <Image
              source={{ uri: media.uri }}
              style={[
                styles.previewImage,
                { transform: [{ rotate: `${rotation}deg` }] },
              ]}
              resizeMode="cover"
            />
{{/if}}

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
            {isVideo{{#if CHAT}} && !playing{{/if}} && (
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
                <AppText style={styles.controlSectionTitle}>Trim Video</AppText>
                <AppText style={styles.trimDurationBadge}>
                  {formatTrimTime(Math.max(0, trimEnd - trimStart), true)}
                </AppText>
              </View>

              <VideoTrimmer
                duration={totalDuration}
                start={trimStart}
                end={trimEnd}
{{#if CHAT}}
                playhead={playing ? playhead : undefined}
{{/if}}
                onChange={changeTrim}
                styles={styles}
              />

              <View style={styles.trimTimesRow}>
                <AppText style={styles.trimTime}>{formatTrimTime(trimStart, true)}</AppText>
                <AppText style={styles.trimHint}>Drag the handles or slide the selection</AppText>
                <AppText style={styles.trimTime}>{formatTrimTime(trimEnd, true)}</AppText>
              </View>

              {/* Fine-tune: ±0.5 s */}
              <View style={styles.trimButtonsRow}>
                <View style={styles.nudgeGroup}>
                  <TouchableOpacity style={styles.nudgeBtn} onPress={() => nudge('start', -0.5)} accessibilityLabel="Start earlier">
                    <AppText style={styles.trimBtnText}>‹</AppText>
                  </TouchableOpacity>
                  <AppText style={styles.nudgeLabel}>Start</AppText>
                  <TouchableOpacity style={styles.nudgeBtn} onPress={() => nudge('start', 0.5)} accessibilityLabel="Start later">
                    <AppText style={styles.trimBtnText}>›</AppText>
                  </TouchableOpacity>
                </View>
                <View style={styles.nudgeGroup}>
                  <TouchableOpacity style={styles.nudgeBtn} onPress={() => nudge('end', -0.5)} accessibilityLabel="End earlier">
                    <AppText style={styles.trimBtnText}>‹</AppText>
                  </TouchableOpacity>
                  <AppText style={styles.nudgeLabel}>End</AppText>
                  <TouchableOpacity style={styles.nudgeBtn} onPress={() => nudge('end', 0.5)} accessibilityLabel="End later">
                    <AppText style={styles.trimBtnText}>›</AppText>
                  </TouchableOpacity>
                </View>
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
      </View>
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
    trimmerTrack: {
      height: TRIM_TRACK_H,
      borderRadius: 10,
      backgroundColor: '#1E1E1E',
      overflow: 'visible',
      justifyContent: 'center',
    },
    filmStrip: {
      ...StyleSheet.absoluteFill,
      flexDirection: 'row',
      marginHorizontal: TRIM_HANDLE_W,
      borderRadius: 4,
      overflow: 'hidden',
    },
    filmFrame: {
      flex: 1,
      backgroundColor: '#3A3A3A',
    },
    filmFrameAlt: {
      backgroundColor: '#454545',
    },
    trimDim: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      backgroundColor: '#000000B3',
    },
    trimWindow: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      borderTopWidth: 3,
      borderBottomWidth: 3,
      borderColor: '#FFC107',
    },
    playhead: {
      position: 'absolute',
      top: 2,
      bottom: 2,
      width: 2,
      borderRadius: 1,
      backgroundColor: '#FFFFFF',
    },
    trimHandle: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      width: TRIM_HANDLE_W,
      backgroundColor: '#FFC107',
      alignItems: 'center',
      justifyContent: 'center',
    },
    trimHandleStart: {
      borderTopLeftRadius: 10,
      borderBottomLeftRadius: 10,
    },
    trimHandleEnd: {
      borderTopRightRadius: 10,
      borderBottomRightRadius: 10,
    },
    trimGrip: {
      width: 3,
      height: 20,
      borderRadius: 2,
      backgroundColor: '#00000099',
    },
    trimTimesRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    trimTime: {
      color: '#FFFFFF',
      fontSize: 12,
      fontVariant: ['tabular-nums'],
    },
    trimHint: {
      color: '#888888',
      fontSize: 11,
    },
    trimButtonsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    nudgeGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#2A2A2A',
      borderRadius: 18,
      paddingHorizontal: 4,
    },
    nudgeBtn: {
      width: 32,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
    },
    nudgeLabel: {
      color: '#BBBBBB',
      fontSize: 12,
      minWidth: 36,
      textAlign: 'center',
    },
    trimBtnText: {
      color: '#FFFFFF',
      fontSize: 20,
      fontWeight: '500',
    },
  });
