import React from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { AppButton } from '{{IMPORT:components.AppButton}}';
import { AppText } from '{{IMPORT:components.AppText}}';
import { useStyles } from '{{IMPORT:hooks.useTheme}}';
import type { Theme } from '{{IMPORT:theme.index}}';
import { useOTA } from '../hooks/useOTA';
import { formatBytes } from '../services/OTAService';

export function OTAUpdateModal(): React.JSX.Element | null {
  const styles = useStyles(createStyles);
  const {
    status,
    updateInfo,
    progress,
    errorMessage,
    isMandatory,
    downloadAndInstall,
    restart,
    dismiss,
  } = useOTA(true);

  const isVisible =
    status === 'available' ||
    status === 'downloading' ||
    status === 'verifying' ||
    status === 'applying' ||
    status === 'ready' ||
    (status === 'error' && isMandatory);

  if (!isVisible || !updateInfo) {
    return null;
  }

  const isWorking = status === 'downloading' || status === 'verifying' || status === 'applying';
  const progressPercent = Math.round((progress?.progress || 0) * 100);

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!isMandatory && !isWorking) dismiss();
      }}
    >
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <View style={styles.header}>
            <View style={styles.badge}>
              <AppText
                fontFamily="semiBold"
                fontSize="size12"
                color="primary"
                text={status === 'ready' ? 'READY' : isMandatory ? 'REQUIRED' : 'UPDATE'}
              />
            </View>
            <AppText
              fontFamily="bold"
              fontSize="size18"
              text={
                status === 'ready'
                  ? 'Update Ready to Install'
                  : isWorking
                  ? 'Downloading Update...'
                  : 'New Update Available'
              }
            />
            <AppText
              fontSize="size13"
              color="textSecondary"
              text={`Version ${updateInfo.ota_version || ''} • ${formatBytes(updateInfo.bundle_size)}`}
            />
          </View>

          {updateInfo.release_notes ? (
            <View style={styles.notesContainer}>
              <AppText fontFamily="medium" fontSize="size13" text="What's New:" />
              <AppText fontSize="size12" color="textSecondary" text={updateInfo.release_notes} />
            </View>
          ) : null}

          {isWorking ? (
            <View style={styles.progressContainer}>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
              </View>
              <View style={styles.progressMeta}>
                <AppText fontSize="size11" color="textSecondary" text={`${progressPercent}%`} />
                <AppText
                  fontSize="size11"
                  color="textSecondary"
                  text={`${formatBytes(progress.bytesWritten)} / ${formatBytes(progress.contentLength)}`}
                />
              </View>
              {status === 'verifying' ? (
                <AppText fontSize="size12" color="primary" text="Verifying bundle security signature..." />
              ) : null}
              {status === 'applying' ? (
                <AppText fontSize="size12" color="primary" text="Applying update files..." />
              ) : null}
            </View>
          ) : null}

          {errorMessage ? (
            <View style={styles.errorContainer}>
              <AppText fontSize="size12" color="error" text={errorMessage} />
            </View>
          ) : null}

          <View style={styles.actions}>
            {status === 'ready' ? (
              <AppButton
                variant="primary"
                title="Restart App Now"
                onPress={restart}
              />
            ) : isWorking ? (
              <AppButton
                variant="outline"
                disabled
                loading
                title="Downloading..."
                onPress={() => undefined}
              />
            ) : (
              <>
                <AppButton
                  variant="primary"
                  title="Update Now"
                  onPress={() => downloadAndInstall(true)}
                />
                {!isMandatory ? (
                  <AppButton
                    variant="ghost"
                    title="Later"
                    onPress={dismiss}
                  />
                ) : null}
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.spacing20,
    },
    modalCard: {
      width: '100%',
      maxWidth: 400,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.radius16,
      padding: theme.spacing.spacing20,
      gap: theme.spacing.spacing16,
      ...theme.shadows.activityCardShadow,
    },
    header: {
      alignItems: 'center',
      gap: theme.spacing.spacing6,
    },
    badge: {
      backgroundColor: theme.colors.surface,
      paddingHorizontal: theme.spacing.spacing10,
      paddingVertical: theme.spacing.spacing4,
      borderRadius: theme.borderRadius.radius100,
      borderWidth: 1,
      borderColor: theme.colors.primary,
    },
    notesContainer: {
      backgroundColor: theme.colors.background,
      borderRadius: theme.borderRadius.radius10,
      padding: theme.spacing.spacing12,
      gap: theme.spacing.spacing4,
    },
    progressContainer: {
      gap: theme.spacing.spacing6,
    },
    progressBarBg: {
      height: 8,
      backgroundColor: theme.colors.border,
      borderRadius: theme.borderRadius.radius5,
      overflow: 'hidden',
    },
    progressBarFill: {
      height: '100%',
      backgroundColor: theme.colors.primary,
    },
    progressMeta: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    errorContainer: {
      backgroundColor: '#fee2e2',
      borderRadius: theme.borderRadius.radius8,
      padding: theme.spacing.spacing10,
    },
    actions: {
      gap: theme.spacing.spacing8,
      marginTop: theme.spacing.spacing4,
    },
  });
