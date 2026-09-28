import { {{#if AUTH}}In, {{/if}}type DataSource, type Repository } from 'typeorm';
import { ConflictError, NotFoundError } from '{{IMPORT:core.errors}}';
import { pageOffset, type PageQuery } from '{{IMPORT:core.pagination}}';
{{#if AUTH}}
import { isRole{{#if NOTIFICATIONS}}, type Role{{/if}} } from '{{IMPORT:domain.roles}}';
{{/if}}
import type { User } from '{{IMPORT:domain.user}}';
import type { CreateUserData, UpdateUserData, UsersRepository } from '{{IMPORT:contract.users}}';
import { isUniqueViolation } from '{{IMPORT:db.connection}}';
import { UserOrmEntity } from '{{IMPORT:typeorm.user}}';

{{#if POSTGRES}}
const LIKE = 'ILIKE';
{{else}}
const LIKE = 'LIKE';
{{/if}}
{{#if AUTH}}
const TAKEN = () => new ConflictError('Email or mobile number is already registered', 'ACCOUNT_EXISTS');
{{else}}
const TAKEN = () => new ConflictError('Email is already registered', 'EMAIL_TAKEN');
{{/if}}

function toUser(e: UserOrmEntity): User {
  return {
    id: e.id,
    email: e.email,
    name: e.name,
{{#if AUTH}}
    passwordHash: e.passwordHash,
    role: isRole(e.role) ? e.role : 'user',
    emailVerifiedAt: e.emailVerifiedAt,
    countryCode: e.countryCode,
    phone: e.phone,
    phoneVerifiedAt: e.phoneVerifiedAt,
    avatarUrl: e.avatarUrl,
    location: e.location,
    bio: e.bio,
    isActive: e.isActive,
    tokenVersion: e.tokenVersion,
    lastLoginAt: e.lastLoginAt,
    lastSeenAt: e.lastSeenAt,
{{#if SEC_LOCKOUT}}
    failedLoginAttempts: e.failedLoginAttempts,
    lockedUntil: e.lockedUntil,
{{/if}}
{{/if}}
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
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
{{#if AUTH}}

  async findByPhone(countryCode: string, phone: string): Promise<User | null> {
    const entity = await this.repo.findOneBy({ countryCode, phone });
    return entity ? toUser(entity) : null;
  }

  async findManyByIds(ids: string[]): Promise<User[]> {
    return ids.length ? (await this.repo.findBy({ id: In(ids) })).map(toUser) : [];
  }

  async search(term: string, options: { excludeId: string; limit: number }): Promise<User[]> {
    const entities = await this.repo
      .createQueryBuilder('user')
      .where('user.isActive = :active AND user.id != :me', { active: true, me: options.excludeId })
      .andWhere(`(user.name ${LIKE} :term OR user.email ${LIKE} :term)`, { term: `%${term}%` })
      .orderBy('user.name', 'ASC')
      .take(options.limit)
      .getMany();
    return entities.map(toUser);
  }
{{/if}}
{{#if NOTIFICATIONS}}

  async activeUserIds(role?: Role): Promise<string[]> {
    const rows = await this.repo.find({ select: { id: true }, where: { isActive: true, ...(role ? { role } : {}) } });
    return rows.map(r => r.id);
  }
{{/if}}

  async list(query: PageQuery): Promise<{ items: User[]; total: number }> {
    const qb = this.repo.createQueryBuilder('user').orderBy('user.createdAt', 'DESC').skip(pageOffset(query)).take(query.limit);
    if (query.search) qb.where(`user.email ${LIKE} :search OR user.name ${LIKE} :search`, { search: `%${query.search}%` });
    const [entities, total] = await qb.getManyAndCount();
    return { items: entities.map(toUser), total };
  }

  async create(data: CreateUserData): Promise<User> {
    try {
      return toUser(await this.repo.save(this.repo.create(data)));
    } catch (error) {
      if (isUniqueViolation(error)) throw TAKEN();
      throw error;
    }
  }

  async update(id: string, data: UpdateUserData): Promise<User> {
    const entity = await this.repo.findOneBy({ id });
    if (!entity) throw new NotFoundError('User not found', 'USER_NOT_FOUND');
    try {
      return toUser(await this.repo.save(this.repo.merge(entity, data)));
    } catch (error) {
      if (isUniqueViolation(error)) throw TAKEN();
      throw error;
    }
  }

{{#if REPLICA}}
  async saveReplica(user: User): Promise<void> {
    // save() updates when the primary key exists, inserts otherwise.
    await this.repo.save(this.repo.create(user));
  }

{{/if}}
  async delete(id: string): Promise<void> {
    const result = await this.repo.delete({ id });
    if (!result.affected) throw new NotFoundError('User not found', 'USER_NOT_FOUND');
  }
}
