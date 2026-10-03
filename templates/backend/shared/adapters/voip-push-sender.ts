import { createPrivateKey, sign, type KeyObject } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { connect, constants, type ClientHttp2Session } from 'node:http2';
import type { Logger } from '{{IMPORT:core.logger}}';
import type { VoipCallPayload, VoipPushSender } from '{{IMPORT:port.voipPushSender}}';

export interface ApnsSettings {
  /** Apple Developer → Keys: the key's 10-character id (APNS_KEY_ID). */
  keyId: string;
  /** Apple Developer → Membership: the team id (APNS_TEAM_ID). */
  teamId: string;
  /** Path to the AuthKey_XXXX.p8 file (or the PEM itself). */
  keyPath: string;
  /** The iOS bundle id – VoIP pushes go to the `<bundle id>.voip` topic. */
  bundleId: string;
  /** api.push.apple.com (App Store / TestFlight builds) instead of api.sandbox.push.apple.com (Xcode builds). */
  production: boolean;
}

const APNS_PRODUCTION = 'https://api.push.apple.com';
const APNS_SANDBOX = 'https://api.sandbox.push.apple.com';
/** Apple refuses provider tokens older than an hour and throttles new ones – refresh after 50 minutes. */
const JWT_TTL_MS = 50 * 60 * 1000;
/** A request that gets no answer in this time is given up. */
const REQUEST_TIMEOUT_MS = 10_000;
/**
 * The token is dead (app uninstalled, VoIP token reset). Note: a development token sent to the production host
 * (or the other way round) is also answered BadDeviceToken – check APNS_PRODUCTION if tokens keep disappearing.
 */
const INVALID_TOKEN_REASONS = new Set(['BadDeviceToken', 'Unregistered']);

/** Empty, or a dummy value written by the generator. */
const missing = (value: string) => !value || value.includes('REPLACE_ME');
const base64url = (value: string | Buffer) => Buffer.from(value).toString('base64url');

/** A PEM, or the path of a file holding one. */
function readKey(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.includes('PRIVATE KEY')) return trimmed;
  return existsSync(trimmed) ? readFileSync(trimmed, 'utf8') : null;
}

/** The settings that are not usable yet (empty, REPLACE_ME, or a key file that doesn't exist). */
export function missingApnsSettings(settings: ApnsSettings): string[] {
  const problems: string[] = [];
  if (missing(settings.keyId)) problems.push('APNS_KEY_ID');
  if (missing(settings.teamId)) problems.push('APNS_TEAM_ID');
  if (missing(settings.keyPath) || !readKey(settings.keyPath)) problems.push('APNS_KEY_PATH');
  if (missing(settings.bundleId)) problems.push('APNS_BUNDLE_ID');
  return problems;
}

/**
 * iOS VoIP pushes (PushKit) straight to APNs over HTTP/2, with token-based auth (an ES256 JWT signed with the
 * .p8 key). PushKit wakes the app even when it was killed, and the app reports the call to CallKit – the
 * native incoming call screen rings. Only Node built-ins: no APNs library needed.
 */
export class ApnsVoipPushSender implements VoipPushSender {
  private readonly key: KeyObject;
  private readonly host: string;
  private jwt: { value: string; createdAt: number } | null = null;
  private session: ClientHttp2Session | null = null;

  constructor(
    private readonly settings: ApnsSettings,
    private readonly logger: Logger,
  ) {
    this.key = createPrivateKey(readKey(settings.keyPath) ?? '');
    this.host = settings.production ? APNS_PRODUCTION : APNS_SANDBOX;
  }

  async send(tokens: string[], payload: VoipCallPayload, ttlSeconds?: number): Promise<{ invalidTokens: string[] }> {
    // 0 = deliver now or never; otherwise APNs keeps trying until the call stops ringing.
    const expiration = ttlSeconds ? Math.floor(Date.now() / 1000) + ttlSeconds : 0;
    const body = JSON.stringify(payload);
    const results = await Promise.all(
      [...new Set(tokens)].map(async token => {
        try {
          const { status, reason } = await this.post(token, body, expiration);
          if (status === 200) return null;
          // Our JWT was refused (clock skew, key revoked…): sign a new one for the next push.
          if (status === 403 && (reason === 'ExpiredProviderToken' || reason === 'InvalidProviderToken')) this.jwt = null;
          if (status === 410 || (status === 400 && reason && INVALID_TOKEN_REASONS.has(reason))) return token;
          this.logger.warn({ status, reason, callId: payload.callId }, 'APNs refused the VoIP push');
        } catch (error) {
          this.logger.warn({ err: error, callId: payload.callId }, 'VoIP push not sent (APNs unreachable)');
        }
        return null;
      }),
    );
    return { invalidTokens: results.filter(token => token !== null) };
  }

