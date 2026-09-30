import { createMMKV } from 'react-native-mmkv';
import type { StorageKey } from '@data/storage/storageKeys';

/**
 * The only contract the app depends on. Swap the engine for Keychain (for secrets)
 * or an in-memory adapter in tests via `setStorageAdapter`.
 */
export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
}

/** MMKV is synchronous and very fast; it is wrapped in the async contract so the engine can be swapped. */
const mmkv = createMMKV({ id: 'myapp-storage' });

const mmkvAdapter: StorageAdapter = {
  getItem: async key => mmkv.getString(key) ?? null,
  setItem: async (key, value) => mmkv.set(key, value),
  removeItem: async key => {
    mmkv.remove(key);
  },
  clear: async () => mmkv.clearAll(),
};

let adapter: StorageAdapter = mmkvAdapter;

export function setStorageAdapter(next: StorageAdapter): void {
  adapter = next;
}

/** JSON key-value storage. Values are serialised, so objects can be stored directly. */
export const storageService = {
  async set<T>(key: StorageKey, value: T): Promise<void> {
    await adapter.setItem(key, JSON.stringify(value));
  },

  async get<T>(key: StorageKey): Promise<T | null> {
    const raw = await adapter.getItem(key);
    if (raw === null) {
      return null;
    }
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },

  async remove(key: StorageKey): Promise<void> {
    await adapter.removeItem(key);
  },

  async clear(): Promise<void> {
    await adapter.clear();
  },
};
