import { Paginated, type PageQuery } from '{{IMPORT:core.pagination}}';
import type { User } from '{{IMPORT:domain.user}}';
import type { UsersRepository } from '{{IMPORT:contract.users}}';

export class ListUsersUseCase {
  constructor(private readonly users: UsersRepository) {}

  async execute(query: PageQuery): Promise<Paginated<User>> {
    const { items, total } = await this.users.list(query);
    return Paginated.of(items, total, query);
  }
}
