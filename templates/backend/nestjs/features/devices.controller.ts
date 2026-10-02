import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
{{#if SWAGGER}}
import { ApiTags } from '@nestjs/swagger';
{{/if}}
import { DevicesService } from '{{IMPORT:app.devicesService}}';
import type { User } from '{{IMPORT:domain.user}}';
import { CurrentUser } from '{{IMPORT:nest.decorators}}';
import { Endpoint } from '{{IMPORT:nest.endpoint}}';
import { DeviceDto, UpdateFcmTokenDto, UpdateVoipTokenDto } from '{{IMPORT:nest.devices.dto}}';
import { DEVICES_MESSAGES } from '{{IMPORT:messages.devices}}';

/**
 * `/devices` – the devices (app installs) the user is signed in on. There is no "register"
 * route: login / register / OTP / social sign-in / refresh carry the `device`, logout removes it.
 */
{{#if SWAGGER}}
@ApiTags('Devices')
{{/if}}
@Controller('devices')
export class DevicesController {
  constructor(private readonly devices: DevicesService) {}

  @Get()
  @Endpoint({ summary: 'Every device you are signed in on', message: DEVICES_MESSAGES.list, response: DeviceDto, array: true, errors: [401], bearer: true })
  list(@CurrentUser() user: User) {
    return this.devices.list(user.id);
  }

  @Patch(':deviceId')
  @Endpoint({ summary: 'FCM rotated the token of this install', message: DEVICES_MESSAGES.tokenUpdated, response: DeviceDto, errors: [401, 404, 422], bearer: true })
  updateFcmToken(@CurrentUser() user: User, @Param('deviceId') deviceId: string, @Body() dto: UpdateFcmTokenDto) {
    return this.devices.updateFcmToken(user.id, deviceId, dto.fcmToken);
  }

  @Patch(':deviceId/voip-token')
  @Endpoint({ summary: 'Update the iOS VoIP push token for incoming calls', message: DEVICES_MESSAGES.tokenUpdated, response: DeviceDto, errors: [401, 404, 422], bearer: true })
  updateVoipToken(@CurrentUser() user: User, @Param('deviceId') deviceId: string, @Body() dto: UpdateVoipTokenDto) {
    return this.devices.updateVoipToken(user.id, deviceId, dto.voipToken);
  }
}
