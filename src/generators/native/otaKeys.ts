import { generateKeyPairSync } from 'node:crypto';
import path from 'node:path';
import fs from 'fs-extra';

/** Where the OTA signing key is written inside the app project (git-ignored). */
export const OTA_PRIVATE_KEY_FILE = 'ota/ota-signing-key.pem';

/**
 * One RSA key pair per generated project: the app embeds the public key and only accepts
 * bundles signed with the private key (scripts/ota-bundle.mjs signs with it).
 */
export interface OTAKeys {
  privateKeyPem: string;
  /** X.509 SubjectPublicKeyInfo, base64 – Android `X509EncodedKeySpec`. */
  publicKeySpki: string;
  /** PKCS#1 RSAPublicKey, base64 – iOS `SecKeyCreateWithData`. */
  publicKeyPkcs1: string;
}

export function generateOTAKeys(): OTAKeys {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  return {
    privateKeyPem: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
    publicKeySpki: publicKey.export({ type: 'spki', format: 'der' }).toString('base64'),
    publicKeyPkcs1: publicKey.export({ type: 'pkcs1', format: 'der' }).toString('base64'),
  };
}

export async function writeOTAPrivateKey(projectDir: string, keys: OTAKeys): Promise<void> {
  const file = path.join(projectDir, OTA_PRIVATE_KEY_FILE);
  await fs.ensureDir(path.dirname(file));
  await fs.writeFile(file, keys.privateKeyPem, { encoding: 'utf8', mode: 0o600 });
}
