import { readFileSync } from 'node:fs';
import { cert, getApps, initializeApp, type ServiceAccount } from 'firebase-admin/app';
import { getMessaging, type Messaging, type MulticastMessage } from 'firebase-admin/messaging';
import type { Logger } from '{{IMPORT:core.logger}}';
import type { PushMessage, PushSender } from '{{IMPORT:port.pushSender}}';

/** FCM accepts at most 500 tokens per multicast. */
const BATCH = 500;
const INVALID_TOKEN_CODES = new Set(['messaging/registration-token-not-registered', 'messaging/invalid-registration-token', 'messaging/invalid-argument']);

function toMulticast(tokens: string[], message: PushMessage): MulticastMessage {
  const ttl = message.ttlSeconds;
  if (!message.dataOnly) {
    return {
      tokens,
      notification: { title: message.title, body: message.body },
      data: message.data,
      android: { priority: 'high', notification: { sound: 'default' }, ...(ttl ? { ttl: ttl * 1000 } : {}) },
      apns: { payload: { aps: { sound: 'default' } } },
    };
  }
  const expiration: Record<string, string> = ttl
    ? { 'apns-expiration': String(Math.floor(Date.now() / 1000) + ttl) }
    : {};
  return {
    tokens,
    data: message.data,
    // No `notification`: Android hands the message to the app's FirebaseMessagingService, even when killed.
    android: { priority: 'high', ...(ttl ? { ttl: ttl * 1000 } : {}) },
    apns: message.title
      ? {
          headers: { 'apns-priority': '10', ...expiration },
          payload: { aps: { alert: { title: message.title, body: message.body }, sound: 'default' } },
        }
      : {
          headers: { 'apns-priority': '5', 'apns-push-type': 'background', ...expiration },
          payload: { aps: { contentAvailable: true } },
        },
  };
}

/** Firebase Cloud Messaging (Android + iOS through APNs). */
export class FcmPushSender implements PushSender {
  private readonly messaging: Messaging;

  /** `serviceAccount`: path to the JSON key file, or the JSON itself. */
  constructor(serviceAccount: string) {
    const json = serviceAccount.trim().startsWith('{') ? serviceAccount : readFileSync(serviceAccount, 'utf8');
    const app = getApps()[0] ?? initializeApp({ credential: cert(JSON.parse(json) as ServiceAccount) });
    this.messaging = getMessaging(app);
  }

  async send(tokens: string[], message: PushMessage): Promise<{ invalidTokens: string[] }> {
    const invalidTokens: string[] = [];
    for (let i = 0; i < tokens.length; i += BATCH) {
      const batch = tokens.slice(i, i + BATCH);
      const result = await this.messaging.sendEachForMulticast(toMulticast(batch, message));
      result.responses.forEach((response, index) => {
        const token = batch[index];
        if (token && response.error && INVALID_TOKEN_CODES.has(response.error.code)) invalidTokens.push(token);
      });
    }
    return { invalidTokens };
  }
}

/** Development: logs pushes instead of sending them (no Firebase credentials configured). */
export class LogPushSender implements PushSender {
  constructor(private readonly logger: Logger) {}

  async send(tokens: string[], message: PushMessage): Promise<{ invalidTokens: string[] }> {
    this.logger.info({ devices: tokens.length, title: message.title, data: message.data }, 'Push (FIREBASE_SERVICE_ACCOUNT not set – not sent)');
    return { invalidTokens: [] };
  }
}

export function createPushSender(serviceAccount: string, logger: Logger): PushSender {
  return serviceAccount ? new FcmPushSender(serviceAccount) : new LogPushSender(logger);
}
