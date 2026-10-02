import { LEGAL_PAGES, type LegalSettings, type LegalSettingsInput } from '{{IMPORT:domain.legal}}';
import type { LegalRepository } from '{{IMPORT:contract.legal}}';

/** The links from .env (TERMS_URL …) – used until the admin panel saves its own. */
export interface LegalDefaults {
  termsUrl: string;
  privacyPolicyUrl: string;
  deleteAccountUrl?: string;
}

/** What GET /legal returns: the links the app opens + the pages' HTML (null = public/*.html). */
export interface LegalView {
  termsUrl: string;
  privacyPolicyUrl: string;
  deleteAccountUrl: string | null;
  termsHtml: string | null;
  privacyPolicyHtml: string | null;
  deleteAccountHtml: string | null;
}

export class LegalService {
  constructor(
    private readonly legal: LegalRepository,
    private readonly defaults: LegalDefaults,
  ) {}

  async get(): Promise<LegalView> {
    return this.view(await this.legal.find());
  }

  /** Only the fields that are sent change; an empty string resets one (back to the default). */
  async update(input: LegalSettingsInput): Promise<LegalView> {
    const changes = Object.fromEntries(
      Object.entries(input)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => [key, value?.trim() || null]),
    );
    return this.view(await this.legal.save(changes));
  }

  /** HTML saved for `/terms-and-conditions` …, or null when public/*.html should be served. */
  async pageHtml(path: string): Promise<string | null> {
    const page = path.replace(/^\/+|\.html$/g, '');
    if (!Object.hasOwn(LEGAL_PAGES, page)) return null;
    const settings = await this.legal.find();
    return settings?.[LEGAL_PAGES[page as keyof typeof LEGAL_PAGES]] ?? null;
  }

  private view(settings: LegalSettings | null): LegalView {
    return {
      termsUrl: settings?.termsUrl ?? this.defaults.termsUrl,
      privacyPolicyUrl: settings?.privacyPolicyUrl ?? this.defaults.privacyPolicyUrl,
      deleteAccountUrl: settings?.deleteAccountUrl ?? this.defaults.deleteAccountUrl ?? null,
      termsHtml: settings?.termsHtml ?? null,
      privacyPolicyHtml: settings?.privacyPolicyHtml ?? null,
      deleteAccountHtml: settings?.deleteAccountHtml ?? null,
    };
  }
}
