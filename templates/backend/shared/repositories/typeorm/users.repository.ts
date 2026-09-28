import type { DataSource, Repository } from 'typeorm';
import { ConflictError, NotFoundError } from '{{IMPORT:core.errors}}';
import { pageOffset, type PageQuery } from '{{IMPORT:core.pagination}}';
{{#if AUTH}}
import { isRole } from '{{IMPORT:domain.roles}}';
{{/if}}
import type { User } from '{{IMPORT:domain.user}}';
import type { CreateUserData, UpdateUserData, UsersRepository } from '{{IMPORT:contract.users}}';
import { isUniqueViolation } from '{{IMPORT:db.connection}}';
import { UserOrmEntity } from '{{IMPORT:typeorm.user}}';

function toUser(entity: UserOrmEntity): User {
  return {
    id: entity.id,
    email: entity.email,
    name: entity.name,
{{#if AUTH}}
    passwordHash: entity.passwordHash,
    role: isRole(entity.role) ? entity.role : 'user',
    emailVerifiedAt: entity.emailVerifiedAt,
    isActive: entity.isActive,
    tokenVersion: entity.tokenVersion,
    lastLoginAt: entity.lastLoginAt,
{{#if SEC_LOCKOUT}}
    failedLoginAttempts: entity.failedLoginAttempts,
    lockedUntil: entity.lockedUntil,
{{/if}}
{{/if}}
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

export class TypeOrmUsersRepository implements UsersRepository {
  private readonly repo: Repository<UserOrmEntity>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(UserOrmEntity);
  }

  async findById(id: string): Promise<User | null> {
    const entity = await this.repo.findOneBy({ id });
    return entity ? toUser(entity) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const entity = await this.repo.findOneBy({ email });
    return entity ? toUser(entity) : null;
  }

  async list(query: PageQuery): Promise<{ items: User[]; total: number }> {
    const qb = this.repo.createQueryBuilder('user').orderBy('user.createdAt', 'DESC').skip(pageOffset(query)).take(query.limit);
    if (query.search) {
{{#if POSTGRES}}
      qb.where('user.email ILIKE :search OR user.name ILIKE :search', { search: `%${query.search}%` });
{{else}}
      qb.where('user.email LIKE :search OR user.name LIKE :search', { search: `%${query.search}%` });
{{/if}}
    }
    const [entities, total] = await qb.getManyAndCount();
    return { items: entities.map(toUser), total };
  }

  async create(data: CreateUserData): Promise<User> {
    try {
      return toUser(await this.repo.save(this.repo.create(data)));
    } catch (error) {
      if (isUniqueViolation(error)) throw new ConflictError('Email is already registered', 'EMAIL_TAKEN');
      throw error;
    }
  }

  async update(id: string, data: UpdateUserData): Promise<User> {
    const entity = await this.repo.findOneBy({ id });
    if (!entity) throw new NotFoundError('User not found', 'USER_NOT_FOUND');
    return toUser(await this.repo.save(this.repo.merge(entity, data)));
  }

  async delete(id: string): Promise<void> {
    const result = await this.repo.delete({ id });
    if (!result.affected) throw new NotFoundError('User not found', 'USER_NOT_FOUND');
  }
}
