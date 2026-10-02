import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { notificationInbox } from './notificationInbox';
import type { AppNotification } from './notificationTypes';

/** Live notification inbox for screens and header badges. */
export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const unsubscribe = notificationInbox.subscribe(setNotifications);
    notificationInbox.reload();
    // Pick up messages saved by the background handler while the app was closed.
    const appState = AppState.addEventListener('change', state => {
      if (state === 'active') notificationInbox.reload();
    });
    return () => {
      unsubscribe();
      appState.remove();
    };
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await notificationInbox.reload();
    } finally {
      setRefreshing(false);
    }
  }, []);

  return {
    notifications,
    unreadCount: notifications.filter(n => !n.read).length,
    refreshing,
    refresh,
    markRead: notificationInbox.markRead,
    markAllRead: notificationInbox.markAllRead,
    remove: notificationInbox.remove,
    removeAll: notificationInbox.removeAll,
  };
}
