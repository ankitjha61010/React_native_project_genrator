import { io, Socket } from 'socket.io-client';
import { env } from '{{IMPORT:config.env}}';
import { logger } from '{{IMPORT:utils.logger}}';
import { SOCKET_EVENTS, type SocketEventName } from './socketEvents';

export class SocketService {
  private socket: Socket | null = null;
  private isConnecting = false;

  /** Initializes and connects the Socket.io client */
  connect(token?: string): Socket {
    if (this.socket?.connected) {
      return this.socket;
    }

    if (this.socket && !this.socket.connected) {
      this.socket.connect();
      return this.socket;
    }

    const socketUrl = (env as any).API_BASE_URL || 'https://api.example.com';

    this.socket = io(socketUrl, {
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      auth: token ? { token } : undefined,
    });

    this.setupBaseListeners();
    return this.socket;
  }

  private setupBaseListeners(): void {
    if (!this.socket) return;

    this.socket.on(SOCKET_EVENTS.CONNECT, () => {
      logger.info('[SocketService] Connected with ID:', this.socket?.id);
    });

    this.socket.on(SOCKET_EVENTS.CONNECT_ERROR, (err: Error) => {
      logger.error('[SocketService] Connection error:', err.message);
    });

    this.socket.on(SOCKET_EVENTS.DISCONNECT, (reason: string) => {
      logger.info('[SocketService] Disconnected:', reason);
    });
  }

  /** Emit an event safely */
  emit<T = any>(event: SocketEventName | string, data?: T, ack?: (res: any) => void): void {
    if (!this.socket) {
      logger.warn('[SocketService] Attempted to emit without active socket connection:', event);
      return;
    }
    if (ack) {
      this.socket.emit(event, data, ack);
    } else {
      this.socket.emit(event, data);
    }
  }

  /** Subscribe to an incoming socket event */
  on<T = any>(event: SocketEventName | string, callback: (data: T) => void): () => void {
    if (!this.socket) {
      this.connect();
    }
    this.socket?.on(event, callback);

    // Return cleanup function to unsubscribe
    return () => {
      this.socket?.off(event, callback);
    };
  }

  /** Unsubscribe from an event */
  off(event: SocketEventName | string, callback?: (...args: any[]) => void): void {
    if (callback) {
      this.socket?.off(event, callback);
    } else {
      this.socket?.off(event);
    }
  }

  /** Disconnect current socket */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /** Check if currently connected */
  isConnected(): boolean {
    return Boolean(this.socket?.connected);
  }

  /** Get underlying socket instance */
  getRawSocket(): Socket | null {
    return this.socket;
  }
}

export const socketService = new SocketService();
