import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
{{#if AUTH}}
import { BEARER, envelope, errorResponses, json, ok, pageMetaSchema } from '{{IMPORT:ex.docs.helpers}}';
import { listUsersQuery, publicUserSchema, updateProfileSchema, updateUserSchema, userIdParams } from '{{IMPORT:ex.users.schemas}}';
{{else}}
import { envelope, errorResponses, json, ok, pageMetaSchema } from '{{IMPORT:ex.docs.helpers}}';
import { createUserSchema, listUsersQuery, publicUserSchema, updateUserSchema, userIdParams } from '{{IMPORT:ex.users.schemas}}';
{{/if}}

const userResponse = envelope(publicUserSchema, 'UserResponse');
const userListResponse = envelope(z.array(publicUserSchema), 'UserListResponse', pageMetaSchema);
const emptyResponse = envelope(z.null(), 'EmptyResponse');

export function registerUsersDocs(registry: OpenAPIRegistry): void {
  const tags = ['Users'];
{{#if AUTH}}
  const security = BEARER;

  registry.registerPath({
    method: 'patch',
    path: '/users/me',
    tags,
    summary: 'Update your own profile',
    security,
    request: { body: json(updateProfileSchema) },
    responses: { 200: ok('Profile updated', userResponse), ...errorResponses(401, 422) },
  });
{{else}}
  const security = undefined;

  registry.registerPath({
    method: 'post',
    path: '/users',
    tags,
    summary: 'Create a user',
    request: { body: json(createUserSchema) },
    responses: { 201: ok('User created', userResponse), ...errorResponses(409, 422) },
  });
{{/if}}
  registry.registerPath({
    method: 'get',
    path: '/users',
    tags,
    summary: 'List users (paginated, searchable){{#if AUTH}} – permission users:read{{/if}}',
    security,
    request: { query: listUsersQuery },
    responses: { 200: ok('Users', userListResponse), ...errorResponses({{#if AUTH}}401, 403, {{/if}}422) },
  });
  registry.registerPath({
    method: 'get',
    path: '/users/{id}',
    tags,
    summary: 'Get a user{{#if AUTH}} – permission users:read{{/if}}',
    security,
    request: { params: userIdParams },
    responses: { 200: ok('User', userResponse), ...errorResponses({{#if AUTH}}401, 403, {{/if}}404) },
  });
  registry.registerPath({
    method: 'patch',
    path: '/users/{id}',
    tags,
    summary: 'Update a user{{#if AUTH}} – permission users:write{{/if}}',
    security,
    request: { params: userIdParams, body: json(updateUserSchema) },
    responses: { 200: ok('User updated', userResponse), ...errorResponses({{#if AUTH}}401, 403, {{/if}}404, 422) },
  });
  registry.registerPath({
    method: 'delete',
    path: '/users/{id}',
    tags,
    summary: 'Delete a user{{#if AUTH}} – permission users:delete{{/if}}',
    security,
    request: { params: userIdParams },
    responses: { 200: ok('User deleted', emptyResponse), ...errorResponses({{#if AUTH}}401, 403, {{/if}}404) },
  });
}
