import { useCallback } from 'react';
import type { AuthSession } from '{{IMPORT:auth.types}}';
import { authSessionStorage } from '{{IMPORT:storage.session}}';
{{#if NOTIFICATIONS}}
import { notificationInbox } from '{{IMPORT:notification.inbox}}';
{{/if}}
{{#if HAS_SOCIAL_AUTH}}
import { socialAuthService } from '{{IMPORT:auth.socialAuth}}';
{{/if}}
import {
  selectAuthToken,
  selectAuthUser,
  sessionCleared,
  sessionStarted,
  useAppDispatch,
  useAppSelector,
} from '{{IMPORT:store.index}}';

/** Session access for screens/hooks, backed by the Redux store. */
export function useAuthSession() {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectAuthUser);
  const token = useAppSelector(selectAuthToken);

  const signIn = useCallback(
    async (session: AuthSession) => {
      await authSessionStorage.save(session);
      dispatch(sessionStarted(session));
    },
    [dispatch],
  );

  const signOut = useCallback(async () => {
    await authSessionStorage.clear();
{{#if NOTIFICATIONS}}
    // The next user must not see this user's notifications.
    await notificationInbox.clear();
{{/if}}
{{#if HAS_SOCIAL_AUTH}}
    // Also end the Google / Facebook SDK session so the next login shows the account picker.
    await socialAuthService.signOut();
{{/if}}
    dispatch(sessionCleared());
  }, [dispatch]);

  /** Loads a persisted session. Resolves true when the user is signed in. */
  const restore = useCallback(async () => {
    const session = await authSessionStorage.load();
    if (session) {
      dispatch(sessionStarted(session));
    }
    return session !== null;
  }, [dispatch]);

  return { user, token, isAuthenticated: token !== null, signIn, signOut, restore };
}
