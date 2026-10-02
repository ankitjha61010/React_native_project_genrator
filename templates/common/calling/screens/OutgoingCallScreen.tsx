// ─── Outgoing Call Screen ─────────────────────────────────────────────────────
// Shown while the caller is waiting for the receiver to answer (ringing state).
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import type { CallType } from '../types/calling.types';

interface Props {
  callerName: string;
  callType: CallType;
  onCancel: () => void;
}

export function OutgoingCallScreen({ callerName, callType, onCancel }: Props) {
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [fadeAnim]);

  return (
    <View style={styles.container}>
      <View style={styles.background} />

      <View style={styles.callerInfo}>
        <View style={styles.avatarRing}>
          <View style={styles.avatarInner}>
            <Text style={styles.avatarInitial}>{callerName.charAt(0).toUpperCase()}</Text>
          </View>
        </View>
        <Text style={styles.callerName}>{callerName}</Text>
        <Animated.Text style={[styles.statusText, { opacity: fadeAnim }]}>
          {callType === 'video' ? 'Video calling…' : 'Audio calling…'}
        </Animated.Text>
      </View>

      <TouchableOpacity
        style={styles.cancelBtn}
        onPress={onCancel}
        activeOpacity={0.85}
        accessibilityLabel="Cancel call"
        accessibilityRole="button"
      >
        <Text style={styles.cancelIcon}>✕</Text>
        <Text style={styles.cancelLabel}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 96,
  },
  background: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#0a0e1a',
  },
  callerInfo: { alignItems: 'center', gap: 16 },
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
  callerName: { fontSize: 26, fontWeight: '700', color: '#fff' },
  statusText: { fontSize: 15, color: 'rgba(255,255,255,0.5)' },
  cancelBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    shadowColor: '#ef4444',
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 10,
  },
  cancelIcon: { fontSize: 28, color: '#fff' },
  cancelLabel: { fontSize: 12, color: '#fff', fontWeight: '600' },
});
