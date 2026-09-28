import { Router{{#if AUTH}}, type RequestHandler{{/if}} } from 'express';
{{#if AUTH}}
import { requirePermissions } from '{{IMPORT:ex.mw.authorize}}';
{{/if}}
import type { UsersController } from '{{IMPORT:ex.users.controller}}';

{{#if AUTH}}
/** `/users` – profile of the signed-in user + administration (permission based, see roles.ts). */
export function createUsersRouter(controller: UsersController, authenticate: RequestHandler): Router {
  const router = Router();
  router.use(authenticate);
  router.patch('/me', controller.updateProfile);
  router.get('/', requirePermissions('users:read'), controller.list);
  router.get('/:id', requirePermissions('users:read'), controller.getById);
  router.patch('/:id', requirePermissions('users:write'), controller.update);
  router.delete('/:id', requirePermissions('users:delete'), controller.delete);
  return router;
}
{{else}}
/** `/users` – CRUD. There is no authentication: protect these routes before going live. */
export function createUsersRouter(controller: UsersController): Router {
  const router = Router();
  router.get('/', controller.list);
  router.post('/', controller.create);
  router.get('/:id', controller.getById);
  router.patch('/:id', controller.update);
  router.delete('/:id', controller.delete);
  return router;
}
{{/if}}
