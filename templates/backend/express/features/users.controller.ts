{{#if AUTH}}
import { z } from 'zod';
{{/if}}
{{#if VIEWS}}
import { userView } from '{{IMPORT:views.user}}';
{{else}}
import type { Paginated } from '{{IMPORT:core.pagination}}';
import { toPublicUser, type User } from '{{IMPORT:domain.user}}';
{{/if}}
import { emptySchema, idParams, searchPageQuery } from '{{IMPORT:ex.schemas}}';
import { route, type RouteGroup } from '{{IMPORT:ex.route}}';
{{#if AUTH}}
import { publicUserSchema, searchUsersQuery, updateProfileSchema, updateUserSchema, userSummarySchema } from '{{IMPORT:ex.users.schemas}}';
{{else}}
import { createUserSchema, publicUserSchema, updateUserSchema } from '{{IMPORT:ex.users.schemas}}';
{{/if}}

{{#if VIEWS}}
const one = userView.one;
const page = userView.page;
{{else}}
const one = toPublicUser;
const page = (users: Paginated<User>) => users.map(toPublicUser);
{{/if}}

{{#if AUTH}}
/** `/users` – your own profile, user search, and administration (permission based, see roles.ts). */
export const usersRoutes: RouteGroup = {
  prefix: '/users',
  tag: 'Users',
  routes: [
    // `/me…` and `/search` are declared before `/:id` so they aren't read as ids.
    route({
      method: 'patch',
      path: '/me',
      summary: 'Update your profile (name, mobile number, location, bio)',
      message: 'Profile updated',
      auth: true,
      body: updateProfileSchema,
      response: publicUserSchema,
      errors: [401, 409, 422],
      handler: async ({ user, body }, { users }) => one(await users.updateProfile(user.id, body)),
    }),
    route({
      method: 'post',
      path: '/me/avatar',
      summary: 'Upload a profile picture (multipart field `avatar`: JPEG, PNG, WebP or HEIC)',
      message: 'Avatar updated',
      auth: true,
      upload: 'avatar',
      response: publicUserSchema,
      errors: [400, 401, 413, 422],
      handler: async ({ user, file }, { users }) => one(await users.setAvatar(user.id, file)),
    }),
    route({
      method: 'delete',
      path: '/me/avatar',
      summary: 'Remove your profile picture',
      message: 'Avatar removed',
      auth: true,
      response: publicUserSchema,
      errors: [401],
      handler: async ({ user }, { users }) => one(await users.removeAvatar(user.id)),
    }),
    route({
      method: 'delete',
      path: '/me',
      summary: 'Delete your account and its data',
      message: 'Account deleted',
      auth: true,
      response: emptySchema,
      errors: [401],
      handler: ({ user }, { users }) => users.deleteAccount(user.id),
    }),
    route({
      method: 'get',
      path: '/search',
      summary: 'Find other users by name or email (e.g. to start a chat)',
      message: 'Users',
      auth: true,
      query: searchUsersQuery,
      response: z.array(userSummarySchema),
      errors: [401, 422],
      handler: ({ user, query }, { users }) => users.search(user.id, query.q, query.limit),
    }),
    route({
      method: 'get',
      path: '',
      summary: 'List users (paginated, searchable) – permission users:read',
      message: 'Users',
      permission: 'users:read',
      query: searchPageQuery,
      response: publicUserSchema,
      paginated: true,
      errors: [401, 403, 422],
      handler: async ({ query }, { users }) => page(await users.list(query)),
    }),
    route({
      method: 'get',
      path: '/:id',
      summary: 'Get a user – permission users:read',
      message: 'User',
      permission: 'users:read',
      params: idParams,
      response: publicUserSchema,
      errors: [401, 403, 404],
      handler: async ({ params }, { users }) => one(await users.getById(params.id)),
    }),
    route({
      method: 'patch',
      path: '/:id',
      summary: 'Update a user (name, role, active) – permission users:write',
      message: 'User updated',
      permission: 'users:write',
      params: idParams,
      body: updateUserSchema,
      response: publicUserSchema,
      errors: [401, 403, 404, 422],
      handler: async ({ params, body, user }, { users }) => one(await users.update(params.id, body, user.id)),
    }),
    route({
      method: 'delete',
      path: '/:id',
      summary: 'Delete a user – permission users:delete',
      message: 'User deleted',
      permission: 'users:delete',
      params: idParams,
      response: emptySchema,
      errors: [401, 403, 404],
      handler: ({ params, user }, { users }) => users.delete(params.id, user.id),
    }),
  ],
};
{{else}}
/** `/users` – CRUD. There is no authentication: protect these routes before going live. */
export const usersRoutes: RouteGroup = {
  prefix: '/users',
  tag: 'Users',
  routes: [
    route({
      method: 'get',
      path: '',
      summary: 'List users (paginated, searchable)',
      message: 'Users',
      query: searchPageQuery,
      response: publicUserSchema,
      paginated: true,
      errors: [422],
      handler: async ({ query }, { users }) => page(await users.list(query)),
    }),
    route({
      method: 'post',
      path: '',
      summary: 'Create a user',
      message: 'User created',
      status: 201,
      body: createUserSchema,
      response: publicUserSchema,
      errors: [409, 422],
      handler: async ({ body }, { users }) => one(await users.create(body)),
    }),
    route({
      method: 'get',
      path: '/:id',
      summary: 'Get a user',
      message: 'User',
      params: idParams,
      response: publicUserSchema,
      errors: [404],
      handler: async ({ params }, { users }) => one(await users.getById(params.id)),
    }),
    route({
      method: 'patch',
      path: '/:id',
      summary: 'Update a user',
      message: 'User updated',
      params: idParams,
      body: updateUserSchema,
      response: publicUserSchema,
      errors: [404, 422],
      handler: async ({ params, body }, { users }) => one(await users.update(params.id, body)),
    }),
    route({
      method: 'delete',
      path: '/:id',
      summary: 'Delete a user',
      message: 'User deleted',
      params: idParams,
      response: emptySchema,
      errors: [404],
      handler: ({ params }, { users }) => users.delete(params.id),
    }),
  ],
};
{{/if}}
