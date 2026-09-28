import { readFileSync } from 'node:fs';
import { cert, getApps, initializeApp, type ServiceAccount } from 'firebase-admin/app';
import { getMessaging, type Messaging } from 'firebase-admin/messaging';
import type { Logger } from '{{IMPORT:core.logger}}';
import type { PushMessage, PushSender } from '{{IMPORT:port.pushSender}}';

/** FCM accepts at most 500 tokens per multicast. */
const BATCH = 500;
const INVALID_TOKEN_CODES = new Set(['messaging/registration-token-not-registered', 'messaging/invalid-registration-token', 'messaging/invalid-argument']);

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
      const result = await this.messaging.sendEachForMulticast({
        tokens: batch,
        notification: { title: message.title, body: message.body },
        data: message.data,
        android: { priority: 'high', notification: { sound: 'default' } },
        apns: { payload: { aps: { sound: 'default' } } },
      });
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
