import { configureStore } from '@reduxjs/toolkit';
import { rootReducer } from './rootReducer';

export const store = configureStore({
  reducer: rootReducer,
});

export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = typeof store.dispatch;

export * from './hooks';
export * from './selectors/authSelectors';
export { sessionCleared, sessionStarted, userUpdated, type AuthState } from './slices/authSlice';
