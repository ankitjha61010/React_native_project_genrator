import { useEffect } from 'react';
import { configureApiAuth } from '{{IMPORT:api.client}}';
import { useAuthSession } from '{{IMPORT:hooks.useAuthSession}}';
import { openUrlInApp, resetToAuth } from '{{IMPORT:navigation.ref}}';
import { notificationService } from '{{IMPORT:notification.service}}';
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

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let unmounted = false;

    notificationService
      .initialize({
        // Send `{ "url": "https://…" }` in the FCM data payload to open a page on tap.
        onNotificationTap: ({ data }) => {
          const url = data.url;
          if (typeof url === 'string') {
            openUrlInApp(url);
          }
        },
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
