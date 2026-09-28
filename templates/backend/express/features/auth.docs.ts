import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { BEARER, envelope, errorResponses, json, ok } from '{{IMPORT:ex.docs.helpers}}';
import {
  authTokensSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
{{#if AUTH_REFRESH}}
  refreshTokenSchema,
{{/if}}
  registerSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from '{{IMPORT:ex.auth.schemas}}';
import { publicUserSchema } from '{{IMPORT:ex.users.schemas}}';

const sessionResponse = envelope(z.object({ user: publicUserSchema, tokens: authTokensSchema }), 'AuthSessionResponse');
const userResponse = envelope(publicUserSchema, 'UserResponse');
const emptyResponse = envelope(z.null(), 'EmptyResponse');

export function registerAuthDocs(registry: OpenAPIRegistry): void {
  const tags = ['Auth'];

  registry.registerPath({
    method: 'post',
    path: '/auth/register',
    tags,
    summary: 'Create an account (sends a verification email)',
    request: { body: json(registerSchema) },
    responses: { 201: ok('Registered', sessionResponse), ...errorResponses(409, 422, 429) },
  });
  registry.registerPath({
    method: 'post',
    path: '/auth/login',
    tags,
    summary: 'Log in with email + password',
    request: { body: json(loginSchema) },
    responses: { 200: ok('Logged in', sessionResponse), ...errorResponses(401, 403{{#if SEC_LOCKOUT}}, 423{{/if}}, 422, 429) },
  });
{{#if AUTH_REFRESH}}
  registry.registerPath({
    method: 'post',
    path: '/auth/refresh',
    tags,
{{#if AUTH_ROTATION}}
    summary: 'New token pair for a refresh token (the used refresh token is revoked; reusing it revokes the whole session)',
{{else}}
    summary: 'New access token for a refresh token',
{{/if}}
    request: { body: json(refreshTokenSchema) },
    responses: { 200: ok('Refreshed', sessionResponse), ...errorResponses(401, 422, 429) },
  });
  registry.registerPath({
    method: 'post',
    path: '/auth/logout',
    tags,
    summary: 'End the session of a refresh token',
    request: { body: json(refreshTokenSchema) },
    responses: { 200: ok('Logged out', emptyResponse), ...errorResponses(422) },
  });
  registry.registerPath({
    method: 'post',
    path: '/auth/logout-all',
    tags,
    summary: 'Log out on every device',
    security: BEARER,
    responses: { 200: ok('Logged out everywhere', emptyResponse), ...errorResponses(401) },
  });
{{else}}
  registry.registerPath({
    method: 'post',
    path: '/auth/logout',
    tags,
    summary: 'Log out (invalidates every token of the user)',
    security: BEARER,
    responses: { 200: ok('Logged out', emptyResponse), ...errorResponses(401) },
  });
{{/if}}
  registry.registerPath({
    method: 'get',
    path: '/auth/me',
    tags,
    summary: 'The signed-in user',
    security: BEARER,
    responses: { 200: ok('Current user', userResponse), ...errorResponses(401) },
  });
  registry.registerPath({
    method: 'post',
    path: '/auth/change-password',
    tags,
    summary: 'Change the password (other sessions are signed out)',
    security: BEARER,
    request: { body: json(changePasswordSchema) },
    responses: { 200: ok('Password changed', sessionResponse), ...errorResponses(400, 401, 422, 429) },
  });
  registry.registerPath({
    method: 'post',
    path: '/auth/forgot-password',
    tags,
    summary: 'Send a password reset link (always succeeds)',
    request: { body: json(forgotPasswordSchema) },
    responses: { 200: ok('Reset link sent if the email exists', emptyResponse), ...errorResponses(422, 429) },
  });
  registry.registerPath({
    method: 'post',
    path: '/auth/reset-password',
    tags,
    summary: 'Set a new password with the token from the email',
    request: { body: json(resetPasswordSchema) },
    responses: { 200: ok('Password reset', emptyResponse), ...errorResponses(400, 422, 429) },
  });
  registry.registerPath({
    method: 'post',
    path: '/auth/verify-email',
    tags,
    summary: 'Confirm the email address with the token from the email',
    request: { body: json(verifyEmailSchema) },
    responses: { 200: ok('Email verified', userResponse), ...errorResponses(400, 422, 429) },
  });
  registry.registerPath({
    method: 'post',
    path: '/auth/verify-email/request',
    tags,
    summary: 'Send the verification email again',
    security: BEARER,
    responses: { 200: ok('Verification email sent', emptyResponse), ...errorResponses(401, 409, 429) },
  });
}
