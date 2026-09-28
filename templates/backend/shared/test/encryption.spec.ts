import { decryptText, encryptText } from '{{IMPORT:http.encryption}}';

// Produced by the app's apiEncryption.ts (crypto-js AES-256-CBC, PKCS#7) with the test key / IV.
const FROM_APP = 'tti/AglvlWu/teK1aC6uVwUTsY3WNdtAEbFed/NfJT3IRruOJstPW54eqLddvlIBzeXXTXsjhAgaiaraCXsdfA==';
const PLAIN = JSON.stringify({ email: 'jane@example.com', password: 'Sup3rSecret' });

describe('API encryption (compatible with the app)', () => {
  it('decrypts what the app encrypted', () => {
    expect(decryptText(FROM_APP)).toBe(PLAIN);
  });

  it('encrypts exactly like the app', () => {
    expect(encryptText(PLAIN)).toBe(FROM_APP);
  });

  it('round-trips any text', () => {
    const text = JSON.stringify({ success: true, data: { name: 'Zoë 🚀' } });
    expect(decryptText(encryptText(text))).toBe(text);
  });
});
