import { parseDuration, randomDigits, safeEqual, sha256 } from '{{IMPORT:core.crypto}}';
import { BadRequestError, TooManyRequestsError } from '{{IMPORT:core.errors}}';
import type { CodePurpose } from '{{IMPORT:domain.authTokens}}';
import type { VerificationCodesRepository } from '{{IMPORT:contract.auth}}';
import type { AuthSettings } from '{{IMPORT:app.authTypes}}';
import { AUTH_MESSAGES } from '{{IMPORT:messages.auth}}';

export interface SentCode {
  /** Seconds until the code expires. */
  expiresIn: number;
  /** Seconds until another code may be requested. */
  resendIn: number;
}

const hash = (target: string, code: string) => sha256(`${target}:${code}`);

/**
 * 6-digit one-time codes (email verification, password reset{{#if AUTH_OTP}}, SMS login{{/if}}). A code is
 * stored hashed, expires after `VERIFICATION_CODE_TTL` and dies after `…_MAX_ATTEMPTS` wrong tries.
 */
export class VerificationCodes {
  constructor(
    private readonly codes: VerificationCodesRepository,
    private readonly settings: NonNullable<AuthSettings['codes']>,
  ) {}

  /**
   * Creates a code and hands it to `deliver` (email / SMS). Older codes stop working.
   * Throws TooManyRequestsError when asked again too soon.
   */
  async send(purpose: CodePurpose, target: string, deliver: (code: string) => Promise<void>): Promise<SentCode> {
    const resendAfter = parseDuration(this.settings.resendAfter);
    const latest = await this.codes.findLatest(purpose, target);
    const wait = latest ? latest.createdAt.getTime() + resendAfter - Date.now() : 0;
    if (wait > 0) {
      throw new TooManyRequestsError(AUTH_MESSAGES.resendTooSoon(Math.ceil(wait / 1000)));
    }

    const code = randomDigits(6);
    const ttl = parseDuration(this.settings.ttl);
    await this.codes.invalidateAll(purpose, target);
    await this.codes.create({ purpose, target, codeHash: hash(target, code), expiresAt: new Date(Date.now() + ttl) });
    await deliver(code);
    return { expiresIn: Math.round(ttl / 1000), resendIn: Math.round(resendAfter / 1000) };
  }

  /** Like `send`, but silently does nothing when asked again too soon (no account enumeration). */
  async trySend(purpose: CodePurpose, target: string, deliver: (code: string) => Promise<void>): Promise<void> {
    try {
      await this.send(purpose, target, deliver);
    } catch (error) {
      if (!(error instanceof TooManyRequestsError)) throw error;
    }
  }

  /** Consumes the code, or throws BadRequestError (`INVALID_CODE`). */
  async verify(purpose: CodePurpose, target: string, code: string): Promise<void> {
    const record = await this.codes.findActive(purpose, target, new Date());
    if (!record || record.attempts >= this.settings.maxAttempts) {
      throw new BadRequestError(AUTH_MESSAGES.invalidCode);
    }
    if (!safeEqual(record.codeHash, hash(target, code.trim()))) {
      await this.codes.incrementAttempts(record.id);
      const left = this.settings.maxAttempts - record.attempts - 1;
      throw new BadRequestError(AUTH_MESSAGES.wrongCode(left));
    }
    await this.codes.markUsed(record.id);
  }
}
