import type { ApiDocGroup } from '{{IMPORT:ex.docs.helpers}}';
import { legalSchema{{#if AUTH}}, updateLegalSchema{{/if}} } from '{{IMPORT:ex.legal.schemas}}';

/** Swagger docs of legal.routes.ts. */
export const legalDocs: ApiDocGroup = {
  tag: 'Legal',
  endpoints: [
    { method: 'get', path: '/legal', summary: 'Terms & Conditions / Privacy Policy links the app opens (admin panel, else TERMS_URL … in .env)', response: legalSchema },
{{#if AUTH}}
    { method: 'put', path: '/legal', summary: 'Save the legal links / pages (admin)', auth: true, body: updateLegalSchema, response: legalSchema, errors: [401, 403, 422] },
{{/if}}
  ],
};
