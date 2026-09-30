import axios from 'axios';
import { translate } from '@infrastructure/i18n';

export type ApiErrorCode =
  | 'NETWORK'
  | 'TIMEOUT'
  | 'CANCELLED'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'VALIDATION'
  | 'SERVER'
  | 'DECRYPTION'
  | 'UNKNOWN';

export interface FieldError {
  field?: string;
  message: string;
}

/** The single error type the rest of the app has to handle. */
export class ApiError extends Error {
  /** The backend's machine readable code, e.g. `INVALID_CREDENTIALS`, `EMAIL_TAKEN`. */
  readonly serverCode?: string;
  /** Per-field validation messages (422). */
  readonly fields: FieldError[];

  constructor(
    message: string,
    readonly code: ApiErrorCode,
    readonly status?: number,
    readonly data?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
    const body = data && typeof data === 'object' ? (data as { code?: unknown; errors?: unknown }) : {};
    this.serverCode = typeof body.code === 'string' ? body.code : undefined;
    this.fields = Array.isArray(body.errors) ? (body.errors as FieldError[]) : [];
  }
}

function codeForStatus(status: number): ApiErrorCode {
  if (status === 401) return 'UNAUTHORIZED';
  if (status === 403) return 'FORBIDDEN';
  if (status === 404) return 'NOT_FOUND';
  if (status === 409) return 'CONFLICT';
  if (status === 400 || status === 413 || status === 422) return 'VALIDATION';
  if (status >= 500) return 'SERVER';
  return 'UNKNOWN';
}

function messageFrom(data: unknown): string | undefined {
  if (data && typeof data === 'object' && 'message' in data && typeof data.message === 'string') {
    return data.message;
  }
  return undefined;
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }
  if (axios.isCancel(error)) {
    return new ApiError('Request cancelled', 'CANCELLED');
  }
  if (axios.isAxiosError(error)) {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return new ApiError('Request timed out', 'TIMEOUT');
    }
    if (!error.response) {
      return new ApiError('Network error', 'NETWORK');
    }
    const { status, data } = error.response;
    return new ApiError(messageFrom(data) ?? error.message, codeForStatus(status), status, data);
  }
  return new ApiError(error instanceof Error ? error.message : 'Unknown error', 'UNKNOWN');
}

/**
 * The message to show the user for ANY failed request – never a raw backend / axios error:
 *   - 4xx with a message from the backend (wrong password, email taken, only admins…) → that message
 *     (the backend keeps them readable, in its messages files); 422 → the first field problem,
 *   - offline / timeout / 5xx / anything else → a translated, friendly text.
 *
 *   flash.error({ message: errorMessage(error) });
 *
 * Also works for errors Redux serialized (thunks).
 */
export function errorMessage(error: unknown): string {
  const apiError = error instanceof ApiError ? error : fromSerialized(error);
  if (!apiError) return translate('common', 'genericError');
  const { code, status, message, fields } = apiError;
  if (code === 'NETWORK') return translate('common', 'networkError');
  if (code === 'TIMEOUT') return translate('common', 'timeoutError');
  if (code === 'SERVER') return translate('common', 'serverError');
  if (status !== undefined && status >= 400 && status < 500) {
    if (fields[0]?.message) return fields[0].message;
    if (message) return message;
  }
  if (code === 'UNAUTHORIZED') return translate('common', 'sessionExpired');
  if (code === 'FORBIDDEN') return translate('common', 'notAllowed');
  if (code === 'NOT_FOUND') return translate('common', 'notFoundError');
  return translate('common', 'genericError');
}

/** A thunk's serialized ApiError (`{ name, message, code }`). */
function fromSerialized(error: unknown): Pick<ApiError, 'code' | 'status' | 'message' | 'fields'> | undefined {
  const serialized = error as { name?: unknown; message?: unknown; code?: unknown } | null;
  if (serialized?.name !== 'ApiError' || typeof serialized.message !== 'string') return undefined;
  const code = (typeof serialized.code === 'string' ? serialized.code : 'UNKNOWN') as ApiErrorCode;
  // Client errors keep their (readable) message.
  const status = code === 'VALIDATION' || code === 'CONFLICT' || code === 'NOT_FOUND' || code === 'FORBIDDEN' ? 400 : undefined;
  return { code, status, message: serialized.message, fields: [] };
}
