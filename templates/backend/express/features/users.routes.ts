import { Router } from 'express';
import type { Services } from '{{IMPORT:app.container}}';
{{#if AUTH}}
import { requireAuth, requirePermission } from '{{IMPORT:ex.mw.auth}}';
import { upload } from '{{IMPORT:ex.mw.upload}}';
{{/if}}
import { UsersController } from '{{IMPORT:ex.users.controller}}';

{{#if AUTH}}
/** `/users` – your own profile, user search, and administration (permissions: roles.ts). */
export function usersRoutes(services: Services): Router {
  const router = Router();
  const users = new UsersController(services.users);

  // Every /users route needs a signed-in user.
  router.use(requireAuth(services.sessions));

  // `/me…` and `/search` come before `/:id`, so they aren't read as an id.
  router.patch('/me', users.updateProfile);
  router.post('/me/avatar', upload('avatar'), users.setAvatar);
  router.delete('/me/avatar', users.removeAvatar);
{{#if DELETE_ACCOUNT}}
  router.delete('/me', users.deleteAccount);
{{/if}}
  router.get('/search', users.search);

  // Administration.
  router.get('/', requirePermission('users:read'), users.list);
  router.get('/:id', requirePermission('users:read'), users.getById);
  router.patch('/:id', requirePermission('users:write'), users.update);
  router.delete('/:id', requirePermission('users:delete'), users.delete);
  return router;
}
{{else}}
/** `/users` – CRUD. There is no authentication: protect these routes before going live. */
export function usersRoutes(services: Services): Router {
  const router = Router();
  const users = new UsersController(services.users);

  router.get('/', users.list);
  router.post('/', users.create);
  router.get('/:id', users.getById);
  router.patch('/:id', users.update);
  router.delete('/:id', users.delete);
  return router;
}
{{/if}}
