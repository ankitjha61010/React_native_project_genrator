import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
{{#if SWAGGER}}
import { ApiTags } from '@nestjs/swagger';
{{/if}}
import { DevicesService } from '{{IMPORT:app.devicesService}}';
import type { User } from '{{IMPORT:domain.user}}';
import { CurrentUser } from '{{IMPORT:nest.decorators}}';
import { Endpoint } from '{{IMPORT:nest.endpoint}}';
import { DeviceDto, RegisterDeviceDto } from '{{IMPORT:nest.devices.dto}}';
import { DEVICES_MESSAGES } from '{{IMPORT:messages.devices}}';

/** `/devices` – the devices (app installs) the user is signed in on, and their FCM tokens. */
{{#if SWAGGER}}
@ApiTags('Devices')
{{/if}}
@Controller('devices')
export class DevicesController {
  constructor(private readonly devices: DevicesService) {}

  @Post()
  @Endpoint({ summary: 'Register / update this device (FCM token, model, versions) – after every sign-in, on app start and on token refresh', message: DEVICES_MESSAGES.registered, status: 200, response: DeviceDto, errors: [401, 422], bearer: true })
  register(@CurrentUser() user: User, @Body() dto: RegisterDeviceDto) {
    return this.devices.register(user.id, dto);
  }

  @Get()
  @Endpoint({ summary: 'Every device you are signed in on', message: DEVICES_MESSAGES.list, response: DeviceDto, array: true, errors: [401], bearer: true })
  list(@CurrentUser() user: User) {
    return this.devices.list(user.id);
  }

  @Delete(':deviceId')
  @Endpoint({ summary: 'Remove a device (call on logout – it gets no more pushes)', message: DEVICES_MESSAGES.removed, errors: [401, 404], bearer: true })
  async remove(@CurrentUser() user: User, @Param('deviceId') deviceId: string) {
    await this.devices.remove(user.id, deviceId);
  }
}
