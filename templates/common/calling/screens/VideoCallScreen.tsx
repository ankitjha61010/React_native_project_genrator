// ─── Video Call Screen ────────────────────────────────────────────────────────
// Active video call UI with local preview, remote video tiles, camera/mute/end.
// Supports minimize (picture-in-picture style), camera flip, and speaker.
// Your own camera preview can be dragged anywhere and glides to the nearest side.
// Like WhatsApp: nobody in yet → your camera full screen; one other person → them full screen, you in a draggable
// window; three or more people → everyone (you included) in a grid of named tiles.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  AppState,
  Platform,
  useWindowDimensions,
  type AppStateStatus,
} from 'react-native';
import { GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Reanimated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RtcSurfaceView, RtcTextureView, VideoSourceType } from 'react-native-agora';
import { AppIcon, type AppIconName } from '{{IMPORT:components.AppIcon}}';
import type { ActiveCallState } from '../types/calling.types';
import { useFloatingDrag } from '../hooks/useFloatingDrag';

const PREVIEW_EDGE = 16;

interface Props {
  state: ActiveCallState;
  localUid?: number;
  callerName: string;
  timer?: string;
  onHangUp: () => void;
  onToggleMute: () => void;
  onToggleSpeaker: () => void;
  onToggleCamera: () => void;
  onFlipCamera: () => void;
  onMinimize?: () => void;
}

export function VideoCallScreen({
  state,
  localUid = state.agoraToken?.uid ?? 0,
  callerName,
  timer,
  onHangUp,
  onToggleMute,
  onToggleSpeaker,
  onToggleCamera,
  onFlipCamera,
  onMinimize,
}: Props) {
  const [showControls, setShowControls] = useState(true);
  const insets = useSafeAreaInsets();
  // Your camera: starts top-right, drag it anywhere – it settles on the nearest side.
  const preview = useFloatingDrag({
    margins: { top: insets.top + PREVIEW_EDGE, bottom: insets.bottom + PREVIEW_EDGE, left: insets.left + PREVIEW_EDGE, right: insets.right + PREVIEW_EDGE },
    initial: (size, screen) => ({ x: screen.width - size.width - PREVIEW_EDGE, y: insets.top + 72 }),
    snapToSides: true,
  });

  useEffect(() => {
    const sub = AppState.addEventListener('change', (_next: AppStateStatus) => {
      // Agora holds the channel in the native layer – no action needed.
    });
    return () => sub.remove();
  }, []);

  // Auto-hide controls after 4s
  useEffect(() => {
    if (!showControls) return;
    const t = setTimeout(() => setShowControls(false), 4000);
    return () => clearTimeout(t);
  }, [showControls]);

  const firstRemote = state.remoteUids[0];
  const isGroup = Boolean(state.call?.isGroupCall) || state.remoteUids.length > 1;
  const inCall = state.remoteUids.length + 1;
  const useGrid = state.remoteUids.length >= 2;
  const waitingText = isGroup
    ? 'Waiting for others to join…'
    : state.outgoing && state.status !== 'connected'
      ? 'Calling…'
      : 'Connecting…';

  return (
    // The call screen is a Modal – a separate native root that needs its own gesture root.
    <GestureHandlerRootView style={styles.root}>
    <TouchableOpacity
      style={styles.container}
      activeOpacity={1}
      onPress={() => setShowControls(c => !c)}
      accessible={false}
    >
      {useGrid ? (
        <GroupVideoGrid state={state} localUid={localUid} topInset={insets.top} bottomInset={insets.bottom} />
      ) : firstRemote !== undefined ? (
        state.remoteVideoOff?.includes(firstRemote) ? (
          <View style={[styles.remoteVideo, styles.noRemotePlaceholder]}>
            <Avatar name={state.remoteUsers?.[firstRemote]?.name ?? callerName} uri={state.remoteUsers?.[firstRemote]?.avatar} size={96} />
            <Text style={styles.noRemoteText}>{state.remoteUsers?.[firstRemote]?.name ?? callerName}</Text>
            <Text style={styles.connectingText}>Camera off</Text>
          </View>
        ) : (
          <RtcSurfaceView
            canvas={{ uid: firstRemote, sourceType: VideoSourceType.VideoSourceRemote }}
            style={styles.remoteVideo}
          />
        )
      ) : (
        // Nobody else yet: your own camera full screen while it rings.
        <>
          {state.isCameraOff ? (
            <View style={[styles.remoteVideo, styles.noRemotePlaceholder]} />
          ) : (
            <RtcSurfaceView
              canvas={{ uid: localUid, sourceType: VideoSourceType.VideoSourceCamera }}
              style={styles.remoteVideo}
            />
          )}
          <View style={styles.waitingOverlay} pointerEvents="none">
            <Text style={styles.noRemoteText}>{callerName}</Text>
            <Text style={styles.waitingText}>{waitingText}</Text>
          </View>
        </>
      )}

      {/* Your camera in a small draggable window – only next to one other person's full-screen video */}
      {!useGrid && firstRemote !== undefined && !state.isCameraOff && (
        <GestureDetector gesture={preview.gesture}>
          <Reanimated.View style={[styles.localPreviewWrapper, preview.style]} onLayout={preview.onLayout}>
            <RtcSurfaceView
              canvas={{ uid: localUid, sourceType: VideoSourceType.VideoSourceCamera }}
              style={styles.localPreview}
              // Draw above the full-screen remote video (Android SurfaceView ordering).
              zOrderMediaOverlay
            />
          </Reanimated.View>
        </GestureDetector>
      )}

      {showControls && (
        <>
          {/* Top bar */}
          <View style={styles.topBar}>
            {onMinimize && (
              <TouchableOpacity onPress={onMinimize} accessibilityLabel="Minimize call">
                <AppIcon name="chevron-down" size={30} tintColor="#fff" />
              </TouchableOpacity>
            )}
            <View style={styles.topCenter}>
              <Text style={styles.topCallerName} numberOfLines={1}>{callerName}</Text>
              {timer || isGroup ? (
                <Text style={styles.topTimer}>
                  {[timer, isGroup ? `${inCall} in call` : null].filter(Boolean).join(' · ')}
                </Text>
              ) : null}
            </View>
            <TouchableOpacity onPress={onFlipCamera} accessibilityLabel="Flip camera">
              <AppIcon name="camera-flip-outline" size={26} tintColor="#fff" />
            </TouchableOpacity>
          </View>

          {/* Bottom controls */}
          <View style={styles.controls}>
            <CtrlBtn icon={state.isMuted ? 'microphone-off' : 'microphone'} label={state.isMuted ? 'Unmute' : 'Mute'} onPress={onToggleMute} active={state.isMuted} />
            <CtrlBtn icon={state.isCameraOff ? 'video-off' : 'video'} label={state.isCameraOff ? 'Camera' : 'Camera off'} onPress={onToggleCamera} active={state.isCameraOff} />
            <CtrlBtn icon="phone-hangup" label="End" onPress={onHangUp} isEnd />
            <CtrlBtn icon={state.isSpeaker ? 'volume-high' : 'volume-medium'} label="Speaker" onPress={onToggleSpeaker} active={state.isSpeaker} />
          </View>
        </>
      )}
    </TouchableOpacity>
    </GestureHandlerRootView>
  );
}

