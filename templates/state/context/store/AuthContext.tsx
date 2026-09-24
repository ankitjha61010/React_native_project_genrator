import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { AuthSession, User } from '{{IMPORT:auth.types}}';
import { authSessionStorage } from '{{IMPORT:storage.session}}';

export interface AuthContextValue {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  signIn: (session: AuthSession) => Promise<void>;
  signOut: () => Promise<void>;
  /** Loads a persisted session. Resolves true when the user is signed in. */
  restore: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [session, setSession] = useState<AuthSession | null>(null);

  const signIn = useCallback(async (next: AuthSession) => {
    await authSessionStorage.save(next);
    setSession(next);
  }, []);

  const signOut = useCallback(async () => {
    await authSessionStorage.clear();
    setSession(null);
  }, []);

  const restore = useCallback(async () => {
    const stored = await authSessionStorage.load();
    setSession(stored);
    return stored !== null;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      token: session?.token ?? null,
      isAuthenticated: session !== null,
      signIn,
      signOut,
      restore,
    }),
    [session, signIn, signOut, restore],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuthContext must be used inside <AuthProvider>');
  }
  return value;
}
