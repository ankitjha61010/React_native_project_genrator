import { useCallback, useSyncExternalStore } from 'react';
import type { AuthSession, User } from '{{IMPORT:auth.types}}';
import { sessionService } from '{{IMPORT:api.session}}';

/**
 * No state library: the session lives in this module and every screen that uses the hook
 * re-renders when it changes (a profile update shows everywhere at once).
 * Pick Zustand / Redux / Context for more app-wide state.
 */
let current: AuthSession | null = null;
const listeners = new Set<() => void>();

function setCurrent(next: AuthSession | null): void {
  current = next;
  listeners.forEach(listener => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Session access for screens/hooks (side effects: sessionService). */
export function useAuthSession() {
  const session = useSyncExternalStore(subscribe, () => current);

  const signIn = useCallback(async (next: AuthSession) => {
    await sessionService.start(next);
    setCurrent(next);
  }, []);

  /** Keeps the session, replaces the user (after Edit Profile / avatar upload). */
  const updateUser = useCallback(async (user: User) => {
    await sessionService.saveUser(user);
    if (current) setCurrent({ ...current, user });
  }, []);

  /** `server: false` after the account was deleted. */
  const signOut = useCallback(async (options?: { server?: boolean }) => {
    await sessionService.end(options);
    setCurrent(null);
  }, []);

  /** Loads a persisted session. Resolves true when the user is signed in. */
  const restore = useCallback(async () => {
    const stored = await sessionService.restore();
    setCurrent(stored);
    return stored !== null;
  }, []);

  return { user: session?.user ?? null, token: session?.token ?? null, isAuthenticated: session !== null, signIn, updateUser, signOut, restore };
}
