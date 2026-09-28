import type { FieldError } from '{{IMPORT:core.errors}}';

/** Every successful response: `{ success: true, message, data, meta? }`. */
export interface ApiSuccessResponse<T> {
  success: true;
  message: string;
  data: T;
  meta?: Record<string, unknown>;
}

/** Every error response: `{ success: false, message, code, errors }`. */
export interface ApiErrorResponse {
  success: false;
  message: string;
  /** Stable, machine readable error code (e.g. VALIDATION_ERROR, INVALID_CREDENTIALS). */
  code: string;
  errors: FieldError[];
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export function successResponse<T>(data: T, message = 'OK', meta?: Record<string, unknown>): ApiSuccessResponse<T> {
  return meta ? { success: true, message, data, meta } : { success: true, message, data };
}

export function errorResponse(message: string, code: string, errors: FieldError[] = []): ApiErrorResponse {
  return { success: false, message, code, errors };
}
