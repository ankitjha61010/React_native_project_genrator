// ─── Audio Call Screen ────────────────────────────────────────────────────────
// Active audio call UI with mute, speaker toggle, end call, and call timer.
// The screen can be minimized – the call continues in background.
// Group calls show everyone in the call (you included) as named avatars.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  AppState,
  type AppStateStatus,
} from 'react-native';
import { AppIcon, type AppIconName } from '{{IMPORT:components.AppIcon}}';
import type { ActiveCallState } from '../types/calling.types';

interface Props {
  state: ActiveCallState;
  callerName: string;
  callerAvatar?: string;
  timer?: string;
  onHangUp: () => void;
  onToggleMute: () => void;
  onToggleSpeaker: () => void;
  /** Called when the user minimizes (presses Home / back). Call continues. */
  onMinimize?: () => void;
}

function useCallTimer(active: boolean): string {
  const [seconds, setSeconds] = useState(0);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (active) {
      ref.current = setInterval(() => setSeconds(s => s + 1), 1000);
    } else {
      if (ref.current) clearInterval(ref.current);
      setSeconds(0);
    }
    return () => { if (ref.current) clearInterval(ref.current); };
  }, [active]);

  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export function AudioCallScreen({ state, callerName, timer: propTimer, onHangUp, onToggleMute, onToggleSpeaker, onMinimize }: Props) {
  const localTimer = useCallTimer(state.status === 'connected');
  const timer = propTimer ?? localTimer;

  // When app goes to background, call stays alive (Agora engine runs in native layer).
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'background') {
        // Nothing extra needed – Agora holds the channel.
        // CallKeep shows the "ongoing call" notification on Android.
      }
    });
    return () => sub.remove();
  }, []);

  const isGroup = Boolean(state.call?.isGroupCall) || state.remoteUids.length > 1;
  const people = [
    { key: 'local', name: 'You', avatar: null as string | null | undefined, muted: state.isMuted },
    ...state.remoteUids.map(uid => ({
      key: String(uid),
      name: state.remoteUsers?.[uid]?.name ?? 'Participant',
      avatar: state.remoteUsers?.[uid]?.avatar,
      muted: false,
    })),
  ];

  const statusLabel =
    state.status === 'initiating' ? 'Calling…'
    : state.status === 'ringing' ? 'Ringing…'
    : state.status === 'connecting' ? 'Connecting…'
    : state.status === 'reconnecting' ? 'Reconnecting…'
    : timer;

  return (
    <View style={styles.container}>
      {/* Status bar area */}
      <View style={styles.header}>
        {onMinimize && (
          <TouchableOpacity onPress={onMinimize} style={styles.minimizeBtn} accessibilityLabel="Minimize call">
            <AppIcon name="chevron-down" size={28} tintColor="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {isGroup ? (
        <View style={styles.groupSection}>
          <Text style={styles.callerName} numberOfLines={1}>{callerName}</Text>
          <Text style={styles.statusText}>{statusLabel} · {people.length} in call</Text>
          <ScrollView contentContainerStyle={styles.groupGrid} showsVerticalScrollIndicator={false}>
            {people.map(person => (
              <View key={person.key} style={styles.person}>
                <View>
                  {person.avatar ? (
                    <Image source={{ uri: person.avatar }} style={styles.personAvatar} />
                  ) : (
                    <View style={[styles.personAvatar, styles.personAvatarFallback]}>
                      <Text style={styles.personInitial}>{person.name.charAt(0).toUpperCase()}</Text>
                    </View>
                  )}
                  {person.muted ? (
                    <View style={styles.personMuted}>
                      <AppIcon name="microphone-off" size={12} tintColor="#fff" />
                    </View>
                  ) : null}
                </View>
                <Text style={styles.personName} numberOfLines={1}>{person.name}</Text>
              </View>
            ))}
            {people.length === 1 ? <Text style={styles.participantsText}>Waiting for others to join…</Text> : null}
          </ScrollView>
        </View>
      ) : (
      <View style={styles.callerSection}>
        <View style={styles.avatarRing}>
          <View style={styles.avatarInner}>
            <Text style={styles.avatarInitial}>{callerName.charAt(0).toUpperCase()}</Text>
          </View>
        </View>
        <Text style={styles.callerName}>{callerName}</Text>
        <Text style={styles.statusText}>{statusLabel}</Text>
      </View>
      )}

      {/* Controls */}
      <View style={styles.controls}>
        <ControlButton
          icon={state.isMuted ? 'microphone-off' : 'microphone'}
          label={state.isMuted ? 'Unmute' : 'Mute'}
          onPress={onToggleMute}
          active={state.isMuted}
          accessibilityLabel={state.isMuted ? 'Unmute microphone' : 'Mute microphone'}
        />
        <ControlButton
          icon={state.isSpeaker ? 'volume-high' : 'volume-medium'}
          label={state.isSpeaker ? 'Speaker' : 'Earpiece'}
          onPress={onToggleSpeaker}
          active={state.isSpeaker}
          accessibilityLabel="Toggle speaker"
        />
        <ControlButton
          icon="phone-hangup"
          label="End"
          onPress={onHangUp}
          isEnd
          accessibilityLabel="End call"
        />
      </View>
    </View>
  );
}

