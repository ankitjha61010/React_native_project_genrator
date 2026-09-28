import { randomUUID } from 'node:crypto';
import { ConflictError, NotFoundError } from '{{IMPORT:core.errors}}';
import { pageOffset, type PageQuery } from '{{IMPORT:core.pagination}}';
{{#if AUTH}}
{{#if AUTH_REFRESH}}
import type { RefreshToken, UserToken, UserTokenType } from '{{IMPORT:domain.authTokens}}';
{{else}}
import type { UserToken, UserTokenType } from '{{IMPORT:domain.authTokens}}';
{{/if}}
{{/if}}
import type { User } from '{{IMPORT:domain.user}}';
{{#if AUTH_REFRESH}}
import type { CreateRefreshTokenData, RefreshTokensRepository } from '{{IMPORT:contract.refreshTokens}}';
{{/if}}
{{#if AUTH}}
import type { UserTokensRepository } from '{{IMPORT:contract.userTokens}}';
{{/if}}
import type { CreateUserData, UpdateUserData, UsersRepository } from '{{IMPORT:contract.users}}';

/** In-memory implementations of the repository contracts (tests only). */
export class InMemoryUsersRepository implements UsersRepository {
  readonly users = new Map<string, User>();

  async findById(id: string) {
    return this.users.get(id) ?? null;
  }

  async findByEmail(email: string) {
    return [...this.users.values()].find(user => user.email === email) ?? null;
  }

  async list(query: PageQuery) {
    const search = query.search?.toLowerCase();
    const all = [...this.users.values()]
      .filter(user => !search || user.email.includes(search) || user.name.toLowerCase().includes(search))
      .toSorted((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return { items: all.slice(pageOffset(query), pageOffset(query) + query.limit), total: all.length };
  }

  async create(data: CreateUserData) {
    if (await this.findByEmail(data.email)) throw new ConflictError('Email is already registered', 'EMAIL_TAKEN');
    const now = new Date();
    const user: User = {
      id: randomUUID(),
      email: data.email,
      name: data.name,
{{#if AUTH}}
      passwordHash: data.passwordHash,
      role: data.role ?? 'user',
      emailVerifiedAt: data.emailVerifiedAt ?? null,
      isActive: true,
      tokenVersion: 0,
      lastLoginAt: null,
{{#if SEC_LOCKOUT}}
      failedLoginAttempts: 0,
      lockedUntil: null,
{{/if}}
{{/if}}
      createdAt: now,
      updatedAt: now,
    };
    this.users.set(user.id, user);
    return user;
  }

  async update(id: string, data: UpdateUserData) {
    const user = this.users.get(id);
    if (!user) throw new NotFoundError('User not found', 'USER_NOT_FOUND');
    const updated = { ...user, ...data, updatedAt: new Date() };
    this.users.set(id, updated);
    return updated;
  }

  async delete(id: string) {
    if (!this.users.delete(id)) throw new NotFoundError('User not found', 'USER_NOT_FOUND');
  }
}
{{#if AUTH_REFRESH}}

export class InMemoryRefreshTokensRepository implements RefreshTokensRepository {
  readonly tokens = new Map<string, RefreshToken>();

  async create(data: CreateRefreshTokenData) {
    const token: RefreshToken = { userAgent: null, ip: null, ...data, revokedAt: null, replacedById: null, createdAt: new Date() };
    this.tokens.set(token.id, token);
    return token;
  }

  async findById(id: string) {
    return this.tokens.get(id) ?? null;
  }

  async revoke(id: string, replacedById?: string) {
    const token = this.tokens.get(id);
    if (token && !token.revokedAt) this.tokens.set(id, { ...token, revokedAt: new Date(), replacedById: replacedById ?? null });
  }

  async revokeFamily(familyId: string) {
    for (const token of this.tokens.values()) if (token.familyId === familyId) await this.revoke(token.id);
  }

  async revokeAllForUser(userId: string) {
    for (const token of this.tokens.values()) if (token.userId === userId) await this.revoke(token.id);
  }

  async deleteExpired(before: Date) {
    let count = 0;
    for (const token of this.tokens.values()) if (token.expiresAt < before && this.tokens.delete(token.id)) count++;
    return count;
  }
}
{{/if}}
{{#if AUTH}}

export class InMemoryUserTokensRepository implements UserTokensRepository {
  readonly tokens = new Map<string, UserToken>();

  async create(data: Pick<UserToken, 'userId' | 'type' | 'tokenHash' | 'expiresAt'>) {
    const token: UserToken = { id: randomUUID(), ...data, usedAt: null, createdAt: new Date() };
    this.tokens.set(token.id, token);
    return token;
  }

  async findValid(type: UserTokenType, tokenHash: string, now: Date) {
    return [...this.tokens.values()].find(t => t.type === type && t.tokenHash === tokenHash && !t.usedAt && t.expiresAt > now) ?? null;
  }

  async markUsed(id: string) {
    const token = this.tokens.get(id);
    if (token) this.tokens.set(id, { ...token, usedAt: new Date() });
  }

  async invalidateAll(userId: string, type: UserTokenType) {
    for (const token of this.tokens.values()) if (token.userId === userId && token.type === type) await this.markUsed(token.id);
  }
}
{{/if}}
