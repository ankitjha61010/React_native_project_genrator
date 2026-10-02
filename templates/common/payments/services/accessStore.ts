import { logger } from '{{IMPORT:utils.logger}}';
import { paymentsApi } from '../paymentsApi';
import type { Access } from '../types/payments.types';

type Listener = (access: Access) => void;

const EMPTY: Access = { accessLevels: [], entitlements: [] };
let current: Access = EMPTY;
const listeners = new Set<Listener>();

/**
 * The signed-in user's access levels (GET /payments/me), shared by every screen.
 * Unlock features with `useAccess().hasAccess('premium')` – the backend decides, never the app.
 */
export const accessStore = {
  get: () => current,

  set(access: Access): void {
    current = access;
    listeners.forEach(listener => listener(access));
  },

  async refresh(): Promise<Access> {
    try {
      accessStore.set(await paymentsApi.access());
    } catch (error) {
      logger.warn('Loading the access levels failed', error);
    }
    return current;
  },

  /** Sign out. */
  clear(): void {
    accessStore.set(EMPTY);
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
