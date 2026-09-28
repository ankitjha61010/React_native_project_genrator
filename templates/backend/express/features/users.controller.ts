import type { Request, Response } from 'express';
{{#if STYLE_SERVICE}}
import type { UsersService } from '{{IMPORT:app.usersService}}';
{{else}}
{{#if NO_AUTH}}
import type { CreateUserUseCase } from '{{IMPORT:uc.createUser}}';
{{/if}}
import type { DeleteUserUseCase } from '{{IMPORT:uc.deleteUser}}';
import type { GetUserUseCase } from '{{IMPORT:uc.getUser}}';
import type { ListUsersUseCase } from '{{IMPORT:uc.listUsers}}';
{{#if AUTH}}
import type { UpdateProfileUseCase } from '{{IMPORT:uc.updateProfile}}';
{{/if}}
import type { UpdateUserUseCase } from '{{IMPORT:uc.updateUser}}';
{{/if}}
{{#if VIEWS}}
import { userView } from '{{IMPORT:views.user}}';
{{else}}
import { toPublicUser } from '{{IMPORT:domain.user}}';
{{/if}}
{{#if AUTH}}
import { currentUser } from '{{IMPORT:ex.mw.authenticate}}';
{{/if}}
import { respond } from '{{IMPORT:ex.respond}}';
import { parseRequest } from '{{IMPORT:ex.mw.validate}}';
{{#if AUTH}}
import { listUsersQuery, updateProfileSchema, updateUserSchema, userIdParams } from '{{IMPORT:ex.users.schemas}}';
{{else}}
import { createUserSchema, listUsersQuery, updateUserSchema, userIdParams } from '{{IMPORT:ex.users.schemas}}';
{{/if}}

{{#if STYLE_USECASE}}
export interface UsersUseCases {
  list: ListUsersUseCase;
  getById: GetUserUseCase;
{{#if NO_AUTH}}
  create: CreateUserUseCase;
{{/if}}
  update: UpdateUserUseCase;
{{#if AUTH}}
  updateProfile: UpdateProfileUseCase;
{{/if}}
  delete: DeleteUserUseCase;
}

{{/if}}
{{#if VIEWS}}
const one = userView.one;
const page = userView.page;
{{else}}
const one = toPublicUser;
{{/if}}

export class UsersController {
  constructor(private readonly users: {{#if STYLE_SERVICE}}UsersService{{else}}UsersUseCases{{/if}}) {}

  list = async (req: Request, res: Response) => {
    const { query } = parseRequest(req, { query: listUsersQuery });
    const result = await this.users.list{{CALL}}(query);
{{#if VIEWS}}
    respond(res, page(result), { message: 'Users' });
{{else}}
    respond(res, result.map(one), { message: 'Users' });
{{/if}}
  };

  getById = async (req: Request, res: Response) => {
    const { params } = parseRequest(req, { params: userIdParams });
    respond(res, one(await this.users.getById{{CALL}}(params.id)), { message: 'User' });
  };
{{#if NO_AUTH}}

  create = async (req: Request, res: Response) => {
    const { body } = parseRequest(req, { body: createUserSchema });
    respond(res, one(await this.users.create{{CALL}}(body)), { status: 201, message: 'User created' });
  };

  update = async (req: Request, res: Response) => {
    const { params, body } = parseRequest(req, { params: userIdParams, body: updateUserSchema });
    respond(res, one(await this.users.update{{CALL}}(params.id, body)), { message: 'User updated' });
  };

  delete = async (req: Request, res: Response) => {
    const { params } = parseRequest(req, { params: userIdParams });
    await this.users.delete{{CALL}}(params.id);
    respond(res, null, { message: 'User deleted' });
  };
{{else}}

  update = async (req: Request, res: Response) => {
    const { params, body } = parseRequest(req, { params: userIdParams, body: updateUserSchema });
    respond(res, one(await this.users.update{{CALL}}(params.id, body, currentUser(req).id)), { message: 'User updated' });
  };

  updateProfile = async (req: Request, res: Response) => {
    const { body } = parseRequest(req, { body: updateProfileSchema });
    respond(res, one(await this.users.updateProfile{{CALL}}(currentUser(req).id, body)), { message: 'Profile updated' });
  };

  delete = async (req: Request, res: Response) => {
    const { params } = parseRequest(req, { params: userIdParams });
    await this.users.delete{{CALL}}(params.id, currentUser(req).id);
    respond(res, null, { message: 'User deleted' });
  };
{{/if}}
}
