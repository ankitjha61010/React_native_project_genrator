/**
 * AES-256-CBC (PKCS#7) – mirrors the backend's encryption.middleware.ts.
 * Uses the Web Crypto API so it works in the browser AND in Next.js
 * edge / server components without any extra npm packages.
 */

const ENC_KEY = process.env.NEXT_PUBLIC_API_ENCRYPTION_KEY ?? '';
const ENC_IV  = process.env.NEXT_PUBLIC_API_ENCRYPTION_IV  ?? '';
const ENABLED = process.env.NEXT_PUBLIC_API_ENCRYPTION_ENABLED === 'true';

/** Convert a UTF-8 string to a raw CryptoKey for AES-256-CBC. */
async function importKey(keyStr: string): Promise<CryptoKey> {
  const raw = new TextEncoder().encode(keyStr);
  return crypto.subtle.importKey('raw', raw, { name: 'AES-CBC' }, false, ['encrypt', 'decrypt']);
}

/** Encrypt a UTF-8 string → base64 (same output as Node crypto AES-256-CBC). */
export async function encryptText(text: string): Promise<string> {
  const key = await importKey(ENC_KEY);
  const iv  = new TextEncoder().encode(ENC_IV);
  const data = new TextEncoder().encode(text);
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-CBC', iv }, key, data);
  return btoa(String.fromCharCode(...new Uint8Array(encrypted)));
}

/** Decrypt a base64 string → UTF-8 (same as Node crypto AES-256-CBC). */
export async function decryptText(base64: string): Promise<string> {
  const key = await importKey(ENC_KEY);
  const iv  = new TextEncoder().encode(ENC_IV);
  // base64 → Uint8Array
  const raw = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-CBC', iv }, key, raw);
  return new TextDecoder().decode(decrypted);
}

export { ENABLED as encryptionEnabled };
