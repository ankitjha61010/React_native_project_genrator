{{#if AUTH}}
import type { RequestHandler } from 'express';
{{/if}}
import { UsersService } from '{{IMPORT:app.usersService}}';
import type { UsersRepository } from '{{IMPORT:contract.users}}';
import { UsersController } from '{{IMPORT:ex.users.controller}}';
import { createUsersRouter } from '{{IMPORT:ex.users.routes}}';

export interface UsersModuleDependencies {
  usersRepository: UsersRepository;
{{#if AUTH}}
  /** From the auth module. */
  authenticate: RequestHandler;
{{/if}}
}

/** Public API of the users module. */
export function createUsersModule(deps: UsersModuleDependencies) {
  const service = new UsersService(deps.usersRepository);
  return { service, router: createUsersRouter(new UsersController(service){{#if AUTH}}, deps.authenticate{{/if}}) };
}

export type UsersModule = ReturnType<typeof createUsersModule>;
