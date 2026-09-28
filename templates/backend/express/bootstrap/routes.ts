{{#if AUTH_API}}
import { authRoutes } from '{{IMPORT:ex.auth.controller}}';
{{/if}}
{{#if CHAT}}
import { chatRoutes } from '{{IMPORT:ex.chat.controller}}';
{{/if}}
import { healthRoutes } from '{{IMPORT:ex.health.controller}}';
{{#if NOTIFICATIONS}}
import { notificationsRoutes } from '{{IMPORT:ex.notifications.controller}}';
{{/if}}
import type { RouteGroup } from '{{IMPORT:ex.route}}';
{{#if USERS_API}}
import { usersRoutes } from '{{IMPORT:ex.users.controller}}';
{{/if}}

/** Every endpoint of the API (mounted by app.ts, documented by openapi.ts). */
export const routeGroups: RouteGroup[] = [
  healthRoutes,
{{#if AUTH_API}}
  authRoutes,
{{/if}}
{{#if USERS_API}}
  usersRoutes,
{{/if}}
{{#if CHAT}}
  chatRoutes,
{{/if}}
{{#if NOTIFICATIONS}}
  notificationsRoutes,
{{/if}}
];
