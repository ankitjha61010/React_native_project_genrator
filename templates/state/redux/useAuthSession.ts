import { useCallback } from 'react';
import type { AuthSession } from '{{IMPORT:auth.types}}';
import { authSessionStorage } from '{{IMPORT:storage.session}}';
import {
  selectAuthToken,
  selectAuthUser,
  sessionCleared,
  sessionStarted,
  useAppDispatch,
  useAppSelector,
} from '{{IMPORT:store.index}}';

/** Session access for screens/hooks, backed by the Redux store. */
export function useAuthSession() {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectAuthUser);
  const token = useAppSelector(selectAuthToken);

  const signIn = useCallback(
    async (session: AuthSession) => {
      await authSessionStorage.save(session);
      dispatch(sessionStarted(session));
    },
    [dispatch],
  );

  const signOut = useCallback(async () => {
    await authSessionStorage.clear();
    dispatch(sessionCleared());
  }, [dispatch]);

  /** Loads a persisted session. Resolves true when the user is signed in. */
  const restore = useCallback(async () => {
    const session = await authSessionStorage.load();
    if (session) {
      dispatch(sessionStarted(session));
    }
    return session !== null;
  }, [dispatch]);

  return { user, token, isAuthenticated: token !== null, signIn, signOut, restore };
}
