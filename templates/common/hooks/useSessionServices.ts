import { useEffect } from 'react';
import { authApi } from '{{IMPORT:api.auth}}';
import { configureApiAuth } from '{{IMPORT:api.client}}';
import { authSessionStorage } from '{{IMPORT:storage.session}}';
import { useAuthSession } from '{{IMPORT:hooks.useAuthSession}}';
import { resetToAuth } from '{{IMPORT:navigation.ref}}';
{{#if NOTIFICATIONS}}
import { handleNotificationTap } from '{{IMPORT:notification.router}}';
import { notificationService } from '{{IMPORT:notification.service}}';
{{/if}}
import { flash } from '{{IMPORT:utils.flashMessage}}';
{{#if SOCKET}}
import { socketService } from '{{IMPORT:socket.service}}';
{{/if}}
{{#if NOTIFICATIONS}}
{{#if SOCKET}}
import { SOCKET_EVENTS } from '{{IMPORT:socket.events}}';
import { notificationInbox } from '{{IMPORT:notification.inbox}}';
import { toAppNotification } from '{{IMPORT:notification.types}}';
{{/if}}
{{/if}}

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

{{#if SOCKET}}
  // One Socket.IO connection while signed in (online status, chat, live notifications).
  useEffect(() => {
    socketService.connect();
{{#if NOTIFICATIONS}}
    const offNotification = socketService.on<{ id: string; type: string; title: string; body: string; data: Record<string, string>; createdAt: string }>(
      SOCKET_EVENTS.PUSH_NOTIFICATION,
      n => {
        notificationInbox.add(toAppNotification({ id: n.id, title: n.title, body: n.body, data: { ...n.data, type: n.type, notificationId: n.id, sentAt: n.createdAt } }));
      },
    );
{{/if}}
    return () => {
{{#if NOTIFICATIONS}}
      offNotification();
{{/if}}
      socketService.disconnect();
    };
  }, []);

{{/if}}
{{#if NOTIFICATIONS}}
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
{{/if}}
}
