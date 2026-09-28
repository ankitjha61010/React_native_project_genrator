/** What the CLI generates. */
export type ProjectType = 'frontend' | 'backend' | 'fullstack';

export type BackendFramework = 'nestjs' | 'express';

export type BackendArchitectureId = 'feature-based' | 'layered' | 'clean' | 'mvc' | 'modular' | 'enterprise';

export type BackendDatabase = 'postgresql' | 'mysql' | 'mongodb';

export type BackendOrm = 'prisma' | 'typeorm' | 'mongoose';

/**
 * - jwt: one access token, revoked by bumping the user's token version.
 * - access-refresh: short access token + long-lived refresh token stored (hashed) in the DB.
 * - refresh-rotation: like access-refresh, but every refresh issues a new refresh token and
 *   reusing an old one revokes the whole token family.
 */
export type BackendAuth = 'none' | 'jwt' | 'access-refresh' | 'refresh-rotation';

/** `configurable`: both algorithms are installed and PASSWORD_HASH_ALGORITHM picks one. */
export type PasswordHashing = 'bcrypt' | 'argon2' | 'configurable' | 'none';

export interface BackendSecurity {
  helmet: boolean;
  cors: boolean;
  /** Global rate limit for every route. */
  rateLimit: boolean;
  /** Stricter rate limit for login / register / password reset. */
  authRateLimit: boolean;
  /** Max JSON / form body size. */
  bodyLimit: boolean;
  /** Strips `$…` / dotted keys (NoSQL / prototype injection) and trims strings. */
  sanitize: boolean;
  /** Locks an account for a while after too many failed logins. */
  accountLockout: boolean;
}

export interface BackendOptions {
  appName: string;
  displayName: string;
  /** Directory the backend project is written to (absolute). */
  projectDir: string;
  framework: BackendFramework;
  architecture: BackendArchitectureId;
  database: BackendDatabase;
  orm: BackendOrm;
  auth: BackendAuth;
  hashing: PasswordHashing;
  swagger: boolean;
  security: BackendSecurity;
  installDependencies: boolean;
  initGit: boolean;
}

export const DEFAULT_SECURITY: BackendSecurity = {
  helmet: true,
  cors: true,
  rateLimit: true,
  authRateLimit: true,
  bodyLimit: true,
  sanitize: true,
  accountLockout: true,
};
