import type { AuthSession, User } from '{{IMPORT:auth.types}}';
import { authSessionStorage } from '{{IMPORT:storage.session}}';
{{#if NOTIFICATIONS}}
import { notificationInbox } from '{{IMPORT:notification.inbox}}';
{{/if}}
{{#if HAS_SOCIAL_AUTH}}
import { socialAuthService } from '{{IMPORT:auth.socialAuth}}';
{{/if}}
{{#if SOCKET}}
import { socketService } from '{{IMPORT:socket.service}}';
{{/if}}
import { endServerSession } from './authApi';

/**
 * What signing in / out does besides updating the state – one place, used by `useAuthSession`
 * whatever state management the app uses. The state (Redux / Zustand / Context / none) only
 * keeps `user` + `token` for the screens.
 *
 * The device (install id, FCM token…) travels with the sign-in / refresh requests themselves
 * (authApi.ts) – there is no separate device request after signing in.
 */
export const sessionService = {
  /** After register / login / social login: persist the session. */
  start(session: AuthSession): Promise<void> {
    return authSessionStorage.save(session);
  },

  /** On app start: the persisted session, or null. */
  restore(): Promise<AuthSession | null> {
    return authSessionStorage.load();
  },

  /** After a profile change: persist the updated user (tokens stay as they are). */
  saveUser(user: User): Promise<void> {
    return authSessionStorage.update({ user });
  },

  /**
   * Signs out on this device. `server: false` skips the server calls (the account was just
   * deleted – there is no session left to revoke). Never throws.
   */
  async end({ server = true }: { server?: boolean } = {}): Promise<void> {
    // Revoke the session{{#if NOTIFICATIONS}} and remove the device{{/if}} first – it needs the stored tokens.
    if (server) await endServerSession();
    await authSessionStorage.clear();
{{#if SOCKET}}
    socketService.disconnect();
{{/if}}
{{#if NOTIFICATIONS}}
    // The next user must not see this user's notifications.
    await notificationInbox.clear();
{{/if}}
{{#if HAS_SOCIAL_AUTH}}
    // Also end the Google / Facebook SDK session so the next login shows the account picker.
    await socialAuthService.signOut();
{{/if}}
  },
};
