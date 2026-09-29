import type { FieldError } from '{{IMPORT:core.errors}}';
import type { ErrorMessage } from '{{IMPORT:core.messages}}';

/** Every successful response: `{ success: true, message, data, meta? }`. */
export interface ApiSuccessResponse<T> {
  success: true;
  message: string;
  data: T;
  meta?: Record<string, unknown>;
}

/** Every error response: `{ success: false, message, data: null, code, errors }` – the same shape as a success. */
export interface ApiErrorResponse {
  success: false;
  message: string;
  data: null;
  /** Stable, machine readable error code (e.g. VALIDATION_ERROR, INVALID_CREDENTIALS). */
  code: string;
  errors: FieldError[];
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export function successResponse<T>(data: T, message: string, meta?: Record<string, unknown>): ApiSuccessResponse<T> {
  return meta ? { success: true, message, data, meta } : { success: true, message, data };
}

export function errorResponse(error: ErrorMessage, errors: FieldError[] = []): ApiErrorResponse {
  return { success: false, message: error.message, data: null, code: error.code, errors };
}
