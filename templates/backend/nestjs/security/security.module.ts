import { Global, Module } from '@nestjs/common';
import { config } from '{{IMPORT:config.env}}';
import { logger } from '{{IMPORT:core.logger}}';
import { LogMailer } from '{{IMPORT:impl.mailer}}';
import { createPasswordHasher } from '{{IMPORT:impl.passwordHasher}}';
import { JwtTokenService } from '{{IMPORT:impl.tokenService}}';
import { MAILER, PASSWORD_HASHER, TOKEN_SERVICE } from '{{IMPORT:nest.tokens}}';

/** Password hashing, JWT and mail – implementations of the application ports. */
@Global()
@Module({
  providers: [
{{#if HASH_ARGON2}}
    { provide: PASSWORD_HASHER, useFactory: () => createPasswordHasher() },
{{else}}
    { provide: PASSWORD_HASHER, useFactory: () => createPasswordHasher(config.password) },
{{/if}}
    { provide: TOKEN_SERVICE, useFactory: () => new JwtTokenService(config.jwt) },
    { provide: MAILER, useFactory: () => new LogMailer(logger, config.isProduction) },
  ],
  exports: [PASSWORD_HASHER, TOKEN_SERVICE, MAILER],
})
export class SecurityModule {}
