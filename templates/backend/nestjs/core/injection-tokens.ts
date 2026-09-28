/** DI tokens for everything that is an interface (interfaces don't exist at runtime). */
export const DATABASE = Symbol('DATABASE');
export const HEALTH_CHECKS = Symbol('HEALTH_CHECKS');
export const USERS_REPOSITORY = Symbol('USERS_REPOSITORY');
{{#if AUTH}}
{{#if AUTH_REFRESH}}
export const REFRESH_TOKENS_REPOSITORY = Symbol('REFRESH_TOKENS_REPOSITORY');
{{/if}}
export const USER_TOKENS_REPOSITORY = Symbol('USER_TOKENS_REPOSITORY');
export const PASSWORD_HASHER = Symbol('PASSWORD_HASHER');
export const TOKEN_SERVICE = Symbol('TOKEN_SERVICE');
export const MAILER = Symbol('MAILER');
export const AUTH_SETTINGS = Symbol('AUTH_SETTINGS');
{{/if}}
{{#if STYLE_USECASE}}
/** Use-cases are grouped per feature and injected as one object. */
{{#if AUTH}}
export const AUTH_USE_CASES = Symbol('AUTH_USE_CASES');
{{/if}}
export const USERS_USE_CASES = Symbol('USERS_USE_CASES');
export const HEALTH_USE_CASES = Symbol('HEALTH_USE_CASES');
{{/if}}
