import { createHarness } from '../support/harness.js';

const credentials = { email: 'Jane@Example.com', password: 'Sup3rSecret', name: 'Jane' };

describe('authentication', () => {
  let h: ReturnType<typeof createHarness>;

  beforeEach(() => {
    h = createHarness();
  });

  it('registers a user with a hashed password and a normalized email', async () => {
    const { user, tokens } = await h.auth.register(credentials);

    expect(user.email).toBe('jane@example.com');
    expect(user.passwordHash).not.toBe(credentials.password);
    expect(await h.hasher.verify(user.passwordHash, credentials.password)).toBe(true);
    expect(tokens.tokenType).toBe('Bearer');
    expect(tokens.accessToken).toBeTruthy();
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
{{#if AUTH_REFRESH}}

  it('refreshes the session', async () => {
    const { tokens } = await h.auth.register(credentials);
    const refreshed = await h.auth.refresh(tokens.refreshToken);

    expect(refreshed.tokens.accessToken).toBeTruthy();
{{#if AUTH_ROTATION}}
    expect(refreshed.tokens.refreshToken).not.toBe(tokens.refreshToken);
{{else}}
    expect(refreshed.tokens.refreshToken).toBe(tokens.refreshToken);
{{/if}}
  });
{{#if AUTH_ROTATION}}

  it('revokes the whole session when a rotated refresh token is reused', async () => {
    const { tokens } = await h.auth.register(credentials);
    const rotated = await h.auth.refresh(tokens.refreshToken);

    await expect(h.auth.refresh(tokens.refreshToken)).rejects.toMatchObject({ statusCode: 401, code: 'TOKEN_REUSED' });
    // The legitimate new token died with the family.
    await expect(h.auth.refresh(rotated.tokens.refreshToken)).rejects.toMatchObject({ statusCode: 401 });
  });
{{/if}}

  it('logs out a single session', async () => {
    const { tokens } = await h.auth.register(credentials);
    await h.auth.logout(tokens.refreshToken);
    await expect(h.auth.refresh(tokens.refreshToken)).rejects.toMatchObject({ statusCode: 401 });
  });

  it('logs out everywhere', async () => {
    const { user, tokens } = await h.auth.register(credentials);
    await h.auth.logoutAll(user.id);
    await expect(h.auth.authenticate(tokens.accessToken)).rejects.toMatchObject({ code: 'SESSION_REVOKED' });
    await expect(h.auth.refresh(tokens.refreshToken)).rejects.toMatchObject({ statusCode: 401 });
  });
{{else}}

  it('logout invalidates every token of the user', async () => {
    const { user, tokens } = await h.auth.register(credentials);
    await h.auth.logout(user.id);
    await expect(h.auth.authenticate(tokens.accessToken)).rejects.toMatchObject({ code: 'SESSION_REVOKED' });
  });
{{/if}}

  it('changes the password and signs out old sessions', async () => {
    const { user, tokens } = await h.auth.register(credentials);
    const result = await h.auth.changePassword(user.id, { currentPassword: credentials.password, newPassword: 'An0therSecret' });

    await expect(h.auth.authenticate(tokens.accessToken)).rejects.toMatchObject({ code: 'SESSION_REVOKED' });
    expect((await h.auth.authenticate(result.tokens.accessToken)).id).toBe(user.id);
    await expect(h.auth.changePassword(user.id, { currentPassword: 'Wrong1234', newPassword: 'Y3tAnother' })).rejects.toMatchObject({
      code: 'INVALID_CURRENT_PASSWORD',
    });
  });

  it('resets a forgotten password with the emailed one-time token', async () => {
    await h.auth.register(credentials);
    await h.auth.requestPasswordReset(credentials.email);
    const token = h.mailer.lastToken('jane@example.com');

    await h.auth.resetPassword(token, 'Brand5New');
    await expect(h.auth.login({ email: credentials.email, password: 'Brand5New' })).resolves.toBeTruthy();
    // One-time only.
    await expect(h.auth.resetPassword(token, 'Brand6New')).rejects.toMatchObject({ code: 'INVALID_TOKEN' });
  });

  it('does not reveal whether an email is registered', async () => {
    await expect(h.auth.requestPasswordReset('nobody@example.com')).resolves.toBeUndefined();
    expect(h.mailer.sent).toHaveLength(0);
  });

  it('verifies the email address with the emailed token', async () => {
    const { user } = await h.auth.register(credentials);
    expect(user.emailVerifiedAt).toBeNull();

    const verified = await h.auth.verifyEmail(h.mailer.lastToken('jane@example.com'));
    expect(verified.emailVerifiedAt).toBeInstanceOf(Date);
    await expect(h.auth.requestEmailVerification(user.id)).rejects.toMatchObject({ code: 'EMAIL_ALREADY_VERIFIED' });
  });
});
