import type { PublicUser } from '{{IMPORT:domain.user}}';
import type { AuthResult, AuthTokens } from '{{IMPORT:app.authTypes}}';
import { userView } from '{{IMPORT:views.user}}';

export interface AuthView {
  user: PublicUser;
  tokens: AuthTokens;
}

/** View layer (MVC): the response of register / login / refresh / change-password. */
export const authView = {
  session: (result: AuthResult): AuthView => ({ user: userView.one(result.user), tokens: result.tokens }),
};
