/** A single problem with a request (usually one invalid field). */
export interface FieldError {
  field?: string;
  message: string;
}

/**
 * Every expected error is an AppError: it carries the HTTP status, a stable machine
 * readable `code` and an optional list of field errors. The HTTP layer turns it into the
 * standard error response; anything else becomes a 500 without leaking details.
 */
export class AppError extends Error {
  constructor(
    message: string,
    readonly statusCode = 500,
    readonly code = 'INTERNAL_ERROR',
    readonly errors: FieldError[] = [],
  ) {
    super(message);
    this.name = new.target.name;
  }

  /** 4xx errors are safe to show to clients; 5xx messages are replaced by a generic one. */
  get expose(): boolean {
    return this.statusCode < 500;
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request', code = 'BAD_REQUEST', errors: FieldError[] = []) {
    super(message, 400, code, errors);
  }
}

export class ValidationError extends AppError {
  constructor(errors: FieldError[], message = 'Validation failed') {
    super(message, 422, 'VALIDATION_ERROR', errors);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required', code = 'UNAUTHORIZED') {
    super(message, 401, code);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You are not allowed to do this', code = 'FORBIDDEN') {
    super(message, 403, code);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', code = 'NOT_FOUND') {
    super(message, 404, code);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource already exists', code = 'CONFLICT') {
    super(message, 409, code);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = 'Too many requests, please try again later', code = 'TOO_MANY_REQUESTS') {
    super(message, 429, code);
  }
}
{{#if SEC_LOCKOUT}}

export class AccountLockedError extends AppError {
  constructor(readonly lockedUntil: Date) {
    super('Too many failed login attempts. The account is temporarily locked.', 423, 'ACCOUNT_LOCKED');
  }
}
{{/if}}
