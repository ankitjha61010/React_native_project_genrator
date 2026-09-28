import { EVENT_CHANNELS, type EventBus } from '{{IMPORT:port.eventBus}}';
import type { Realtime } from '{{IMPORT:port.realtime}}';

/** The `Realtime` port of a service without sockets: live events go to the chat service, which holds them. */
export class EventRealtime implements Realtime {
  constructor(private readonly eventBus: EventBus) {}

  toUser(userId: string, event: string, payload: unknown): void {
    void this.eventBus.publish(EVENT_CHANNELS.realtime, { to: 'user', id: userId, event, payload });
  }

  toConversation(conversationId: string, event: string, payload: unknown): void {
    void this.eventBus.publish(EVENT_CHANNELS.realtime, { to: 'conversation', id: conversationId, event, payload });
  }

  /** Unknown here (the sockets live in the chat service). */
  isOnline(): boolean {
    return false;
  }
}
