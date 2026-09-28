import { {{#if AUTH_REFRESH}}IsNull, LessThan, {{else}}{{#if CODES}}IsNull, {{/if}}{{/if}}{{#if CODES}}MoreThan, {{/if}}type DataSource, type Repository } from 'typeorm';
{{#if SOCIAL}}
import { ConflictError } from '{{IMPORT:core.errors}}';
{{/if}}
{{#if AUTH_REFRESH}}
import type { RefreshToken } from '{{IMPORT:domain.authTokens}}';
{{/if}}
{{#if CODES}}
import type { CodePurpose, VerificationCode } from '{{IMPORT:domain.authTokens}}';
{{/if}}
{{#if SOCIAL}}
import type { SocialAccount, SocialProvider } from '{{IMPORT:domain.authTokens}}';
import { isUniqueViolation } from '{{IMPORT:db.connection}}';
{{/if}}
{{#if AUTH_REFRESH}}
import type { CreateRefreshTokenData, RefreshTokensRepository } from '{{IMPORT:contract.auth}}';
import { RefreshTokenOrmEntity } from '{{IMPORT:typeorm.auth}}';
{{/if}}
{{#if CODES}}
import type { VerificationCodesRepository } from '{{IMPORT:contract.auth}}';
import { VerificationCodeOrmEntity } from '{{IMPORT:typeorm.auth}}';
{{/if}}
{{#if SOCIAL}}
import type { SocialAccountsRepository } from '{{IMPORT:contract.auth}}';
import { SocialAccountOrmEntity } from '{{IMPORT:typeorm.auth}}';
{{/if}}
{{#if AUTH_REFRESH}}

const toRefreshToken = (e: RefreshTokenOrmEntity): RefreshToken => ({
  id: e.id,
  userId: e.userId,
  tokenHash: e.tokenHash,
  familyId: e.familyId,
  expiresAt: e.expiresAt,
  revokedAt: e.revokedAt,
  replacedById: e.replacedById,
  userAgent: e.userAgent,
  ip: e.ip,
  createdAt: e.createdAt,
});

export class TypeOrmRefreshTokensRepository implements RefreshTokensRepository {
  private readonly repo: Repository<RefreshTokenOrmEntity>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(RefreshTokenOrmEntity);
  }

  async create(data: CreateRefreshTokenData): Promise<RefreshToken> {
    return toRefreshToken(await this.repo.save(this.repo.create({ userAgent: null, ip: null, revokedAt: null, replacedById: null, ...data })));
  }

  async findById(id: string): Promise<RefreshToken | null> {
    const entity = await this.repo.findOneBy({ id });
    return entity ? toRefreshToken(entity) : null;
  }

  async revoke(id: string, replacedById?: string): Promise<void> {
    await this.repo.update({ id, revokedAt: IsNull() }, { revokedAt: new Date(), replacedById: replacedById ?? null });
  }

  async revokeFamily(familyId: string): Promise<void> {
    await this.repo.update({ familyId, revokedAt: IsNull() }, { revokedAt: new Date() });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.repo.update({ userId, revokedAt: IsNull() }, { revokedAt: new Date() });
  }

  async deleteExpired(before: Date): Promise<number> {
    return (await this.repo.delete({ expiresAt: LessThan(before) })).affected ?? 0;
  }
}
{{/if}}
{{#if CODES}}

const toCode = (e: VerificationCodeOrmEntity): VerificationCode => ({
  id: e.id,
  purpose: e.purpose as CodePurpose,
  target: e.target,
  codeHash: e.codeHash,
  attempts: e.attempts,
  expiresAt: e.expiresAt,
  usedAt: e.usedAt,
  createdAt: e.createdAt,
});

export class TypeOrmVerificationCodesRepository implements VerificationCodesRepository {
  private readonly repo: Repository<VerificationCodeOrmEntity>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(VerificationCodeOrmEntity);
  }

  async create(data: Pick<VerificationCode, 'purpose' | 'target' | 'codeHash' | 'expiresAt'>): Promise<VerificationCode> {
    return toCode(await this.repo.save(this.repo.create({ ...data, attempts: 0, usedAt: null })));
  }

  async findActive(purpose: CodePurpose, target: string, now: Date): Promise<VerificationCode | null> {
    const entity = await this.repo.findOne({ where: { purpose, target, usedAt: IsNull(), expiresAt: MoreThan(now) }, order: { createdAt: 'DESC' } });
    return entity ? toCode(entity) : null;
  }

  async findLatest(purpose: CodePurpose, target: string): Promise<VerificationCode | null> {
    const entity = await this.repo.findOne({ where: { purpose, target }, order: { createdAt: 'DESC' } });
    return entity ? toCode(entity) : null;
  }

  async incrementAttempts(id: string): Promise<void> {
    await this.repo.increment({ id }, 'attempts', 1);
  }

  async markUsed(id: string): Promise<void> {
    await this.repo.update({ id }, { usedAt: new Date() });
  }

  async invalidateAll(purpose: CodePurpose, target: string): Promise<void> {
    await this.repo.update({ purpose, target, usedAt: IsNull() }, { usedAt: new Date() });
  }
}
{{/if}}
{{#if SOCIAL}}

const toAccount = (e: SocialAccountOrmEntity): SocialAccount => ({ id: e.id, userId: e.userId, provider: e.provider as SocialProvider, providerUserId: e.providerUserId, email: e.email, createdAt: e.createdAt });

export class TypeOrmSocialAccountsRepository implements SocialAccountsRepository {
  private readonly repo: Repository<SocialAccountOrmEntity>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(SocialAccountOrmEntity);
  }

  async find(provider: SocialProvider, providerUserId: string): Promise<SocialAccount | null> {
    const entity = await this.repo.findOneBy({ provider, providerUserId });
    return entity ? toAccount(entity) : null;
  }

  async create(data: Pick<SocialAccount, 'userId' | 'provider' | 'providerUserId' | 'email'>): Promise<SocialAccount> {
    try {
      return toAccount(await this.repo.save(this.repo.create(data)));
    } catch (error) {
      if (isUniqueViolation(error)) throw new ConflictError('This account is already linked', 'SOCIAL_ACCOUNT_LINKED');
      throw error;
    }
  }
}
{{/if}}
