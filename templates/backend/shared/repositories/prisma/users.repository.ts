import { ConflictError, NotFoundError } from '{{IMPORT:core.errors}}';
import { pageOffset, type PageQuery } from '{{IMPORT:core.pagination}}';
{{#if AUTH}}
import { isRole{{#if NOTIFICATIONS}}, type Role{{/if}} } from '{{IMPORT:domain.roles}}';
{{/if}}
import type { User } from '{{IMPORT:domain.user}}';
import type { CreateUserData, UpdateUserData, UsersRepository } from '{{IMPORT:contract.users}}';
import { isNotFound, isUniqueViolation, type PrismaClient } from '{{IMPORT:db.connection}}';

type UserRecord = NonNullable<Awaited<ReturnType<PrismaClient['user']['findUnique']>>>;

{{#if AUTH}}
const toUser = (record: UserRecord): User => ({ ...record, role: isRole(record.role) ? record.role : 'user' });
const TAKEN = () => new ConflictError('Email or mobile number is already registered', 'ACCOUNT_EXISTS');
{{else}}
const toUser = (record: UserRecord): User => record;
const TAKEN = () => new ConflictError('Email is already registered', 'EMAIL_TAKEN');
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

  async search(term: string, options: { excludeId: string; limit: number }): Promise<User[]> {
    const records = await this.prisma.user.findMany({
      where: { isActive: true, id: { not: options.excludeId }, OR: [{ name: contains(term) }, { email: contains(term) }] },
      orderBy: { name: 'asc' },
      take: options.limit,
    });
    return records.map(toUser);
  }
{{/if}}
{{#if NOTIFICATIONS}}

  async activeUserIds(role?: Role): Promise<string[]> {
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
      if (isNotFound(error)) throw new NotFoundError('User not found', 'USER_NOT_FOUND');
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
      if (isNotFound(error)) throw new NotFoundError('User not found', 'USER_NOT_FOUND');
      throw error;
    }
  }
}
