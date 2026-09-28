import type { Request, Response } from 'express';
{{#if STYLE_SERVICE}}
import type { AuthService } from '{{IMPORT:app.authService}}';
{{else}}
import type { ChangePasswordUseCase } from '{{IMPORT:uc.changePassword}}';
import type { GetCurrentUserUseCase } from '{{IMPORT:uc.getCurrentUser}}';
import type { LoginUseCase } from '{{IMPORT:uc.login}}';
{{#if AUTH_REFRESH}}
import type { LogoutAllUseCase } from '{{IMPORT:uc.logoutAll}}';
{{/if}}
import type { LogoutUseCase } from '{{IMPORT:uc.logout}}';
{{#if AUTH_REFRESH}}
import type { RefreshSessionUseCase } from '{{IMPORT:uc.refreshSession}}';
{{/if}}
import type { RegisterUseCase } from '{{IMPORT:uc.register}}';
import type { RequestEmailVerificationUseCase } from '{{IMPORT:uc.requestEmailVerification}}';
import type { RequestPasswordResetUseCase } from '{{IMPORT:uc.requestPasswordReset}}';
import type { ResetPasswordUseCase } from '{{IMPORT:uc.resetPassword}}';
import type { VerifyEmailUseCase } from '{{IMPORT:uc.verifyEmail}}';
{{/if}}
import type { AuthResult, ClientContext } from '{{IMPORT:app.authTypes}}';
{{#if VIEWS}}
import { authView } from '{{IMPORT:views.auth}}';
import { userView } from '{{IMPORT:views.user}}';
{{else}}
import { toPublicUser } from '{{IMPORT:domain.user}}';
{{/if}}
import { currentUser } from '{{IMPORT:ex.mw.authenticate}}';
import { respond } from '{{IMPORT:ex.respond}}';
import { parseRequest } from '{{IMPORT:ex.mw.validate}}';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
{{#if AUTH_REFRESH}}
  refreshTokenSchema,
{{/if}}
  registerSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from '{{IMPORT:ex.auth.schemas}}';

{{#if STYLE_USECASE}}
export interface AuthUseCases {
  register: RegisterUseCase;
  login: LoginUseCase;
{{#if AUTH_REFRESH}}
  refresh: RefreshSessionUseCase;
  logoutAll: LogoutAllUseCase;
{{/if}}
  logout: LogoutUseCase;
  getCurrentUser: GetCurrentUserUseCase;
  changePassword: ChangePasswordUseCase;
  requestPasswordReset: RequestPasswordResetUseCase;
  resetPassword: ResetPasswordUseCase;
  requestEmailVerification: RequestEmailVerificationUseCase;
  verifyEmail: VerifyEmailUseCase;
}

{{/if}}
const clientOf = (req: Request): ClientContext => ({ ip: req.ip, userAgent: req.get('user-agent') });

{{#if VIEWS}}
const session = (result: AuthResult) => authView.session(result);
const user = userView.one;
{{else}}
const session = (result: AuthResult) => ({ user: toPublicUser(result.user), tokens: result.tokens });
const user = toPublicUser;
{{/if}}

export class AuthController {
  constructor(private readonly auth: {{#if STYLE_SERVICE}}AuthService{{else}}AuthUseCases{{/if}}) {}

  register = async (req: Request, res: Response) => {
    const { body } = parseRequest(req, { body: registerSchema });
    const result = await this.auth.register{{CALL}}(body, clientOf(req));
    respond(res, session(result), { status: 201, message: 'Registered successfully' });
  };

  login = async (req: Request, res: Response) => {
    const { body } = parseRequest(req, { body: loginSchema });
    const result = await this.auth.login{{CALL}}(body, clientOf(req));
    respond(res, session(result), { message: 'Logged in successfully' });
  };
{{#if AUTH_REFRESH}}

  refresh = async (req: Request, res: Response) => {
    const { body } = parseRequest(req, { body: refreshTokenSchema });
    const result = await this.auth.refresh{{CALL}}(body.refreshToken, clientOf(req));
    respond(res, session(result), { message: 'Token refreshed' });
  };

  logout = async (req: Request, res: Response) => {
    const { body } = parseRequest(req, { body: refreshTokenSchema });
    await this.auth.logout{{CALL}}(body.refreshToken);
    respond(res, null, { message: 'Logged out' });
  };

  logoutAll = async (req: Request, res: Response) => {
    await this.auth.logoutAll{{CALL}}(currentUser(req).id);
    respond(res, null, { message: 'Logged out on all devices' });
  };
{{else}}

  logout = async (req: Request, res: Response) => {
    await this.auth.logout{{CALL}}(currentUser(req).id);
    respond(res, null, { message: 'Logged out' });
  };
{{/if}}

  me = async (req: Request, res: Response) => {
    respond(res, user(await this.auth.getCurrentUser{{CALL}}(currentUser(req).id)), { message: 'Current user' });
  };

  changePassword = async (req: Request, res: Response) => {
    const { body } = parseRequest(req, { body: changePasswordSchema });
    const result = await this.auth.changePassword{{CALL}}(currentUser(req).id, body, clientOf(req));
    respond(res, session(result), { message: 'Password changed' });
  };

  forgotPassword = async (req: Request, res: Response) => {
    const { body } = parseRequest(req, { body: forgotPasswordSchema });
    await this.auth.requestPasswordReset{{CALL}}(body.email);
    respond(res, null, { message: 'If the email is registered, a reset link has been sent' });
  };

  resetPassword = async (req: Request, res: Response) => {
    const { body } = parseRequest(req, { body: resetPasswordSchema });
    await this.auth.resetPassword{{CALL}}(body.token, body.newPassword);
    respond(res, null, { message: 'Password has been reset, please log in' });
  };

  requestEmailVerification = async (req: Request, res: Response) => {
    await this.auth.requestEmailVerification{{CALL}}(currentUser(req).id);
    respond(res, null, { message: 'Verification email sent' });
  };

  verifyEmail = async (req: Request, res: Response) => {
    const { body } = parseRequest(req, { body: verifyEmailSchema });
    respond(res, user(await this.auth.verifyEmail{{CALL}}(body.token)), { message: 'Email verified' });
  };
}
