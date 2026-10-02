import type { CallEntity, CallParticipantEntity, CallStatus, CallEndReason } from '{{IMPORT:domain.call}}';

export interface CreateCallInput {
  callerId: string;
  receiverId?: string;
  callType: CallEntity['callType'];
  isGroupCall: boolean;
  channelName: string;
}

export interface UpdateCallStatusInput {
  callId: string;
  status: CallStatus;
  endReason?: CallEndReason;
  answeredAt?: Date;
  endedAt?: Date;
  duration?: number;
}

export interface ICallingRepository {
  createCall(input: CreateCallInput): Promise<CallEntity>;
  findCallById(callId: string): Promise<CallEntity | null>;
  findActiveCallByUserId(userId: string): Promise<CallEntity | null>;
  updateCallStatus(input: UpdateCallStatusInput): Promise<CallEntity>;
  getUserCallHistory(userId: string, limit: number, offset: number): Promise<CallEntity[]>;
  countUserCalls(userId: string): Promise<number>;

  // Participants
  addParticipant(callId: string, userId: string, role?: CallParticipantEntity['role']): Promise<CallParticipantEntity>;
  updateParticipantStatus(callId: string, userId: string, status: CallParticipantEntity['status'], leftAt?: Date): Promise<void>;
  getCallParticipants(callId: string): Promise<CallParticipantEntity[]>;
  findParticipant(callId: string, userId: string): Promise<CallParticipantEntity | null>;

  // History (per user: hiding a call leaves it in the other person's history)
  hideCallForUser(callId: string, userId: string): Promise<void>;
  hideAllCallsForUser(userId: string): Promise<void>;
}
