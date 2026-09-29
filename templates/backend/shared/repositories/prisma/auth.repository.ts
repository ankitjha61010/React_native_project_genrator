{{#if AUTH_REFRESH}}
import type { RefreshToken } from '{{IMPORT:domain.authTokens}}';
{{/if}}
{{#if DB_CODES}}
import type { CodePurpose, VerificationCode } from '{{IMPORT:domain.authTokens}}';
{{/if}}
{{#if SOCIAL}}
import { isUniqueViolation } from '{{IMPORT:db.connection}}';
import { ConflictError } from '{{IMPORT:core.errors}}';
import type { SocialAccount, SocialProvider } from '{{IMPORT:domain.authTokens}}';
{{/if}}
import type {
{{#if AUTH_REFRESH}}
  CreateRefreshTokenData,
  RefreshTokensRepository,
{{/if}}
{{#if SOCIAL}}
  SocialAccountsRepository,
{{/if}}
{{#if DB_CODES}}
  VerificationCodesRepository,
{{/if}}
} from '{{IMPORT:contract.auth}}';
import type { PrismaClient } from '{{IMPORT:db.connection}}';
{{#if SOCIAL}}
import { AUTH_MESSAGES } from '{{IMPORT:messages.auth}}';
{{/if}}
{{#if AUTH_REFRESH}}

export class PrismaRefreshTokensRepository implements RefreshTokensRepository {
  constructor(private readonly prisma: PrismaClient) {}

  create(data: CreateRefreshTokenData): Promise<RefreshToken> {
    return this.prisma.refreshToken.create({ data });
  }

  findById(id: string): Promise<RefreshToken | null> {
    return this.prisma.refreshToken.findUnique({ where: { id } });
  }

  async revoke(id: string, replacedById?: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({ where: { id, revokedAt: null }, data: { revokedAt: new Date(), replacedById: replacedById ?? null } });
  }

  async revokeFamily(familyId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({ where: { familyId, revokedAt: null }, data: { revokedAt: new Date() } });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
  }

  async deleteExpired(before: Date): Promise<number> {
    const { count } = await this.prisma.refreshToken.deleteMany({ where: { expiresAt: { lt: before } } });
    return count;
  }
}
{{/if}}
{{#if DB_CODES}}

const toCode = (record: Omit<VerificationCode, 'purpose'> & { purpose: string }): VerificationCode => ({ ...record, purpose: record.purpose as CodePurpose });

export class PrismaVerificationCodesRepository implements VerificationCodesRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: Pick<VerificationCode, 'purpose' | 'target' | 'codeHash' | 'expiresAt'>): Promise<VerificationCode> {
    return toCode(await this.prisma.verificationCode.create({ data }));
  }

  async findActive(purpose: CodePurpose, target: string, now: Date): Promise<VerificationCode | null> {
    const record = await this.prisma.verificationCode.findFirst({ where: { purpose, target, usedAt: null, expiresAt: { gt: now } }, orderBy: { createdAt: 'desc' } });
    return record ? toCode(record) : null;
  }

  async findLatest(purpose: CodePurpose, target: string): Promise<VerificationCode | null> {
    const record = await this.prisma.verificationCode.findFirst({ where: { purpose, target }, orderBy: { createdAt: 'desc' } });
    return record ? toCode(record) : null;
  }

  async incrementAttempts(id: string): Promise<void> {
    await this.prisma.verificationCode.update({ where: { id }, data: { attempts: { increment: 1 } } });
  }

  async markUsed(id: string): Promise<void> {
    await this.prisma.verificationCode.update({ where: { id }, data: { usedAt: new Date() } });
  }

  async invalidateAll(purpose: CodePurpose, target: string): Promise<void> {
    await this.prisma.verificationCode.updateMany({ where: { purpose, target, usedAt: null }, data: { usedAt: new Date() } });
  }
}
{{/if}}
{{#if SOCIAL}}

const toAccount = (record: Omit<SocialAccount, 'provider'> & { provider: string }): SocialAccount => ({ ...record, provider: record.provider as SocialProvider });

export class PrismaSocialAccountsRepository implements SocialAccountsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async find(provider: SocialProvider, providerUserId: string): Promise<SocialAccount | null> {
    const record = await this.prisma.socialAccount.findUnique({ where: { provider_providerUserId: { provider, providerUserId } } });
    return record ? toAccount(record) : null;
  }

  async create(data: Pick<SocialAccount, 'userId' | 'provider' | 'providerUserId' | 'email'>): Promise<SocialAccount> {
    try {
      return toAccount(await this.prisma.socialAccount.create({ data }));
    } catch (error) {
      if (isUniqueViolation(error)) throw new ConflictError(AUTH_MESSAGES.socialAccountLinked);
      throw error;
    }
  }
}
{{/if}}
