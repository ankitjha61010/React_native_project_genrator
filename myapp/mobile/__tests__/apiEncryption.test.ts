import { decryptPayload, encryptPayload, fromEncryptedBody, toEncryptedBody } from '@data/api/apiEncryption';

describe('apiEncryption', () => {
  it('round-trips JSON payloads', () => {
    const payload = { email: 'jane@example.com', roles: ['admin'], age: 30 };
    const cipher = encryptPayload(payload);
    expect(cipher).not.toContain('jane');
    expect(decryptPayload(cipher)).toEqual(payload);
  });

  it('wraps request bodies and unwraps responses', () => {
    const body = toEncryptedBody({ id: 1 });
    expect(typeof body.data).toBe('string');
    expect(fromEncryptedBody(body)).toEqual({ id: 1 });
    expect(fromEncryptedBody(body.data)).toEqual({ id: 1 });
  });

  it('rejects data that was not encrypted with the configured key', () => {
    expect(() => decryptPayload('bm90IGVuY3J5cHRlZA==')).toThrow();
  });
});
