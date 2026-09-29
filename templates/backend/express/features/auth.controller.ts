import type { Request, Response } from 'express';
import type { AuthService } from '{{IMPORT:app.authService}}';
{{#if VIEWS}}
import { authView } from '{{IMPORT:views.auth}}';
import { userView } from '{{IMPORT:views.user}}';
{{else}}
import { toSessionView, type ClientContext } from '{{IMPORT:app.authTypes}}';
import { toPublicUser } from '{{IMPORT:domain.user}}';
{{/if}}
{{#if VIEWS}}
import type { ClientContext } from '{{IMPORT:app.authTypes}}';
{{/if}}
import { currentUser } from '{{IMPORT:ex.mw.auth}}';
import { sendSuccess } from '{{IMPORT:ex.respond}}';
import { parseBody } from '{{IMPORT:ex.validation}}';
import {
{{#if AUTH_EMAIL}}
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  verifyEmailSchema,
{{/if}}
{{#if AUTH_OTP}}
  sendOtpSchema,
  verifyOtpSchema,
{{/if}}
{{#if SOCIAL}}
  socialLoginSchema,
{{/if}}
{{#if AUTH_REFRESH}}
  refreshTokenSchema,
{{/if}}
} from '{{IMPORT:ex.auth.schemas}}';
import { AUTH_MESSAGES } from '{{IMPORT:messages.auth}}';

{{#if VIEWS}}
const session = authView.session;
const publicUser = userView.one;
{{else}}
/** `{ user, tokens }` – the response of every sign-in endpoint. */
const session = toSessionView;
const publicUser = toPublicUser;
{{/if}}

/** IP + user agent – stored with the session and used in security logs. */
const client = (req: Request): ClientContext => ({ ip: req.ip, userAgent: req.get('user-agent') });

/** Handles `/auth` requests: {{AUTH_METHODS_TEXT}}, sessions. */
export class AuthController {
  constructor(private readonly auth: AuthService) {}
{{#if AUTH_EMAIL}}

  /** POST /auth/register – a verification code is emailed */
  register = async (req: Request, res: Response) => {
    const result = await this.auth.register(parseBody(registerSchema, req), client(req));
    sendSuccess(res, AUTH_MESSAGES.registered, session(result), { status: 201 });
  };

  /** POST /auth/login */
  login = async (req: Request, res: Response) => {
    const result = await this.auth.login(parseBody(loginSchema, req), client(req));
    sendSuccess(res, AUTH_MESSAGES.loggedIn, session(result));
  };
{{/if}}
{{#if AUTH_OTP}}

  /** POST /auth/otp/send – texts a 6-digit code */
  sendOtp = async (req: Request, res: Response) => {
    sendSuccess(res, AUTH_MESSAGES.codeSent, await this.auth.sendOtp(parseBody(sendOtpSchema, req)));
  };

  /** POST /auth/otp/verify – signs in (the account is created on the first login) */
  verifyOtp = async (req: Request, res: Response) => {
    const result = await this.auth.verifyOtp(parseBody(verifyOtpSchema, req), client(req));
    sendSuccess(res, AUTH_MESSAGES.loggedIn, session(result));
  };
{{/if}}
{{#if SOCIAL}}

  /** POST /auth/social – {{SOCIAL_PROVIDERS_TEXT}} (the token is verified with the provider) */
  socialLogin = async (req: Request, res: Response) => {
    const result = await this.auth.socialLogin(parseBody(socialLoginSchema, req), client(req));
    sendSuccess(res, AUTH_MESSAGES.loggedIn, session(result));
  };
{{/if}}
{{#if AUTH_REFRESH}}

  /** POST /auth/refresh{{#if AUTH_ROTATION}} – the used refresh token is revoked; reusing it revokes the whole session{{/if}} */
  refresh = async (req: Request, res: Response) => {
    const { refreshToken } = parseBody(refreshTokenSchema, req);
    sendSuccess(res, AUTH_MESSAGES.tokenRefreshed, session(await this.auth.refresh(refreshToken, client(req))));
  };

  /** POST /auth/logout – ends the session of a refresh token */
  logout = async (req: Request, res: Response) => {
    await this.auth.logout(parseBody(refreshTokenSchema, req).refreshToken);
    sendSuccess(res, AUTH_MESSAGES.loggedOut);
  };

  /** POST /auth/logout-all – every device */
  logoutAll = async (req: Request, res: Response) => {
    await this.auth.logoutAll(currentUser(req).id);
    sendSuccess(res, AUTH_MESSAGES.loggedOutEverywhere);
  };
{{else}}

  /** POST /auth/logout – invalidates every token of the user */
  logout = async (req: Request, res: Response) => {
    await this.auth.logout(currentUser(req).id);
    sendSuccess(res, AUTH_MESSAGES.loggedOut);
  };
{{/if}}

  /** GET /auth/me */
  me = async (req: Request, res: Response) => {
    sendSuccess(res, AUTH_MESSAGES.currentUser, publicUser(await this.auth.getCurrentUser(currentUser(req).id)));
  };
{{#if AUTH_EMAIL}}

  /** POST /auth/change-password – other sessions are signed out */
  changePassword = async (req: Request, res: Response) => {
    const result = await this.auth.changePassword(currentUser(req).id, parseBody(changePasswordSchema, req), client(req));
    sendSuccess(res, AUTH_MESSAGES.passwordChanged, session(result));
  };

  /** POST /auth/forgot-password – always succeeds (doesn't reveal which emails exist) */
  forgotPassword = async (req: Request, res: Response) => {
    await this.auth.requestPasswordReset(parseBody(forgotPasswordSchema, req).email);
    sendSuccess(res, AUTH_MESSAGES.resetCodeSent);
  };

  /** POST /auth/reset-password */
  resetPassword = async (req: Request, res: Response) => {
    await this.auth.resetPassword(parseBody(resetPasswordSchema, req));
    sendSuccess(res, AUTH_MESSAGES.passwordReset);
  };

  /** POST /auth/verify-email/request */
  requestEmailVerification = async (req: Request, res: Response) => {
    sendSuccess(res, AUTH_MESSAGES.verificationCodeSent, await this.auth.requestEmailVerification(currentUser(req).id));
  };

  /** POST /auth/verify-email */
  verifyEmail = async (req: Request, res: Response) => {
    const { code } = parseBody(verifyEmailSchema, req);
    sendSuccess(res, AUTH_MESSAGES.emailVerified, publicUser(await this.auth.verifyEmail(currentUser(req).id, code)));
  };
{{/if}}
}
