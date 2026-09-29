import { createAsyncThunk } from '@reduxjs/toolkit';
import { authService } from '{{IMPORT:auth.service}}';
import type { AuthSession, LoginCredentials } from '{{IMPORT:auth.types}}';
import { sessionService } from '{{IMPORT:api.session}}';

/** Async action: pending → fulfilled/rejected are handled in authSlice. */
export const loginThunk = createAsyncThunk<AuthSession, LoginCredentials>('auth/login', async credentials => {
  const session = await authService.login(credentials);
  await sessionService.start(session);
  return session;
});
