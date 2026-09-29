import { useCallback } from 'react';
import type { AuthSession, User } from '{{IMPORT:auth.types}}';
import { sessionService } from '{{IMPORT:api.session}}';
import { useAuthStore } from '{{IMPORT:store.index}}';

/** Session access for screens/hooks, backed by a Zustand store (side effects: sessionService). */
export function useAuthSession() {
  const user = useAuthStore(state => state.user);
  const token = useAuthStore(state => state.token);
  const setSession = useAuthStore(state => state.setSession);
  const setUser = useAuthStore(state => state.setUser);
  const clearSession = useAuthStore(state => state.clearSession);

  const signIn = useCallback(
    async (session: AuthSession) => {
      await sessionService.start(session);
      setSession(session);
    },
    [setSession],
  );

  /** Keeps the session, replaces the user (after Edit Profile / avatar upload). */
  const updateUser = useCallback(
    async (next: User) => {
      await sessionService.saveUser(next);
      setUser(next);
    },
    [setUser],
  );

  /** `server: false` after the account was deleted. */
  const signOut = useCallback(
    async (options?: { server?: boolean }) => {
      await sessionService.end(options);
      clearSession();
    },
    [clearSession],
  );

  /** Loads a persisted session. Resolves true when the user is signed in. */
  const restore = useCallback(async () => {
    const session = await sessionService.restore();
    if (session) setSession(session);
    return session !== null;
  }, [setSession]);

  return { user, token, isAuthenticated: token !== null, signIn, updateUser, signOut, restore };
}
