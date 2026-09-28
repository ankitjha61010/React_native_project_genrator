import type { UserToken, UserTokenType } from '{{IMPORT:domain.authTokens}}';
import type { UserTokensRepository } from '{{IMPORT:contract.userTokens}}';
import { UserTokenModel, type UserTokenDocument } from '{{IMPORT:mongoose.userToken}}';

function toUserToken(doc: UserTokenDocument): UserToken {
  return {
    id: doc._id.toString(),
    userId: doc.userId.toString(),
    type: doc.type,
    tokenHash: doc.tokenHash,
    expiresAt: doc.expiresAt,
    usedAt: doc.usedAt ?? null,
    createdAt: doc.createdAt,
  };
}

export class MongooseUserTokensRepository implements UserTokensRepository {
  async create(data: Pick<UserToken, 'userId' | 'type' | 'tokenHash' | 'expiresAt'>): Promise<UserToken> {
    const doc = await UserTokenModel.create(data);
    return toUserToken(doc.toObject<UserTokenDocument>());
  }

  async findValid(type: UserTokenType, tokenHash: string, now: Date): Promise<UserToken | null> {
    const doc = await UserTokenModel.findOne({ type, tokenHash, usedAt: null, expiresAt: { $gt: now } }).lean<UserTokenDocument>();
    return doc ? toUserToken(doc) : null;
  }

  async markUsed(id: string): Promise<void> {
    await UserTokenModel.updateOne({ _id: id }, { $set: { usedAt: new Date() } });
  }

  async invalidateAll(userId: string, type: UserTokenType): Promise<void> {
    await UserTokenModel.updateMany({ userId, type, usedAt: null }, { $set: { usedAt: new Date() } });
  }
}
