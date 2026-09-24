import React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

export interface FadeInViewProps {
  children: React.ReactNode;
  /** Delay in ms – stagger items by passing index * 80. */
  delay?: number;
  style?: StyleProp<ViewStyle>;
}

/** Minimal Reanimated example: fades + slides its children in on mount. */
export function FadeInView({ children, delay = 0, style }: FadeInViewProps): React.JSX.Element {
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(400)} style={style}>
      {children}
    </Animated.View>
  );
}
