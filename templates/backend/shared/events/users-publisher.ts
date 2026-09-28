import type { Logger } from '{{IMPORT:core.logger}}';
import type { User } from '{{IMPORT:domain.user}}';
import type { UsersRepository } from '{{IMPORT:contract.users}}';
import { EVENT_CHANNELS, type EventBus } from '{{IMPORT:port.eventBus}}';

/**
 * Identity service: every change to a user is published, so the other services can keep
 * their copy up to date (names, avatars, roles, token version…). Password hashes never leave.
 */
export class PublishingUsersRepository implements UsersRepository {
  constructor(
    private readonly inner: UsersRepository,
    private readonly eventBus: EventBus,
    private readonly logger: Logger,
  ) {}

  findById = (id: string) => this.inner.findById(id);
  findByEmail = (email: string) => this.inner.findByEmail(email);
  findByPhone = (countryCode: string, phone: string) => this.inner.findByPhone(countryCode, phone);
  findManyByIds = (ids: string[]) => this.inner.findManyByIds(ids);
  search = (term: string, options: { excludeId: string; limit: number }) => this.inner.search(term, options);
  list = (query: Parameters<UsersRepository['list']>[0]) => this.inner.list(query);

  async create(data: Parameters<UsersRepository['create']>[0]): Promise<User> {
    return this.published(await this.inner.create(data));
  }

  async update(id: string, data: Parameters<UsersRepository['update']>[1]): Promise<User> {
    return this.published(await this.inner.update(id, data));
  }

  async delete(id: string): Promise<void> {
    await this.inner.delete(id);
    await this.send({ type: 'user.deleted', id });
  }

  private async published(user: User): Promise<User> {
    await this.send({ type: 'user.upserted', user: { ...user, passwordHash: null } });
    return user;
  }

  private async send(event: unknown): Promise<void> {
    // The write already happened – a lost event must not fail the request.
    await this.eventBus.publish(EVENT_CHANNELS.users, event).catch(error => this.logger.error({ err: error }, 'Publishing a user event failed'));
  }
}
