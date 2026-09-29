import { COMMON_MESSAGES, type ErrorMessage } from '{{IMPORT:core.messages}}';

/** A single problem with a request (usually one invalid field). */
export interface FieldError {
  field?: string;
  message: string;
}

/**
 * Every expected error is an AppError: it carries the HTTP status, a stable machine
 * readable `code` and an optional list of field errors. The HTTP layer turns it into the
 * standard error response; anything else becomes a 500 without leaking details.
 *
 *   throw new NotFoundError(USERS_MESSAGES.notFound);   // messages come from *.messages.ts
 */
export class AppError extends Error {
  readonly code: string;

  constructor(
    error: ErrorMessage,
    readonly statusCode = 500,
    readonly errors: FieldError[] = [],
  ) {
    super(error.message);
    this.code = error.code;
    this.name = new.target.name;
  }

  /** 4xx errors are safe to show to clients; 5xx messages are replaced by a generic one. */
  get expose(): boolean {
    return this.statusCode < 500;
  }
}

export class BadRequestError extends AppError {
  constructor(error: ErrorMessage = COMMON_MESSAGES.badRequest, errors: FieldError[] = []) {
    super(error, 400, errors);
  }
}

export class ValidationError extends AppError {
  constructor(errors: FieldError[], error: ErrorMessage = COMMON_MESSAGES.validationFailed) {
    super(error, 422, errors);
  }
}

export class UnauthorizedError extends AppError {
  constructor(error: ErrorMessage = COMMON_MESSAGES.unauthorized) {
    super(error, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(error: ErrorMessage = COMMON_MESSAGES.forbidden) {
    super(error, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(error: ErrorMessage = COMMON_MESSAGES.notFound) {
    super(error, 404);
  }
}

export class ConflictError extends AppError {
  constructor(error: ErrorMessage = COMMON_MESSAGES.conflict) {
    super(error, 409);
  }
}

export class PayloadTooLargeError extends AppError {
  constructor(error: ErrorMessage = COMMON_MESSAGES.payloadTooLarge) {
    super(error, 413);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(error: ErrorMessage = COMMON_MESSAGES.tooManyRequests) {
    super(error, 429);
  }
}
{{#if SEC_LOCKOUT}}

export class AccountLockedError extends AppError {
  constructor(
    readonly lockedUntil: Date,
    error: ErrorMessage,
  ) {
    super(error, 423);
  }
}
{{/if}}
