{{#if REPLICA}}
import { NotFoundError } from '{{IMPORT:core.errors}}';
{{/if}}
import type { Logger } from '{{IMPORT:core.logger}}';
{{#if REPLICA}}
import type { User } from '{{IMPORT:domain.user}}';
{{/if}}
{{#if SVC_NOTIFICATIONS}}
import type { PushMessage } from '{{IMPORT:port.pushSender}}';
{{/if}}
import { EVENT_CHANNELS } from '{{IMPORT:port.eventBus}}';
import type { Infrastructure, Services } from '{{IMPORT:app.container}}';
{{#if REPLICA}}

const DATE_FIELDS = ['emailVerifiedAt', 'phoneVerifiedAt', 'lastLoginAt', 'lastSeenAt', 'lockedUntil', 'createdAt', 'updatedAt'] as const;

/** JSON → User (dates are strings on the wire). */
function reviveUser(raw: Record<string, unknown>): User {
  const user = { ...raw } as Record<string, unknown>;
  for (const field of DATE_FIELDS) if (typeof user[field] === 'string') user[field] = new Date(user[field]);
  return user as unknown as User;
}
{{/if}}

/**
 * What this service listens to on the event bus:
{{#if REPLICA}}
 * - `users`: keeps the local copy of the users in sync with the identity service
{{/if}}
{{#if SVC_CHAT}}
 * - `realtime`: live events of other services, delivered to the connected apps
{{/if}}
{{#if SVC_NOTIFICATIONS}}
 * - `push`: push requests of other services (e.g. chat messages for offline members)
{{/if}}
 */
export async function startEventHandlers(infra: Infrastructure, {{#if SVC_NOTIFICATIONS}}services{{else}}{{#if GROUP_CHAT}}services{{else}}_services{{/if}}{{/if}}: Services, logger: Logger): Promise<void> {
  const { eventBus } = infra;
{{#if REPLICA}}

  await eventBus.subscribe(EVENT_CHANNELS.users, async payload => {
    const event = payload as { type?: string; user?: Record<string, unknown>; id?: string };
    if (event.type === 'user.upserted' && event.user) {
      await infra.repositories.users.saveReplica(reviveUser(event.user));
    } else if (event.type === 'user.deleted' && event.id) {
{{#if GROUP_CHAT}}
      // Their groups get a new admin first.
      await services.chat.leaveAllGroups(event.id);
{{/if}}
      await infra.repositories.users.delete(event.id).catch(error => {
        if (!(error instanceof NotFoundError)) throw error;
      });
    }
  });
{{/if}}
{{#if SVC_CHAT}}

  await eventBus.subscribe(EVENT_CHANNELS.realtime, payload => {
    const event = payload as { to?: string; id?: string; event?: string; payload?: unknown };
    if (!event.id || !event.event) return;
    if (event.to === 'conversation') infra.realtime.toConversation(event.id, event.event, event.payload);
    else infra.realtime.toUser(event.id, event.event, event.payload);
  });
{{/if}}
{{#if SVC_NOTIFICATIONS}}

  await eventBus.subscribe(EVENT_CHANNELS.push, async payload => {
    const event = payload as { userIds?: string[]; message?: PushMessage };
    if (Array.isArray(event.userIds) && event.message) await services.notifications.push(event.userIds, event.message);
  });
{{/if}}
  logger.info('Event handlers ready');
}
