import { io, type Socket } from 'socket.io-client';
import { env } from '{{IMPORT:config.env}}';
import { StorageKeys } from '{{IMPORT:storage.keys}}';
import { storageService } from '{{IMPORT:storage.service}}';
import { logger } from '{{IMPORT:utils.logger}}';
import { SOCKET_EVENTS, type SocketEventName } from './socketEvents';

/**
 * The app's single Socket.IO connection (same host as the API). It authenticates with the
 * access token on every (re)connect, and emits made before the connection is up are buffered.
 */
export class SocketService {
  private socket: Socket | null = null;

  /** Connects (once). Called when the user is signed in (useSessionServices). */
  connect(): Socket {
    if (this.socket) {
      if (!this.socket.connected) this.socket.connect();
      return this.socket;
    }

    this.socket = io(env.socketUrl, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10_000,
      // Read on every (re)connect, so a refreshed token is used automatically.
      auth: callback => {
        storageService
          .get<string>(StorageKeys.AUTH_TOKEN)
          .then(token => callback({ token }))
          .catch(() => callback({}));
      },
    });

    this.socket.on(SOCKET_EVENTS.CONNECT, () => logger.info('[Socket] connected', this.socket?.id));
    this.socket.on(SOCKET_EVENTS.CONNECT_ERROR, (error: Error) => logger.warn('[Socket] connection error', error.message));
    this.socket.on(SOCKET_EVENTS.DISCONNECT, (reason: string) => logger.info('[Socket] disconnected', reason));
    return this.socket;
  }

  /** Emits an event (buffered until connected). `ack` receives the server's answer. */
  emit<T = unknown>(event: SocketEventName | string, data?: T, ack?: (response: unknown) => void): void {
    const socket = this.connect();
    if (ack) socket.emit(event, data, ack);
    else socket.emit(event, data);
  }

  /** Subscribes to an event; returns the unsubscribe function. */
  on<T = unknown>(event: SocketEventName | string, callback: (data: T) => void): () => void {
    const socket = this.connect();
    socket.on(event, callback);
    return () => {
      socket.off(event, callback);
    };
  }

  /** On sign out. */
  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  isConnected(): boolean {
    return Boolean(this.socket?.connected);
  }
}

export const socketService = new SocketService();
