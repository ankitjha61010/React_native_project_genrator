import { toSessionView, type AuthResult, type SessionView } from '{{IMPORT:app.authTypes}}';

/** View layer (MVC): the response of every sign-in endpoint (register, login, refresh…). */
export const authView = {
  session: (result: AuthResult): SessionView => toSessionView(result),
};
