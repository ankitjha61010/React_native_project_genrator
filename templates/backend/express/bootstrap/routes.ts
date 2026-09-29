import { Router } from 'express';
import type { Services } from '{{IMPORT:app.container}}';
{{#if AUTH_API}}
import { authRoutes } from '{{IMPORT:ex.auth.routes}}';
{{/if}}
{{#if CHAT}}
import { chatRoutes } from '{{IMPORT:ex.chat.routes}}';
{{/if}}
{{#if DEVICES}}
import { devicesRoutes } from '{{IMPORT:ex.devices.routes}}';
{{/if}}
import { healthRoutes } from '{{IMPORT:ex.health.routes}}';
{{#if LEGAL}}
import { legalRoutes } from '{{IMPORT:ex.legal.routes}}';
{{/if}}
{{#if NOTIFICATIONS}}
import { notificationsRoutes } from '{{IMPORT:ex.notifications.routes}}';
{{/if}}
{{#if USERS_API}}
import { usersRoutes } from '{{IMPORT:ex.users.routes}}';
{{/if}}

/**
 * Every endpoint of the API, by feature. Mounted under /api/v1 by app.ts, e.g.
 * `/auth` + `/login` = POST /api/v1/auth/login.
 */
export function apiRoutes(services: Services): Router {
  const api = Router();
  api.use('/health', healthRoutes(services));
{{#if AUTH_API}}
  api.use('/auth', authRoutes(services));
{{/if}}
{{#if USERS_API}}
  api.use('/users', usersRoutes(services));
{{/if}}
{{#if CHAT}}
  api.use('/chat', chatRoutes(services));
{{/if}}
{{#if DEVICES}}
  api.use('/devices', devicesRoutes(services));
{{/if}}
{{#if NOTIFICATIONS}}
  api.use('/notifications', notificationsRoutes(services));
{{/if}}
{{#if LEGAL}}
  api.use('/legal', legalRoutes());
{{/if}}
  return api;
}
