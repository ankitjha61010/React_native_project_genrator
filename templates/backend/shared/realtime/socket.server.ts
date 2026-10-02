import type { Server as HttpServer } from 'node:http';
{{#if REDIS}}
import { createAdapter } from '@socket.io/redis-adapter';
{{/if}}
import { Server, type Socket } from 'socket.io';
{{#if SEC_CORS}}
import { config } from '{{IMPORT:config.env}}';
{{/if}}
import type { Logger } from '{{IMPORT:core.logger}}';
import type { User } from '{{IMPORT:domain.user}}';
import type { UsersRepository } from '{{IMPORT:contract.users}}';
import type { Realtime } from '{{IMPORT:port.realtime}}';
{{#if REDIS}}
import { newRedisConnection, redis } from '{{IMPORT:db.redis}}';
{{/if}}

/**
 * Socket.IO events – the same names as the app's socketEvents.ts.
 * Every socket joins `user:<id>`; chat screens join `conversation:<id>` for typing.
 */
export const SOCKET_EVENTS = {
  joinRoom: 'chat:join_room',
  leaveRoom: 'chat:leave_room',
  typing: 'presence:typing',
  stopTyping: 'presence:stop_typing',
  userOnline: 'presence:user_online',
  userOffline: 'presence:user_offline',
{{#if CHAT}}
  markRead: 'chat:message_read',
{{/if}}
{{#if HAS_CALLING}}
  // Calling events (real-time call signaling)
  callIncoming: 'call:incoming',
  callRinging: 'call:ringing',
  callAccepted: 'call:accepted',
  callRejected: 'call:rejected',
  callBusy: 'call:busy',
  callCancelled: 'call:cancelled',
  callConnected: 'call:connected',
  callEnded: 'call:ended',
  callMissed: 'call:missed',
  callParticipantJoined: 'call:participant-joined',
  callParticipantLeft: 'call:participant-left',
  callMute: 'call:mute',
{{#if VIDEO_CALL}}
  callCamera: 'call:camera',
{{/if}}
  callReconnecting: 'call:reconnecting',
  callFailed: 'call:failed',
{{/if}}
} as const;

const userRoom = (userId: string) => `user:${userId}`;
const conversationRoom = (conversationId: string) => `conversation:${conversationId}`;

/** What the socket layer needs from the application. */
export interface SocketDependencies {
  authenticate(accessToken: string): Promise<User>;
  users: UsersRepository;
{{#if CHAT}}
  isMember(userId: string, conversationId: string): Promise<boolean>;
  markRead(userId: string, conversationId: string): Promise<void>;
{{/if}}
  logger: Logger;
}

/**
 * The `Realtime` port. Services get it at startup; it starts delivering once the Socket.IO
 * server is attached (attachSocketServer). {{#if REDIS}}Events reach every server instance (Redis adapter);
 * presence (`isOnline`) is tracked per process.{{else}}Presence is tracked per process – use the
 * Socket.IO Redis adapter + a shared store when running several instances.{{/if}}
 */
export class SocketHub implements Realtime {
  private io: Server | undefined;
  /** userId → number of connected sockets (phone + tablet…). */
  private readonly online = new Map<string, number>();

  attach(io: Server): void {
    this.io = io;
  }

  /** Disconnects every socket (and closes the HTTP server it is attached to). */
  async close(): Promise<void> {
    await this.io?.close();
    this.io = undefined;
  }

  toUser(userId: string, event: string, payload: unknown): void {
    this.io?.to(userRoom(userId)).emit(event, payload);
  }

  toConversation(conversationId: string, event: string, payload: unknown): void {
    this.io?.to(conversationRoom(conversationId)).emit(event, payload);
  }

  isOnline(userId: string): boolean {
    return (this.online.get(userId) ?? 0) > 0;
  }

  /** Returns true when this was the user's first connection. */
  connected(userId: string): boolean {
    const count = (this.online.get(userId) ?? 0) + 1;
    this.online.set(userId, count);
    return count === 1;
  }

  /** Returns true when the user has no connection left. */
  disconnected(userId: string): boolean {
    const count = (this.online.get(userId) ?? 1) - 1;
    if (count > 0) this.online.set(userId, count);
    else this.online.delete(userId);
    return count <= 0;
  }
}

{{#if CHAT}}
type Ack = (response: { ok: boolean; error?: string }) => void;

/** `{ roomId }` sent by the app → the conversation id. */
function roomId(payload: unknown): string | null {
  const value = payload && typeof payload === 'object' ? (payload as { roomId?: unknown }).roomId : undefined;
  return typeof value === 'string' ? value : null;
}
{{/if}}

/**
 * Socket.IO on the same port as the API. The app connects with `auth: { token: <access token> }`
 * (sockets without a valid token are rejected).
 */
export function attachSocketServer(httpServer: HttpServer, hub: SocketHub, deps: SocketDependencies): Server {
  const io = new Server(httpServer, {
{{#if SEC_CORS}}
    cors: { origin: config.http.corsOrigins.length ? config.http.corsOrigins : false },
{{/if}}
    // Only the websocket transport – the app uses `transports: ['websocket']`.
    transports: ['websocket'],
    pingInterval: 25_000,
    pingTimeout: 20_000,
    maxHttpBufferSize: 100_000,
  });
{{#if REDIS}}
  // With Redis, an event emitted on one server instance reaches sockets connected to any other.
  if (redis) io.adapter(createAdapter(newRedisConnection(), newRedisConnection()));
{{/if}}

  io.use(async (socket, next) => {
    const auth = socket.handshake.auth as { token?: unknown } | undefined;
    const header = socket.handshake.headers.authorization;
    const token = typeof auth?.token === 'string' ? auth.token : header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    if (!token) return next(new Error('UNAUTHORIZED'));
    try {
      socket.data.user = await deps.authenticate(token);
      next();
    } catch {
      next(new Error('UNAUTHORIZED'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = socket.data.user as User;
    void socket.join(userRoom(user.id));
    if (hub.connected(user.id)) io.emit(SOCKET_EVENTS.userOnline, { userId: user.id });

{{#if CHAT}}
    socket.on(SOCKET_EVENTS.joinRoom, async (payload: unknown, ack?: Ack) => {
      const id = roomId(payload);
      if (!id || !(await deps.isMember(user.id, id).catch(() => false))) return ack?.({ ok: false, error: 'NOT_A_MEMBER' });
      await socket.join(conversationRoom(id));
      ack?.({ ok: true });
    });

    socket.on(SOCKET_EVENTS.leaveRoom, (payload: unknown) => {
      const id = roomId(payload);
      if (id) void socket.leave(conversationRoom(id));
    });

    // Typing indicators go to everyone else in the room.
    for (const event of [SOCKET_EVENTS.typing, SOCKET_EVENTS.stopTyping]) {
      socket.on(event, (payload: unknown) => {
        const id = roomId(payload);
        if (id && socket.rooms.has(conversationRoom(id))) socket.to(conversationRoom(id)).emit(event, { roomId: id, userId: user.id, name: user.name });
      });
    }

    socket.on(SOCKET_EVENTS.markRead, (payload: unknown) => {
      const id = roomId(payload);
      if (id) deps.markRead(user.id, id).catch(error => deps.logger.debug({ err: error }, 'Socket mark read failed'));
    });
{{/if}}

    socket.on('disconnect', () => {
      if (!hub.disconnected(user.id)) return;
      io.emit(SOCKET_EVENTS.userOffline, { userId: user.id, lastSeen: new Date().toISOString() });
      deps.users.update(user.id, { lastSeenAt: new Date() }).catch(error => deps.logger.debug({ err: error }, 'lastSeenAt not saved'));
    });
  });

{{#if HAS_CALLING}}
  // Calling: the CallingService should call hub.toUser() to signal call events.
  // Example usage in CallingService:
  //   hub.toUser(receiverId, SOCKET_EVENTS.callIncoming, { callId, callerId, callType, callerName });
  //   hub.toUser(callerId, SOCKET_EVENTS.callAccepted, { callId });
  //   hub.toUser(callerId, SOCKET_EVENTS.callRejected, { callId });
  //   hub.toUser(userId, SOCKET_EVENTS.callEnded, { callId, endReason });
{{/if}}

  hub.attach(io);
  deps.logger.info('Socket.IO ready');
  return io;
}
