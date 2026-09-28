import type { RefreshToken } from '{{IMPORT:domain.authTokens}}';
import type { CreateRefreshTokenData, RefreshTokensRepository } from '{{IMPORT:contract.refreshTokens}}';
import type { PrismaClient } from '{{IMPORT:db.connection}}';

export class PrismaRefreshTokensRepository implements RefreshTokensRepository {
  constructor(private readonly prisma: PrismaClient) {}

  create(data: CreateRefreshTokenData): Promise<RefreshToken> {
    return this.prisma.refreshToken.create({ data });
  }

  findById(id: string): Promise<RefreshToken | null> {
    return this.prisma.refreshToken.findUnique({ where: { id } });
  }

  async revoke(id: string, replacedById?: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { id, revokedAt: null },
      data: { revokedAt: new Date(), replacedById: replacedById ?? null },
    });
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
