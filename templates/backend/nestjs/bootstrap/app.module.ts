import { Module } from '@nestjs/common';
{{#if AUTH}}
import { APP_GUARD } from '@nestjs/core';
{{else}}
{{#if SEC_RATE_LIMIT}}
import { APP_GUARD } from '@nestjs/core';
{{/if}}
{{/if}}
{{#if SEC_ANY_RATE_LIMIT}}
import { ThrottlerModule{{#if SEC_RATE_LIMIT}}, ThrottlerGuard{{/if}} } from '@nestjs/throttler';
import { config } from '{{IMPORT:config.env}}';
{{/if}}
import { ConfigModule } from '{{IMPORT:nest.configModule}}';
import { DatabaseModule } from '{{IMPORT:nest.databaseModule}}';
{{#if AUTH}}
import { SecurityModule } from '{{IMPORT:nest.securityModule}}';
import { AccessGuard } from '{{IMPORT:nest.accessGuard}}';
import { JwtAuthGuard } from '{{IMPORT:nest.authGuard}}';
{{/if}}
{{#if FEATURE_MODULES}}
{{#if AUTH}}
import { AuthModule } from '{{IMPORT:nest.auth.module}}';
{{/if}}
import { HealthModule } from '{{IMPORT:nest.health.module}}';
import { UsersModule } from '{{IMPORT:nest.users.module}}';
{{else}}
{{#if AUTH}}
import { AuthController } from '{{IMPORT:nest.auth.controller}}';
import { authProviders } from '{{IMPORT:nest.auth.providers}}';
{{/if}}
import { HealthController } from '{{IMPORT:nest.health.controller}}';
import { healthProviders } from '{{IMPORT:nest.health.providers}}';
import { UsersController } from '{{IMPORT:nest.users.controller}}';
import { usersProviders } from '{{IMPORT:nest.users.providers}}';
{{/if}}

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
{{#if AUTH}}
    SecurityModule,
{{/if}}
{{#if SEC_RATE_LIMIT}}
    // Per-IP limit for every route (RATE_LIMIT_*); auth routes are stricter (@AuthRateLimit).
    ThrottlerModule.forRoot([{ name: 'default', ttl: config.rateLimit.windowMs, limit: config.rateLimit.max }]),
{{else}}
{{#if SEC_AUTH_RATE_LIMIT}}
    // Only the auth routes are limited (@AuthRateLimit).
    ThrottlerModule.forRoot([{ name: 'default', ttl: config.authRateLimit.windowMs, limit: config.authRateLimit.max }]),
{{/if}}
{{/if}}
{{#if FEATURE_MODULES}}
    HealthModule,
    UsersModule,
{{#if AUTH}}
    AuthModule,
{{/if}}
{{/if}}
  ],
{{#if !FEATURE_MODULES}}
  controllers: [HealthController, UsersController{{#if AUTH}}, AuthController{{/if}}],
{{/if}}
  providers: [
{{#if !FEATURE_MODULES}}
    ...healthProviders,
    ...usersProviders,
{{#if AUTH}}
    ...authProviders,
{{/if}}
{{/if}}
    // Global guards run in this order.
{{#if SEC_RATE_LIMIT}}
    { provide: APP_GUARD, useClass: ThrottlerGuard },
{{/if}}
{{#if AUTH}}
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: AccessGuard },
{{/if}}
  ],
})
export class AppModule {}
