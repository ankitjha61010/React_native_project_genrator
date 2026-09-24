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

/** The single error type the rest of the app has to handle. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly code: ApiErrorCode,
    readonly status?: number,
    readonly data?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
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
