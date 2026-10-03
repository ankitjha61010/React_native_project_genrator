import React, { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '{{IMPORT:components.AppText}}';
{{#if VECTOR_ICONS}}
import { AppIcon, type AppIconName } from '{{IMPORT:components.AppIcon}}';
{{/if}}
{{#if RTL}}
import { useDirection } from '{{IMPORT:hooks.useDirection}}';
{{/if}}
import { useStyles } from '{{IMPORT:hooks.useTheme}}';
import type { Theme } from '{{IMPORT:theme.index}}';
import { translate } from '{{IMPORT:i18n.index}}';
import type { BubbleLayout } from '../ChatBubble/ChatBubble';

export interface MessageAction {
  key: string;
  label: string;
{{#if VECTOR_ICONS}}
  icon: AppIconName;
{{/if}}
  destructive?: boolean;
  /** Ask "Delete this message for everyone?" inside the menu before running it. */
  confirm?: string;
  onPress: () => void;
}

export interface MessageActionsMenuProps {
  /** Where the long-pressed message is on screen; null = closed. */
  anchor: BubbleLayout | null;
  /** The message is drawn on the right (your own) – the menu lines up with it. */
  alignEnd: boolean;
  actions: MessageAction[];
  /** The long-pressed message, drawn above the dimmed chat. */
  children?: React.ReactNode;
  onClose: () => void;
}

const ITEM_HEIGHT = 48;
const MENU_WIDTH = 220;
const GAP = 8;

/**
 * WhatsApp-style long-press menu: the chat dims, the message stays highlighted where it was
 * and a small card with its actions opens right below it (above it when there is no room).
 */
export function MessageActionsMenu({ anchor, alignEnd, actions, children, onClose }: MessageActionsMenuProps): React.JSX.Element {
  const styles = useStyles(createStyles);
{{#if RTL}}
  // A Modal is a separate native root – it needs the app's direction explicitly.
  const { directionStyle } = useDirection();
{{/if}}
  const insets = useSafeAreaInsets();
  const { height: screenH } = useWindowDimensions();
  const progress = useRef(new Animated.Value(0)).current;
  /** The action waiting for "Delete for everyone?" – the menu shows the question instead. */
  const [confirming, setConfirming] = useState<MessageAction | null>(null);
  // Keep the last anchor while the close animation runs.
  const [shown, setShown] = useState<BubbleLayout | null>(anchor);

  useEffect(() => {
    if (anchor) {
      setShown(anchor);
      setConfirming(null);
      progress.setValue(0);
      Animated.spring(progress, { toValue: 1, useNativeDriver: true, damping: 18, stiffness: 260, mass: 0.7 }).start();
    }
  }, [anchor, progress]);

  const close = (after?: () => void) => {
    Animated.timing(progress, { toValue: 0, duration: 120, useNativeDriver: true }).start(() => {
      setShown(null);
      onClose();
      after?.();
    });
  };

  const run = (action: MessageAction) => {
    if (action.confirm && !confirming) {
      setConfirming(action);
      return;
    }
    close(action.onPress);
  };

  if (!shown) return <></>;

  const rows = confirming ? 3 : actions.length;
  const menuH = rows * ITEM_HEIGHT + (confirming ? 12 : 0);
  const top = insets.top + GAP;
  const bottom = screenH - insets.bottom - GAP;
  // A very long message is cut so the menu still fits on screen.
  const bubbleH = Math.min(shown.height, bottom - top - menuH - GAP);
  let bubbleY = shown.y;
  let menuBelow = true;
  if (bubbleY + bubbleH + GAP + menuH > bottom) {
    if (bubbleY - GAP - menuH >= top) {
      menuBelow = false;
    } else {
      // No room on either side: lift the message so the menu fits under it.
      bubbleY = Math.max(top, bottom - menuH - GAP - bubbleH);
    }
  }
  bubbleY = Math.max(top, bubbleY);
  const menuY = menuBelow ? bubbleY + bubbleH + GAP : bubbleY - GAP - menuH;

  const menuStyle = {
    top: menuY,
    opacity: progress,
    transform: [
      { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [menuBelow ? -12 : 12, 0] }) },
      { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) },
    ],
  };

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={() => close()}>
      <GestureHandlerRootView style={ {{#if RTL}}[styles.root, directionStyle]{{else}}styles.root{{/if}} }>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => close()} accessibilityRole="button" accessibilityLabel={translate('common', 'cancel')}>
          <Animated.View style={[styles.backdrop, { opacity: progress }]} />
        </Pressable>

        {/* The message itself, on top of the dimmed chat. */}
        <View pointerEvents="none" style={[styles.bubble, { top: bubbleY, left: shown.x, width: shown.width, maxHeight: bubbleH }]}>
          {children}
        </View>

        <Animated.View style={[styles.menu, alignEnd ? styles.menuEnd : styles.menuStart, menuStyle]}>
          {confirming ? (
            <>
              <View style={styles.question}>
                <AppText fontSize="size13" color="textSecondary" text={confirming.confirm ?? ''} />
              </View>
              <MenuRow styles={styles} label={confirming.label} destructive{{#if VECTOR_ICONS}} icon={confirming.icon}{{/if}} onPress={() => run(confirming)} />
              <MenuRow styles={styles} label={translate('common', 'cancel')}{{#if VECTOR_ICONS}} icon="close"{{/if}} onPress={() => setConfirming(null)} last />
            </>
          ) : (
            actions.map((action, index) => (
              <MenuRow
                key={action.key}
                styles={styles}
                label={action.label}
{{#if VECTOR_ICONS}}
                icon={action.icon}
{{/if}}
                destructive={action.destructive}
                onPress={() => run(action)}
                last={index === actions.length - 1}
              />
            ))
          )}
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}

interface MenuRowProps {
  styles: ReturnType<typeof createStyles>;
  label: string;
{{#if VECTOR_ICONS}}
  icon: AppIconName;
{{/if}}
  destructive?: boolean;
  last?: boolean;
  onPress: () => void;
}

function MenuRow({ styles, label, {{#if VECTOR_ICONS}}icon, {{/if}}destructive, last, onPress }: MenuRowProps): React.JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.row, !last && styles.rowDivider, pressed && styles.rowPressed]}>
      <AppText fontSize="size15" color={destructive ? 'error' : 'text'} style={styles.rowLabel} text={label} />
{{#if VECTOR_ICONS}}
      <AppIcon name={icon} size={20} tintColor={destructive ? styles.destructive.color : styles.icon.color} />
{{/if}}
    </Pressable>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    root: {
      flex: 1,
    },
    backdrop: {
      flex: 1,
      backgroundColor: '#00000066',
    },
    bubble: {
      position: 'absolute',
      overflow: 'hidden',
    },
    menu: {
      position: 'absolute',
      width: MENU_WIDTH,
      borderRadius: 14,
      backgroundColor: theme.colors.surface,
      overflow: 'hidden',
      elevation: 12,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.2,
      shadowRadius: 16,
    },
    menuStart: {
      start: 16,
    },
    menuEnd: {
      end: 16,
    },
    question: {
      height: ITEM_HEIGHT + 12,
      paddingHorizontal: 16,
      justifyContent: 'center',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    row: {
      height: ITEM_HEIGHT,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    rowDivider: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    rowPressed: {
      backgroundColor: theme.colors.pressed,
    },
    rowLabel: {
      flex: 1,
    },
    icon: {
      color: theme.colors.text,
    },
    destructive: {
      color: theme.colors.error,
    },
  });
