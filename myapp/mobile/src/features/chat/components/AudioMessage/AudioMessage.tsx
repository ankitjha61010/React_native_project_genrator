import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';
import { AppText } from '@presentation/components/AppText';
import { AppIcon } from '@presentation/components/AppIcon';
import { useStyles } from '@presentation/hooks/useTheme';
import type { Theme } from '@presentation/theme';
import { flash } from '@utils/flashMessage';
import { voiceService } from '../../services/voiceService';

/** 75 → "1:15". */
export const formatDuration = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

export interface AudioMessageProps {
  uri: string;
  /** Seconds (from the message) – shown before the file is loaded. */
  duration?: number;
  /** On a coloured (own) bubble. */
  inverted?: boolean;
}

type PlayerState = 'idle' | 'loading' | 'playing' | 'paused';

/** A voice message: play / pause, progress bar and time. Only one plays at a time. */
export function AudioMessage({ uri, duration = 0, inverted = false }: AudioMessageProps): React.JSX.Element {
  const styles = useStyles(createStyles);
  const [state, setState] = useState<PlayerState>('idle');
  const [position, setPosition] = useState(0);
  const [total, setTotal] = useState(duration);

  const active = useRef(false);
  active.current = state !== 'idle';

  // Stop playing when the message leaves the screen.
  useEffect(
    () => () => {
      if (active.current) voiceService.stop();
    },
    [],
  );

  const toggle = async () => {
    try {
      if (state === 'playing') {
        await voiceService.pause();
        setState('paused');
      } else if (state === 'paused') {
        await voiceService.resume();
        setState('playing');
      } else if (state === 'idle') {
        setState('loading');
        await voiceService.play(
          uri,
          (current, length) => {
            setState('playing');
            setPosition(current);
            if (length > 0) setTotal(length);
          },
          () => {
            setState('idle');
            setPosition(0);
          },
        );
      }
    } catch {
      setState('idle');
      flash.error({ intlType: 'common', value: 'genericError' });
    }
  };

  const progress = total > 0 ? Math.min(1, position / total) : 0;
  const color = inverted ? '#FFFFFF' : styles.accent.color;

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={toggle} style={styles.button} accessibilityRole="button" accessibilityLabel={state === 'playing' ? 'Pause' : 'Play'}>
        {state === 'loading' ? (
          <ActivityIndicator color={color} />
        ) : (
          <AppIcon name={state === 'playing' ? 'pause' : 'play'} size={26} tintColor={color} />
        )}
      </TouchableOpacity>
      <View style={styles.track}>
        <View style={[styles.trackFill, { width: `${progress * 100}%`, backgroundColor: color }]} />
      </View>
      <AppText fontSize="size12" style={[styles.time, inverted && styles.timeInverted]} text={formatDuration(state === 'idle' ? total : position)} />
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.spacing8,
      minWidth: 200,
      paddingVertical: theme.spacing.spacing4,
    },
    button: {
      width: 32,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
    },
    track: {
      flex: 1,
      height: 3,
      borderRadius: 2,
      backgroundColor: 'rgba(128,128,128,0.35)',
      overflow: 'hidden',
    },
    trackFill: {
      height: 3,
    },
    time: {
      minWidth: 34,
      color: theme.colors.textSecondary,
    },
    timeInverted: {
      color: 'rgba(255,255,255,0.85)',
    },
    accent: {
      color: theme.colors.primary,
    },
  });
