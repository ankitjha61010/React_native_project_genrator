import { createHarness, type Harness } from '../support/test-infrastructure.js';
{{#if AUTH_EMAIL}}

const credentials = { email: 'Jane@Example.com', password: 'Sup3rSecret', name: 'Jane' };
{{/if}}

describe('authentication', () => {
  let h: Harness;

  beforeEach(() => {
    h = createHarness();
  });
{{#if AUTH_REFRESH}}

  /** A signed-in session through the first enabled sign-in method. */
  const signIn = async () => {
{{#if AUTH_EMAIL}}
    return h.auth.register(credentials);
{{else}}
{{#if AUTH_OTP}}
    await h.auth.sendOtp({ countryCode: '+1', phone: '5550100000' });
    return h.auth.verifyOtp({ countryCode: '+1', phone: '5550100000', otp: h.sms.lastCode('+15550100000') });
{{else}}
    return h.auth.socialLogin({ provider: {{SOCIAL_PROVIDER}}, token: 'valid:session', tokenType: 'idToken' });
{{/if}}
{{/if}}
  };
{{/if}}
{{#if AUTH_EMAIL}}

  describe('email + password', () => {
    it('registers a user with a hashed password and a normalized email', async () => {
      const { user, tokens } = await h.auth.register(credentials);

      expect(user.email).toBe('jane@example.com');
      expect(user.passwordHash).not.toBe(credentials.password);
      expect(await h.infra.passwordHasher.verify(user.passwordHash!, credentials.password)).toBe(true);
      expect(tokens.tokenType).toBe('Bearer');
      // A verification code was emailed.
      expect(h.mailer.lastCode('jane@example.com')).toMatch(/^\d{6}$/);
    });

    it('stores the mobile number given at sign-up and rejects a taken one', async () => {
      const { user } = await h.auth.register({ ...credentials, countryCode: '91', phone: '98765 43210' });
      expect(user).toMatchObject({ countryCode: '+91', phone: '9876543210', phoneVerifiedAt: null });

      await expect(h.auth.register({ ...credentials, email: 'other@example.com', countryCode: '+91', phone: '9876543210' })).rejects.toMatchObject({ statusCode: 409, code: 'PHONE_TAKEN' });
    });

    it('rejects a duplicate email', async () => {
      await h.auth.register(credentials);
      await expect(h.auth.register({ ...credentials, email: 'JANE@example.com' })).rejects.toMatchObject({ statusCode: 409, code: 'EMAIL_TAKEN' });
    });

    it('enforces the password policy', async () => {
      await expect(h.auth.register({ ...credentials, password: 'short' })).rejects.toMatchObject({ statusCode: 422, code: 'VALIDATION_ERROR' });
      await expect(h.auth.register({ ...credentials, password: 'onlyletters' })).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    });

    it('logs in and resolves the user from the access token', async () => {
      await h.auth.register(credentials);
      const { user, tokens } = await h.auth.login({ email: 'jane@example.com', password: credentials.password });

      expect((await h.auth.authenticate(tokens.accessToken)).id).toBe(user.id);
      expect(user.lastLoginAt).toBeInstanceOf(Date);
    });

    it('answers wrong passwords and unknown emails with the same error', async () => {
      await h.auth.register(credentials);
      await expect(h.auth.login({ email: credentials.email, password: 'Wrong1234' })).rejects.toMatchObject({ statusCode: 401, code: 'INVALID_CREDENTIALS' });
      await expect(h.auth.login({ email: 'nobody@example.com', password: 'Wrong1234' })).rejects.toMatchObject({ statusCode: 401, code: 'INVALID_CREDENTIALS' });
    });

    it('rejects a tampered access token', async () => {
      const { tokens } = await h.auth.register(credentials);
      await expect(h.auth.authenticate(`${tokens.accessToken}x`)).rejects.toMatchObject({ statusCode: 401 });
    });
{{#if SEC_LOCKOUT}}

    it('locks the account after repeated failed logins', async () => {
      await h.auth.register(credentials);
      for (let i = 0; i < 3; i++) {
        await expect(h.auth.login({ email: credentials.email, password: 'Wrong1234' })).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
      }
      // Even the right password is refused while locked.
      await expect(h.auth.login({ email: credentials.email, password: credentials.password })).rejects.toMatchObject({ statusCode: 423, code: 'ACCOUNT_LOCKED' });
    });
{{/if}}

    it('changes the password and signs out the other sessions', async () => {
      const { user, tokens } = await h.auth.register(credentials);
      await h.auth.changePassword(user.id, { currentPassword: credentials.password, newPassword: 'N3wPassword' });

      await expect(h.auth.authenticate(tokens.accessToken)).rejects.toMatchObject({ code: 'SESSION_REVOKED' });
      await h.auth.login({ email: credentials.email, password: 'N3wPassword' });
    });

    it('resets a forgotten password with the emailed code', async () => {
      await h.auth.register(credentials);
      h.repositories.verificationCodes.age('jane@example.com');
      await h.auth.requestPasswordReset(credentials.email);
      const code = h.mailer.lastCode('jane@example.com');

      const wrong = code === '000000' ? '111111' : '000000';
      await expect(h.auth.resetPassword({ email: credentials.email, code: wrong, newPassword: 'Brand5New' })).rejects.toMatchObject({ code: 'INVALID_CODE' });
      await h.auth.resetPassword({ email: credentials.email, code, newPassword: 'Brand5New' });
      await h.auth.login({ email: credentials.email, password: 'Brand5New' });
      // A code works once.
      await expect(h.auth.resetPassword({ email: credentials.email, code, newPassword: 'Brand6New' })).rejects.toMatchObject({ code: 'INVALID_CODE' });
    });

    it('does not reveal whether an email is registered', async () => {
      await expect(h.auth.requestPasswordReset('nobody@example.com')).resolves.toBeUndefined();
      expect(h.mailer.sent).toHaveLength(0);
    });

    it('verifies the email address with the emailed code', async () => {
      const { user } = await h.auth.register(credentials);
      const verified = await h.auth.verifyEmail(user.id, h.mailer.lastCode('jane@example.com'));
      expect(verified.emailVerifiedAt).toBeInstanceOf(Date);
    });
  });
{{/if}}
{{#if AUTH_OTP}}

  describe('mobile number + SMS code', () => {
    const phone = { countryCode: '+1', phone: '555 010 9999' };

    it('creates the account on the first login and reuses it afterwards', async () => {
      const sent = await h.auth.sendOtp(phone);
      expect(sent).toMatchObject({ expiresIn: 600, resendIn: 60 });

      const first = await h.auth.verifyOtp({ ...phone, otp: h.sms.lastCode('+15550109999'), name: 'Sam' });
      expect(first.isNewUser).toBe(true);
      expect(first.user).toMatchObject({ name: 'Sam', countryCode: '+1', phone: '5550109999', email: null });
      expect(first.user.phoneVerifiedAt).toBeInstanceOf(Date);

      h.repositories.verificationCodes.age('+15550109999');
      await h.auth.sendOtp(phone);
      const second = await h.auth.verifyOtp({ ...phone, otp: h.sms.lastCode('+15550109999') });
      expect(second.isNewUser).toBeUndefined();
      expect(second.user.id).toBe(first.user.id);
    });

    it('throttles resends', async () => {
      await h.auth.sendOtp(phone);
      await expect(h.auth.sendOtp(phone)).rejects.toMatchObject({ statusCode: 429, code: 'CODE_RESEND_TOO_SOON' });
    });

    it('kills the code after too many wrong attempts', async () => {
      await h.auth.sendOtp(phone);
      const code = h.sms.lastCode('+15550109999');
      const wrong = code === '000000' ? '111111' : '000000';
      for (let i = 0; i < 5; i++) await expect(h.auth.verifyOtp({ ...phone, otp: wrong })).rejects.toMatchObject({ code: 'INVALID_CODE' });
      // Even the right code is refused now.
      await expect(h.auth.verifyOtp({ ...phone, otp: code })).rejects.toMatchObject({ code: 'INVALID_CODE' });
    });
  });
{{/if}}
{{#if SOCIAL}}

  describe('social sign-in', () => {
    const provider = {{SOCIAL_PROVIDER}};

    it('creates an account on the first sign-in and signs in the same account afterwards', async () => {
      const first = await h.auth.socialLogin({ provider, token: 'valid:abc:sam@example.com', tokenType: 'idToken' });
      expect(first.isNewUser).toBe(true);
      expect(first.user).toMatchObject({ email: 'sam@example.com', passwordHash: null });

      const second = await h.auth.socialLogin({ provider, token: 'valid:abc:sam@example.com', tokenType: 'idToken' });
      expect(second.user.id).toBe(first.user.id);
    });
{{#if AUTH_EMAIL}}

    it('links to an existing account with the same verified email', async () => {
      const { user } = await h.auth.register({ email: 'sam@example.com', password: 'Sup3rSecret', name: 'Sam' });
      const result = await h.auth.socialLogin({ provider, token: 'valid:xyz:sam@example.com', tokenType: 'idToken' });
      expect(result.user.id).toBe(user.id);
      expect(result.isNewUser).toBe(false);
    });
{{/if}}

    it('rejects tokens the provider does not accept', async () => {
      await expect(h.auth.socialLogin({ provider, token: 'forged-token', tokenType: 'idToken' })).rejects.toMatchObject({ statusCode: 401, code: 'INVALID_SOCIAL_TOKEN' });
    });
  });
{{/if}}
{{#if AUTH_REFRESH}}

  describe('sessions', () => {
{{#if AUTH_ROTATION}}
    it('rotates refresh tokens and revokes the family on reuse', async () => {
      const { tokens } = await signIn();
      const next = await h.auth.refresh(tokens.refreshToken);
      expect(next.tokens.refreshToken).not.toBe(tokens.refreshToken);

      await expect(h.auth.refresh(tokens.refreshToken)).rejects.toMatchObject({ code: 'TOKEN_REUSED' });
      // The whole family is gone – the newest token too.
      await expect(h.auth.refresh(next.tokens.refreshToken)).rejects.toMatchObject({ statusCode: 401 });
    });
{{else}}
    it('refreshes the access token with the same refresh token', async () => {
      const { tokens } = await signIn();
      const next = await h.auth.refresh(tokens.refreshToken);
      expect(next.tokens.refreshToken).toBe(tokens.refreshToken);
    });
{{/if}}

    it('logs out one device', async () => {
      const { tokens } = await signIn();
      await h.auth.logout(tokens.refreshToken);
      await expect(h.auth.refresh(tokens.refreshToken)).rejects.toMatchObject({ statusCode: 401 });
    });
  });
{{/if}}
});
