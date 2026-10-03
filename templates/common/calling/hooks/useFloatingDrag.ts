// ─── Floating Drag ─────────────────────────────────────────────────────────────
// Lets a floating view (minimised call bar, your own camera preview) be dragged
// anywhere on screen. Runs on the UI thread (Gesture Handler + Reanimated), stays
// inside the safe area and re-fits itself when the screen rotates.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect } from 'react';
import { StyleSheet, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import { usePanGesture } from 'react-native-gesture-handler';
import { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

export interface DragMargins {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface FloatingDragOptions {
  /** Free space kept between the view and each screen edge (add the safe-area insets here). */
  margins: DragMargins;
  /** Where the view starts, from its size and the screen size. */
  initial: (size: { width: number; height: number }, screen: { width: number; height: number }) => { x: number; y: number };
  /** On release, glide to the nearest side (like picture-in-picture). Default: stay where dropped. */
  snapToSides?: boolean;
}

const SPRING = { damping: 20, stiffness: 220, mass: 0.8 };

export function useFloatingDrag({ margins, initial, snapToSides = false }: FloatingDragOptions) {
  const { width: screenW, height: screenH } = useWindowDimensions();
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const width = useSharedValue(0);
  const height = useSharedValue(0);
  /** Hidden until measured, so it never flashes in the corner first. */
  const placed = useSharedValue(false);

  const { top, bottom, left, right } = margins;

  const clampX = (value: number) => {
    'worklet';
    return Math.min(Math.max(value, left), Math.max(left, screenW - right - width.value));
  };
  const clampY = (value: number) => {
    'worklet';
    return Math.min(Math.max(value, top), Math.max(top, screenH - bottom - height.value));
  };

  const onLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const size = event.nativeEvent.layout;
      width.value = size.width;
      height.value = size.height;
      if (!placed.value) {
        const start = initial({ width: size.width, height: size.height }, { width: screenW, height: screenH });
        x.value = Math.min(Math.max(start.x, left), Math.max(left, screenW - right - size.width));
        y.value = Math.min(Math.max(start.y, top), Math.max(top, screenH - bottom - size.height));
        placed.value = true;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [screenW, screenH, top, bottom, left, right],
  );

  // Rotation / safe-area change: keep it on screen.
  useEffect(() => {
    if (!placed.value) return;
    x.value = withSpring(Math.min(Math.max(x.value, left), Math.max(left, screenW - right - width.value)), SPRING);
    y.value = withSpring(Math.min(Math.max(y.value, top), Math.max(top, screenH - bottom - height.value)), SPRING);
  }, [screenW, screenH, top, bottom, left, right, x, y, width, height, placed]);

  const gesture = usePanGesture({
    minDistance: 6,
    onBegin: () => {
      'worklet';
      startX.value = x.value;
      startY.value = y.value;
    },
    onUpdate: event => {
      'worklet';
      x.value = clampX(startX.value + event.translationX);
      y.value = clampY(startY.value + event.translationY);
    },
    onDeactivate: event => {
      'worklet';
      // A flick carries it a little further, then it settles inside the screen.
      const targetY = clampY(y.value + event.velocityY * 0.08);
      const targetX = snapToSides
        ? x.value + width.value / 2 + event.velocityX * 0.08 < screenW / 2
          ? left
          : screenW - right - width.value
        : clampX(x.value + event.velocityX * 0.08);
      x.value = withSpring(targetX, SPRING);
      y.value = withSpring(targetY, SPRING);
    },
  });

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: placed.value ? 1 : 0,
    transform: [{ translateX: x.value }, { translateY: y.value }],
  }));

  return { gesture, style: [styles.floating, animatedStyle], onLayout };
}

const styles = StyleSheet.create({
  floating: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
});
