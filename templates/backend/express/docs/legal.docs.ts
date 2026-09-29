import { z } from 'zod';
import type { ApiDocGroup } from '{{IMPORT:ex.docs.helpers}}';

const legalSchema = z
  .object({
    termsUrl: z.url(),
    privacyPolicyUrl: z.url(),
{{#if DELETE_ACCOUNT}}
    deleteAccountUrl: z.url(),
{{/if}}
  })
  .meta({ id: 'LegalLinks' });

/** Swagger docs of legal.routes.ts. */
export const legalDocs: ApiDocGroup = {
  tag: 'Legal',
  endpoints: [{ method: 'get', path: '/legal', summary: 'Terms & Conditions / Privacy Policy links the app opens (TERMS_URL … in .env)', response: legalSchema }],
};
