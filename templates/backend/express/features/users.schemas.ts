import { z } from 'zod';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '{{IMPORT:core.pagination}}';
{{#if AUTH}}
import { ROLES } from '{{IMPORT:domain.roles}}';
{{/if}}

export const userIdParams = z.object({ id: z.string().min(1).max(64) });

export const listUsersQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  search: z.string().trim().max(100).optional(),
});

const name = z.string().trim().min(1).max(120).meta({ example: 'Jane Doe' });
{{#if NO_AUTH}}

export const createUserSchema = z
  .object({ email: z.email().max(255).meta({ example: 'jane@example.com' }), name })
  .meta({ id: 'CreateUserRequest' });

export const updateUserSchema = z.object({ name: name.optional() }).meta({ id: 'UpdateUserRequest' });
{{else}}

export const updateUserSchema = z
  .object({ name: name.optional(), role: z.enum(ROLES).optional(), isActive: z.boolean().optional() })
  .refine(value => Object.keys(value).length > 0, 'Provide at least one field')
  .meta({ id: 'UpdateUserRequest' });

export const updateProfileSchema = z.object({ name }).meta({ id: 'UpdateProfileRequest' });
{{/if}}

// ── responses (used by the OpenAPI document) ──────────────────────────────────

export const publicUserSchema = z
  .object({
    id: z.string(),
    email: z.email(),
    name: z.string(),
{{#if AUTH}}
    role: z.enum(ROLES),
    emailVerified: z.boolean(),
{{/if}}
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .meta({ id: 'User' });
