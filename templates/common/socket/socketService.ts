import { io, type Socket } from 'socket.io-client';
import { env } from '{{IMPORT:config.env}}';
import { StorageKeys } from '{{IMPORT:storage.keys}}';
import { storageService } from '{{IMPORT:storage.service}}';
import { logger } from '{{IMPORT:utils.logger}}';
import { SOCKET_EVENTS, type SocketEventName } from './socketEvents';

/**
 * The app's single Socket.IO connection (same host as the API). It authenticates with the
 * access token on every (re)connect, and emits made before the connection is up are buffered.
 *
 * The socket object lives for the whole signed-in session, so listeners added with `on()`
 * survive network drops, reconnects and app background / foreground (`pause` / `resume`).
 * Being connected is what makes the user "online" for the others (the server tracks it).
 */
export class SocketService {
  private socket: Socket | null = null;

  /** Connects (or reconnects). Called when the user is signed in (useSessionServices). */
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

  /** App went to the background: disconnect (the others see "offline" + last seen). Listeners stay. */
  pause(): void {
    this.socket?.disconnect();
  }

  /** App is back in the foreground: connect again (the others see "online"). */
  resume(): void {
    if (this.socket && !this.socket.connected) this.socket.connect();
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

  /**
   * Runs `callback` after every (re)connect – e.g. reload online status and messages missed
   * while offline or in the background. Returns the unsubscribe function.
   */
  onReconnect(callback: () => void): () => void {
    return this.on(SOCKET_EVENTS.CONNECT, callback);
  }

  /** On sign out: closes the connection and forgets every listener. */
  disconnect(): void {
    this.socket?.removeAllListeners();
    this.socket?.disconnect();
    this.socket = null;
  }

  isConnected(): boolean {
    return Boolean(this.socket?.connected);
  }
}

export const socketService = new SocketService();
