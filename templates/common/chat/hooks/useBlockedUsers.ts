import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { errorMessage } from '{{IMPORT:api.errors}}';
import type { UserSummary } from '{{IMPORT:api.user}}';
import { translate } from '{{IMPORT:i18n.index}}';
import { SOCKET_EVENTS } from '{{IMPORT:socket.events}}';
import { socketService } from '{{IMPORT:socket.service}}';
import { flash } from '{{IMPORT:utils.flashMessage}}';
import { chatService } from '../services/chatService';

/**
 * The people you blocked: loaded on open, pull to refresh, and again when you block / unblock
 * someone on another device. `unblock` asks first.
 */
export function useBlockedUsers() {
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  /** The last load failed (the empty list shows it with a Retry button). */
  const [error, setError] = useState<string | null>(null);
  /** The user being unblocked right now (their row shows a spinner). */
  const [unblockingId, setUnblockingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setUsers(await chatService.fetchBlockedUserProfiles());
      setError(null);
    } catch (e) {
      // Keep the current list; pull to refresh / Retry tries again.
      setError(errorMessage(e));
      flash.error({ message: errorMessage(e) });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const refresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const retry = useCallback(() => {
    setLoading(true);
    load();
  }, [load]);

  useEffect(() => {
    load();
    const subscriptions = [
      socketService.on(SOCKET_EVENTS.USER_BLOCKED, load),
      socketService.on<{ userId: string }>(SOCKET_EVENTS.USER_UNBLOCKED, event => setUsers(current => current.filter(u => u.id !== event.userId))),
      socketService.onReconnect(load),
    ];
    return () => subscriptions.forEach(off => off());
  }, [load]);

  const runUnblock = useCallback(async (userId: string) => {
    setUnblockingId(userId);
    try {
      await chatService.unblockUser(userId);
      setUsers(current => current.filter(u => u.id !== userId));
      flash.success({ message: translate('common', 'userUnblocked') });
    } catch (e) {
      flash.error({ message: errorMessage(e) });
    } finally {
      setUnblockingId(null);
    }
  }, []);

  /** Asks "Unblock this contact…?" with Cancel / Unblock. */
  const unblock = useCallback(
    (userId: string) =>
      Alert.alert(translate('common', 'unblockUser'), translate('common', 'unblockUserConfirm'), [
        { text: translate('common', 'cancel'), style: 'cancel' },
        { text: translate('common', 'unblock'), onPress: () => runUnblock(userId) },
      ]),
    [runUnblock],
  );

  return { users, loading, refreshing, error, refresh, retry, unblock, unblockingId };
}
