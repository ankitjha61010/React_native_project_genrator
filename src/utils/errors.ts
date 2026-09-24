/** An error the CLI knows how to explain: what failed, why, and what to try. */
export class GeneratorError extends Error {
  constructor(
    message: string,
    readonly details: { reason?: string; tryHints?: string[]; cause?: unknown } = {},
  ) {
    super(message);
    this.name = 'GeneratorError';
  }
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

/** Recognise common OS / network failures and turn them into actionable errors. */
export function explainSystemError(action: string, error: unknown): GeneratorError {
  if (error instanceof GeneratorError) {
    return error;
  }
  const code = (error as NodeJS.ErrnoException | undefined)?.code;
  const reason = errorMessage(error);
  if (code === 'EACCES' || code === 'EPERM') {
    return new GeneratorError(`Permission denied while trying to ${action}.`, {
      reason,
      tryHints: ['Choose a location you own (e.g. inside your home folder).', 'Avoid running the generator with sudo.'],
      cause: error,
    });
  }
  if (code === 'ENOSPC') {
    return new GeneratorError(`Not enough disk space to ${action}.`, { reason, cause: error });
  }
  if (/ENOTFOUND|ECONNRESET|ETIMEDOUT|EAI_AGAIN|network/i.test(reason)) {
    return new GeneratorError(`Network failure while trying to ${action}.`, {
      reason,
      tryHints: ['Check your internet connection / proxy settings.', 'Run `npm ping` to verify the npm registry is reachable.'],
      cause: error,
    });
  }
  return new GeneratorError(`Failed to ${action}.`, { reason, cause: error });
}
