/**
 * AES-256-CBC (PKCS#7) – mirrors the backend's encryption.middleware.ts.
 * Uses the Web Crypto API so it works in the browser without any extra npm packages.
 * Vite (React) variant – reads VITE_* env vars via import.meta.env.
 */

const ENC_KEY = import.meta.env.VITE_API_ENCRYPTION_KEY ?? '';
const ENC_IV  = import.meta.env.VITE_API_ENCRYPTION_IV  ?? '';
const ENABLED = import.meta.env.VITE_API_ENCRYPTION_ENABLED === 'true';

async function importKey(keyStr: string): Promise<CryptoKey> {
  const raw = new TextEncoder().encode(keyStr);
  return crypto.subtle.importKey('raw', raw, { name: 'AES-CBC' }, false, ['encrypt', 'decrypt']);
}

export async function encryptText(text: string): Promise<string> {
  const key = await importKey(ENC_KEY);
  const iv  = new TextEncoder().encode(ENC_IV);
  const data = new TextEncoder().encode(text);
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-CBC', iv }, key, data);
  return btoa(String.fromCharCode(...new Uint8Array(encrypted)));
}

export async function decryptText(base64: string): Promise<string> {
  const key = await importKey(ENC_KEY);
  const iv  = new TextEncoder().encode(ENC_IV);
  const raw = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-CBC', iv }, key, raw);
  return new TextDecoder().decode(decrypted);
}

export { ENABLED as encryptionEnabled };
