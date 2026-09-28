import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
{{#if SWAGGER}}
import { ApiTags } from '@nestjs/swagger';
{{/if}}
import { NotificationsService } from '{{IMPORT:app.notificationsService}}';
import type { Broadcast } from '{{IMPORT:domain.notification}}';
import type { User } from '{{IMPORT:domain.user}}';
import { PageQueryDto } from '{{IMPORT:nest.commonDto}}';
import { CurrentUser, RequirePermissions } from '{{IMPORT:nest.decorators}}';
import { Endpoint } from '{{IMPORT:nest.endpoint}}';
import { WithMeta } from '{{IMPORT:nest.interceptor}}';
import { BroadcastDto, BroadcastResponseDto, CountDto, NotificationDto, RegisterDeviceDto } from '{{IMPORT:nest.notifications.dto}}';

const broadcastView = ({ id, title, body, type, audience, recipientCount, createdAt }: Broadcast) => ({ id, title, body, type, audience, recipientCount, createdAt: createdAt.toISOString() });

/** `/notifications` – push devices, the inbox, and admin broadcasts. */
{{#if SWAGGER}}
@ApiTags('Notifications')
{{/if}}
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Post('devices')
  @Endpoint({ summary: 'Register this device for push (FCM token) – call after login and on token refresh', message: 'Device registered', status: 200, errors: [401, 422], bearer: true })
  async registerDevice(@CurrentUser() user: User, @Body() dto: RegisterDeviceDto) {
    await this.notifications.registerDevice(user.id, dto.token, dto.platform);
  }

  @Delete('devices/:token')
  @Endpoint({ summary: 'Stop push for this device (call on logout)', message: 'Device removed', errors: [401], bearer: true })
  async removeDevice(@CurrentUser() user: User, @Param('token') token: string) {
    await this.notifications.unregisterDevice(user.id, token);
  }

  @Get()
  @Endpoint({ summary: 'Your notifications, newest first (meta.unreadCount)', message: 'Notifications', response: NotificationDto, paginated: true, errors: [401, 422], bearer: true })
  async list(@CurrentUser() user: User, @Query() query: PageQueryDto) {
    const { page, unreadCount } = await this.notifications.list(user.id, query);
    return new WithMeta(page.items, { ...page.meta, unreadCount });
  }

  @Get('unread-count')
  @Endpoint({ summary: 'Number of unread notifications (badge)', message: 'Unread count', response: CountDto, errors: [401], bearer: true })
  async unreadCount(@CurrentUser() user: User) {
    return { count: await this.notifications.unreadCount(user.id) };
  }

  @Post('read-all')
  @Endpoint({ summary: 'Mark every notification as read', message: 'All marked as read', status: 200, errors: [401], bearer: true })
  async readAll(@CurrentUser() user: User) {
    await this.notifications.markAllRead(user.id);
  }

  @Post('broadcast')
  @RequirePermissions('notifications:broadcast')
  @Endpoint({ summary: 'Send a notification to all users (or one audience) – permission notifications:broadcast', message: 'Broadcast sent', status: 201, response: BroadcastResponseDto, errors: [401, 403, 422], bearer: true })
  async broadcast(@CurrentUser() user: User, @Body() dto: BroadcastDto) {
    return broadcastView(await this.notifications.broadcast(user.id, dto));
  }

  @Get('broadcasts')
  @RequirePermissions('notifications:broadcast')
  @Endpoint({ summary: 'Sent broadcasts – permission notifications:broadcast', message: 'Broadcasts', response: BroadcastResponseDto, paginated: true, errors: [401, 403, 422], bearer: true })
  async broadcasts(@Query() query: PageQueryDto) {
    return (await this.notifications.listBroadcasts(query)).map(broadcastView);
  }

  @Patch(':id/read')
  @Endpoint({ summary: 'Mark one notification as read', message: 'Marked as read', errors: [401, 404], bearer: true })
  async read(@CurrentUser() user: User, @Param('id') id: string) {
    await this.notifications.markRead(user.id, id);
  }

  @Delete(':id')
  @Endpoint({ summary: 'Delete one notification', message: 'Notification deleted', errors: [401, 404], bearer: true })
  async remove(@CurrentUser() user: User, @Param('id') id: string) {
    await this.notifications.delete(user.id, id);
  }

  @Delete()
  @Endpoint({ summary: 'Delete all your notifications', message: 'Notifications cleared', errors: [401], bearer: true })
  async clear(@CurrentUser() user: User) {
    await this.notifications.clear(user.id);
  }
}
