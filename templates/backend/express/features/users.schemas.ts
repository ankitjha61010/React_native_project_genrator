import { z } from 'zod';
{{#if AUTH}}
import { ROLES } from '{{IMPORT:domain.roles}}';
{{/if}}

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

/** The app's Edit Profile screen. Send `phone: null` to remove the number. */
export const updateProfileSchema = z
  .object({
    name: name.optional(),
    countryCode: z.string().trim().regex(/^\+?\d{1,4}$/, 'must be a dial code like +91').nullable().optional(),
    phone: z.string().trim().regex(/^[\d\s-]{4,20}$/, 'must be a valid mobile number').nullable().optional(),
    location: z.string().trim().max(120).nullable().optional(),
    bio: z.string().trim().max(500).nullable().optional(),
  })
  .meta({ id: 'UpdateProfileRequest' });

export const searchUsersQuery = z.object({ q: z.string().trim().min(1).max(100), limit: z.coerce.number().int().min(1).max(50).default(20) });
{{/if}}

// ── responses (used by the OpenAPI document) ──────────────────────────────────

export const publicUserSchema = z
  .object({
    id: z.string(),
{{#if AUTH}}
    email: z.email().nullable(),
    name: z.string(),
    avatar: z.url().nullable(),
    countryCode: z.string().nullable(),
    phone: z.string().nullable(),
    location: z.string().nullable(),
    bio: z.string().nullable(),
    role: z.enum(ROLES),
    emailVerified: z.boolean(),
    phoneVerified: z.boolean(),
    hasPassword: z.boolean(),
{{else}}
    email: z.email(),
    name: z.string(),
{{/if}}
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .meta({ id: 'User' });
{{#if AUTH}}

export const userSummarySchema = z.object({ id: z.string(), name: z.string(), avatar: z.url().nullable() }).meta({ id: 'UserSummary' });
{{/if}}
