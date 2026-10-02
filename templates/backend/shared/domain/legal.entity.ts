/** The legal links + pages edited in the admin panel – one record (created by the first save). */
export interface LegalSettings {
  termsUrl: string | null;
  privacyPolicyUrl: string | null;
  deleteAccountUrl: string | null;
  termsHtml: string | null;
  privacyPolicyHtml: string | null;
  deleteAccountHtml: string | null;
  updatedAt: Date;
}

export type LegalSettingsInput = Partial<Omit<LegalSettings, 'updatedAt'>>;

/** Pages served by this API: the HTML saved in the admin panel, or public/<page>.html. */
export const LEGAL_PAGES = {
  'terms-and-conditions': 'termsHtml',
  'privacy-policy': 'privacyPolicyHtml',
  'delete-account': 'deleteAccountHtml',
} as const satisfies Record<string, keyof LegalSettings>;
