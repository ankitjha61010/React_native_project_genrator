import { ConflictError, NotFoundError } from '{{IMPORT:core.errors}}';
import { pageOffset, type PageQuery } from '{{IMPORT:core.pagination}}';
{{#if AUTH}}
import { isRole } from '{{IMPORT:domain.roles}}';
{{/if}}
import type { User } from '{{IMPORT:domain.user}}';
import type { CreateUserData, UpdateUserData, UsersRepository } from '{{IMPORT:contract.users}}';
import { isNotFound, isUniqueViolation, type PrismaClient } from '{{IMPORT:db.connection}}';

type UserRecord = NonNullable<Awaited<ReturnType<PrismaClient['user']['findUnique']>>>;

function toUser(record: UserRecord): User {
{{#if AUTH}}
  return { ...record, role: isRole(record.role) ? record.role : 'user' };
{{else}}
  return record;
{{/if}}
}

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

  async list(query: PageQuery): Promise<{ items: User[]; total: number }> {
    const where = query.search
{{#if POSTGRES}}
      ? { OR: [{ email: { contains: query.search, mode: 'insensitive' as const } }, { name: { contains: query.search, mode: 'insensitive' as const } }] }
{{else}}
      ? { OR: [{ email: { contains: query.search } }, { name: { contains: query.search } }] }
{{/if}}
      : {};
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
      if (isUniqueViolation(error)) throw new ConflictError('Email is already registered', 'EMAIL_TAKEN');
      throw error;
    }
  }

  async update(id: string, data: UpdateUserData): Promise<User> {
    try {
      return toUser(await this.prisma.user.update({ where: { id }, data }));
    } catch (error) {
      if (isNotFound(error)) throw new NotFoundError('User not found', 'USER_NOT_FOUND');
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.user.delete({ where: { id } });
    } catch (error) {
      if (isNotFound(error)) throw new NotFoundError('User not found', 'USER_NOT_FOUND');
      throw error;
    }
  }
}
