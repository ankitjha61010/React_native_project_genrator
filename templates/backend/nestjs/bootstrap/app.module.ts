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
import { CoreModule } from '{{IMPORT:nest.coreModule}}';
{{#if AUTH}}
import { AccessGuard } from '{{IMPORT:nest.accessGuard}}';
import { JwtAuthGuard } from '{{IMPORT:nest.authGuard}}';
{{/if}}
{{#if FEATURE_MODULES}}
{{#if AUTH_API}}
import { AuthModule } from '{{IMPORT:nest.auth.module}}';
{{/if}}
{{#if CHAT}}
import { ChatModule } from '{{IMPORT:nest.chat.module}}';
{{/if}}
import { HealthModule } from '{{IMPORT:nest.health.module}}';
{{#if NOTIFICATIONS}}
import { NotificationsModule } from '{{IMPORT:nest.notifications.module}}';
{{/if}}
{{#if USERS_API}}
import { UsersModule } from '{{IMPORT:nest.users.module}}';
{{/if}}
{{else}}
{{#if AUTH_API}}
import { AuthController } from '{{IMPORT:nest.auth.controller}}';
{{/if}}
{{#if CHAT}}
import { ChatController } from '{{IMPORT:nest.chat.controller}}';
{{/if}}
import { HealthController } from '{{IMPORT:nest.health.controller}}';
{{#if NOTIFICATIONS}}
import { NotificationsController } from '{{IMPORT:nest.notifications.controller}}';
{{/if}}
{{#if USERS_API}}
import { UsersController } from '{{IMPORT:nest.users.controller}}';
{{/if}}
{{/if}}

@Module({
  imports: [
    CoreModule,
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
{{#if AUTH_API}}
    AuthModule,
{{/if}}
{{#if USERS_API}}
    UsersModule,
{{/if}}
{{#if CHAT}}
    ChatModule,
{{/if}}
{{#if NOTIFICATIONS}}
    NotificationsModule,
{{/if}}
{{/if}}
  ],
{{#if !FEATURE_MODULES}}
  controllers: [HealthController{{#if AUTH_API}}, AuthController{{/if}}{{#if USERS_API}}, UsersController{{/if}}{{#if CHAT}}, ChatController{{/if}}{{#if NOTIFICATIONS}}, NotificationsController{{/if}}],
{{/if}}
  providers: [
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
