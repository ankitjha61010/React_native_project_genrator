import { ConflictError, NotFoundError } from '{{IMPORT:core.errors}}';
import { pageOffset, type PageQuery } from '{{IMPORT:core.pagination}}';
{{#if AUTH}}
import { DEFAULT_ROLE, isRole{{#if NOTIFICATIONS}}, type UserRole{{/if}} } from '{{IMPORT:domain.roles}}';
{{/if}}
import type { User } from '{{IMPORT:domain.user}}';
import type { CreateUserData, UpdateUserData, UsersRepository } from '{{IMPORT:contract.users}}';
import { isNotFound, isUniqueViolation, type PrismaClient } from '{{IMPORT:db.connection}}';
import { USERS_MESSAGES } from '{{IMPORT:messages.users}}';

type UserRecord = NonNullable<Awaited<ReturnType<PrismaClient['user']['findUnique']>>>;

{{#if AUTH}}
const toUser = (record: UserRecord): User => ({ ...record, role: isRole(record.role) ? record.role : DEFAULT_ROLE });
const TAKEN = () => new ConflictError(USERS_MESSAGES.accountExists);
{{else}}
const toUser = (record: UserRecord): User => record;
const TAKEN = () => new ConflictError(USERS_MESSAGES.emailTaken);
{{/if}}
{{#if POSTGRES}}
const contains = (value: string) => ({ contains: value, mode: 'insensitive' as const });
{{else}}
const contains = (value: string) => ({ contains: value });
{{/if}}

export class PrismaUsersRepository implements UsersRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<User | null> {
    const record = await this.prisma.user.findUnique({ where: { id } });
    return record ? toUser(record) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const record = await this.prisma.user.findUnique({ where: { email } });
    return record ? toUser(record) : null;
  }
{{#if AUTH}}

  async findByPhone(countryCode: string, phone: string): Promise<User | null> {
    const record = await this.prisma.user.findUnique({ where: { countryCode_phone: { countryCode, phone } } });
    return record ? toUser(record) : null;
  }

  async findManyByIds(ids: string[]): Promise<User[]> {
    if (!ids.length) return [];
    return (await this.prisma.user.findMany({ where: { id: { in: ids } } })).map(toUser);
  }

  async search(term: string, options: { excludeId: string; offset: number; limit: number }): Promise<{ items: User[]; total: number }> {
    const where = { isActive: true, id: { not: options.excludeId }, ...(term ? { OR: [{ name: contains(term) }, { email: contains(term) }] } : {}) };
    const [records, total] = await Promise.all([
      this.prisma.user.findMany({ where, orderBy: [{ name: 'asc' }, { id: 'asc' }], skip: options.offset, take: options.limit }),
      this.prisma.user.count({ where }),
    ]);
    return { items: records.map(toUser), total };
  }
{{/if}}
{{#if NOTIFICATIONS}}

  async activeUserIds(role?: UserRole): Promise<string[]> {
    const records = await this.prisma.user.findMany({ where: { isActive: true, ...(role ? { role } : {}) }, select: { id: true } });
    return records.map(r => r.id);
  }
{{/if}}

  async list(query: PageQuery): Promise<{ items: User[]; total: number }> {
    const where = query.search ? { OR: [{ email: contains(query.search) }, { name: contains(query.search) }] } : {};
    const [records, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({ where, orderBy: { createdAt: 'desc' }, skip: pageOffset(query), take: query.limit }),
      this.prisma.user.count({ where }),
    ]);
    return { items: records.map(toUser), total };
  }

  async create(data: CreateUserData): Promise<User> {
    try {
      return toUser(await this.prisma.user.create({ data }));
    } catch (error) {
      if (isUniqueViolation(error)) throw TAKEN();
      throw error;
    }
  }

  async update(id: string, data: UpdateUserData): Promise<User> {
    try {
      return toUser(await this.prisma.user.update({ where: { id }, data }));
    } catch (error) {
      if (isNotFound(error)) throw new NotFoundError(USERS_MESSAGES.notFound);
      if (isUniqueViolation(error)) throw TAKEN();
      throw error;
    }
  }

{{#if REPLICA}}
  async saveReplica(user: User): Promise<void> {
    await this.prisma.user.upsert({ where: { id: user.id }, create: user, update: user });
  }

{{/if}}
  async delete(id: string): Promise<void> {
    try {
      await this.prisma.user.delete({ where: { id } });
    } catch (error) {
      if (isNotFound(error)) throw new NotFoundError(USERS_MESSAGES.notFound);
      throw error;
    }
  }
}
