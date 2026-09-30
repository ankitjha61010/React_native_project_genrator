import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@presentation/components/AppText';
import { useStyles } from '@presentation/hooks/useTheme';
import type { Theme } from '@presentation/theme';

export interface ChatNoticeProps {
  text: string;
  /** Under a system message: its time. */
  time?: string;
}

/**
 * A centred pill in the conversation – the date above a day's messages ("Today", "Yesterday",
 * "28 September 2026") and system messages ("Jane added John"). Not a chat bubble.
 */
export function ChatNotice({ text, time }: ChatNoticeProps): React.JSX.Element {
  const styles = useStyles(createStyles);
  return (
    <View style={styles.row} accessibilityRole="text">
      <View style={styles.pill}>
        <AppText fontSize="size12" fontFamily="medium" color="textSecondary" align="center" text={text} />
        {time ? <AppText fontSize="size10" color="textSecondary" align="center" text={time} /> : null}
      </View>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    row: {
      alignItems: 'center',
      marginVertical: theme.spacing.spacing8,
      paddingHorizontal: theme.spacing.spacing24,
    },
    pill: {
      paddingHorizontal: theme.spacing.spacing12,
      paddingVertical: theme.spacing.spacing4,
      borderRadius: theme.borderRadius.radius12,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      maxWidth: '100%',
    },
  });
