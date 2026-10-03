// ─── Minimized Call Bar ────────────────────────────────────────────────────────
// A small floating pill shown when the user navigates away during an active call.
// Drag it anywhere on screen; tap it to return to the full call screen.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  useWindowDimensions,
} from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Reanimated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon } from '{{IMPORT:components.AppIcon}}';
import type { ActiveCallState } from '../types/calling.types';
import { useFloatingDrag } from '../hooks/useFloatingDrag';

const EDGE = 12;

interface Props {
  callState: ActiveCallState;
  callerName: string;
  timer?: string;
  onMaximize: () => void;
  onHangUp: () => void;
}

function useTimer(active: boolean) {
  const [seconds, setSeconds] = React.useState(0);
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [active]);
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export function MinimizedCallBar({ callState, callerName, timer: propTimer, onMaximize, onHangUp }: Props) {
  const pulseAnim = useRef(new Animated.Value(0.6)).current;
  const localTimer = useTimer(callState.status === 'connected');
  const timer = propTimer ?? localTimer;
  const insets = useSafeAreaInsets();
  const { width: screenW } = useWindowDimensions();
  // Starts at the top, centred under the status bar – then wherever the user drops it.
  const drag = useFloatingDrag({
    margins: { top: insets.top + 4, bottom: insets.bottom + EDGE, left: insets.left + EDGE, right: insets.right + EDGE },
    initial: (size, screen) => ({ x: (screen.width - size.width) / 2, y: insets.top + 8 }),
  });

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.6, duration: 600, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  return (
    <GestureDetector gesture={drag.gesture}>
    <Reanimated.View style={[drag.style, { maxWidth: screenW - EDGE * 2 }]} onLayout={drag.onLayout}>
    <TouchableOpacity onPress={onMaximize} activeOpacity={0.9} accessibilityLabel="Return to call" accessibilityRole="button">
      <View style={styles.bar}>
        {/* Green dot */}
        <Animated.View style={[styles.activeDot, { opacity: pulseAnim }]} />

        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{callerName}</Text>
          <Text style={styles.timer}>{callState.status === 'connected' ? timer : callState.status}</Text>
        </View>

        {/* End call button */}
        <TouchableOpacity
          onPress={onHangUp}
          style={styles.endBtn}
          accessibilityLabel="End call"
          accessibilityRole="button"
        >
          <AppIcon name="phone-hangup" size={18} tintColor="#fff" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
    </Reanimated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1d2e',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 28,
    minWidth: 220,
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.3)',
    shadowColor: '#6366f1',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
    gap: 12,
  },
  activeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22c55e',
  },
  info: { flexShrink: 1, marginEnd: 4 },
  name: { fontSize: 14, fontWeight: '700', color: '#fff' },
  timer: { fontSize: 12, color: 'rgba(255,255,255,0.5)', fontVariant: ['tabular-nums'] },
  endBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
