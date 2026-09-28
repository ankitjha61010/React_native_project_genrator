import { IsNull, MoreThan, type DataSource, type Repository } from 'typeorm';
import type { UserToken, UserTokenType } from '{{IMPORT:domain.authTokens}}';
import type { UserTokensRepository } from '{{IMPORT:contract.userTokens}}';
import { UserTokenOrmEntity } from '{{IMPORT:typeorm.userToken}}';

const toUserToken = ({ user: _user, ...token }: UserTokenOrmEntity): UserToken => ({ ...token, type: token.type as UserTokenType });

export class TypeOrmUserTokensRepository implements UserTokensRepository {
  private readonly repo: Repository<UserTokenOrmEntity>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(UserTokenOrmEntity);
  }

  async create(data: Pick<UserToken, 'userId' | 'type' | 'tokenHash' | 'expiresAt'>): Promise<UserToken> {
    return toUserToken(await this.repo.save(this.repo.create({ ...data, usedAt: null })));
  }

  async findValid(type: UserTokenType, tokenHash: string, now: Date): Promise<UserToken | null> {
    const entity = await this.repo.findOneBy({ type, tokenHash, usedAt: IsNull(), expiresAt: MoreThan(now) });
    return entity ? toUserToken(entity) : null;
  }

  async markUsed(id: string): Promise<void> {
    await this.repo.update({ id }, { usedAt: new Date() });
  }

  async invalidateAll(userId: string, type: UserTokenType): Promise<void> {
    await this.repo.update({ userId, type, usedAt: IsNull() }, { usedAt: new Date() });
  }
}
