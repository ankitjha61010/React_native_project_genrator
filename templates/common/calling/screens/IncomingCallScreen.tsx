// ─── Incoming Call Screen ─────────────────────────────────────────────────────
// Shown as an overlay when the app receives an incoming call notification
// while the app is in foreground. For background/killed state, the native
// CallKeep screen handles display.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  Vibration,
} from 'react-native';
import { AppIcon, type AppIconName } from '{{IMPORT:components.AppIcon}}';
import type { IncomingCallData } from '../types/calling.types';

interface Props {
  call: IncomingCallData;
  onAnswer: () => void;
  onDecline: () => void;
}

export function IncomingCallScreen({ call, onAnswer, onDecline }: Props) {
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    // Pulse animation on the avatar
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.12, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    // Vibrate pattern for incoming call
    Vibration.vibrate([0, 1000, 1000], true);
    return () => {
      loop.stop();
      Vibration.cancel();
    };
  }, [pulseAnim]);

  return (
    <View style={styles.container}>
      {/* Background gradient overlay */}
      <View style={styles.background} />

      {/* Caller info */}
      <View style={styles.callerInfo}>
        <Animated.View style={[styles.avatarWrapper, { transform: [{ scale: pulseAnim }] }]}>
          {call.callerAvatar ? (
            <Image source={{ uri: call.callerAvatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>{call.callerName.charAt(0).toUpperCase()}</Text>
            </View>
          )}
        </Animated.View>

        <Text style={styles.callerName}>{call.callerName}</Text>
        <Text style={styles.callTypeLabel}>
          Incoming {call.isGroupCall ? 'group ' : ''}{call.callType} call…
        </Text>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        {/* Decline */}
        <TouchableOpacity
          style={[styles.actionBtn, styles.declineBtn]}
          onPress={onDecline}
          activeOpacity={0.85}
          accessibilityLabel="Decline call"
          accessibilityRole="button"
        >
          <AppIcon name="phone-hangup" size={32} tintColor="#fff" />
          <Text style={styles.actionLabel}>Decline</Text>
        </TouchableOpacity>

        {/* Answer */}
        <TouchableOpacity
          style={[styles.actionBtn, styles.answerBtn]}
          onPress={onAnswer}
          activeOpacity={0.85}
          accessibilityLabel="Answer call"
          accessibilityRole="button"
        >
          <AppIcon name={call.callType === 'video' ? 'video' : 'phone'} size={32} tintColor="#fff" />
          <Text style={styles.actionLabel}>Answer</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    zIndex: 9999,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 80,
  },
  background: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(10, 14, 26, 0.97)',
  },
  callerInfo: {
    alignItems: 'center',
    gap: 16,
  },
  avatarWrapper: {
    marginBottom: 8,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 24,
    elevation: 16,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#6366f1',
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 48,
    fontWeight: '700',
    color: '#fff',
  },
  callerName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
  callTypeLabel: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'capitalize',
  },
  actions: {
    flexDirection: 'row',
    gap: 60,
    alignItems: 'center',
  },
  actionBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  declineBtn: {
    backgroundColor: '#ef4444',
    shadowColor: '#ef4444',
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 8,
  },
  answerBtn: {
    backgroundColor: '#22c55e',
    shadowColor: '#22c55e',
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 8,
  },
  actionIcon: {
    fontSize: 28,
  },
  actionLabel: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
});
