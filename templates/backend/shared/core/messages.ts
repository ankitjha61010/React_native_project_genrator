/**
 * A message the API sends, with its machine readable `code` (the app can switch on the code,
 * the message is shown to the user). Every text lives in a messages file – never inline:
 *   - this file: messages every feature shares (validation, auth, not found, rate limits…),
 *   - `<feature>.messages.ts`: the messages of one feature.
 */
export interface ErrorMessage {
  message: string;
  code: string;
}

export const COMMON_MESSAGES = {
  ok: 'OK',
  // ── errors ─────────────────────────────────────────────────────────────────
  badRequest: { message: 'Bad request', code: 'BAD_REQUEST' },
  validationFailed: { message: 'Validation failed', code: 'VALIDATION_ERROR' },
  malformedJson: { message: 'Malformed JSON body', code: 'INVALID_JSON' },
  payloadTooLarge: { message: 'Request body is too large', code: 'PAYLOAD_TOO_LARGE' },
  fileTooLarge: (maxMb: number): ErrorMessage => ({ message: `The file is larger than ${maxMb} MB`, code: 'PAYLOAD_TOO_LARGE' }),
  fileRequired: 'A file is required',
  unauthorized: { message: 'Authentication required', code: 'UNAUTHORIZED' },
  forbidden: { message: 'You are not allowed to do this', code: 'FORBIDDEN' },
  notFound: { message: 'Resource not found', code: 'NOT_FOUND' },
  routeNotFound: (method: string, path: string): ErrorMessage => ({ message: `Route ${method} ${path} not found`, code: 'ROUTE_NOT_FOUND' }),
  methodNotAllowed: { message: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' },
  conflict: { message: 'Resource already exists', code: 'CONFLICT' },
  tooManyRequests: { message: 'Too many requests, please try again later', code: 'TOO_MANY_REQUESTS' },
  tooManyAuthAttempts: { message: 'Too many attempts, please try again later', code: 'TOO_MANY_REQUESTS' },
  internal: { message: 'Internal server error', code: 'INTERNAL_ERROR' },
{{#if API_ENCRYPTION}}
  decryptionFailed: { message: 'The request body could not be decrypted', code: 'DECRYPTION_FAILED' },
{{/if}}
} as const;
