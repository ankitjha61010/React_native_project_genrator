import { api } from './apiClient';

/** Links of the legal pages – they come from the backend (GET /legal), so they change without an app release. */
export interface LegalLinks {
  termsUrl: string;
  privacyPolicyUrl: string;
  /** Web page explaining how to delete an account (asked for by the app stores). */
  deleteAccountUrl?: string;
}

let cached: Promise<LegalLinks> | undefined;

export const legalApi = {
  /** Loaded once per app start; a failed request is retried next time. */
  getLinks(): Promise<LegalLinks> {
    cached ??= api.get<LegalLinks>('/legal', { skipAuthRefresh: true }).catch(error => {
      cached = undefined;
      throw error;
    });
    return cached;
  },
};
