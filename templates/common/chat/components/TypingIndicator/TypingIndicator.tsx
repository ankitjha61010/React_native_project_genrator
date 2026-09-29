import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { AppText } from '{{IMPORT:components.AppText}}';
import { useStyles } from '{{IMPORT:hooks.useTheme}}';
import { translate } from '{{IMPORT:i18n.index}}';
import type { Theme } from '{{IMPORT:theme.index}}';
import type { TypingUser } from '{{IMPORT:chat.types}}';

/** Three dots that fade in one after another (React Native's Animated – no extra library). */
function Dots(): React.JSX.Element {
  const styles = useStyles(createStyles);
  const values = useRef([new Animated.Value(0.25), new Animated.Value(0.25), new Animated.Value(0.25)]).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.stagger(
        180,
        values.map(value =>
          Animated.sequence([
            Animated.timing(value, { toValue: 1, duration: 280, useNativeDriver: true }),
            Animated.timing(value, { toValue: 0.25, duration: 280, useNativeDriver: true }),
          ]),
        ),
      ),
    );
    animation.start();
    return () => animation.stop();
  }, [values]);

  return (
    <View style={styles.dots}>
      {values.map((opacity, index) => (
        <Animated.View key={index} style={[styles.dot, { opacity }]} />
      ))}
    </View>
  );
}

export interface TypingIndicatorProps {
  typing: TypingUser[];
}

/** "Jane is typing…" – shown above the message input, never in the header. */
export function TypingIndicator({ typing }: TypingIndicatorProps): React.JSX.Element | null {
  const styles = useStyles(createStyles);
  if (!typing.length) return null;
  const names = typing.map(t => t.name.split(' ')[0]).join(', ');
  const label = typing.length === 1 ? translate('common', 'typingOne', { value1: names }) : translate('common', 'typingMany', { value1: names });

  return (
    <View style={styles.container} accessibilityLiveRegion="polite">
      <AppText fontSize="size12" color="textSecondary" numberOfLines={1} style={styles.label} text={label} />
      <Dots />
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.spacing6,
      paddingHorizontal: theme.spacing.spacing16,
      paddingVertical: theme.spacing.spacing6,
    },
    label: {
      flexShrink: 1,
    },
    dots: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
    },
    dot: {
      width: 5,
      height: 5,
      borderRadius: 2.5,
      backgroundColor: theme.colors.textSecondary,
    },
  });
