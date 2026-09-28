import { useCallback } from 'react';
import type { AuthSession } from '{{IMPORT:auth.types}}';
import { authSessionStorage } from '{{IMPORT:storage.session}}';
{{#if NOTIFICATIONS}}
import { notificationInbox } from '{{IMPORT:notification.inbox}}';
{{/if}}
{{#if HAS_SOCIAL_AUTH}}
import { socialAuthService } from '{{IMPORT:auth.socialAuth}}';
{{/if}}
import { useAuthStore } from '{{IMPORT:store.index}}';

/** Session access for screens/hooks, backed by a Zustand store. */
export function useAuthSession() {
  const user = useAuthStore(state => state.user);
  const token = useAuthStore(state => state.token);
  const setSession = useAuthStore(state => state.setSession);
  const clearSession = useAuthStore(state => state.clearSession);

  const signIn = useCallback(
    async (session: AuthSession) => {
      await authSessionStorage.save(session);
      setSession(session);
    },
    [setSession],
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
    clearSession();
  }, [clearSession]);

  /** Loads a persisted session. Resolves true when the user is signed in. */
  const restore = useCallback(async () => {
    const session = await authSessionStorage.load();
    if (session) {
      setSession(session);
    }
    return session !== null;
  }, [setSession]);

  return { user, token, isAuthenticated: token !== null, signIn, signOut, restore };
}
