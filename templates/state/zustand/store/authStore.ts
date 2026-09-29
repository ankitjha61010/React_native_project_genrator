import { create } from 'zustand';
import type { AuthSession, User } from '{{IMPORT:auth.types}}';

interface AuthStore {
  user: User | null;
  token: string | null;
  setSession: (session: AuthSession) => void;
  /** A profile change – the tokens stay as they are. */
  setUser: (user: User) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthStore>()(set => ({
  user: null,
  token: null,
  setSession: session => set({ user: session.user, token: session.token }),
  setUser: user => set({ user }),
  clearSession: () => set({ user: null, token: null }),
}));
