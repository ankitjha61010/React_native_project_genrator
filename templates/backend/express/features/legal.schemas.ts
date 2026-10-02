import { z } from 'zod';

const link = z.union([z.url().max(2048), z.literal('')]).optional();
const html = z.string().max(500_000).optional();

/** Only the fields that are sent change; an empty string resets one to its default. */
export const updateLegalSchema = z
  .object({
    termsUrl: link,
    privacyPolicyUrl: link,
    deleteAccountUrl: link,
    termsHtml: html,
    privacyPolicyHtml: html,
    deleteAccountHtml: html,
  })
  .meta({ id: 'UpdateLegalRequest' });

// ── responses (used by the OpenAPI document) ──────────────────────────────────

export const legalSchema = z
  .object({
    termsUrl: z.url(),
    privacyPolicyUrl: z.url(),
    deleteAccountUrl: z.url().nullable(),
    termsHtml: z.string().nullable().meta({ description: 'Saved in the admin panel – null: public/terms-and-conditions.html' }),
    privacyPolicyHtml: z.string().nullable(),
    deleteAccountHtml: z.string().nullable(),
  })
  .meta({ id: 'Legal' });
