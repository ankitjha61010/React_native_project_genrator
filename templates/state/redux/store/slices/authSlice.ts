import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AuthSession, User } from '{{IMPORT:auth.types}}';
{{#if ARCH_REDUX}}
import { loginThunk } from '{{IMPORT:store.authThunks}}';
{{/if}}

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
    sessionCleared() {
      return initialState;
    },
  },
{{#if ARCH_REDUX}}
  extraReducers: builder => {
    builder
      .addCase(loginThunk.pending, state => {
        state.status = 'loading';
      })
      .addCase(loginThunk.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.status = 'idle';
      })
      .addCase(loginThunk.rejected, state => {
        state.status = 'failed';
      });
  },
{{/if}}
});

export const { sessionStarted, sessionCleared } = authSlice.actions;

export const authReducer = authSlice.reducer;
