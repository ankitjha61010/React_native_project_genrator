import { Redis } from 'ioredis';
import type { Logger } from '{{IMPORT:core.logger}}';
import type { EventBus, EventChannel } from '{{IMPORT:port.eventBus}}';

/**
 * Redis pub/sub: one connection publishes, one listens. Fire-and-forget – for events that
 * must never be lost, move to Redis Streams / a queue (BullMQ, RabbitMQ…).
 */
export class RedisEventBus implements EventBus {
  private readonly publisher: Redis;
  private readonly subscriber: Redis;
  private readonly handlers = new Map<string, Array<(payload: unknown) => Promise<void> | void>>();

  constructor(
    url: string,
    private readonly logger: Logger,
  ) {
    this.publisher = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: 3 });
    this.subscriber = new Redis(url, { lazyConnect: true });
    this.subscriber.on('message', (channel: string, raw: string) => {
      let payload: unknown;
      try {
        payload = JSON.parse(raw);
      } catch {
        return this.logger.warn({ channel }, 'Ignored an event that is not JSON');
      }
      for (const handler of this.handlers.get(channel) ?? []) {
        Promise.resolve(handler(payload)).catch(error => this.logger.error({ err: error, channel }, 'Event handler failed'));
      }
    });
    for (const connection of [this.publisher, this.subscriber]) connection.on('error', error => this.logger.warn({ err: error }, 'Redis error'));
  }

  readonly healthCheck = {
    name: 'events',
    check: async () => {
      await this.connect(this.publisher);
      await this.publisher.ping();
    },
  };

  async publish(channel: EventChannel, payload: unknown): Promise<void> {
    await this.connect(this.publisher);
    await this.publisher.publish(channel, JSON.stringify(payload));
  }

  async subscribe(channel: EventChannel, handler: (payload: unknown) => Promise<void> | void): Promise<void> {
    await this.connect(this.subscriber);
    const handlers = this.handlers.get(channel) ?? [];
    if (!handlers.length) await this.subscriber.subscribe(channel);
    this.handlers.set(channel, [...handlers, handler]);
  }

  async close(): Promise<void> {
    await Promise.allSettled([this.publisher.quit(), this.subscriber.quit()]);
  }

  private async connect(connection: Redis): Promise<void> {
    if (connection.status === 'wait') await connection.connect();
  }
}

export function createEventBus(url: string, logger: Logger): EventBus {
  return new RedisEventBus(url, logger);
}
