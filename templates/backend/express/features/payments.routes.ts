import { Router } from 'express';
import type { Services } from '{{IMPORT:app.container}}';
import { requireAuth, requirePermission } from '{{IMPORT:ex.mw.auth}}';
import { PaymentsController } from '{{IMPORT:ex.payments.controller}}';

/** `/payments` – the store (app), provider webhooks (public, signed) and the admin screens. */
export function paymentsRoutes(services: Services): Router {
  const router = Router();
  const payments = new PaymentsController(services.payments);

  // Webhooks: no user – the provider's signature / token is checked instead.
{{#if GATEWAY}}
  router.post('/webhooks/{{GATEWAY_ID}}', payments.webhook);
{{/if}}
{{#if IAP_ADAPTY}}
  router.post('/webhooks/adapty', payments.adaptyWebhook);
{{/if}}

  const auth = requireAuth(services.sessions);
  router.get('/products', auth, payments.listProducts);
  router.get('/me', auth, payments.access);
{{#if GATEWAY}}
  router.post('/checkout', auth, payments.checkout);
  router.get('/history', auth, payments.history);
  router.post('/:id/confirm', auth, payments.confirm);
{{/if}}
{{#if IAP_NATIVE}}
  router.post('/iap/verify', auth, payments.verifyPurchase);
{{/if}}
{{#if IAP_ADAPTY}}
  router.post('/adapty/sync', auth, payments.syncAdapty);
{{/if}}

  // Admin panel → Payments.
  const admin = [auth, requirePermission('payments:manage')];
  router.get('/admin/stats', ...admin, payments.stats);
  router.get('/admin/products', ...admin, payments.adminProducts);
  router.post('/admin/products', ...admin, payments.createProduct);
  router.patch('/admin/products/:id', ...admin, payments.updateProduct);
  router.delete('/admin/products/:id', ...admin, payments.deleteProduct);
  router.get('/admin/entitlements', ...admin, payments.entitlements);
  router.post('/admin/entitlements', ...admin, payments.grant);
  router.delete('/admin/entitlements/:id', ...admin, payments.revoke);
{{#if GATEWAY}}
  router.get('/admin/payments', ...admin, payments.adminPayments);
  router.post('/admin/payments/:id/refund', ...admin, payments.refund);
{{/if}}
{{#if IAP}}
  router.get('/admin/purchases', ...admin, payments.purchases);
{{/if}}
  return router;
}
