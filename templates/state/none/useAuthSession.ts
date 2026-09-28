import { useCallback, useEffect, useState } from 'react';
import type { AuthSession } from '{{IMPORT:auth.types}}';
import { endServerSession } from '{{IMPORT:api.auth}}';
import { authSessionStorage } from '{{IMPORT:storage.session}}';
{{#if NOTIFICATIONS}}
import { notificationInbox } from '{{IMPORT:notification.inbox}}';
{{/if}}
{{#if HAS_SOCIAL_AUTH}}
import { socialAuthService } from '{{IMPORT:auth.socialAuth}}';
{{/if}}

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
