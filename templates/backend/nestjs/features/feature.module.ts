import { Module } from '@nestjs/common';
{{#if MODULE_HEALTH}}
import { HealthController } from '{{IMPORT:nest.health.controller}}';

/** Services come from the global CoreModule – a feature module only declares its controller. */
@Module({ controllers: [HealthController] })
export class HealthModule {}
{{/if}}
{{#if MODULE_AUTH}}
import { AuthController } from '{{IMPORT:nest.auth.controller}}';

/** Services come from the global CoreModule – a feature module only declares its controller. */
@Module({ controllers: [AuthController] })
export class AuthModule {}
{{/if}}
{{#if MODULE_USERS}}
import { UsersController } from '{{IMPORT:nest.users.controller}}';

/** Services come from the global CoreModule – a feature module only declares its controller. */
@Module({ controllers: [UsersController] })
export class UsersModule {}
{{/if}}
{{#if MODULE_CHAT}}
import { ChatController } from '{{IMPORT:nest.chat.controller}}';

/** Services come from the global CoreModule – a feature module only declares its controller. */
@Module({ controllers: [ChatController] })
export class ChatModule {}
{{/if}}
{{#if MODULE_DEVICES}}
import { DevicesController } from '{{IMPORT:nest.devices.controller}}';

/** Services come from the global CoreModule – a feature module only declares its controller. */
@Module({ controllers: [DevicesController] })
export class DevicesModule {}
{{/if}}
{{#if MODULE_NOTIFICATIONS}}
import { NotificationsController } from '{{IMPORT:nest.notifications.controller}}';

/** Services come from the global CoreModule – a feature module only declares its controller. */
@Module({ controllers: [NotificationsController] })
export class NotificationsModule {}
{{/if}}
{{#if MODULE_CALLING}}
import { CallingController } from '{{IMPORT:nest.calling.controller}}';

/** Services come from the global CoreModule – a feature module only declares its controller. */
@Module({ controllers: [CallingController] })
export class CallingModule {}
{{/if}}
{{#if MODULE_OTA}}
import { OTAController } from '{{IMPORT:nest.ota.controller}}';

/** Services come from the global CoreModule – a feature module only declares its controller. */
@Module({ controllers: [OTAController] })
export class OtaModule {}
{{/if}}
{{#if MODULE_LEGAL}}
import { LegalController } from '{{IMPORT:nest.legal.controller}}';

/** Services come from the global CoreModule – a feature module only declares its controller. */
@Module({ controllers: [LegalController] })
export class LegalModule {}
{{/if}}
