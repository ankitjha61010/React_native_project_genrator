export interface PushMessage {
  title: string;
  body: string;
  /** Delivered to the app as `remoteMessage.data` – string values only. */
  data: Record<string, string>;
}

/** Sends push notifications to app installs (FCM registration tokens). */
export interface PushSender {
  /** Returns the tokens that are no longer valid (the app was uninstalled…), so they can be removed. */
  send(tokens: string[], message: PushMessage): Promise<{ invalidTokens: string[] }>;
}
