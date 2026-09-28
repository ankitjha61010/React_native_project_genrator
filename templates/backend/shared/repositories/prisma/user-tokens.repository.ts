import type { UserToken, UserTokenType } from '{{IMPORT:domain.authTokens}}';
import type { UserTokensRepository } from '{{IMPORT:contract.userTokens}}';
import type { PrismaClient } from '{{IMPORT:db.connection}}';

type UserTokenRecord = NonNullable<Awaited<ReturnType<PrismaClient['userToken']['findUnique']>>>;

const toUserToken = (record: UserTokenRecord): UserToken => ({ ...record, type: record.type as UserTokenType });

export class PrismaUserTokensRepository implements UserTokensRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: Pick<UserToken, 'userId' | 'type' | 'tokenHash' | 'expiresAt'>): Promise<UserToken> {
    return toUserToken(await this.prisma.userToken.create({ data }));
  }

  async findValid(type: UserTokenType, tokenHash: string, now: Date): Promise<UserToken | null> {
    const record = await this.prisma.userToken.findFirst({ where: { type, tokenHash, usedAt: null, expiresAt: { gt: now } } });
    return record ? toUserToken(record) : null;
  }

  async markUsed(id: string): Promise<void> {
    await this.prisma.userToken.update({ where: { id }, data: { usedAt: new Date() } });
  }

  async invalidateAll(userId: string, type: UserTokenType): Promise<void> {
    await this.prisma.userToken.updateMany({ where: { userId, type, usedAt: null }, data: { usedAt: new Date() } });
  }
}
