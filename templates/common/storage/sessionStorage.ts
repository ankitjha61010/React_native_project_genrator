import type { AuthSession, User } from '{{IMPORT:auth.types}}';
import { StorageKeys } from '{{IMPORT:storage.keys}}';
import { storageService } from '{{IMPORT:storage.service}}';

/** Persists the signed-in session so it survives app restarts. */
export const authSessionStorage = {
  async save(session: AuthSession): Promise<void> {
    await Promise.all([
      storageService.set(StorageKeys.AUTH_TOKEN, session.token),
      session.refreshToken ? storageService.set(StorageKeys.AUTH_REFRESH_TOKEN, session.refreshToken) : storageService.remove(StorageKeys.AUTH_REFRESH_TOKEN),
      storageService.set(StorageKeys.AUTH_USER, session.user),
    ]);
  },

  async load(): Promise<AuthSession | null> {
    const [token, refreshToken, user] = await Promise.all([
      storageService.get<string>(StorageKeys.AUTH_TOKEN),
      storageService.get<string>(StorageKeys.AUTH_REFRESH_TOKEN),
      storageService.get<User>(StorageKeys.AUTH_USER),
    ]);
    return token && user ? { token, refreshToken: refreshToken ?? undefined, user } : null;
  },

  getRefreshToken(): Promise<string | null> {
    return storageService.get<string>(StorageKeys.AUTH_REFRESH_TOKEN);
  },

  /** After a token refresh / profile change. */
  async update(changes: { token?: string; refreshToken?: string; user?: User }): Promise<void> {
    await Promise.all([
      changes.token ? storageService.set(StorageKeys.AUTH_TOKEN, changes.token) : undefined,
      changes.refreshToken ? storageService.set(StorageKeys.AUTH_REFRESH_TOKEN, changes.refreshToken) : undefined,
      changes.user ? storageService.set(StorageKeys.AUTH_USER, changes.user) : undefined,
    ]);
  },

  async clear(): Promise<void> {
    await Promise.all([
      storageService.remove(StorageKeys.AUTH_TOKEN),
      storageService.remove(StorageKeys.AUTH_REFRESH_TOKEN),
      storageService.remove(StorageKeys.AUTH_USER),
    ]);
  },
};
