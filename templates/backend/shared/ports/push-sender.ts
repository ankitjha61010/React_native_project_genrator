export interface PushMessage {
  title: string;
  body: string;
  /** Delivered to the app as `remoteMessage.data` – string values only. */
  data: Record<string, string>;
  /**
   * Android gets `data` only (no system notification), so the app's own FirebaseMessagingService runs even when
   * the app is killed – incoming calls use it to show the native call screen. iOS still shows `title`/`body`
   * (an empty title sends a silent push).
   */
  dataOnly?: boolean;
  /** How long FCM keeps trying to deliver, in seconds (an incoming call is useless once it stops ringing). */
  ttlSeconds?: number;
}

/** Sends push notifications to app installs (FCM registration tokens). */
export interface PushSender {
  /** Returns the tokens that are no longer valid (the app was uninstalled…), so they can be removed. */
  send(tokens: string[], message: PushMessage): Promise<{ invalidTokens: string[] }>;
}
