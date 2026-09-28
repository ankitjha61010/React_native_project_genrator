import type { RefreshToken } from '{{IMPORT:domain.authTokens}}';
import type { CreateRefreshTokenData, RefreshTokensRepository } from '{{IMPORT:contract.refreshTokens}}';
import { RefreshTokenModel, type RefreshTokenDocument } from '{{IMPORT:mongoose.refreshToken}}';

function toRefreshToken(doc: RefreshTokenDocument): RefreshToken {
  return {
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
  };
}

export class MongooseRefreshTokensRepository implements RefreshTokensRepository {
  async create({ id, ...data }: CreateRefreshTokenData): Promise<RefreshToken> {
    const doc = await RefreshTokenModel.create({ _id: id, ...data });
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
    const { deletedCount } = await RefreshTokenModel.deleteMany({ expiresAt: { $lt: before } });
    return deletedCount;
  }
}
