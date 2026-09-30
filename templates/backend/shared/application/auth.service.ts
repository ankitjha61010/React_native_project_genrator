{{#if AUTH_EMAIL}}
{{#if SEC_LOCKOUT}}
import { AccountLockedError, BadRequestError, ConflictError, ForbiddenError, NotFoundError, UnauthorizedError } from '{{IMPORT:core.errors}}';
{{else}}
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError, UnauthorizedError } from '{{IMPORT:core.errors}}';
{{/if}}
{{else}}
import { ForbiddenError, NotFoundError } from '{{IMPORT:core.errors}}';
{{/if}}
import type { Logger } from '{{IMPORT:core.logger}}';
{{#if DEVICE_INPUT}}
import type { DeviceRegistry } from '{{IMPORT:domain.device}}';
{{/if}}
{{#if CODES}}
import { {{#if AUTH_EMAIL}}normalizeEmail, {{/if}}normalizePhone, type User } from '{{IMPORT:domain.user}}';
{{else}}
import type { User } from '{{IMPORT:domain.user}}';
{{/if}}
{{#if SOCIAL}}
import type { SocialAccountsRepository } from '{{IMPORT:contract.auth}}';
{{/if}}
import type { UsersRepository } from '{{IMPORT:contract.users}}';
{{#if AUTH_EMAIL}}
import type { Mailer } from '{{IMPORT:port.mailer}}';
import type { PasswordHasher } from '{{IMPORT:port.passwordHasher}}';
{{/if}}
{{#if AUTH_OTP}}
import type { SmsSender } from '{{IMPORT:port.smsSender}}';
{{/if}}
{{#if SOCIAL}}
import type { SocialVerifier } from '{{IMPORT:port.socialVerifier}}';
{{/if}}
{{#if CODES}}
import type { SentCode, VerificationCodes } from '{{IMPORT:app.authCodes}}';
{{/if}}
import type { Sessions } from '{{IMPORT:app.authSessions}}';
{{#if AUTH_EMAIL}}
import { assertPasswordPolicy } from '{{IMPORT:app.authTypes}}';
{{/if}}
import type {
  AuthResult,
  AuthSettings,
{{#if AUTH_EMAIL}}
  ChangePasswordInput,
{{/if}}
  ClientContext,
{{#if AUTH_EMAIL}}
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
{{/if}}
{{#if AUTH_OTP}}
  PhoneInput,
  VerifyOtpInput,
{{/if}}
{{#if SOCIAL}}
  SocialLoginInput,
{{/if}}
} from '{{IMPORT:app.authTypes}}';
import { USERS_MESSAGES } from '{{IMPORT:messages.users}}';
import { AUTH_MESSAGES } from '{{IMPORT:messages.auth}}';

export interface AuthDependencies {
  users: UsersRepository;
  sessions: Sessions;
{{#if CODES}}
  codes: VerificationCodes;
{{/if}}
{{#if AUTH_EMAIL}}
  hasher: PasswordHasher;
  mailer: Mailer;
{{/if}}
{{#if AUTH_OTP}}
  sms: SmsSender;
{{/if}}
{{#if SOCIAL}}
  socialAccounts: SocialAccountsRepository;
  socialVerifier: SocialVerifier;
{{/if}}
  settings: AuthSettings;
{{#if DEVICE_INPUT}}
  /** Saves the `device` of sign-in requests, removes it on logout (DevicesService, or events to the notifications service). */
  devices: DeviceRegistry;
{{/if}}
  logger: Logger;
}
{{#if AUTH_EMAIL}}

const INVALID_CREDENTIALS = () => new UnauthorizedError(AUTH_MESSAGES.invalidCredentials);
{{/if}}

/**
 * How users get in: {{AUTH_METHODS_TEXT}}. Framework independent – controllers only
 * call these methods. Tokens are handled by `Sessions`{{#if CODES}}, one-time codes by `VerificationCodes`{{/if}}.
 */
export class AuthService {
{{#if AUTH_EMAIL}}
  private dummyHash: Promise<string> | undefined;

{{/if}}
  constructor(private readonly deps: AuthDependencies) {}
{{#if AUTH_EMAIL}}

  // ── email + password ───────────────────────────────────────────────────────

  async register(input: RegisterInput, client: ClientContext = {}): Promise<AuthResult> {
    const { users, hasher, settings, logger } = this.deps;
    assertPasswordPolicy(input.password, settings.password);
    const email = normalizeEmail(input.email);
    if (await users.findByEmail(email)) throw new ConflictError(AUTH_MESSAGES.emailTaken);
    const phone = input.phone && input.countryCode ? await this.assertPhoneAvailable(input.countryCode, input.phone) : null;

    const user = await users.create({ email, name: input.name.trim(), passwordHash: await hasher.hash(input.password), countryCode: phone?.countryCode ?? null, phone: phone?.phone ?? null });
    logger.info({ userId: user.id }, 'User registered');
    await this.sendEmailVerification(user).catch(error => logger.error({ err: error, userId: user.id }, 'Sending the verification email failed'));
    return this.signIn(user, client);
  }

  async login(input: LoginInput, client: ClientContext = {}): Promise<AuthResult> {
    const { users, hasher } = this.deps;
    const user = await users.findByEmail(normalizeEmail(input.email));
    if (!user?.passwordHash) {
      // Same work as a real check, so response times don't reveal which emails exist.
      await hasher.verify(await this.getDummyHash(), input.password);
      throw INVALID_CREDENTIALS();
    }
{{#if SEC_LOCKOUT}}
    if (user.lockedUntil && user.lockedUntil > new Date()) throw new AccountLockedError(user.lockedUntil, AUTH_MESSAGES.accountLocked);
{{/if}}
    if (!(await hasher.verify(user.passwordHash, input.password))) {
{{#if SEC_LOCKOUT}}
      await this.recordFailedLogin(user, client);
{{else}}
      this.deps.logger.warn({ userId: user.id, ip: client.ip }, 'Failed login');
{{/if}}
      throw INVALID_CREDENTIALS();
    }
    // Transparently upgrade old hashes (other algorithm / cost).
    const rehash = hasher.needsRehash(user.passwordHash) ? { passwordHash: await hasher.hash(input.password) } : {};
    return this.signIn(await users.update(user.id, { ...rehash{{#if SEC_LOCKOUT}}, failedLoginAttempts: 0, lockedUntil: null{{/if}} }), client);
  }

  /** Changes (or, for accounts without one, sets) the password. Other sessions are signed out. */
  async changePassword(userId: string, input: ChangePasswordInput, client: ClientContext = {}): Promise<AuthResult> {
    const { users, hasher, sessions, settings, logger } = this.deps;
    const user = await this.getCurrentUser(userId);
    if (user.passwordHash) {
      if (!input.currentPassword || !(await hasher.verify(user.passwordHash, input.currentPassword))) {
        throw new BadRequestError(AUTH_MESSAGES.wrongCurrentPassword);
      }
      if (input.currentPassword === input.newPassword) throw new BadRequestError(AUTH_MESSAGES.passwordUnchanged);
    }
    assertPasswordPolicy(input.newPassword, settings.password, 'newPassword');

    await sessions.revokeAll(user.id);
    const updated = await users.update(user.id, { passwordHash: await hasher.hash(input.newPassword) });
    logger.info({ userId: user.id }, 'Password changed');
    return this.signIn(updated, client);
  }

  /** Emails a 6-digit code. Always succeeds, whether the email exists or not (no account enumeration). */
  async requestPasswordReset(email: string): Promise<void> {
    const { users, codes, mailer, settings } = this.deps;
    const user = await users.findByEmail(normalizeEmail(email));
    if (!user?.email || !user.isActive) return;
    const to = user.email;
    await codes.trySend('password_reset', to, code =>
      mailer.send({ to, subject: `${settings.appName}: reset your password`, text: `Hi ${user.name},\n\nYour password reset code is ${code}.\nIt expires in ${settings.codes.ttl}. If you didn't ask for it, ignore this email.` }),
    );
  }

  async resetPassword(input: ResetPasswordInput): Promise<void> {
    const { users, codes, hasher, sessions, settings, logger } = this.deps;
    const email = normalizeEmail(input.email);
    await codes.verify('password_reset', email, input.code);
    const user = await users.findByEmail(email);
    if (!user) throw new BadRequestError(AUTH_MESSAGES.invalidCode);
    assertPasswordPolicy(input.newPassword, settings.password, 'newPassword');

    await sessions.revokeAll(user.id);
    await users.update(user.id, { passwordHash: await hasher.hash(input.newPassword){{#if SEC_LOCKOUT}}, failedLoginAttempts: 0, lockedUntil: null{{/if}} });
    logger.info({ userId: user.id }, 'Password reset');
  }

  async requestEmailVerification(userId: string): Promise<SentCode> {
    const user = await this.getCurrentUser(userId);
    if (!user.email) throw new BadRequestError(AUTH_MESSAGES.noEmail);
    if (user.emailVerifiedAt) throw new ConflictError(AUTH_MESSAGES.emailAlreadyVerified);
    return this.sendEmailVerification(user);
  }

  async verifyEmail(userId: string, code: string): Promise<User> {
    const user = await this.getCurrentUser(userId);
    if (!user.email) throw new BadRequestError(AUTH_MESSAGES.noEmail);
    await this.deps.codes.verify('email_verification', user.email, code);
    return this.deps.users.update(user.id, { emailVerifiedAt: new Date() });
  }
{{/if}}
{{#if AUTH_OTP}}

  // ── mobile number + SMS code ───────────────────────────────────────────────

  /** Texts a 6-digit login code. Works for new and existing numbers. */
  async sendOtp(input: PhoneInput): Promise<SentCode> {
    const { countryCode, phone } = normalizePhone(input.countryCode, input.phone);
    const to = `${countryCode}${phone}`;
    return this.deps.codes.send('phone_login', to, code => this.deps.sms.send(to, `${code} is your ${this.deps.settings.appName} verification code.`));
  }

  /** Signs in with the SMS code; creates the account on the first login. */
  async verifyOtp(input: VerifyOtpInput, client: ClientContext = {}): Promise<AuthResult> {
    const { users, codes, logger } = this.deps;
    const { countryCode, phone } = normalizePhone(input.countryCode, input.phone);
    await codes.verify('phone_login', `${countryCode}${phone}`, input.otp);

    const existing = await users.findByPhone(countryCode, phone);
    if (existing) {
      const user = existing.phoneVerifiedAt ? existing : await users.update(existing.id, { phoneVerifiedAt: new Date() });
      return this.signIn(user, client);
    }
    const user = await users.create({ name: input.name?.trim() || `User ${phone.slice(-4)}`, countryCode, phone, phoneVerifiedAt: new Date() });
    logger.info({ userId: user.id }, 'User registered (mobile)');
    return { ...(await this.signIn(user, client)), isNewUser: true };
  }
{{/if}}
{{#if SOCIAL}}

  // ── social sign-in ────────────────────────────────────────────────────────

  /**
   * Verifies the provider token, then signs in the linked account – or links an account
   * with the same verified email – or creates a new one.
   */
  async socialLogin(input: SocialLoginInput, client: ClientContext = {}): Promise<AuthResult> {
    const { users, socialAccounts, socialVerifier, logger } = this.deps;
    const profile = await socialVerifier.verify(input);

    const linked = await socialAccounts.find(profile.provider, profile.providerUserId);
    if (linked) {
      const user = await users.findById(linked.userId);
      if (!user) throw new NotFoundError(USERS_MESSAGES.notFound);
      return this.signIn(user, client);
    }

    // Only a provider-verified email may be matched to an existing account.
    const byEmail = profile.email && profile.emailVerified ? await users.findByEmail(profile.email.toLowerCase()) : null;
    const user =
      byEmail ??
      (await users.create({
        email: profile.emailVerified ? (profile.email?.toLowerCase() ?? null) : null,
        emailVerifiedAt: profile.emailVerified ? new Date() : null,
        name: profile.name ?? input.name?.trim() ?? 'User',
        avatarUrl: profile.avatarUrl,
      }));
    await socialAccounts.create({ userId: user.id, provider: profile.provider, providerUserId: profile.providerUserId, email: profile.email });
    logger.info({ userId: user.id, provider: profile.provider, linked: !!byEmail }, 'Social sign-in');
    return { ...(await this.signIn(user, client)), isNewUser: !byEmail };
  }
{{/if}}

  // ── session & account ─────────────────────────────────────────────────────

  /** The user behind an access token (auth guard / middleware / socket handshake). */
  authenticate(accessToken: string): Promise<User> {
    return this.deps.sessions.authenticate(accessToken);
  }
{{#if AUTH_REFRESH}}

  async refresh(refreshToken: string, client: ClientContext = {}): Promise<AuthResult> {
    const result = await this.deps.sessions.refresh(refreshToken, client);
{{#if DEVICE_INPUT}}
    // Keeps the install's FCM token / app version current (the app sends its device with every refresh).
    await this.saveDevice(result.user.id, client);
{{/if}}
    return result;
  }

  /**
   * Ends this device's session{{#if DEVICE_INPUT}} and removes the device (`deviceId` – no more pushes){{/if}}. Works without a
   * valid access token, so an app can always log out.
   */
  async logout(refreshToken: string, {{#if DEVICE_INPUT}}deviceId{{else}}_deviceId{{/if}}?: string): Promise<void> {
{{#if DEVICE_INPUT}}
    const userId = await this.deps.sessions.logout(refreshToken);
    if (userId && deviceId) await this.removeDevice(userId, deviceId);
{{else}}
    await this.deps.sessions.logout(refreshToken);
{{/if}}
  }

  /** Signs the user out on every device. */
  async logoutAll(userId: string): Promise<void> {
    await this.deps.sessions.revokeAll(userId);
{{#if DEVICE_INPUT}}
    await this.deps.devices.removeAll(userId);
{{/if}}
  }
{{else}}

  /** Plain JWT has no per-device session: logging out invalidates every token of the user. */
  async logout(userId: string, {{#if DEVICE_INPUT}}deviceId{{else}}_deviceId{{/if}}?: string): Promise<void> {
    await this.deps.sessions.revokeAll(userId);
{{#if DEVICE_INPUT}}
    if (deviceId) await this.removeDevice(userId, deviceId);
{{/if}}
  }
{{/if}}

  async getCurrentUser(userId: string): Promise<User> {
    const user = await this.deps.users.findById(userId);
    if (!user) throw new NotFoundError(USERS_MESSAGES.notFound);
    return user;
  }

  // ── helpers ────────────────────────────────────────────────────────────────

  private async signIn(user: User, client: ClientContext): Promise<AuthResult> {
    if (!user.isActive) throw new ForbiddenError(AUTH_MESSAGES.accountDisabled);
    const updated = await this.deps.users.update(user.id, { lastLoginAt: new Date() });
    const tokens = await this.deps.sessions.issue(updated, client);
{{#if DEVICE_INPUT}}
    // Every sign-in saves the install (FCM token, model, versions) – the app makes no separate device request.
    await this.saveDevice(updated.id, client);
{{/if}}
    return { user: updated, tokens };
  }
{{#if DEVICE_INPUT}}

  /** Never fails the sign-in: without its device the app still works (just without pushes). */
  private async saveDevice(userId: string, client: ClientContext): Promise<void> {
    if (!client.device) return;
    await this.deps.devices.save(userId, client.device).catch(error => this.deps.logger.error({ err: error, userId }, 'Saving the device failed'));
  }

  private async removeDevice(userId: string, deviceId: string): Promise<void> {
    await this.deps.devices.remove(userId, deviceId).catch(error => this.deps.logger.error({ err: error, userId }, 'Removing the device failed'));
  }
{{/if}}
{{#if AUTH_EMAIL}}

  private async assertPhoneAvailable(countryCode: string, phone: string) {
    const normalized = normalizePhone(countryCode, phone);
    if (await this.deps.users.findByPhone(normalized.countryCode, normalized.phone)) {
      throw new ConflictError(USERS_MESSAGES.phoneTaken);
    }
    return normalized;
  }

  private sendEmailVerification(user: User): Promise<SentCode> {
    const { codes, mailer, settings } = this.deps;
    const to = user.email!;
    return codes.send('email_verification', to, code =>
      mailer.send({ to, subject: `${settings.appName}: confirm your email`, text: `Hi ${user.name},\n\nYour verification code is ${code}.\nIt expires in ${settings.codes.ttl}.` }),
    );
  }
{{#if SEC_LOCKOUT}}

  private async recordFailedLogin(user: User, client: ClientContext): Promise<void> {
    const { users, settings, logger } = this.deps;
    const attempts = user.failedLoginAttempts + 1;
    if (attempts >= settings.lockout.maxAttempts) {
      const lockedUntil = new Date(Date.now() + settings.lockout.minutes * 60_000);
      await users.update(user.id, { failedLoginAttempts: 0, lockedUntil });
      logger.warn({ userId: user.id, ip: client.ip, lockedUntil }, 'Account locked after repeated failed logins');
    } else {
      await users.update(user.id, { failedLoginAttempts: attempts });
      logger.warn({ userId: user.id, ip: client.ip, attempts }, 'Failed login');
    }
  }
{{/if}}

  private getDummyHash(): Promise<string> {
    this.dummyHash ??= this.deps.hasher.hash('timing-attack-protection-password-1');
    return this.dummyHash;
  }
{{/if}}
}
