import type { ApiDocGroup } from '{{IMPORT:ex.docs.helpers}}';
import { idParams } from '{{IMPORT:ex.schemas}}';
import {
  entitlementsQuery,
  grantEntitlementSchema,
  productSchema,
  productsQuery,
  updateProductSchema,
{{#if GATEWAY}}
  checkoutSchema,
  confirmSchema,
  paymentsQuery,
  refundSchema,
{{/if}}
{{#if IAP}}
  purchasesQuery,
{{/if}}
{{#if IAP_NATIVE}}
  verifyPurchaseSchema,
{{/if}}
} from '{{IMPORT:ex.payments.schemas}}';

/** Swagger docs of payments.routes.ts. */
export const paymentsDocs: ApiDocGroup = {
  tag: 'Payments',
  endpoints: [
{{#if GATEWAY}}
    { method: 'post', path: '/payments/webhooks/{{GATEWAY_ID}}', summary: '{{GATEWAY_NAME}} webhook – signature checked, no bearer token', errors: [400, 503] },
{{/if}}
{{#if IAP_ADAPTY}}
    { method: 'post', path: '/payments/webhooks/adapty', summary: 'Adapty webhook – Authorization: ADAPTY_WEBHOOK_TOKEN', errors: [401] },
{{/if}}
    { method: 'get', path: '/payments/products', summary: 'Products the app can sell', auth: true, errors: [401] },
    { method: 'get', path: '/payments/me', summary: "The signed-in user's access levels (accessLevels + entitlements)", auth: true, errors: [401] },
{{#if GATEWAY}}
    { method: 'post', path: '/payments/checkout', summary: 'Create a {{GATEWAY_NAME}} order – returns what the app needs to open the checkout', status: 201, auth: true, body: checkoutSchema, errors: [400, 401, 404, 502, 503] },
    { method: 'get', path: '/payments/history', summary: "The signed-in user's payments", auth: true, query: paymentsQuery, paginated: true, errors: [401] },
    { method: 'post', path: '/payments/:id/confirm', summary: 'The app finished the checkout – the provider is asked whether it is paid', auth: true, params: idParams, body: confirmSchema, errors: [400, 401, 404, 502] },
{{/if}}
{{#if IAP_NATIVE}}
    { method: 'post', path: '/payments/iap/verify', summary: 'Verify a react-native-iap purchase with Apple / Google and grant its access level', auth: true, body: verifyPurchaseSchema, errors: [400, 401, 404, 409, 502, 503] },
{{/if}}
{{#if IAP_ADAPTY}}
    { method: 'post', path: '/payments/adapty/sync', summary: 'Sync access levels from Adapty (after a purchase / restore)', auth: true, errors: [401, 502, 503] },
{{/if}}
    { method: 'get', path: '/payments/admin/stats', summary: 'Payment statistics – permission payments:manage', auth: true, errors: [401, 403] },
    { method: 'get', path: '/payments/admin/products', summary: 'All products (?all=true: inactive too) – permission payments:manage', auth: true, query: productsQuery, errors: [401, 403] },
    { method: 'post', path: '/payments/admin/products', summary: 'Create a product – permission payments:manage', status: 201, auth: true, body: productSchema, errors: [401, 403, 422] },
    { method: 'patch', path: '/payments/admin/products/:id', summary: 'Update a product – permission payments:manage', auth: true, params: idParams, body: updateProductSchema, errors: [401, 403, 404, 422] },
    { method: 'delete', path: '/payments/admin/products/:id', summary: 'Delete a product – permission payments:manage', auth: true, params: idParams, errors: [401, 403, 404] },
    { method: 'get', path: '/payments/admin/entitlements', summary: 'Entitlements (?userId=) – permission payments:manage', auth: true, query: entitlementsQuery, paginated: true, errors: [401, 403] },
    { method: 'post', path: '/payments/admin/entitlements', summary: 'Give someone access by hand – permission payments:manage', status: 201, auth: true, body: grantEntitlementSchema, errors: [401, 403, 404, 422] },
    { method: 'delete', path: '/payments/admin/entitlements/:id', summary: 'Revoke an entitlement – permission payments:manage', auth: true, params: idParams, errors: [401, 403, 404] },
{{#if GATEWAY}}
    { method: 'get', path: '/payments/admin/payments', summary: 'Payments (?status=&userId=) – permission payments:manage', auth: true, query: paymentsQuery, paginated: true, errors: [401, 403] },
    { method: 'post', path: '/payments/admin/payments/:id/refund', summary: 'Refund all of a payment, or `amount` (minor units) – permission payments:manage', auth: true, params: idParams, body: refundSchema, errors: [400, 401, 403, 404, 502] },
{{/if}}
{{#if IAP}}
    { method: 'get', path: '/payments/admin/purchases', summary: 'Store purchases (?userId=) – permission payments:manage', auth: true, query: purchasesQuery, paginated: true, errors: [401, 403] },
{{/if}}
  ],
};
