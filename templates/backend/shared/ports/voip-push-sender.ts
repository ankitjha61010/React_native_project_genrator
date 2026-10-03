/**
 * An incoming call as the iOS app's PushKit handler reads it (the app's IncomingCallData + the CallKit uuid).
 * VoIP payloads are arbitrary JSON – flat, with real booleans.
 */
export interface VoipCallPayload {
  /** The CallKit call UUID – the same for every delivery of this call (socket, FCM, VoIP). */
  uuid: string;
  callId: string;
  callerId: string;
  callerName: string;
  callerAvatar: string;
  callType: string;
  channelName: string;
  isGroupCall: boolean;
}

/** Sends iOS VoIP (PushKit) pushes through APNs – each one must report an incoming call to CallKit. */
export interface VoipPushSender {
  /**
   * `ttlSeconds`: how long APNs keeps trying (a call is useless once it stops ringing).
   * Returns the tokens APNs reported as no longer valid, so they can be cleared.
   */
  send(tokens: string[], payload: VoipCallPayload, ttlSeconds?: number): Promise<{ invalidTokens: string[] }>;
}
