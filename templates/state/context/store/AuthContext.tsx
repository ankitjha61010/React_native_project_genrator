import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { AuthSession, User } from '{{IMPORT:auth.types}}';
import { endServerSession } from '{{IMPORT:api.auth}}';
import { authSessionStorage } from '{{IMPORT:storage.session}}';
{{#if NOTIFICATIONS}}
import { notificationInbox } from '{{IMPORT:notification.inbox}}';
{{/if}}
{{#if HAS_SOCIAL_AUTH}}
import { socialAuthService } from '{{IMPORT:auth.socialAuth}}';
{{/if}}

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
    // Revoke the session on the server first – it needs the stored tokens.
    await endServerSession();
    await authSessionStorage.clear();
{{#if NOTIFICATIONS}}
    // The next user must not see this user's notifications.
    await notificationInbox.clear();
{{/if}}
{{#if HAS_SOCIAL_AUTH}}
    // Also end the Google / Facebook SDK session so the next login shows the account picker.
    await socialAuthService.signOut();
{{/if}}
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
