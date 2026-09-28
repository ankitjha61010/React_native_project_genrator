import { IsNull, LessThan, type DataSource, type Repository } from 'typeorm';
import type { RefreshToken } from '{{IMPORT:domain.authTokens}}';
import type { CreateRefreshTokenData, RefreshTokensRepository } from '{{IMPORT:contract.refreshTokens}}';
import { RefreshTokenOrmEntity } from '{{IMPORT:typeorm.refreshToken}}';

const toRefreshToken = ({ user: _user, ...token }: RefreshTokenOrmEntity): RefreshToken => token;

export class TypeOrmRefreshTokensRepository implements RefreshTokensRepository {
  private readonly repo: Repository<RefreshTokenOrmEntity>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(RefreshTokenOrmEntity);
  }

  async create(data: CreateRefreshTokenData): Promise<RefreshToken> {
    return toRefreshToken(
      await this.repo.save(this.repo.create({ ...data, userAgent: data.userAgent ?? null, ip: data.ip ?? null, revokedAt: null, replacedById: null })),
    );
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
    const result = await this.repo.delete({ expiresAt: LessThan(before) });
    return result.affected ?? 0;
  }
}