// ── Group grid ───────────────────────────────────────────────────────────────

interface Tile {
  key: string;
  uid: number;
  local: boolean;
  name: string;
  avatar?: string | null;
  videoOff: boolean;
}

/**
 * Rows of the grid, filling the screen: 1–2 people stacked, up to 6 two per row, more three per row. The first row
 * takes the odd ones full width (3 people: one on top, two below) – no half-empty row.
 */
function gridRows<T>(tiles: T[]): T[][] {
  const perRow = tiles.length <= 2 ? 1 : tiles.length <= 6 ? 2 : 3;
  const firstRow = tiles.length - perRow * (Math.ceil(tiles.length / perRow) - 1);
  const rows = [tiles.slice(0, firstRow)];
  for (let i = firstRow; i < tiles.length; i += perRow) rows.push(tiles.slice(i, i + perRow));
  return rows;
}

/** Most rows on screen at once – more scroll. */
const MAX_VISIBLE_ROWS = 4;

/**
 * Android: TextureView – SurfaceViews are separate native layers that don't clip, scroll or stack inside a grid
 * (tiles overlap or land in the wrong place). iOS renders either correctly.
 */
const GridVideoView = Platform.OS === 'android' ? RtcTextureView : RtcSurfaceView;

function GroupVideoGrid({
  state,
  localUid,
  topInset,
  bottomInset,
}: {
  state: ActiveCallState;
  localUid: number;
  topInset: number;
  bottomInset: number;
}) {
  const { height } = useWindowDimensions();
  const tiles: Tile[] = [
    { key: 'local', uid: localUid, local: true, name: 'You', videoOff: state.isCameraOff },
    ...state.remoteUids.map(uid => ({
      key: String(uid),
      uid,
      local: false,
      name: state.remoteUsers?.[uid]?.name ?? 'Participant',
      avatar: state.remoteUsers?.[uid]?.avatar,
      videoOff: state.remoteVideoOff?.includes(uid) ?? false,
    })),
  ];
  const rows = gridRows(tiles);
  const rowHeight = Math.floor((height - topInset - bottomInset) / Math.min(rows.length, MAX_VISIBLE_ROWS));

  return (
    <ScrollView
      style={StyleSheet.absoluteFill}
      contentContainerStyle={{ paddingTop: topInset, paddingBottom: bottomInset }}
      scrollEnabled={rows.length > MAX_VISIBLE_ROWS}
      showsVerticalScrollIndicator={false}
    >
      {rows.map(row => (
        <View key={row.map(tile => tile.key).join('-')} style={[styles.gridRow, { height: rowHeight }]}>
          {row.map(tile => (
            <View key={tile.key} style={styles.tile}>
              <View style={styles.tileInner}>
                {tile.videoOff ? (
                  <View style={styles.tileAvatarWrap}>
                    <Avatar name={tile.name} uri={tile.avatar} size={Math.min(88, rowHeight / 3)} />
                  </View>
                ) : (
                  <GridVideoView
                    canvas={{ uid: tile.uid, sourceType: tile.local ? VideoSourceType.VideoSourceCamera : VideoSourceType.VideoSourceRemote }}
                    style={StyleSheet.absoluteFill}
                  />
                )}
                <View style={styles.tileLabel}>
                  {tile.local && state.isMuted ? <AppIcon name="microphone-off" size={14} tintColor="#fff" /> : null}
                  <Text style={styles.tileName} numberOfLines={1}>{tile.name}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

function Avatar({ name, uri, size }: { name: string; uri?: string | null; size: number }) {
  const round = { width: size, height: size, borderRadius: size / 2 };
  return uri ? (
    <Image source={{ uri }} style={round} />
  ) : (
    <View style={[styles.avatarFallback, round]}>
      <Text style={[styles.avatarInitial, { fontSize: size * 0.4 }]}>{name.charAt(0).toUpperCase()}</Text>
    </View>
  );
}

interface CtrlBtnProps {
  icon: AppIconName;
  label: string;
  onPress: () => void;
  active?: boolean;
  isEnd?: boolean;
}

function CtrlBtn({ icon, label, onPress, active, isEnd }: CtrlBtnProps) {
  return (
    <TouchableOpacity
      style={[styles.ctrlBtn, isEnd ? styles.endBtn : active ? styles.activeBtn : styles.inactiveBtn]}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
    >
      <AppIcon name={icon} size={26} tintColor="#fff" />
      <Text style={styles.ctrlLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { flex: 1, backgroundColor: '#000' },
  remoteVideo: { ...StyleSheet.absoluteFill, zIndex: 0 },
  noRemotePlaceholder: {
    backgroundColor: '#0a0e1a',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    zIndex: 0,
  },
  noRemoteText: { fontSize: 22, fontWeight: '700', color: '#fff' },
  connectingText: { fontSize: 14, color: 'rgba(255,255,255,0.5)' },
  waitingOverlay: {
    position: 'absolute',
    top: '38%',
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 6,
    zIndex: 5,
  },
  waitingText: {
    fontSize: 15,
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowRadius: 6,
  },
  localPreviewWrapper: {
    width: 100,
    height: 150,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    zIndex: 10,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 12,
  },
  localPreview: { flex: 1 },
  gridRow: { flexDirection: 'row' },
  tile: { flex: 1, padding: 2 },
  tileInner: { flex: 1, borderRadius: 10, overflow: 'hidden', backgroundColor: '#1b2133' },
  tileAvatarWrap: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#1b2133',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileLabel: {
    position: 'absolute',
    left: 10,
    bottom: 10,
    maxWidth: '80%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  tileName: { fontSize: 12, fontWeight: '600', color: '#fff' },
  avatarFallback: { backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontWeight: '700', color: '#fff' },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 20,
  },
  topCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 12,
  },
  topCallerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  topTimer: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  controls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    paddingBottom: 48,
    paddingTop: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 20,
  },
  ctrlBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  inactiveBtn: { backgroundColor: 'rgba(255,255,255,0.15)' },
  activeBtn: { backgroundColor: '#6366f1' },
  endBtn: { backgroundColor: '#ef4444', shadowColor: '#ef4444', shadowOpacity: 0.7, shadowRadius: 12, elevation: 8 },
  ctrlLabel: { fontSize: 10, color: '#fff', fontWeight: '500' },
});
