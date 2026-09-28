import type { Paginated } from '{{IMPORT:core.pagination}}';
import { toPublicUser, type PublicUser, type User } from '{{IMPORT:domain.user}}';

/**
 * View layer (MVC): decides exactly what a client sees of a user. Controllers never
 * return model objects directly.
 */
export const userView = {
  one: (user: User): PublicUser => toPublicUser(user),
  page: (users: Paginated<User>): Paginated<PublicUser> => users.map(toPublicUser),
};
