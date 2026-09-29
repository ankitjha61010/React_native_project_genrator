import type { Request, Response } from 'express';
import type { UsersService } from '{{IMPORT:app.usersService}}';
{{#if VIEWS}}
import { userView } from '{{IMPORT:views.user}}';
{{else}}
import { toPublicUser } from '{{IMPORT:domain.user}}';
{{/if}}
{{#if AUTH}}
import { currentUser } from '{{IMPORT:ex.mw.auth}}';
{{/if}}
import { sendSuccess } from '{{IMPORT:ex.respond}}';
{{#if AUTH}}
import { uploadedFile } from '{{IMPORT:ex.mw.upload}}';
{{/if}}
import { idParams, searchPageQuery } from '{{IMPORT:ex.schemas}}';
import { parseBody, parseParams, parseQuery } from '{{IMPORT:ex.validation}}';
import { USERS_MESSAGES } from '{{IMPORT:messages.users}}';
{{#if AUTH}}
import { updateProfileSchema, updateUserSchema } from '{{IMPORT:ex.users.schemas}}';
{{else}}
import { createUserSchema, updateUserSchema } from '{{IMPORT:ex.users.schemas}}';
{{/if}}

{{#if VIEWS}}
const view = userView.one;
{{else}}
/** What the client sees of a user (never the password hash). */
const view = toPublicUser;
{{/if}}

/** Handles `/users` requests: reads the input, calls UsersService, sends the response. */
export class UsersController {
  constructor(private readonly users: UsersService) {}
{{#if AUTH}}

  /** PATCH /users/me */
  updateProfile = async (req: Request, res: Response) => {
    const input = parseBody(updateProfileSchema, req);
    const user = await this.users.updateProfile(currentUser(req).id, input);
    sendSuccess(res, USERS_MESSAGES.profileUpdated, view(user));
  };

  /** POST /users/me/avatar (multipart field `avatar`) */
  setAvatar = async (req: Request, res: Response) => {
    const user = await this.users.setAvatar(currentUser(req).id, uploadedFile(req, 'avatar'));
    sendSuccess(res, USERS_MESSAGES.avatarUpdated, view(user));
  };

  /** DELETE /users/me/avatar */
  removeAvatar = async (req: Request, res: Response) => {
    const user = await this.users.removeAvatar(currentUser(req).id);
    sendSuccess(res, USERS_MESSAGES.avatarRemoved, view(user));
  };

{{#if DELETE_ACCOUNT}}
  /** DELETE /users/me – the user deletes their own account (and its data) */
  deleteAccount = async (req: Request, res: Response) => {
    await this.users.deleteAccount(currentUser(req).id);
    sendSuccess(res, USERS_MESSAGES.accountDeleted);
  };

{{/if}}
  /** GET /users/search?search=jane&page=1&limit=20 – other users A → Z (no search: everybody) */
  search = async (req: Request, res: Response) => {
    sendSuccess(res, USERS_MESSAGES.list, await this.users.search(currentUser(req).id, parseQuery(searchPageQuery, req)));
  };

  /** GET /users?page=1&limit=20&search=jane (admin) */
  list = async (req: Request, res: Response) => {
    const users = await this.users.list(parseQuery(searchPageQuery, req));
    sendSuccess(res, USERS_MESSAGES.list, {{#if VIEWS}}userView.page(users){{else}}users.map(view){{/if}});
  };

  /** GET /users/:id (admin) */
  getById = async (req: Request, res: Response) => {
    const { id } = parseParams(idParams, req);
    sendSuccess(res, USERS_MESSAGES.user, view(await this.users.getById(id)));
  };

  /** PATCH /users/:id (admin: name, role, active) */
  update = async (req: Request, res: Response) => {
    const { id } = parseParams(idParams, req);
    const user = await this.users.update(id, parseBody(updateUserSchema, req), currentUser(req).id);
    sendSuccess(res, USERS_MESSAGES.updated, view(user));
  };

  /** DELETE /users/:id (admin) */
  delete = async (req: Request, res: Response) => {
    const { id } = parseParams(idParams, req);
    await this.users.delete(id, currentUser(req).id);
    sendSuccess(res, USERS_MESSAGES.deleted);
  };
{{else}}

  /** GET /users?page=1&limit=20&search=jane */
  list = async (req: Request, res: Response) => {
    const users = await this.users.list(parseQuery(searchPageQuery, req));
    sendSuccess(res, USERS_MESSAGES.list, {{#if VIEWS}}userView.page(users){{else}}users.map(view){{/if}});
  };

  /** POST /users */
  create = async (req: Request, res: Response) => {
    const user = await this.users.create(parseBody(createUserSchema, req));
    sendSuccess(res, USERS_MESSAGES.created, view(user), { status: 201 });
  };

  /** GET /users/:id */
  getById = async (req: Request, res: Response) => {
    const { id } = parseParams(idParams, req);
    sendSuccess(res, USERS_MESSAGES.user, view(await this.users.getById(id)));
  };

  /** PATCH /users/:id */
  update = async (req: Request, res: Response) => {
    const { id } = parseParams(idParams, req);
    sendSuccess(res, USERS_MESSAGES.updated, view(await this.users.update(id, parseBody(updateUserSchema, req))));
  };

  /** DELETE /users/:id */
  delete = async (req: Request, res: Response) => {
    const { id } = parseParams(idParams, req);
    await this.users.delete(id);
    sendSuccess(res, USERS_MESSAGES.deleted);
  };
{{/if}}
}
