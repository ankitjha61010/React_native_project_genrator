import { useCallback, useEffect, useState } from 'react';
import type { AuthSession } from '{{IMPORT:auth.types}}';
import { authSessionStorage } from '{{IMPORT:storage.session}}';

/**
 * Session access without a state library: every caller reads the persisted
 * session from storage. Pick Zustand / Redux / Context when state must be shared live.
 */
export function useAuthSession() {
  const [session, setSession] = useState<AuthSession | null>(null);

  useEffect(() => {
    let active = true;
    authSessionStorage.load().then(stored => {
      if (active) setSession(stored);
    });
    return () => {
      active = false;
    };
  }, []);

  const signIn = useCallback(async (next: AuthSession) => {
    await authSessionStorage.save(next);
    setSession(next);
  }, []);

  const signOut = useCallback(async () => {
    await authSessionStorage.clear();
    setSession(null);
  }, []);

  /** Resolves true when a persisted session exists. */
  const restore = useCallback(async () => {
    const stored = await authSessionStorage.load();
    setSession(stored);
    return stored !== null;
  }, []);

  return {
    user: session?.user ?? null,
    token: session?.token ?? null,
    isAuthenticated: session !== null,
    signIn,
    signOut,
    restore,
  };
}