  /** The cached provider token (ES256 JWT), signed again every 50 minutes. */
  private providerToken(): string {
    if (this.jwt && Date.now() - this.jwt.createdAt < JWT_TTL_MS) return this.jwt.value;
    const unsigned = `${base64url(JSON.stringify({ alg: 'ES256', kid: this.settings.keyId }))}.${base64url(JSON.stringify({ iss: this.settings.teamId, iat: Math.floor(Date.now() / 1000) }))}`;
    // JWTs need the raw r‖s signature, not DER.
    const signature = sign('sha256', Buffer.from(unsigned), { key: this.key, dsaEncoding: 'ieee-p1363' });
    this.jwt = { value: `${unsigned}.${base64url(signature)}`, createdAt: Date.now() };
    return this.jwt.value;
  }

  /** One HTTP/2 connection, kept open between pushes (Apple's advice) and reopened when it closes. */
  private connection(): ClientHttp2Session {
    if (this.session && !this.session.closed && !this.session.destroyed) return this.session;
    const session = connect(this.host);
    session.on('error', error => this.logger.warn({ err: error }, 'APNs connection error'));
    session.on('goaway', () => session.close());
    session.on('close', () => {
      if (this.session === session) this.session = null;
    });
    // An idle connection must not keep the process alive (shutdown, tests).
    session.unref();
    this.session = session;
    return session;
  }

  private post(token: string, body: string, expiration: number): Promise<{ status: number; reason?: string }> {
    return new Promise((resolve, reject) => {
      const request = this.connection().request({
        ':method': 'POST',
        ':path': `/3/device/${encodeURIComponent(token)}`,
        authorization: `bearer ${this.providerToken()}`,
        'apns-topic': `${this.settings.bundleId}.voip`,
        'apns-push-type': 'voip',
        'apns-priority': '10',
        'apns-expiration': String(expiration),
        'content-type': 'application/json',
      });
      let status = 0;
      let data = '';
      request.setEncoding('utf8');
      request.on('response', headers => {
        status = Number(headers[':status'] ?? 0);
      });
      request.on('data', (chunk: string) => {
        data += chunk;
      });
      request.on('end', () => {
        let reason: string | undefined;
        try {
          reason = data ? (JSON.parse(data) as { reason?: string }).reason : undefined;
        } catch {
          reason = undefined;
        }
        resolve({ status, reason });
      });
      request.on('error', reject);
      request.setTimeout(REQUEST_TIMEOUT_MS, () => {
        request.close(constants.NGHTTP2_CANCEL);
        reject(new Error('APNs request timed out'));
      });
      request.end(body);
    });
  }
}

/** Development / not configured: VoIP pushes are not sent (says so once – Android and FCM still ring). */
export class LogVoipPushSender implements VoipPushSender {
  private warned = false;

  constructor(
    private readonly logger: Logger,
    private readonly missingSettings: string[],
  ) {}

  async send(tokens: string[], payload: VoipCallPayload): Promise<{ invalidTokens: string[] }> {
    if (!this.warned) {
      this.warned = true;
      this.logger.info({ missing: this.missingSettings }, 'iOS VoIP push (APNs) not configured – incoming calls do not wake killed iOS apps');
    }
    this.logger.debug({ devices: tokens.length, callId: payload.callId }, 'VoIP push (APNs not configured – not sent)');
    return { invalidTokens: [] };
  }
}

export function createVoipPushSender(settings: ApnsSettings, logger: Logger): VoipPushSender {
  const problems = missingApnsSettings(settings);
  if (problems.length) return new LogVoipPushSender(logger, problems);
  try {
    return new ApnsVoipPushSender(settings, logger);
  } catch (error) {
    // Not a valid .p8 key – the API still starts; only iOS VoIP pushes are off.
    logger.error({ err: error }, 'APNS_KEY_PATH is not a valid APNs auth key (.p8)');
    return new LogVoipPushSender(logger, ['APNS_KEY_PATH']);
  }
}
