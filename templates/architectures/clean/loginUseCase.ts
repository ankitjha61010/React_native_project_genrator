import type { AuthSession, LoginCredentials } from '{{IMPORT:auth.types}}';
import type { AuthRepository } from '{{IMPORT:domain.authRepository}}';

/**
 * Use case = one application action. Pure TypeScript: it receives its
 * dependencies (the repository) instead of importing concrete implementations.
 */
export function createLoginUseCase(repository: AuthRepository) {
  return async function loginUseCase(credentials: LoginCredentials): Promise<AuthSession> {
    const email = credentials.email.trim().toLowerCase();
    return repository.login({ ...credentials, email });
  };
}
