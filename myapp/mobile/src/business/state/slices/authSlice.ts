import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AuthSession, User } from '@business/models/auth';

export interface AuthState {
  user: User | null;
  token: string | null;
  status: 'idle' | 'loading' | 'failed';
}

const initialState: AuthState = {
  user: null,
  token: null,
  status: 'idle',
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    sessionStarted(state, action: PayloadAction<AuthSession>) {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.status = 'idle';
    },
    /** A profile change – the tokens stay as they are. */
    userUpdated(state, action: PayloadAction<User>) {
      state.user = action.payload;
    },
    sessionCleared() {
      return initialState;
    },
  },
});

export const { sessionStarted, userUpdated, sessionCleared } = authSlice.actions;

export const authReducer = authSlice.reducer;
