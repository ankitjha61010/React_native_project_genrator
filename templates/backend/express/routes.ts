import { Router } from 'express';
import type { Services } from '../container.js';
import { authRoutes } from './auth.routes.js';
import { chatRoutes } from './chat.routes.js';
import { callingRoutes } from './calling.routes.js';
import { devicesRoutes } from './devices.routes.js';
import { healthRoutes } from './health.routes.js';
import { legalRoutes } from './legal.routes.js';
import { notificationsRoutes } from './notifications.routes.js';
import { usersRoutes } from './users.routes.js';

/**
 * Every endpoint of the API, by feature. Mounted under /api/v1 by app.ts, e.g.
 * `/auth` + `/login` = POST /api/v1/auth/login.
 */
export function apiRoutes(services: Services): Router {
  const api = Router();
  api.use('/health', healthRoutes(services));
  api.use('/auth', authRoutes(services));
  api.use('/users', usersRoutes(services));
  api.use('/chat', chatRoutes(services));
  api.use('/calls', callingRoutes(services));
  api.use('/devices', devicesRoutes(services));
  api.use('/notifications', notificationsRoutes(services));
  api.use('/legal', legalRoutes(services));
  return api;
}
