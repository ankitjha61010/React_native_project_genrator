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

/** How users sign in (only used when `auth` isn't `none`; at least one is on). */
export interface BackendAuthMethods {
  /** Email + password: register, login, forgot / reset password, email verification. */
  email: boolean;
  /** Mobile number + one-time SMS code (users are created on first login). */
  mobileOtp: boolean;
  google: boolean;
  facebook: boolean;
  apple: boolean;
}

/** Optional feature modules (need authentication). */
export interface BackendModules {
  /** Conversations, messages, media upload, Socket.IO (typing, presence, read receipts). */
  chat: boolean;
  /** Push devices (FCM), notification inbox, admin broadcasts. */
  notifications: boolean;
}

/**
 * One service of the microservices deployment (undefined = the monolith).
 * - identity: auth + users; publishes user changes.
 * - chat / notifications: their feature + a local replica of the users (kept in sync by events).
 */
export type ServiceRole = 'identity' | 'chat' | 'notifications';

export type BackendDeployment = 'monolith' | 'microservices';

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
  authMethods: BackendAuthMethods;
  hashing: PasswordHashing;
  modules: BackendModules;
  /** AES request / response encryption, compatible with the generated app's apiEncryption. */
  apiEncryption: boolean;
  /** iOS bundle id / Android application id of the app (audience of Apple sign-in tokens). */
  appPackage: string;
  /** Full-stack: the AES key / IV written to both .env files (generated when missing). */
  encryptionSecrets?: { key: string; iv: string };
  /** Monolith (one API) or gateway + services. */
  deployment?: BackendDeployment;
  /** Set by the microservices generator for each service. */
  service?: ServiceRole;
  /** Microservices: the notifications service exists (chat pushes through it). */
  remotePush?: boolean;
  /** Microservices: HTTP port of this service. */
  port?: number;
  /** Microservices: JWT secret shared by all services (generated once). */
  sharedJwtSecret?: string;
  /** Microservices: the system's name – JWT issuer / audience, the same in every service. */
  sharedName?: string;
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

export const DEFAULT_AUTH_METHODS: BackendAuthMethods = { email: true, mobileOtp: false, google: false, facebook: false, apple: false };

export const DEFAULT_MODULES: BackendModules = { chat: false, notifications: false };
