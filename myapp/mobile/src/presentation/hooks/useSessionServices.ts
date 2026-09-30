import { useEffect } from 'react';
import { AppState } from 'react-native';
import { authApi } from '@data/api/authApi';
import { configureApiAuth } from '@data/api/apiClient';
import { authSessionStorage } from '@data/storage/sessionStorage';
import { useAuthSession } from '@presentation/hooks/useAuthSession';
import { resetToAuth } from '@presentation/navigation/navigationRef';
import { handleNotificationTap } from '@infrastructure/notification/notificationRouter';
import { notificationService } from '@infrastructure/notification/notificationService';
import { flash } from '@utils/flashMessage';
import { socketService } from '@services/socket/socketService';
import { SOCKET_EVENTS } from '@services/socket/socketEvents';
import { notificationInbox } from '@infrastructure/notification/notificationInbox';
import { toAppNotification } from '@infrastructure/notification/notificationTypes';

/**
 * Services that only run while the user is signed in (mounted by MainNavigator):
 * - refreshes the access token on a 401 and signs the user out when that fails,
 * - starts push notifications (permission, FCM token) and decides where taps go.
 */
export function useSessionServices(): void {
  const { signOut } = useAuthSession();

  useEffect(() => {
    configureApiAuth({
      // A 401 means the access token expired: trade the refresh token for new tokens once.
      refreshAccessToken: async () => {
        const refreshToken = await authSessionStorage.getRefreshToken();
        if (!refreshToken) return null;
        const session = await authApi.refresh(refreshToken);
        await authSessionStorage.update({ token: session.token, refreshToken: session.refreshToken, user: session.user });
        return session.token;
      },
      onUnauthorized: () => {
        signOut();
        resetToAuth();
        flash.warning({ intlType: 'common', value: 'sessionExpired' });
      },
    });
  }, [signOut]);

  // One Socket.IO connection while signed in (online status, chat, live notifications).
  // Connected = "online" for the others: it disconnects in the background and reconnects in the foreground.
  useEffect(() => {
    socketService.connect();
    const appState = AppState.addEventListener('change', state => {
      if (state === 'active') socketService.resume();
      else if (state === 'background') socketService.pause();
    });
    const offNotification = socketService.on<{ id: string; type: string; title: string; body: string; data: Record<string, string>; createdAt: string }>(
      SOCKET_EVENTS.PUSH_NOTIFICATION,
      n => {
        notificationInbox.add(toAppNotification({ id: n.id, title: n.title, body: n.body, data: { ...n.data, type: n.type, notificationId: n.id, sentAt: n.createdAt } }));
      },
    );
    return () => {
      appState.remove();
      offNotification();
      socketService.disconnect();
    };
  }, []);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let unmounted = false;

    notificationService
      .initialize({
        // Routing per notification type lives in notificationTypes.ts:
        // `chat` → the conversation, everything else → the Notifications screen.
        onNotificationTap: handleNotificationTap,
      })
      .then(dispose => {
        if (unmounted) dispose();
        else cleanup = dispose;
      });

    return () => {
      unmounted = true;
      cleanup?.();
    };
  }, []);
}
