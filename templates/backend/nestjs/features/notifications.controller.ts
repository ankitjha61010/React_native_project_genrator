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
import { BroadcastDto, BroadcastResponseDto, CountDto, NotificationDto } from '{{IMPORT:nest.notifications.dto}}';
import { NOTIFICATIONS_MESSAGES } from '{{IMPORT:messages.notifications}}';

const broadcastView = ({ id, title, body, type, audience, recipientCount, createdAt }: Broadcast) => ({ id, title, body, type, audience, recipientCount, createdAt: createdAt.toISOString() });

/** `/notifications` – the inbox and admin broadcasts (devices: devices.controller.ts). */
{{#if SWAGGER}}
@ApiTags('Notifications')
{{/if}}
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @Endpoint({ summary: 'Your notifications, newest first (meta.unreadCount)', message: NOTIFICATIONS_MESSAGES.list, response: NotificationDto, paginated: true, errors: [401, 422], bearer: true })
  async list(@CurrentUser() user: User, @Query() query: PageQueryDto) {
    const { page, unreadCount } = await this.notifications.list(user.id, query);
    return new WithMeta(page.items, { ...page.meta, unreadCount });
  }

  @Get('unread-count')
  @Endpoint({ summary: 'Number of unread notifications (badge)', message: NOTIFICATIONS_MESSAGES.unreadCount, response: CountDto, errors: [401], bearer: true })
  async unreadCount(@CurrentUser() user: User) {
    return { count: await this.notifications.unreadCount(user.id) };
  }

  @Post('read-all')
  @Endpoint({ summary: 'Mark every notification as read', message: NOTIFICATIONS_MESSAGES.allRead, status: 200, errors: [401], bearer: true })
  async readAll(@CurrentUser() user: User) {
    await this.notifications.markAllRead(user.id);
  }

  @Post('broadcast')
  @RequirePermissions('notifications:broadcast')
  @Endpoint({ summary: 'Send a notification to all users (or one audience) – permission notifications:broadcast', message: NOTIFICATIONS_MESSAGES.broadcastSent, status: 201, response: BroadcastResponseDto, errors: [401, 403, 422], bearer: true })
  async broadcast(@CurrentUser() user: User, @Body() dto: BroadcastDto) {
    return broadcastView(await this.notifications.broadcast(user.id, dto));
  }

  @Get('broadcasts')
  @RequirePermissions('notifications:broadcast')
  @Endpoint({ summary: 'Sent broadcasts – permission notifications:broadcast', message: NOTIFICATIONS_MESSAGES.broadcasts, response: BroadcastResponseDto, paginated: true, errors: [401, 403, 422], bearer: true })
  async broadcasts(@Query() query: PageQueryDto) {
    return (await this.notifications.listBroadcasts(query)).map(broadcastView);
  }

  @Patch(':id/read')
  @Endpoint({ summary: 'Mark one notification as read', message: NOTIFICATIONS_MESSAGES.read, errors: [401, 404], bearer: true })
  async read(@CurrentUser() user: User, @Param('id') id: string) {
    await this.notifications.markRead(user.id, id);
  }

  @Delete(':id')
  @Endpoint({ summary: 'Delete one notification', message: NOTIFICATIONS_MESSAGES.deleted, errors: [401, 404], bearer: true })
  async remove(@CurrentUser() user: User, @Param('id') id: string) {
    await this.notifications.delete(user.id, id);
  }

  @Delete()
  @Endpoint({ summary: 'Delete all your notifications', message: NOTIFICATIONS_MESSAGES.cleared, errors: [401], bearer: true })
  async clear(@CurrentUser() user: User) {
    await this.notifications.clear(user.id);
  }
}