interface ControlButtonProps {
  icon: AppIconName;
  label: string;
  onPress: () => void;
  active?: boolean;
  isEnd?: boolean;
  accessibilityLabel: string;
}

function ControlButton({ icon, label, onPress, active, isEnd, accessibilityLabel }: ControlButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.ctrlBtn, isEnd ? styles.endBtn : active ? styles.activeBtn : styles.inactiveBtn]}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
    >
      <AppIcon name={icon} size={28} tintColor="#fff" />
      <Text style={styles.ctrlLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0e1a',
    justifyContent: 'space-between',
    paddingBottom: 56,
  },
  header: {
    paddingTop: 56,
    paddingHorizontal: 24,
    alignItems: 'flex-start',
  },
  minimizeBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  callerSection: {
    alignItems: 'center',
    gap: 12,
  },
  avatarRing: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    borderColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6366f1',
    shadowOpacity: 0.6,
    shadowRadius: 28,
    elevation: 20,
  },
  avatarInner: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#1e1b4b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: { fontSize: 52, fontWeight: '700', color: '#a5b4fc' },
  callerName: { fontSize: 26, fontWeight: '700', color: '#fff', letterSpacing: 0.2 },
  statusText: { fontSize: 15, color: 'rgba(255,255,255,0.5)', fontVariant: ['tabular-nums'] },
  participantsText: { fontSize: 13, color: 'rgba(255,255,255,0.4)', width: '100%', textAlign: 'center', marginTop: 8 },
  groupSection: { flex: 1, alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingTop: 12 },
  groupGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', paddingTop: 24, paddingBottom: 24 },
  person: { width: '33.33%', alignItems: 'center', gap: 8, marginBottom: 20 },
  personAvatar: { width: 76, height: 76, borderRadius: 38 },
  personAvatarFallback: { backgroundColor: '#1e1b4b', borderWidth: 2, borderColor: '#6366f1', alignItems: 'center', justifyContent: 'center' },
  personInitial: { fontSize: 30, fontWeight: '700', color: '#a5b4fc' },
  personMuted: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  personName: { fontSize: 13, color: '#fff', fontWeight: '600', maxWidth: 96 },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    paddingHorizontal: 24,
  },
  ctrlBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  inactiveBtn: { backgroundColor: 'rgba(255,255,255,0.1)' },
  activeBtn: { backgroundColor: '#6366f1' },
  endBtn: {
    backgroundColor: '#ef4444',
    shadowColor: '#ef4444',
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 10,
  },
  ctrlLabel: { fontSize: 11, color: '#fff', fontWeight: '500' },
});
