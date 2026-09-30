import CryptoJS from 'crypto-js';
import { appConfig } from '{{IMPORT:config.app}}';

/**
 * AES-256-CBC (PKCS7) payload encryption with crypto-js. The backend must use the same
 * algorithm, key and IV (`API_ENCRYPTION_KEY` / `API_ENCRYPTION_IV` in `.env`).
 *
 * Wire format (adapt `toEncryptedBody` / `fromEncryptedBody` to your backend's contract):
 *   request body   { "data": "<base64 cipher text>" }
 *   response body  { "data": "<base64 cipher text>" }  or the bare cipher string
 *
 * `apiClient` applies this automatically to every request. Opt out per request with
 * `api.post(url, body, { skipEncryption: true })`, e.g. for multipart uploads.
 */

const KEY_LENGTH = 32;
const IV_LENGTH = 16;

let cipherParams: { key: CryptoJS.lib.WordArray; iv: CryptoJS.lib.WordArray } | undefined;

function params() {
  if (!cipherParams) {
    const { key, iv } = appConfig.api.encryption;
    if (key.length !== KEY_LENGTH || iv.length !== IV_LENGTH) {
      throw new Error(
        `API encryption is misconfigured: API_ENCRYPTION_KEY must be ${KEY_LENGTH} and API_ENCRYPTION_IV ${IV_LENGTH} characters long.`,
      );
    }
    cipherParams = { key: CryptoJS.enc.Utf8.parse(key), iv: CryptoJS.enc.Utf8.parse(iv) };
  }
  return cipherParams;
}

/**
 * Sent as `X-Encryption-Key-Id` with every encrypted request: the first 12 hex characters of
 * SHA-256(key + iv), never the key. When the server can't decrypt a body it compares this with
 * its own and answers ENCRYPTION_KEY_MISMATCH – usually a bundle built with an old `.env`
 * (react-native-dotenv inlines it at build time: restart Metro with `--reset-cache` and rebuild).
 */
export const ENCRYPTION_KEY_ID_HEADER = 'X-Encryption-Key-Id';

let keyId: string | undefined;

export function encryptionKeyId(): string {
  if (keyId === undefined) {
    const { key, iv } = appConfig.api.encryption;
    keyId = CryptoJS.SHA256(key + iv).toString(CryptoJS.enc.Hex).slice(0, 12);
  }
  return keyId;
}

export function isEncryptionEnabled(): boolean {
  return appConfig.api.encryption.enabled;
}

/** Encrypts any JSON-serialisable value (strings are encrypted as-is). */
export function encryptPayload(data: unknown): string {
  const { key, iv } = params();
  const plain = typeof data === 'string' ? data : JSON.stringify(data);
  return CryptoJS.AES.encrypt(plain, key, { iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 }).toString();
}

/** Decrypts a cipher text; JSON is parsed, anything else is returned as a string. */
export function decryptPayload<T = unknown>(cipherText: string): T {
  const { key, iv } = params();
  let plain = '';
  try {
    plain = CryptoJS.AES.decrypt(cipherText, key, { iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 }).toString(
      CryptoJS.enc.Utf8,
    );
  } catch {
    // Malformed UTF-8 → wrong key/IV or not a cipher text; reported below.
  }
  if (!plain) {
    throw new Error('Could not decrypt the payload – check API_ENCRYPTION_KEY / API_ENCRYPTION_IV.');
  }
  try {
    return JSON.parse(plain) as T;
  } catch {
    return plain as T;
  }
}

export function toEncryptedBody(data: unknown): { data: string } {
  return { data: encryptPayload(data) };
}

export function fromEncryptedBody(body: unknown): unknown {
  if (typeof body === 'string' && body.length > 0) {
    return decryptPayload(body);
  }
  if (body && typeof body === 'object' && 'data' in body && typeof body.data === 'string') {
    return decryptPayload(body.data);
  }
  return body; // empty / not encrypted (e.g. 204 No Content)
}
