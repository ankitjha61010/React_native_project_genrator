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
import { RefreshTokenModel, type RefreshTokenDocument } from '{{IMPORT:mongoose.auth}}';
{{/if}}
{{#if CODES}}
import type { VerificationCodesRepository } from '{{IMPORT:contract.auth}}';
import { VerificationCodeModel, type VerificationCodeDocument } from '{{IMPORT:mongoose.auth}}';
{{/if}}
{{#if SOCIAL}}
import type { SocialAccountsRepository } from '{{IMPORT:contract.auth}}';
import { SocialAccountModel, type SocialAccountDocument } from '{{IMPORT:mongoose.auth}}';
{{/if}}
{{#if AUTH_REFRESH}}

const toRefreshToken = (doc: RefreshTokenDocument): RefreshToken => ({
  id: doc._id,
  userId: doc.userId.toString(),
  tokenHash: doc.tokenHash,
  familyId: doc.familyId,
  expiresAt: doc.expiresAt,
  revokedAt: doc.revokedAt ?? null,
  replacedById: doc.replacedById ?? null,
  userAgent: doc.userAgent ?? null,
  ip: doc.ip ?? null,
  createdAt: doc.createdAt,
});

export class MongooseRefreshTokensRepository implements RefreshTokensRepository {
  async create(data: CreateRefreshTokenData): Promise<RefreshToken> {
    const { id, ...rest } = data;
    const doc = await RefreshTokenModel.create({ _id: id, ...rest });
    return toRefreshToken(doc.toObject<RefreshTokenDocument>());
  }

  async findById(id: string): Promise<RefreshToken | null> {
    const doc = await RefreshTokenModel.findById(id).lean<RefreshTokenDocument>();
    return doc ? toRefreshToken(doc) : null;
  }

  async revoke(id: string, replacedById?: string): Promise<void> {
    await RefreshTokenModel.updateOne({ _id: id, revokedAt: null }, { $set: { revokedAt: new Date(), replacedById: replacedById ?? null } });
  }

  async revokeFamily(familyId: string): Promise<void> {
    await RefreshTokenModel.updateMany({ familyId, revokedAt: null }, { $set: { revokedAt: new Date() } });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await RefreshTokenModel.updateMany({ userId, revokedAt: null }, { $set: { revokedAt: new Date() } });
  }

  async deleteExpired(before: Date): Promise<number> {
    return (await RefreshTokenModel.deleteMany({ expiresAt: { $lt: before } })).deletedCount;
  }
}
{{/if}}
{{#if CODES}}

const toCode = (doc: VerificationCodeDocument): VerificationCode => ({
  id: doc._id.toString(),
  purpose: doc.purpose as CodePurpose,
  target: doc.target,
  codeHash: doc.codeHash,
  attempts: doc.attempts,
  expiresAt: doc.expiresAt,
  usedAt: doc.usedAt ?? null,
  createdAt: doc.createdAt,
});

export class MongooseVerificationCodesRepository implements VerificationCodesRepository {
  async create(data: Pick<VerificationCode, 'purpose' | 'target' | 'codeHash' | 'expiresAt'>): Promise<VerificationCode> {
    return toCode((await VerificationCodeModel.create(data)).toObject<VerificationCodeDocument>());
  }

  async findActive(purpose: CodePurpose, target: string, now: Date): Promise<VerificationCode | null> {
    const doc = await VerificationCodeModel.findOne({ purpose, target, usedAt: null, expiresAt: { $gt: now } }).sort({ createdAt: -1 }).lean<VerificationCodeDocument>();
    return doc ? toCode(doc) : null;
  }

  async findLatest(purpose: CodePurpose, target: string): Promise<VerificationCode | null> {
    const doc = await VerificationCodeModel.findOne({ purpose, target }).sort({ createdAt: -1 }).lean<VerificationCodeDocument>();
    return doc ? toCode(doc) : null;
  }

  async incrementAttempts(id: string): Promise<void> {
    await VerificationCodeModel.updateOne({ _id: id }, { $inc: { attempts: 1 } });
  }

  async markUsed(id: string): Promise<void> {
    await VerificationCodeModel.updateOne({ _id: id }, { $set: { usedAt: new Date() } });
  }

  async invalidateAll(purpose: CodePurpose, target: string): Promise<void> {
    await VerificationCodeModel.updateMany({ purpose, target, usedAt: null }, { $set: { usedAt: new Date() } });
  }
}
{{/if}}
{{#if SOCIAL}}

const toAccount = (doc: SocialAccountDocument): SocialAccount => ({
  id: doc._id.toString(),
  userId: doc.userId.toString(),
  provider: doc.provider as SocialProvider,
  providerUserId: doc.providerUserId,
  email: doc.email ?? null,
  createdAt: doc.createdAt,
});

export class MongooseSocialAccountsRepository implements SocialAccountsRepository {
  async find(provider: SocialProvider, providerUserId: string): Promise<SocialAccount | null> {
    const doc = await SocialAccountModel.findOne({ provider, providerUserId }).lean<SocialAccountDocument>();
    return doc ? toAccount(doc) : null;
  }

  async create(data: Pick<SocialAccount, 'userId' | 'provider' | 'providerUserId' | 'email'>): Promise<SocialAccount> {
    try {
      return toAccount((await SocialAccountModel.create(data)).toObject<SocialAccountDocument>());
    } catch (error) {
      if (isUniqueViolation(error)) throw new ConflictError('This account is already linked', 'SOCIAL_ACCOUNT_LINKED');
      throw error;
    }
  }
}
{{/if}}
