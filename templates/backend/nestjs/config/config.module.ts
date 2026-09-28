import { Global, Module } from '@nestjs/common';
{{#if AUTH}}
import { config } from '{{IMPORT:config.env}}';
import type { AuthSettings } from '{{IMPORT:app.authTypes}}';
import { AUTH_SETTINGS } from '{{IMPORT:nest.tokens}}';

const authSettings: AuthSettings = {
  appUrl: config.appUrl,
  passwordResetTtl: config.tokens.passwordResetTtl,
  emailVerificationTtl: config.tokens.emailVerificationTtl,
  password: { minLength: config.password.minLength, maxLength: config.password.maxLength },
{{#if SEC_LOCKOUT}}
  lockout: config.lockout,
{{/if}}
};
{{/if}}

/**
 * The validated configuration itself is a plain module (`config/env.ts`) – import `config`
 * wherever it is needed. This module provides the settings objects injected into the
 * application layer.
 */
@Global()
@Module({
{{#if AUTH}}
  providers: [{ provide: AUTH_SETTINGS, useValue: authSettings }],
  exports: [AUTH_SETTINGS],
{{/if}}
})
export class ConfigModule {}
