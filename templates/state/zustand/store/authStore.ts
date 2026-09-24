import { create } from 'zustand';
import type { AuthSession, User } from '{{IMPORT:auth.types}}';

interface AuthStore {
  user: User | null;
  token: string | null;
  setSession: (session: AuthSession) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthStore>()(set => ({
  user: null,
  token: null,
  setSession: session => set({ user: session.user, token: session.token }),
  clearSession: () => set({ user: null, token: null }),
}));
