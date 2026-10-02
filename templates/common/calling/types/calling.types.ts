// ─── Calling Types ─────────────────────────────────────────────────────────

export type CallType = 'audio' | 'video';

export type CallStatus =
  | 'initiating'
  | 'ringing'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'busy'
  | 'declined'
  | 'missed'
  | 'cancelled'
  | 'ended'
  | 'failed';

export type CallEndReason = 'normal' | 'declined' | 'missed' | 'cancelled' | 'busy' | 'failed' | 'timeout';

/** Who took part in a call (call history). */
export interface CallUser {
  id: string;
  name: string;
  avatar: string | null;
}

export interface Call {
  id: string;
  callerId: string;
  receiverId?: string;
  callType: CallType;
  isGroupCall: boolean;
  channelName: string;
  status: CallStatus;
  startedAt?: string;
  answeredAt?: string;
  endedAt?: string;
  duration?: number;
  endReason?: CallEndReason;
  createdAt: string;
  updatedAt: string;
  /** Call history only – null when the account no longer exists. */
  caller?: CallUser | null;
  receiver?: CallUser | null;
}

export interface CallParticipant {
  id: string;
  callId: string;
  userId: string;
  joinedAt?: string;
  leftAt?: string;
  status: 'invited' | 'ringing' | 'joined' | 'left' | 'declined' | 'missed';
  role: 'host' | 'participant';
}

export interface AgoraTokenResult {
  token: string;
  appId: string;
  channelName: string;
  uid: number;
  expiresIn: number;
}

// ─── Agora & calling context ──────────────────────────────────────────────

export interface IncomingCallData {
  callId: string;
  callerId: string;
  callerName: string;
  callerAvatar?: string;
  callType: CallType;
  channelName: string;
  isGroupCall: boolean;
}

export interface ActiveCallState {
  call: Call | null;
  agoraToken: AgoraTokenResult | null;
  /** Whether the local user's microphone is muted. */
  isMuted: boolean;
  /** Whether the local user's camera is off (video calls). */
  isCameraOff: boolean;
  /** Whether the call is in speaker mode (audio). */
  isSpeaker: boolean;
  remoteUids: number[];
  status: CallStatus;
  connectedAt?: number | null;
}

// ─── Socket events ─────────────────────────────────────────────────────────

export interface CallIncomingEvent {
  callId: string;
  callerId: string;
  callerName: string;
  callerAvatar?: string;
  callType: CallType;
  channelName: string;
  isGroupCall: boolean;
}

export interface CallEndedEvent {
  callId: string;
  endReason: CallEndReason;
}

export interface CallParticipantEvent {
  callId: string;
  userId: string;
  uid: number;
}
