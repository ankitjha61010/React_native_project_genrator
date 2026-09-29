import React from 'react';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { AppText } from '{{IMPORT:components.AppText}}';
import { useStyles } from '{{IMPORT:hooks.useTheme}}';
import type { Theme } from '{{IMPORT:theme.index}}';

export interface UserRowProps {
  name: string;
  avatar?: string | null;
  /** Second line (e.g. "Admin", "Online"). */
  subtitle?: string;
  /** At the end of the row (a checkmark, a spinner, a badge…). */
  trailing?: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
}

/** A person in a list: avatar (or initial), name, optional second line and trailing element. */
export function UserRow({ name, avatar, subtitle, trailing, onPress, onLongPress, disabled }: UserRowProps): React.JSX.Element {
  const styles = useStyles(createStyles);
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} onLongPress={onLongPress} disabled={disabled || (!onPress && !onLongPress)} accessibilityRole="button">
      {avatar ? (
        <Image source={{ uri: avatar }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.initials]}>
          <AppText fontFamily="semiBold" color="onPrimary" text={name.charAt(0).toUpperCase()} />
        </View>
      )}
      <View style={styles.text}>
        <AppText fontFamily="medium" numberOfLines={1} text={name} />
        {subtitle ? <AppText fontSize="size12" color="textSecondary" numberOfLines={1} text={subtitle} /> : null}
      </View>
      {trailing}
    </TouchableOpacity>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.spacing12,
      paddingHorizontal: theme.spacing.spacing16,
      paddingVertical: theme.spacing.spacing10,
    },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme.colors.primary,
    },
    initials: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    text: {
      flex: 1,
    },
  });
