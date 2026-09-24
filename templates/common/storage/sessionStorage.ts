import type { AuthSession, User } from '{{IMPORT:auth.types}}';
import { StorageKeys } from '{{IMPORT:storage.keys}}';
import { storageService } from '{{IMPORT:storage.service}}';

/** Persists the signed-in session so it survives app restarts. */
export const authSessionStorage = {
  async save(session: AuthSession): Promise<void> {
    await Promise.all([
      storageService.set(StorageKeys.AUTH_TOKEN, session.token),
      storageService.set(StorageKeys.AUTH_USER, session.user),
    ]);
  },

  async load(): Promise<AuthSession | null> {
    const [token, user] = await Promise.all([
      storageService.get<string>(StorageKeys.AUTH_TOKEN),
      storageService.get<User>(StorageKeys.AUTH_USER),
    ]);
    return token && user ? { token, user } : null;
  },

  async clear(): Promise<void> {
    await Promise.all([storageService.remove(StorageKeys.AUTH_TOKEN), storageService.remove(StorageKeys.AUTH_USER)]);
  },
};
