import { randomUUID } from 'node:crypto';
import { ConflictError, NotFoundError } from '{{IMPORT:core.errors}}';
import { pageOffset, type PageQuery } from '{{IMPORT:core.pagination}}';
import { USERS_MESSAGES } from '{{IMPORT:messages.users}}';
{{#if AUTH_REFRESH}}
import type { RefreshToken } from '{{IMPORT:domain.authTokens}}';
{{/if}}
{{#if CODES}}
import type { CodePurpose, VerificationCode } from '{{IMPORT:domain.authTokens}}';
{{/if}}
{{#if SOCIAL}}
import type { SocialAccount, SocialProvider } from '{{IMPORT:domain.authTokens}}';
{{/if}}
{{#if CHAT}}
import type { Conversation, ConversationMember, Message } from '{{IMPORT:domain.chat}}';
{{/if}}
{{#if CALLING}}
import type { CallEntity, CallParticipantEntity } from '{{IMPORT:domain.call}}';
import { CALLING_MESSAGES } from '{{IMPORT:messages.calling}}';
{{/if}}
{{#if DEVICES}}
import type { Device, DeviceInput } from '{{IMPORT:domain.device}}';
{{/if}}
{{#if NOTIFICATIONS}}
import type { Broadcast, Notification } from '{{IMPORT:domain.notification}}';
{{/if}}
{{#if AUTH}}
import { DEFAULT_ROLE{{#if NOTIFICATIONS}}, type UserRole{{/if}} } from '{{IMPORT:domain.roles}}';
{{/if}}
import type { User } from '{{IMPORT:domain.user}}';
import type { Repositories } from '{{IMPORT:db.repositories}}';
{{#if AUTH_REFRESH}}
import type { CreateRefreshTokenData, RefreshTokensRepository } from '{{IMPORT:contract.auth}}';
{{/if}}
{{#if CODES}}
import type { VerificationCodesRepository } from '{{IMPORT:contract.auth}}';
{{/if}}
{{#if SOCIAL}}
import type { SocialAccountsRepository } from '{{IMPORT:contract.auth}}';
{{/if}}
{{#if CHAT}}
import type { ChatRepository, CreateConversationData, CreateMessageData } from '{{IMPORT:contract.chat}}';
{{/if}}
{{#if CALLING}}
import type { CreateCallInput, ICallingRepository, UpdateCallStatusInput } from '{{IMPORT:contract.calling}}';
{{/if}}
{{#if DEVICES}}
import type { DevicesRepository } from '{{IMPORT:contract.devices}}';
{{/if}}
{{#if NOTIFICATIONS}}
import type { CreateNotificationData, NotificationsRepository } from '{{IMPORT:contract.notifications}}';
{{/if}}
{{#if OTA}}
import type { OTADownloadEvent, OTARelease } from '{{IMPORT:domain.ota}}';
import type { OTARepository } from '{{IMPORT:contract.ota}}';
{{/if}}
{{#if LEGAL}}
import type { LegalSettings, LegalSettingsInput } from '{{IMPORT:domain.legal}}';
import type { LegalRepository } from '{{IMPORT:contract.legal}}';
{{/if}}
import type { CreateUserData, UpdateUserData, UsersRepository } from '{{IMPORT:contract.users}}';

/** In-memory implementations of the repository contracts (tests only). */

/** Newest first; the same millisecond is ordered by id (like the database queries). */
const newest = (a: { createdAt: Date; id: string }, b: { createdAt: Date; id: string }) => b.createdAt.getTime() - a.createdAt.getTime() || b.id.localeCompare(a.id);

export class InMemoryUsersRepository implements UsersRepository {
  readonly users = new Map<string, User>();

  async findById(id: string) {
    return this.users.get(id) ?? null;
  }

  async findByEmail(email: string) {
    return [...this.users.values()].find(user => user.email === email) ?? null;
  }
{{#if AUTH}}

  async findByPhone(countryCode: string, phone: string) {
    return [...this.users.values()].find(user => user.countryCode === countryCode && user.phone === phone) ?? null;
  }

  async findManyByIds(ids: string[]) {
    return ids.map(id => this.users.get(id)).filter(user => user !== undefined);
  }

  async search(term: string, options: { excludeId: string; offset: number; limit: number }) {
    const q = term.toLowerCase();
    const all = [...this.users.values()]
      .filter(u => u.isActive && u.id !== options.excludeId && (!q || u.name.toLowerCase().includes(q) || (u.email ?? '').includes(q)))
      .toSorted((a, b) => a.name.localeCompare(b.name));
    return { items: all.slice(options.offset, options.offset + options.limit), total: all.length };
  }
{{/if}}
{{#if NOTIFICATIONS}}

  async activeUserIds(role?: UserRole) {
    return [...this.users.values()].filter(u => u.isActive && (!role || u.role === role)).map(u => u.id);
  }
{{/if}}

  async list(query: PageQuery & { search?: string }) {
    const search = query.search?.toLowerCase();
    const all = [...this.users.values()].filter(user => !search || (user.email ?? '').includes(search) || user.name.toLowerCase().includes(search)).toSorted(newest);
    return { items: all.slice(pageOffset(query), pageOffset(query) + query.limit), total: all.length };
  }

  async create(data: CreateUserData) {
    this.assertUnique(data);
    const now = new Date();
    const user: User = {
      id: randomUUID(),
{{#if AUTH}}
      email: data.email ?? null,
      name: data.name,
      passwordHash: data.passwordHash ?? null,
      role: data.role ?? DEFAULT_ROLE,
      emailVerifiedAt: data.emailVerifiedAt ?? null,
      countryCode: data.countryCode ?? null,
      phone: data.phone ?? null,
      phoneVerifiedAt: data.phoneVerifiedAt ?? null,
      avatarUrl: data.avatarUrl ?? null,
      location: null,
      bio: null,
      isActive: true,
      tokenVersion: 0,
      lastLoginAt: null,
      lastSeenAt: null,
{{#if SEC_LOCKOUT}}
      failedLoginAttempts: 0,
      lockedUntil: null,
{{/if}}
{{else}}
      email: data.email,
      name: data.name,
{{/if}}
      createdAt: now,
      updatedAt: now,
    };
    this.users.set(user.id, user);
    return user;
  }

  async update(id: string, data: UpdateUserData) {
    const user = this.users.get(id);
    if (!user) throw new NotFoundError(USERS_MESSAGES.notFound);
    const updated = { ...user, ...data, updatedAt: new Date() };
    this.assertUnique(updated, id);
    this.users.set(id, updated);
    return updated;
  }

  async delete(id: string) {
    if (!this.users.delete(id)) throw new NotFoundError(USERS_MESSAGES.notFound);
  }
{{#if REPLICA}}

  async saveReplica(user: User) {
    this.users.set(user.id, user);
  }
{{/if}}

  /** Same unique constraints as the database. */
  private assertUnique(data: Partial<User>, exceptId?: string) {
    for (const other of this.users.values()) {
      if (other.id === exceptId) continue;
      if (data.email && other.email === data.email) throw new ConflictError({{#if AUTH}}USERS_MESSAGES.accountExists{{else}}USERS_MESSAGES.emailTaken{{/if}});
{{#if AUTH}}
      if (data.phone && other.phone === data.phone && other.countryCode === data.countryCode) throw new ConflictError(USERS_MESSAGES.accountExists);
{{/if}}
    }
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
{{#if CODES}}

export class InMemoryVerificationCodesRepository implements VerificationCodesRepository {
  readonly codes = new Map<string, VerificationCode>();

  async create(data: Pick<VerificationCode, 'purpose' | 'target' | 'codeHash' | 'expiresAt'>) {
    const code: VerificationCode = { id: randomUUID(), ...data, attempts: 0, usedAt: null, createdAt: new Date() };
    this.codes.set(code.id, code);
    return code;
  }

  async findActive(purpose: CodePurpose, target: string, now: Date) {
    return this.matching(purpose, target).find(c => !c.usedAt && c.expiresAt > now) ?? null;
  }

  async findLatest(purpose: CodePurpose, target: string) {
    return this.matching(purpose, target)[0] ?? null;
  }

  async incrementAttempts(id: string) {
    const code = this.codes.get(id);
    if (code) this.codes.set(id, { ...code, attempts: code.attempts + 1 });
  }

  async markUsed(id: string) {
    const code = this.codes.get(id);
    if (code) this.codes.set(id, { ...code, usedAt: new Date() });
  }

  async invalidateAll(purpose: CodePurpose, target: string) {
    for (const code of this.matching(purpose, target)) if (!code.usedAt) await this.markUsed(code.id);
  }

  /** Tests: pretend the last code was sent long ago (skip the resend delay). */
  age(target: string, ms = 3_600_000) {
    for (const code of this.codes.values()) if (code.target === target) this.codes.set(code.id, { ...code, createdAt: new Date(code.createdAt.getTime() - ms) });
  }

  private matching(purpose: CodePurpose, target: string) {
    return [...this.codes.values()].filter(c => c.purpose === purpose && c.target === target).toSorted(newest);
  }
}
{{/if}}
{{#if SOCIAL}}

export class InMemorySocialAccountsRepository implements SocialAccountsRepository {
  readonly accounts: SocialAccount[] = [];

  async find(provider: SocialProvider, providerUserId: string) {
    return this.accounts.find(a => a.provider === provider && a.providerUserId === providerUserId) ?? null;
  }

  async create(data: Pick<SocialAccount, 'userId' | 'provider' | 'providerUserId' | 'email'>) {
    const account: SocialAccount = { id: randomUUID(), ...data, createdAt: new Date() };
    this.accounts.push(account);
    return account;
  }
}
{{/if}}
{{#if CHAT}}

export class InMemoryChatRepository implements ChatRepository {
  readonly conversations = new Map<string, Conversation>();
  members: ConversationMember[] = [];
  readonly messages = new Map<string, Message>();

  async createConversation({ memberIds, ...data }: CreateConversationData) {
    const now = new Date();
    const conversation: Conversation = { id: randomUUID(), ...data, lastMessageAt: null, createdAt: now, updatedAt: now };
    this.conversations.set(conversation.id, conversation);
    // Each member joins a millisecond later, so "the longest-standing member" is well defined.
    memberIds.forEach((userId, i) =>
      this.members.push({
        conversationId: conversation.id,
        userId,
{{#if GROUP_CHAT}}
        role: data.isGroup && userId === data.createdById ? 'admin' : 'member',
{{/if}}
        lastReadAt: null,
        clearedAt: null,
        hidden: false,
        joinedAt: new Date(now.getTime() + i),
      }),
    );
    return conversation;
  }

  async findConversation(id: string) {
    return this.conversations.get(id) ?? null;
  }
{{#if GROUP_CHAT}}

  async updateConversation(id: string, data: Partial<Pick<Conversation, 'title' | 'avatarUrl'>>) {
    const conversation = { ...this.conversations.get(id)!, ...data, updatedAt: new Date() };
    this.conversations.set(id, conversation);
    return conversation;
  }

  async addMembers(conversationId: string, userIds: string[]) {
    const now = Date.now();
    userIds.forEach((userId, i) => {
      if (!this.members.some(m => m.conversationId === conversationId && m.userId === userId)) {
        this.members.push({ conversationId, userId, role: 'member', lastReadAt: null, clearedAt: null, hidden: false, joinedAt: new Date(now + 1000 + i) });
      }
    });
  }
{{/if}}

  async findDirectConversation(userId: string, otherUserId: string) {
    return (
      [...this.conversations.values()].find(c => {{#if GROUP_CHAT}}!c.isGroup && {{/if}}this.members.some(m => m.conversationId === c.id && m.userId === userId) && this.members.some(m => m.conversationId === c.id && m.userId === otherUserId)) ?? null
    );
  }

  async listConversations(userId: string) {
    return [...this.conversations.values()].filter(c => this.members.some(m => m.conversationId === c.id && m.userId === userId));
  }

  async deleteConversation(id: string) {
    this.conversations.delete(id);
    this.members = this.members.filter(m => m.conversationId !== id);
  }

  async listMembers(conversationIds: string[]) {
    return this.members.filter(m => conversationIds.includes(m.conversationId)).toSorted((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime());
  }

  async findMember(conversationId: string, userId: string) {
    return this.members.find(m => m.conversationId === conversationId && m.userId === userId) ?? null;
  }

  async updateMember(conversationId: string, userId: string, data: Partial<Pick<ConversationMember, 'lastReadAt' | 'clearedAt' | 'hidden'{{#if GROUP_CHAT}} | 'role'{{/if}}>>) {
    this.members = this.members.map(m => (m.conversationId === conversationId && m.userId === userId ? { ...m, ...data } : m));
  }

  async updateMemberships(userId: string, data: Partial<Pick<ConversationMember, 'clearedAt' | 'hidden'>>) {
    this.members = this.members.map(m => (m.userId === userId ? { ...m, ...data } : m));
  }

  async removeMember(conversationId: string, userId: string) {
    this.members = this.members.filter(m => !(m.conversationId === conversationId && m.userId === userId));
  }

  async createMessage(data: CreateMessageData) {
    const createdAt = new Date();
    const message: Message = {
      id: randomUUID(),
      conversationId: data.conversationId,
      senderId: data.senderId,
      type: data.type,
      text: data.text ?? null,
      mediaUrl: data.mediaUrl ?? null,
      thumbnailUrl: data.thumbnailUrl ?? null,
      fileName: data.fileName ?? null,
      fileSize: data.fileSize ?? null,
      duration: data.duration ?? null,
      crop: data.crop ?? null,
      event: data.event ?? null,
      targetUserId: data.targetUserId ?? null,
      replyToId: data.replyToId ?? null,
      createdAt,
      deletedAt: null,
    };
    this.messages.set(message.id, message);
    const conversation = this.conversations.get(data.conversationId);
    if (conversation) this.conversations.set(conversation.id, { ...conversation, lastMessageAt: createdAt });
    return message;
  }

  async findMessage(id: string) {
    return this.messages.get(id) ?? null;
  }

  async findMessages(ids: string[]) {
    return ids.flatMap(id => this.messages.get(id) ?? []);
  }

  async listMessages(conversationId: string, options: { after?: Date | null; before?: Pick<Message, 'createdAt' | 'id'>; limit: number }) {
    const { after, before } = options;
    return this.visible(conversationId)
      .filter(m => (!after || m.createdAt > after) && (!before || newest(m, before) > 0))
      .slice(0, options.limit);
  }

  async lastMessages(conversationIds: string[]) {
    return conversationIds.map(id => this.visible(id)[0]).filter(m => m !== undefined);
  }

  async countUnread(conversationId: string, userId: string, since: Date | null, after: Date | null) {
    return this.visible(conversationId).filter(m => m.senderId !== userId && m.type !== 'system' && (!since || m.createdAt > since) && (!after || m.createdAt > after)).length;
  }

  async softDeleteMessage(id: string) {
    const message = this.messages.get(id);
    if (message) this.messages.set(id, { ...message, deletedAt: new Date() });
  }

  async updateMessageText(id: string, text: string) {
    const message = this.messages.get(id);
    if (!message || message.deletedAt) return null;
    const updated = { ...message, text };
    this.messages.set(id, updated);
    return updated;
  }

  private readonly blocked = new Set<string>();

  async blockUser(blockerId: string, blockedId: string) {
    this.blocked.add(`${blockerId}:${blockedId}`);
  }

  async unblockUser(blockerId: string, blockedId: string) {
    this.blocked.delete(`${blockerId}:${blockedId}`);
  }

  async isBlocked(userAId: string, userBId: string) {
    return this.blocked.has(`${userAId}:${userBId}`) || this.blocked.has(`${userBId}:${userAId}`);
  }

  async getBlockedUserIds(userId: string) {
    const prefix = `${userId}:`;
    return [...this.blocked].filter(k => k.startsWith(prefix)).map(k => k.slice(prefix.length));
  }

  /** Non-deleted messages, newest first. */
  private visible(conversationId: string) {
    return [...this.messages.values()].filter(m => m.conversationId === conversationId && !m.deletedAt).toSorted(newest);
  }
}
{{/if}}
{{#if DEVICES}}

export class InMemoryDevicesRepository implements DevicesRepository {
  devices: Device[] = [];

  async save(userId: string, input: DeviceInput) {
    const now = new Date();
    const fcmToken = input.fcmToken ?? null;
    // A token belongs to one install.
    if (fcmToken) this.forgetToken(fcmToken, input.deviceId);
    const existing = this.devices.find(d => d.deviceId === input.deviceId);
    const device: Device = {
      id: existing?.id ?? randomUUID(),
      userId,
      deviceId: input.deviceId,
      fcmToken,
      voipToken: input.voipToken ?? null,
      deviceType: input.deviceType,
      deviceModel: input.deviceModel ?? null,
      osVersion: input.osVersion ?? null,
      appVersion: input.appVersion ?? null,
      lastActiveAt: now,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    this.devices = [...this.devices.filter(d => d.deviceId !== input.deviceId), device];
    return device;
  }

  async updateFcmToken(userId: string, deviceId: string, fcmToken: string) {
    const existing = this.devices.find(d => d.userId === userId && d.deviceId === deviceId);
    if (!existing) return null;
    this.forgetToken(fcmToken, deviceId);
    const device = { ...existing, fcmToken, lastActiveAt: new Date(), updatedAt: new Date() };
    this.devices = this.devices.map(d => (d.deviceId === deviceId ? device : d));
    return device;
  }

  async updateVoipToken(userId: string, deviceId: string, voipToken: string) {
    const existing = this.devices.find(d => d.userId === userId && d.deviceId === deviceId);
    if (!existing) return null;
    const device = { ...existing, voipToken, lastActiveAt: new Date(), updatedAt: new Date() };
    this.devices = this.devices.map(d => (d.deviceId === deviceId ? device : d));
    return device;
  }

  async listByUser(userId: string) {
    return this.devices.filter(d => d.userId === userId).toSorted((a, b) => b.lastActiveAt.getTime() - a.lastActiveAt.getTime());
  }

  async listWithToken(userIds: string[]) {
    return this.devices.filter(d => userIds.includes(d.userId) && d.fcmToken !== null);
  }

  async remove(userId: string, deviceId: string) {
    const before = this.devices.length;
    this.devices = this.devices.filter(d => !(d.userId === userId && d.deviceId === deviceId));
    return this.devices.length < before;
  }

  async removeAllForUser(userId: string) {
    this.devices = this.devices.filter(d => d.userId !== userId);
  }

  async removeTokens(tokens: string[]) {
    this.devices = this.devices.filter(d => !d.fcmToken || !tokens.includes(d.fcmToken));
  }

  private forgetToken(fcmToken: string, exceptDeviceId: string) {
    this.devices = this.devices.map(d => (d.fcmToken === fcmToken && d.deviceId !== exceptDeviceId ? { ...d, fcmToken: null } : d));
  }
}
{{/if}}
{{#if NOTIFICATIONS}}

export class InMemoryNotificationsRepository implements NotificationsRepository {
  notifications: Notification[] = [];
  readonly broadcasts: Broadcast[] = [];

  async create(data: CreateNotificationData) {
    const notification: Notification = { id: randomUUID(), broadcastId: null, ...data, readAt: null, createdAt: new Date() };
    this.notifications.push(notification);
    return notification;
  }

  async createMany(data: CreateNotificationData[]) {
    for (const item of data) await this.create(item);
    return data.length;
  }

  async list(userId: string, query: PageQuery) {
    const all = this.notifications.filter(n => n.userId === userId).toSorted(newest);
    return { items: all.slice(pageOffset(query), pageOffset(query) + query.limit), total: all.length };
  }

  async countUnread(userId: string) {
    return this.notifications.filter(n => n.userId === userId && !n.readAt).length;
  }

  async markRead(userId: string, id: string) {
    const found = this.notifications.find(n => n.id === id && n.userId === userId);
    if (found && !found.readAt) found.readAt = new Date();
    return !!found;
  }

  async markAllRead(userId: string) {
    for (const n of this.notifications) if (n.userId === userId && !n.readAt) n.readAt = new Date();
  }

  async delete(userId: string, id: string) {
    const before = this.notifications.length;
    this.notifications = this.notifications.filter(n => !(n.id === id && n.userId === userId));
    return this.notifications.length < before;
  }

  async deleteAll(userId: string) {
    this.notifications = this.notifications.filter(n => n.userId !== userId);
  }

  async createBroadcast(data: Omit<Broadcast, 'id' | 'createdAt'>) {
    const broadcast: Broadcast = { id: randomUUID(), ...data, createdAt: new Date() };
    this.broadcasts.push(broadcast);
    return broadcast;
  }

  async listBroadcasts(query: PageQuery) {
    const all = this.broadcasts.toSorted(newest);
    return { items: all.slice(pageOffset(query), pageOffset(query) + query.limit), total: all.length };
  }
}
{{/if}}
{{#if CALLING}}

const ACTIVE_CALL: CallEntity['status'][] = ['initiating', 'ringing', 'connecting', 'connected', 'reconnecting'];
const FINISHED_CALL: CallEntity['status'][] = ['ended', 'missed', 'declined', 'cancelled', 'failed'];

export class InMemoryCallingRepository implements ICallingRepository {
  readonly calls = new Map<string, CallEntity>();
  readonly participants: CallParticipantEntity[] = [];

  async createCall(input: CreateCallInput) {
    const now = new Date();
    const call: CallEntity = { id: randomUUID(), ...input, status: 'initiating', createdAt: now, updatedAt: now };
    this.calls.set(call.id, call);
    return call;
  }

  async findCallById(callId: string) {
    return this.calls.get(callId) ?? null;
  }

  async findActiveCallByUserId(userId: string) {
    const mine = new Set(this.participants.filter(p => p.userId === userId && ['invited', 'ringing', 'joined'].includes(p.status)).map(p => p.callId));
    return [...this.calls.values()].find(c => ACTIVE_CALL.includes(c.status) && (c.callerId === userId || c.receiverId === userId || mine.has(c.id))) ?? null;
  }

  async updateCallStatus({ callId, ...changes }: UpdateCallStatusInput) {
    const call = this.calls.get(callId);
    if (!call) throw new NotFoundError(CALLING_MESSAGES.callNotFound);
    const updated = { ...call, ...Object.fromEntries(Object.entries(changes).filter(([, value]) => value !== undefined)), updatedAt: new Date() };
    this.calls.set(callId, updated);
    return updated;
  }

  private history(userId: string) {
    const visible = new Set(this.participants.filter(p => p.userId === userId && !p.hiddenAt).map(p => p.callId));
    return [...this.calls.values()].filter(c => visible.has(c.id) && FINISHED_CALL.includes(c.status)).toSorted(newest);
  }

  async getUserCallHistory(userId: string, limit: number, offset: number) {
    return this.history(userId).slice(offset, offset + limit);
  }

  async countUserCalls(userId: string) {
    return this.history(userId).length;
  }

  async addParticipant(callId: string, userId: string, role: CallParticipantEntity['role'] = 'participant') {
    const existing = this.participants.find(p => p.callId === callId && p.userId === userId);
    if (existing) {
      existing.role = role;
      return existing;
    }
    const participant: CallParticipantEntity = { id: randomUUID(), callId, userId, role, status: 'invited' };
    this.participants.push(participant);
    return participant;
  }

  async updateParticipantStatus(callId: string, userId: string, status: CallParticipantEntity['status'], leftAt?: Date) {
    for (const p of this.participants) {
      if (p.callId !== callId || p.userId !== userId) continue;
      p.status = status;
      if (leftAt) p.leftAt = leftAt;
    }
  }

  async getCallParticipants(callId: string) {
    return this.participants.filter(p => p.callId === callId);
  }

  async findParticipant(callId: string, userId: string) {
    return this.participants.find(p => p.callId === callId && p.userId === userId) ?? null;
  }

  async hideCallForUser(callId: string, userId: string) {
    for (const p of this.participants) if (p.callId === callId && p.userId === userId) p.hiddenAt = new Date();
  }

  async hideAllCallsForUser(userId: string) {
    for (const p of this.participants) if (p.userId === userId && !p.hiddenAt) p.hiddenAt = new Date();
  }
}
{{/if}}

{{#if LEGAL}}
export class InMemoryLegalRepository implements LegalRepository {
  settings: LegalSettings | null = null;

  async find() {
    return this.settings && { ...this.settings };
  }

  async save(input: LegalSettingsInput) {
    const empty = { termsUrl: null, privacyPolicyUrl: null, deleteAccountUrl: null, termsHtml: null, privacyPolicyHtml: null, deleteAccountHtml: null };
    this.settings = { ...empty, ...this.settings, ...input, updatedAt: new Date() };
    return { ...this.settings };
  }
}
{{/if}}

{{#if OTA}}
export class InMemoryOTARepository implements OTARepository {
  releases: OTARelease[] = [];
  events: OTADownloadEvent[] = [];

  async findLatestActive(platform: string, nativeVersion: string) {
    const matching = this.releases.filter(r => r.status === 'active' && r.nativeVersion === nativeVersion && (r.platform === platform || r.platform === 'all'));
    return matching.sort((a, b) => b.version - a.version)[0] ?? null;
  }

  async listReleases() {
    return [...this.releases].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createRelease(data: Omit<OTARelease, 'id' | 'createdAt' | 'updatedAt' | 'downloadCount'>) {
    const now = new Date();
    const release: OTARelease = { id: randomUUID(), ...data, downloadCount: 0, createdAt: now, updatedAt: now };
    this.releases.push(release);
    return release;
  }

  async rollbackRelease(id: string) {
    const release = this.releases.find(r => r.id === id);
    if (!release) return null;
    release.status = 'rolled_back';
    release.updatedAt = new Date();
    return release;
  }

  async recordEvent(event: Omit<OTADownloadEvent, 'id' | 'createdAt'>) {
    this.events.push({ id: randomUUID(), ...event, createdAt: new Date() });
  }

  async incrementDownloadCount(otaVersion: number) {
    const release = this.releases.find(r => r.version === otaVersion);
    if (release) release.downloadCount += 1;
  }
}
{{/if}}

/** A fresh set of in-memory repositories. */
export function createInMemoryRepositories() {
  return {
    users: new InMemoryUsersRepository(),
{{#if AUTH_REFRESH}}
    refreshTokens: new InMemoryRefreshTokensRepository(),
{{/if}}
{{#if CODES}}
    verificationCodes: new InMemoryVerificationCodesRepository(),
{{/if}}
{{#if SOCIAL}}
    socialAccounts: new InMemorySocialAccountsRepository(),
{{/if}}
{{#if CHAT}}
    chat: new InMemoryChatRepository(),
{{/if}}
{{#if CALLING}}
    calling: new InMemoryCallingRepository(),
{{/if}}
{{#if DEVICES}}
    devices: new InMemoryDevicesRepository(),
{{/if}}
{{#if NOTIFICATIONS}}
    notifications: new InMemoryNotificationsRepository(),
{{/if}}
{{#if LEGAL}}
    legal: new InMemoryLegalRepository(),
{{/if}}
{{#if OTA}}
    ota: new InMemoryOTARepository(),
{{/if}}
  } satisfies Repositories;
}
