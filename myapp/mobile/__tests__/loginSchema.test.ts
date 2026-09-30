import { loginSchema } from '@business/validation/loginSchema';

describe('loginSchema', () => {
  it('accepts valid credentials', () => {
    expect(loginSchema.safeParse({ email: 'jane@example.com', password: 'secret1' }).success).toBe(true);
  });

  it('returns translation keys as error messages', () => {
    const result = loginSchema.safeParse({ email: 'not-an-email', password: '123' });
    expect(result.success).toBe(false);
    const messages = result.error?.issues.map(issue => issue.message);
    expect(messages).toEqual(expect.arrayContaining(['emailInvalid', 'passwordMin']));
  });
});
