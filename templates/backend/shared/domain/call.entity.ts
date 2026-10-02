// ─── Call domain entity ────────────────────────────────────────────────────

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

export type CallEndReason =
  | 'normal'
  | 'declined'
  | 'missed'
  | 'cancelled'
  | 'busy'
  | 'failed'
  | 'timeout';

export type CallParticipantStatus = 'invited' | 'ringing' | 'joined' | 'left' | 'declined' | 'missed';
export type CallParticipantRole = 'host' | 'participant';

export interface CallEntity {
  id: string;
  callerId: string;
  /** For one-to-one calls only. */
  receiverId?: string;
  callType: CallType;
  isGroupCall: boolean;
  /** Agora channel name (unique per call). */
  channelName: string;
  status: CallStatus;
  startedAt?: Date;
  answeredAt?: Date;
  endedAt?: Date;
  /** Duration in seconds, set when the call ends. */
  duration?: number;
  endReason?: CallEndReason;
  createdAt: Date;
  updatedAt: Date;
}

export interface CallParticipantEntity {
  id: string;
  callId: string;
  userId: string;
  joinedAt?: Date;
  leftAt?: Date;
  status: CallParticipantStatus;
  role: CallParticipantRole;
  /** Set when this user deleted the call from their history (the other person keeps theirs). */
  hiddenAt?: Date;
}
