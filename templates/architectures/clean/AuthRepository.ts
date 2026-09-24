import type { AuthSession, LoginCredentials } from '{{IMPORT:auth.types}}';

/** Domain contract. Implemented in the data layer (AuthRepositoryImpl). */
export interface AuthRepository {
  login(credentials: LoginCredentials): Promise<AuthSession>;
}
