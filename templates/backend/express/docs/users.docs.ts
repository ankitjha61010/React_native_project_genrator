import type { ApiDocGroup } from '{{IMPORT:ex.docs.helpers}}';
import { idParams, searchPageQuery } from '{{IMPORT:ex.schemas}}';
{{#if AUTH}}
import { publicUserSchema, updateProfileSchema, updateUserSchema, userSummarySchema } from '{{IMPORT:ex.users.schemas}}';
{{else}}
import { createUserSchema, publicUserSchema, updateUserSchema } from '{{IMPORT:ex.users.schemas}}';
{{/if}}

/** Swagger docs of users.routes.ts. */
export const usersDocs: ApiDocGroup = {
  tag: 'Users',
  endpoints: [
{{#if AUTH}}
    { method: 'patch', path: '/users/me', summary: 'Update your profile (name, mobile number, location, bio)', auth: true, body: updateProfileSchema, response: publicUserSchema, errors: [401, 409, 422] },
    { method: 'post', path: '/users/me/avatar', summary: 'Upload a profile picture (multipart field `avatar`: JPEG, PNG, WebP or HEIC)', auth: true, upload: 'avatar', response: publicUserSchema, errors: [400, 401, 413, 422] },
    { method: 'delete', path: '/users/me/avatar', summary: 'Remove your profile picture', auth: true, response: publicUserSchema, errors: [401] },
{{#if DELETE_ACCOUNT}}
    { method: 'delete', path: '/users/me', summary: 'Delete your account and its data (cannot be undone)', auth: true, errors: [401] },
{{/if}}
    { method: 'get', path: '/users/search', summary: 'Other users A → Z, filtered by name / email (the app\'s "New chat" list; no search = everybody)', auth: true, query: searchPageQuery, response: userSummarySchema, paginated: true, errors: [401, 422] },
    { method: 'get', path: '/users', summary: 'List users (paginated, searchable) – permission users:read', auth: true, query: searchPageQuery, response: publicUserSchema, paginated: true, errors: [401, 403, 422] },
    { method: 'get', path: '/users/:id', summary: 'Get a user – permission users:read', auth: true, params: idParams, response: publicUserSchema, errors: [401, 403, 404] },
    { method: 'patch', path: '/users/:id', summary: 'Update a user (name, role, active) – permission users:write', auth: true, params: idParams, body: updateUserSchema, response: publicUserSchema, errors: [401, 403, 404, 422] },
    { method: 'delete', path: '/users/:id', summary: 'Delete a user – permission users:delete', auth: true, params: idParams, errors: [401, 403, 404] },
{{else}}
    { method: 'get', path: '/users', summary: 'List users (paginated, searchable)', query: searchPageQuery, response: publicUserSchema, paginated: true, errors: [422] },
    { method: 'post', path: '/users', summary: 'Create a user', status: 201, body: createUserSchema, response: publicUserSchema, errors: [409, 422] },
    { method: 'get', path: '/users/:id', summary: 'Get a user', params: idParams, response: publicUserSchema, errors: [404] },
    { method: 'patch', path: '/users/:id', summary: 'Update a user', params: idParams, body: updateUserSchema, response: publicUserSchema, errors: [404, 422] },
    { method: 'delete', path: '/users/:id', summary: 'Delete a user', params: idParams, errors: [404] },
{{/if}}
  ],
};
