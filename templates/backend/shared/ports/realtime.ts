/**
 * Live events to connected apps (Socket.IO). Services use this interface; the socket
 * server implements it. Event names match the app's socketEvents.ts.
 */
export interface Realtime {
  toUser(userId: string, event: string, payload: unknown): void;
  toConversation(conversationId: string, event: string, payload: unknown): void;
  isOnline(userId: string): boolean;
}
