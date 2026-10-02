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
{{#if REDIS}}
{{#if SEC_ANY_RATE_LIMIT}}
import { redis } from '{{IMPORT:db.redis}}';
import { RedisThrottlerStorage } from '{{IMPORT:nest.throttlerStorage}}';
{{/if}}
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
{{#if DEVICES}}
import { DevicesModule } from '{{IMPORT:nest.devices.module}}';
{{/if}}
import { HealthModule } from '{{IMPORT:nest.health.module}}';
{{#if LEGAL}}
import { LegalModule } from '{{IMPORT:nest.legal.module}}';
{{/if}}
{{#if OTA}}
import { OtaModule } from '{{IMPORT:nest.ota.module}}';
{{/if}}
{{#if PAYMENTS}}
import { PaymentsModule } from '{{IMPORT:nest.payments.module}}';
{{/if}}
{{#if CALLING}}
import { CallingModule } from '{{IMPORT:nest.calling.module}}';
{{/if}}
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
{{#if DEVICES}}
import { DevicesController } from '{{IMPORT:nest.devices.controller}}';
{{/if}}
import { HealthController } from '{{IMPORT:nest.health.controller}}';
{{#if LEGAL}}
import { LegalController } from '{{IMPORT:nest.legal.controller}}';
{{/if}}
{{#if OTA}}
import { OTAController } from '{{IMPORT:nest.ota.controller}}';
{{/if}}
{{#if PAYMENTS}}
import { PaymentsController } from '{{IMPORT:nest.payments.controller}}';
{{/if}}
{{#if CALLING}}
import { CallingController } from '{{IMPORT:nest.calling.controller}}';
{{/if}}
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
{{#if REDIS}}
    ThrottlerModule.forRoot({
      throttlers: [{ name: 'default', ttl: config.rateLimit.windowMs, limit: config.rateLimit.max }],
      // Counters in Redis, shared by every instance (in memory when REDIS_URL is empty, e.g. tests).
      storage: redis ? new RedisThrottlerStorage(redis) : undefined,
    }),
{{else}}
    ThrottlerModule.forRoot([{ name: 'default', ttl: config.rateLimit.windowMs, limit: config.rateLimit.max }]),
{{/if}}
{{else}}
{{#if SEC_AUTH_RATE_LIMIT}}
    // Only the auth routes are limited (@AuthRateLimit).
{{#if REDIS}}
    ThrottlerModule.forRoot({
      throttlers: [{ name: 'default', ttl: config.authRateLimit.windowMs, limit: config.authRateLimit.max }],
      // Counters in Redis, shared by every instance (in memory when REDIS_URL is empty, e.g. tests).
      storage: redis ? new RedisThrottlerStorage(redis) : undefined,
    }),
{{else}}
    ThrottlerModule.forRoot([{ name: 'default', ttl: config.authRateLimit.windowMs, limit: config.authRateLimit.max }]),
{{/if}}
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
{{#if DEVICES}}
    DevicesModule,
{{/if}}
{{#if NOTIFICATIONS}}
    NotificationsModule,
{{/if}}
{{#if LEGAL}}
    LegalModule,
{{/if}}
{{#if OTA}}
    OtaModule,
{{/if}}
{{#if PAYMENTS}}
    PaymentsModule,
{{/if}}
{{#if CALLING}}
    CallingModule,
{{/if}}
{{/if}}
  ],
{{#if !FEATURE_MODULES}}
  controllers: [HealthController{{#if AUTH_API}}, AuthController{{/if}}{{#if USERS_API}}, UsersController{{/if}}{{#if CHAT}}, ChatController{{/if}}{{#if DEVICES}}, DevicesController{{/if}}{{#if NOTIFICATIONS}}, NotificationsController{{/if}}{{#if LEGAL}}, LegalController{{/if}}{{#if OTA}}, OTAController{{/if}}{{#if PAYMENTS}}, PaymentsController{{/if}}{{#if CALLING}}, CallingController{{/if}}],
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
