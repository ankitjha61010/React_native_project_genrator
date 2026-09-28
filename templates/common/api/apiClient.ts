import axios, { type AxiosError, type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios';
import { StorageKeys } from '{{IMPORT:storage.keys}}';
import { storageService } from '{{IMPORT:storage.service}}';
import { logger } from '{{IMPORT:utils.logger}}';
import { apiConfig } from './apiConfig';
{{#if API_ENCRYPTION}}
import { fromEncryptedBody, isEncryptionEnabled, toEncryptedBody } from './apiEncryption';
import { ApiError, toApiError } from './apiErrors';
{{else}}
import { toApiError } from './apiErrors';
{{/if}}

declare module 'axios' {
  interface AxiosRequestConfig {
{{#if API_ENCRYPTION}}
    /** Send this request and read its response as plain JSON (e.g. multipart uploads). */
    skipEncryption?: boolean;
{{/if}}
    /** Don't try to refresh the token when this request answers 401 (the refresh call itself, login…). */
    skipAuthRefresh?: boolean;
  }
}

/** The single HTTP client of the app. Never create other axios instances. */
export const apiClient = axios.create(apiConfig);

{{#if API_ENCRYPTION}}
type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean; _encrypted?: boolean };
{{else}}
type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };
{{/if}}

interface ApiAuthHandlers {
  /** Where the access token comes from (defaults to local storage). */
  getAccessToken: () => Promise<string | null>;
  /** Called once on a 401. Return a new access token, or null to give up. */
  refreshAccessToken?: () => Promise<string | null>;
  /** Called when a request is still unauthorised (e.g. sign the user out). */
  onUnauthorized?: () => void;
}

const auth: ApiAuthHandlers = {
  getAccessToken: () => storageService.get<string>(StorageKeys.AUTH_TOKEN),
};

/** Plug in token refresh / logout behaviour, e.g. from your auth feature. */
export function configureApiAuth(handlers: Partial<ApiAuthHandlers>): void {
  Object.assign(auth, handlers);
}

{{#if API_ENCRYPTION}}
function usesEncryption(config: InternalAxiosRequestConfig | undefined): boolean {
  return isEncryptionEnabled() && !config?.skipEncryption;
}

{{/if}}
// Request: attach the bearer token.
apiClient.interceptors.request.use(async config => {
  const token = await auth.getAccessToken();
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
{{#if API_ENCRYPTION}}
  // Encrypt the body once (a retried request already carries the encrypted body).
  const request = config as RetriableConfig;
  if (usesEncryption(config) && !request._encrypted && config.data != null && !(config.data instanceof FormData)) {
    logger.debug('  body (before encryption)', config.data);
    config.data = toEncryptedBody(config.data);
    request._encrypted = true;
  }
{{/if}}
  logger.debug(`→ ${config.method?.toUpperCase()} ${config.baseURL ?? ''}${config.url ?? ''}`);
  return config;
});

// Concurrent 401s share one refresh request.
let refreshing: Promise<string | null> | null = null;

// Response: refresh once on 401, then normalise every error into ApiError.
apiClient.interceptors.response.use(
  response => {
    logger.debug(`← ${response.status} ${response.config.url ?? ''}`);
{{#if API_ENCRYPTION}}
    if (usesEncryption(response.config)) {
      try {
        response.data = fromEncryptedBody(response.data);
      } catch (decryptError) {
        logger.error('Response decryption failed', decryptError);
        return Promise.reject(new ApiError('Could not decrypt the server response', 'DECRYPTION', response.status));
      }
    }
{{/if}}
    return response;
  },
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined;
    const status = error.response?.status;
{{#if API_ENCRYPTION}}
    // Error bodies are encrypted too – decrypt them so ApiError carries the server message.
    if (error.response && usesEncryption(original)) {
      try {
        error.response.data = fromEncryptedBody(error.response.data);
      } catch {
        // Not encrypted (e.g. a gateway error page) – keep it as-is.
      }
    }
{{/if}}

    if (status === 401 && original && !original._retry && !original.skipAuthRefresh && auth.refreshAccessToken) {
      original._retry = true;
      try {
        refreshing ??= auth.refreshAccessToken().finally(() => {
          refreshing = null;
        });
        const token = await refreshing;
        if (token) {
          await storageService.set(StorageKeys.AUTH_TOKEN, token);
          original.headers.Authorization = `Bearer ${token}`;
          return apiClient(original);
        }
      } catch (refreshError) {
        logger.warn('Token refresh failed', refreshError);
      }
    }

    if (status === 401 && !original?.skipAuthRefresh) {
      auth.onUnauthorized?.();
    }
    return Promise.reject(toApiError(error));
  },
);

/** The backend wraps every response: `{ success, message, data, meta }`. */
export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: Record<string, unknown>;
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  [key: string]: unknown;
}

export interface Page<T> {
  items: T[];
  meta: PageMeta;
}

function isEnvelope(body: unknown): body is ApiEnvelope<unknown> {
  return typeof body === 'object' && body !== null && 'success' in body && 'data' in body;
}

/** The `data` of the envelope (or the raw body for endpoints that don't use one). */
function unwrap<T>(body: unknown): T {
  return (isEnvelope(body) ? body.data : body) as T;
}

/** Typed helpers that return the response's `data`. */
export const api = {
  get: <T>(url: string, config?: AxiosRequestConfig) => apiClient.get(url, config).then(r => unwrap<T>(r.data)),
  post: <T>(url: string, body?: unknown, config?: AxiosRequestConfig) => apiClient.post(url, body, config).then(r => unwrap<T>(r.data)),
  put: <T>(url: string, body?: unknown, config?: AxiosRequestConfig) => apiClient.put(url, body, config).then(r => unwrap<T>(r.data)),
  patch: <T>(url: string, body?: unknown, config?: AxiosRequestConfig) => apiClient.patch(url, body, config).then(r => unwrap<T>(r.data)),
  delete: <T>(url: string, config?: AxiosRequestConfig) => apiClient.delete(url, config).then(r => unwrap<T>(r.data)),
  /** A list with its `meta` (pagination, unread count…). */
  page: <T>(url: string, config?: AxiosRequestConfig) =>
    apiClient.get<ApiEnvelope<T[]>>(url, config).then(r => ({ items: r.data.data, meta: (r.data.meta ?? {}) as PageMeta }) as Page<T>),
  /** multipart/form-data upload of one file (`uri` from the image / document picker). */
  upload: <T>(url: string, field: string, file: { uri: string; name: string; type: string }, config?: AxiosRequestConfig) => {
    const form = new FormData();
    form.append(field, file as unknown as Blob);
    return apiClient
      .post(url, form, { ...config, headers: { 'Content-Type': 'multipart/form-data' }{{#if API_ENCRYPTION}}, skipEncryption: true{{/if}}, timeout: 120_000 })
      .then(r => unwrap<T>(r.data));
  },
};
