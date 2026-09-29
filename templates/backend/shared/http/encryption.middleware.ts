import { createCipheriv, createDecipheriv } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { config } from '{{IMPORT:config.env}}';
import { errorResponse } from '{{IMPORT:core.response}}';
import { COMMON_MESSAGES } from '{{IMPORT:core.messages}}';

/**
 * AES-256-CBC (PKCS#7) with a fixed key and IV – exactly what the app's apiEncryption.ts
 * (crypto-js) does, so both sides read each other's `{ "data": "<base64>" }` bodies.
 *
 * This hides payloads from casual inspection; it is NOT a replacement for HTTPS.
 */
const key = () => Buffer.from(config.encryption.key, 'utf8');
const iv = () => Buffer.from(config.encryption.iv, 'utf8');

export function encryptText(text: string): string {
  const cipher = createCipheriv('aes-256-cbc', key(), iv());
  return Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]).toString('base64');
}

export function decryptText(base64: string): string {
  const decipher = createDecipheriv('aes-256-cbc', key(), iv());
  return Buffer.concat([decipher.update(base64, 'base64'), decipher.final()]).toString('utf8');
}

/** Decrypts `{ data }` request bodies and encrypts every JSON response. Multipart uploads pass through. */
export function apiEncryption(req: Request, res: Response, next: NextFunction): void {
  if (!config.encryption.enabled) return next();

  const body: unknown = req.body;
  if (body && typeof body === 'object' && typeof (body as { data?: unknown }).data === 'string') {
    try {
      req.body = JSON.parse(decryptText((body as { data: string }).data));
    } catch {
      res.status(400).json(errorResponse(COMMON_MESSAGES.decryptionFailed));
      return;
    }
  }

  const json = res.json.bind(res);
  res.json = (payload: unknown) => json({ data: encryptText(JSON.stringify(payload)) });
  next();
}
