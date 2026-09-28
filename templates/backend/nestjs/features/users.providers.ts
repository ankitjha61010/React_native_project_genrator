import type { Provider } from '@nestjs/common';
import type { Database } from '{{IMPORT:db.connection}}';
import type { UsersRepository } from '{{IMPORT:contract.users}}';
{{#if PRISMA}}
import { PrismaUsersRepository } from '{{IMPORT:repo.users}}';
{{/if}}
{{#if TYPEORM}}
import { TypeOrmUsersRepository } from '{{IMPORT:repo.users}}';
{{/if}}
{{#if MONGOOSE}}
import { MongooseUsersRepository } from '{{IMPORT:repo.users}}';
{{/if}}
{{#if STYLE_SERVICE}}
import { UsersService } from '{{IMPORT:app.usersService}}';
import { DATABASE, USERS_REPOSITORY } from '{{IMPORT:nest.tokens}}';
{{else}}
{{#if NO_AUTH}}
import { CreateUserUseCase } from '{{IMPORT:uc.createUser}}';
{{/if}}
import { DeleteUserUseCase } from '{{IMPORT:uc.deleteUser}}';
import { GetUserUseCase } from '{{IMPORT:uc.getUser}}';
import { ListUsersUseCase } from '{{IMPORT:uc.listUsers}}';
{{#if AUTH}}
import { UpdateProfileUseCase } from '{{IMPORT:uc.updateProfile}}';
{{/if}}
import { UpdateUserUseCase } from '{{IMPORT:uc.updateUser}}';
import { DATABASE, USERS_REPOSITORY, USERS_USE_CASES } from '{{IMPORT:nest.tokens}}';

export function createUsersUseCases(users: UsersRepository) {
  return {
    list: new ListUsersUseCase(users),
    getById: new GetUserUseCase(users),
{{#if NO_AUTH}}
    create: new CreateUserUseCase(users),
{{/if}}
    update: new UpdateUserUseCase(users),
{{#if AUTH}}
    updateProfile: new UpdateProfileUseCase(users),
{{/if}}
    delete: new DeleteUserUseCase(users),
  };
}

export type UsersUseCases = ReturnType<typeof createUsersUseCases>;
{{/if}}

/** Wiring of the users feature: ORM repository → {{#if STYLE_SERVICE}}service{{else}}use-cases{{/if}}. */
export const usersProviders: Provider[] = [
  {
    provide: USERS_REPOSITORY,
{{#if PRISMA}}
    useFactory: (database: Database) => new PrismaUsersRepository(database.client),
{{/if}}
{{#if TYPEORM}}
    useFactory: (database: Database) => new TypeOrmUsersRepository(database.dataSource),
{{/if}}
{{#if MONGOOSE}}
    // Needs the connection to be open, hence the dependency on DATABASE.
    useFactory: (_database: Database) => new MongooseUsersRepository(),
{{/if}}
    inject: [DATABASE],
  },
{{#if STYLE_SERVICE}}
  { provide: UsersService, useFactory: (users: UsersRepository) => new UsersService(users), inject: [USERS_REPOSITORY] },
{{else}}
  { provide: USERS_USE_CASES, useFactory: createUsersUseCases, inject: [USERS_REPOSITORY] },
{{/if}}
];
