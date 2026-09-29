import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { AuthSession, User } from '{{IMPORT:auth.types}}';
import { sessionService } from '{{IMPORT:api.session}}';

export interface AuthContextValue {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  signIn: (session: AuthSession) => Promise<void>;
  /** Keeps the session, replaces the user (after Edit Profile / avatar upload). */
  updateUser: (user: User) => Promise<void>;
  /** `server: false` after the account was deleted. */
  signOut: (options?: { server?: boolean }) => Promise<void>;
  /** Loads a persisted session. Resolves true when the user is signed in. */
  restore: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** The signed-in session for the whole app (side effects: sessionService). */
export function AuthProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [session, setSession] = useState<AuthSession | null>(null);

  const signIn = useCallback(async (next: AuthSession) => {
    await sessionService.start(next);
    setSession(next);
  }, []);

  const updateUser = useCallback(async (user: User) => {
    await sessionService.saveUser(user);
    setSession(current => (current ? { ...current, user } : current));
  }, []);

  const signOut = useCallback(async (options?: { server?: boolean }) => {
    await sessionService.end(options);
    setSession(null);
  }, []);

  const restore = useCallback(async () => {
    const stored = await sessionService.restore();
    setSession(stored);
    return stored !== null;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      token: session?.token ?? null,
      isAuthenticated: session !== null,
      signIn,
      updateUser,
      signOut,
      restore,
    }),
    [session, signIn, updateUser, signOut, restore],
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
