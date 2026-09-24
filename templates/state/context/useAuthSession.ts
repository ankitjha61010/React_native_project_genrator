import { useAuthContext } from '{{IMPORT:store.index}}';

/** Session access for screens/hooks, backed by React Context (see AuthProvider). */
export function useAuthSession() {
  return useAuthContext();
}
