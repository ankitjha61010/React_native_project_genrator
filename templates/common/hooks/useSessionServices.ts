import { useEffect } from 'react';
import { configureApiAuth } from '{{IMPORT:api.client}}';
import { useAuthSession } from '{{IMPORT:hooks.useAuthSession}}';
import { resetToAuth } from '{{IMPORT:navigation.ref}}';
{{#if NOTIFICATIONS}}
import { handleNotificationTap } from '{{IMPORT:notification.router}}';
import { notificationService } from '{{IMPORT:notification.service}}';
{{/if}}
import { flash } from '{{IMPORT:utils.flashMessage}}';

/**
 * Services that only run while the user is signed in (mounted by MainNavigator):
 * - signs the user out when the API keeps answering 401,
 * - starts push notifications (permission, FCM token) and decides where taps go.
 */
export function useSessionServices(): void {
  const { signOut } = useAuthSession();

  useEffect(() => {
    configureApiAuth({
      onUnauthorized: () => {
        signOut();
        resetToAuth();
        flash.warning({ intlType: 'common', value: 'sessionExpired' });
      },
    });
  }, [signOut]);

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
