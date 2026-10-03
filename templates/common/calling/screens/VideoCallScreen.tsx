// ─── Video Call Screen ────────────────────────────────────────────────────────
// Active video call UI with local preview, remote video tiles, camera/mute/end.
// Supports minimize (picture-in-picture style), camera flip, and speaker.
// Your own camera preview can be dragged anywhere and glides to the nearest side.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  AppState,
  type AppStateStatus,
} from 'react-native';
import { GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Reanimated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RtcSurfaceView, VideoSourceType } from 'react-native-agora';
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
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
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

  return (
    // The call screen is a Modal – a separate native root that needs its own gesture root.
    <GestureHandlerRootView style={styles.root}>
    <TouchableOpacity
      style={styles.container}
      activeOpacity={1}
      onPress={() => setShowControls(c => !c)}
      accessible={false}
    >
      {/* Remote video (full screen) */}
      {firstRemote !== undefined ? (
        <RtcSurfaceView
          canvas={{ uid: firstRemote, sourceType: VideoSourceType.VideoSourceRemote }}
          style={styles.remoteVideo}
        />
      ) : (
        <View style={[styles.remoteVideo, styles.noRemotePlaceholder]}>
          <Text style={styles.noRemoteText}>{callerName}</Text>
          <Text style={styles.connectingText}>{state.status === 'connected' ? 'Connecting video…' : 'Connecting…'}</Text>
        </View>
      )}

      {/* Local preview (PiP) */}
      {!state.isCameraOff && (
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
              {timer ? <Text style={styles.topTimer}>{timer}</Text> : null}
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
