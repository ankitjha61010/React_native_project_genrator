import axios from 'axios';

export type ApiErrorCode =
  | 'NETWORK'
  | 'TIMEOUT'
  | 'CANCELLED'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION'
  | 'SERVER'
{{#if API_ENCRYPTION}}
  | 'DECRYPTION'
{{/if}}
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
  if (status === 400 || status === 422) return 'VALIDATION';
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
 * The message to show the user for a failed request: the backend's message for client errors
 * (wrong password, email taken…), undefined otherwise (show a generic error).
 * Also works for errors Redux serialized (thunks).
 */
export function userMessage(error: unknown): string | undefined {
  if (error instanceof ApiError) return error.status && error.status < 500 ? error.message : undefined;
  const serialized = error as { name?: unknown; message?: unknown } | null;
  return serialized?.name === 'ApiError' && typeof serialized.message === 'string' ? serialized.message : undefined;
}
