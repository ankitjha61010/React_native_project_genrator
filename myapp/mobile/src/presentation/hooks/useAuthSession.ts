import { useCallback } from 'react';
import type { AuthSession, User } from '@business/models/auth';
import { sessionService } from '@data/api/sessionService';
import { selectAuthToken, selectAuthUser, sessionCleared, sessionStarted, useAppDispatch, useAppSelector, userUpdated } from '@business/state';

/** Session access for screens/hooks, backed by the Redux store (side effects: sessionService). */
export function useAuthSession() {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectAuthUser);
  const token = useAppSelector(selectAuthToken);

  const signIn = useCallback(
    async (session: AuthSession) => {
      await sessionService.start(session);
      dispatch(sessionStarted(session));
    },
    [dispatch],
  );

  /** Keeps the session, replaces the user (after Edit Profile / avatar upload). */
  const updateUser = useCallback(
    async (next: User) => {
      await sessionService.saveUser(next);
      dispatch(userUpdated(next));
    },
    [dispatch],
  );

  /** `server: false` after the account was deleted. */
  const signOut = useCallback(
    async (options?: { server?: boolean }) => {
      await sessionService.end(options);
      dispatch(sessionCleared());
    },
    [dispatch],
  );

  /** Loads a persisted session. Resolves true when the user is signed in. */
  const restore = useCallback(async () => {
    const session = await sessionService.restore();
    if (session) dispatch(sessionStarted(session));
    return session !== null;
  }, [dispatch]);

  return { user, token, isAuthenticated: token !== null, signIn, updateUser, signOut, restore };
}
