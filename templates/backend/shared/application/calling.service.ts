// ─── Calling Service ─────────────────────────────────────────────────────────
// Handles Agora token generation, call lifecycle management, busy detection,
// call history, and timeout enforcement.
// Agora App Certificate is NEVER sent to mobile clients.
// ─────────────────────────────────────────────────────────────────────────────

import { createHash, randomUUID } from 'node:crypto';
import agoraAccessTokenPkg from 'agora-access-token';
const { RtcTokenBuilder, RtcRole } = (agoraAccessTokenPkg as any).default ?? agoraAccessTokenPkg;
import { AppError, BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '{{IMPORT:core.errors}}';
import type { Logger } from '{{IMPORT:core.logger}}';
import type { ICallingRepository } from '{{IMPORT:contract.calling}}';
import type { UsersRepository } from '{{IMPORT:contract.users}}';
import type {
  CallEndReason,
  CallEntity,
  CallParticipantEntity,
  CallParticipantStatus,
  CallStatus,
  CallType,
} from '{{IMPORT:domain.call}}';
import { toUserSummary, type UserSummary } from '{{IMPORT:domain.user}}';
import type { Realtime } from '{{IMPORT:port.realtime}}';
{{#if NOTIFICATIONS}}
import { CALLING_MESSAGES, CallingMessages } from '{{IMPORT:messages.calling}}';
import type { PushMessage } from '{{IMPORT:port.pushSender}}';
{{else}}
import { CallingMessages } from '{{IMPORT:messages.calling}}';
{{/if}}
{{#if VOIP_PUSH}}
import type { VoipCallPayload } from '{{IMPORT:port.voipPushSender}}';
{{/if}}

// ─── Environment (never expose AGORA_APP_CERTIFICATE to client) ───────────────
const AGORA_APP_ID = process.env['AGORA_APP_ID'] ?? '';
const AGORA_APP_CERTIFICATE = process.env['AGORA_APP_CERTIFICATE'] ?? '';
/** Ringing timeout in seconds. After this the call is marked missed. */
const CALL_TIMEOUT_SECONDS = Number(process.env['CALL_TIMEOUT_SECONDS'] ?? 60);
/** Agora token expiry in seconds. */
const AGORA_TOKEN_EXPIRY = 3600;

// ─── CallKit UUID ─────────────────────────────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The UUID iOS CallKit knows this call by. It must be the same in every delivery of the call – the socket
 * `call:incoming` event, the FCM push and the VoIP (PushKit) push – or the phone shows the call twice. So it is
 * derived from the call id, never random: the call id itself when it is a UUID (lowercased), otherwise a
 * name-based (version 5 style) UUID from sha1(callId).
 */
export function callKitUuid(callId: string): string {
  if (UUID_RE.test(callId)) return callId.toLowerCase();
  const bytes = createHash('sha1').update(callId).digest().subarray(0, 16);
  bytes[6] = (bytes[6]! & 0x0f) | 0x50;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface InitiateCallInput {
  callerId: string;
  receiverId: string;
  callType: CallType;
}

export interface InitiateGroupCallInput {
  callerId: string;
  participantIds: string[];
  callType: CallType;
}

export interface AgoraTokenInput {
  callId: string;
  userId: string;
  role?: 'publisher' | 'subscriber';
}

export interface AgoraTokenResult {
  token: string;
  appId: string;
  channelName: string;
  uid: number;
  expiresIn: number;
}

/** A history entry: the call plus who called whom (names for the call list; null when the account is gone). */
export interface CallHistoryItem extends CallEntity {
  caller: UserSummary | null;
  receiver: UserSummary | null;
}

export interface CallHistoryQuery {
  userId: string;
  limit?: number;
  offset?: number;
}

// ─── Service ─────────────────────────────────────────────────────────────────

/** Socket.IO call events – the same names as the app's useCallSocket CALL_EVENTS. */
export const CALL_EVENTS = {
  incoming: 'call:incoming',
  accepted: 'call:accepted',
  rejected: 'call:rejected',
  cancelled: 'call:cancelled',
  ended: 'call:ended',
  missed: 'call:missed',
  participantJoined: 'call:participant-joined',
  participantLeft: 'call:participant-left',
} as const;

/** Still ringing – nobody has answered yet. */
const RINGING_STATUSES: CallStatus[] = ['initiating', 'ringing'];
/** Finished calls – nothing can change them any more. */
const FINISHED_STATUSES: CallStatus[] = ['busy', 'declined', 'missed', 'cancelled', 'ended', 'failed'];
/** Participants that still hold the call open. */
const OPEN_PARTICIPANT_STATUSES: CallParticipantStatus[] = ['invited', 'ringing', 'joined'];

export interface CallingServiceDeps {
  calling: ICallingRepository;
  users: UsersRepository;
  realtime: Realtime;
{{#if NOTIFICATIONS}}
  /** Pushes the incoming call to receivers without a live socket (NotificationsService.push). */
  push?: (userIds: string[], message: PushMessage) => Promise<void>;
{{/if}}
{{#if VOIP_PUSH}}
  /** Rings the receivers' iOS devices through PushKit / CallKit, even when the app was killed (NotificationsService.pushVoip). */
  voipPush?: (userIds: string[], payload: VoipCallPayload, ttlSeconds?: number) => Promise<void>;
{{/if}}
  logger: Logger;
  /** Checks if either user has blocked the other. */
  isBlocked?: (userA: string, userB: string) => Promise<boolean>;
  /** Shows the finished one-to-one call in the two people's chat (ChatService.recordCall), when chat exists. */
  recordCall?: (input: {
    callerId: string;
    receiverId: string;
    callType: CallType;
    answered: boolean;
    duration: number;
  }) => Promise<void>;
}

export class CallingService {
  /** callId → ringing timeout (marks the call missed). */
  private readonly timers = new Map<string, NodeJS.Timeout>();

  constructor(private readonly deps: CallingServiceDeps) {}

  private get callingRepo(): ICallingRepository {
    return this.deps.calling;
  }

  // ── Initiate one-to-one call ─────────────────────────────────────────────

  async initiateCall(input: InitiateCallInput): Promise<CallEntity> {
    if (input.receiverId === input.callerId) throw new BadRequestError(CallingMessages.CANNOT_CALL_SELF);
    if (this.deps.isBlocked && (await this.deps.isBlocked(input.callerId, input.receiverId))) {
      throw new ForbiddenError(CallingMessages.CANNOT_CALL_BLOCKED);
    }
    // Starting a new call means anything the caller still has open was abandoned (app killed, network lost).
    await this.releaseOpenCalls(input.callerId);
    if (await this.findBusyCall(input.receiverId)) {
      throw new ConflictError(CallingMessages.USER_BUSY);
    }

    const channelName = `call_${randomUUID().replace(/-/g, '')}`;
    const call = await this.callingRepo.createCall({
      callerId: input.callerId,
      receiverId: input.receiverId,
      callType: input.callType,
      isGroupCall: false,
      channelName,
    });

    // The caller is in the call from the start; the receiver is invited.
    await this.callingRepo.addParticipant(call.id, input.callerId, 'host');
    await this.callingRepo.updateParticipantStatus(call.id, input.callerId, 'joined');
    await this.callingRepo.addParticipant(call.id, input.receiverId, 'participant');

    return this.ring(call, [input.receiverId]);
  }

  // ── Initiate group call ────────────────────────────────────────────────────

  async initiateGroupCall(input: InitiateGroupCallInput): Promise<CallEntity> {
    await this.releaseOpenCalls(input.callerId);

    const channelName = `group_${randomUUID().replace(/-/g, '')}`;
    const call = await this.callingRepo.createCall({
      callerId: input.callerId,
      callType: input.callType,
      isGroupCall: true,
      channelName,
    });

    await this.callingRepo.addParticipant(call.id, input.callerId, 'host');
    await this.callingRepo.updateParticipantStatus(call.id, input.callerId, 'joined');
    const invited = [...new Set(input.participantIds)].filter((id) => id !== input.callerId);
    for (const pid of invited) {
      await this.callingRepo.addParticipant(call.id, pid, 'participant');
    }

    return this.ring(call, invited);
  }

  // ── Accept call ───────────────────────────────────────────────────────────

  async acceptCall(callId: string, userId: string): Promise<CallEntity> {
    const call = await this.requireCall(callId);
    await this.requireParticipant(call, userId);
    if (FINISHED_STATUSES.includes(call.status)) throw new ConflictError(CallingMessages.CALL_ALREADY_ENDED);
    // The same answer can arrive twice (native call screen + app): already in the call is a success.
    if (!RINGING_STATUSES.includes(call.status)) {
      const participant = await this.callingRepo.findParticipant(callId, userId);
      if (participant?.status === 'joined') return call;
    }
    if (!RINGING_STATUSES.includes(call.status) && !call.isGroupCall) {
      throw new ConflictError(CallingMessages.INVALID_CALL_STATE);
    }
    this.clearTimer(callId);
    const updated = RINGING_STATUSES.includes(call.status)
      ? await this.callingRepo.updateCallStatus({ callId, status: 'connecting', answeredAt: new Date() })
      : call;
    await this.callingRepo.updateParticipantStatus(callId, userId, 'joined');
    await this.notify(call, userId, CALL_EVENTS.accepted, { callId, userId });
    return updated;
  }

  // ── Reject call ────────────────────────────────────────────────────────────

  async rejectCall(callId: string, userId: string): Promise<CallEntity> {
    const call = await this.requireCall(callId);
    await this.requireParticipant(call, userId);
    if (FINISHED_STATUSES.includes(call.status)) return call;
    if (call.isGroupCall) {
      // One invitee saying no does not end a group call.
      await this.callingRepo.updateParticipantStatus(callId, userId, 'declined');
      return call;
    }
    return this.finish(call, 'declined', 'declined', userId);
  }

  // ── End call ──────────────────────────────────────────────────────────────

  async endCall(callId: string, userId: string): Promise<CallEntity> {
    const call = await this.requireCall(callId);
    await this.requireParticipant(call, userId);
    if (FINISHED_STATUSES.includes(call.status)) return call;
    if (call.isGroupCall) {
      await this.leaveGroupCall(callId, userId);
      return (await this.callingRepo.findCallById(callId)) ?? call;
    }
    // Hanging up before an answer: the caller cancels, the receiver declines.
    if (RINGING_STATUSES.includes(call.status)) {
      return call.callerId === userId
        ? this.finish(call, 'cancelled', 'cancelled', userId)
        : this.finish(call, 'declined', 'declined', userId);
    }
    return this.finish(call, 'ended', 'normal', userId);
  }

  // ── End call for everyone (host only) ────────────────────────────────────

  async endCallForAll(callId: string, userId: string): Promise<CallEntity> {
    const call = await this.requireCall(callId);
    const participant = await this.callingRepo.findParticipant(callId, userId);
    if (!participant || participant.role !== 'host') {
      throw new ForbiddenError(CallingMessages.UNAUTHORIZED_END_CALL);
    }
    if (FINISHED_STATUSES.includes(call.status)) return call;
    return this.finish(call, 'ended', 'normal', userId);
  }

  // ── Cancel call (caller hangs up before answer) ───────────────────────────

  async cancelCall(callId: string, callerId: string): Promise<CallEntity> {
    const call = await this.requireCall(callId);
    if (call.callerId !== callerId) throw new ForbiddenError(CallingMessages.NOT_CALL_PARTICIPANT);
    if (FINISHED_STATUSES.includes(call.status)) return call;
    return RINGING_STATUSES.includes(call.status)
      ? this.finish(call, 'cancelled', 'cancelled', callerId)
      : this.finish(call, 'ended', 'normal', callerId);
  }

  // ── Join group call ────────────────────────────────────────────────────────

  async joinGroupCall(callId: string, userId: string): Promise<CallEntity> {
    const call = await this.requireCall(callId);
    if (!call.isGroupCall) throw new BadRequestError(CallingMessages.NOT_GROUP_CALL);
    if (FINISHED_STATUSES.includes(call.status)) throw new ConflictError(CallingMessages.CALL_ALREADY_ENDED);
    const participant = await this.callingRepo.findParticipant(callId, userId);
    if (!participant) await this.callingRepo.addParticipant(callId, userId, 'participant');
    await this.callingRepo.updateParticipantStatus(callId, userId, 'joined');
    await this.notify(call, userId, CALL_EVENTS.participantJoined, { callId, userId });
    return call;
  }

  // ── Leave group call ──────────────────────────────────────────────────────

  async leaveGroupCall(callId: string, userId: string): Promise<void> {
    const call = await this.requireCall(callId);
    await this.requireParticipant(call, userId);
    if (FINISHED_STATUSES.includes(call.status)) return;
    await this.callingRepo.updateParticipantStatus(callId, userId, 'left', new Date());
    await this.notify(call, userId, CALL_EVENTS.participantLeft, { callId, userId });
    // The last one out ends the call.
    const participants = await this.callingRepo.getCallParticipants(callId);
    if (!participants.some((p) => p.status === 'joined')) await this.finish(call, 'ended', 'normal', userId);
  }

  // ── Mark as missed (ringing timeout) ──────────────────────────────────────

  async markMissed(callId: string): Promise<CallEntity> {
    const call = await this.requireCall(callId);
    if (!RINGING_STATUSES.includes(call.status)) return call;
    return this.finish(call, 'missed', 'timeout');
  }

  // ── Generate Agora token (NEVER send certificate to client) ──────────────

  generateAgoraToken(input: AgoraTokenInput & { channelName: string }): AgoraTokenResult {
    if (!AGORA_APP_ID || !AGORA_APP_CERTIFICATE) {
      throw new AppError(CallingMessages.AGORA_TOKEN_FAILED, 500);
    }
    const uid = this.uidFromUserId(input.userId);
    const role = input.role === 'subscriber' ? RtcRole.SUBSCRIBER : RtcRole.PUBLISHER;
    const expireTime = Math.floor(Date.now() / 1000) + AGORA_TOKEN_EXPIRY;
    const token = RtcTokenBuilder.buildTokenWithUid(
      AGORA_APP_ID,
      AGORA_APP_CERTIFICATE,
      input.channelName,
      uid,
      role,
      expireTime,
    );
    return { token, appId: AGORA_APP_ID, channelName: input.channelName, uid, expiresIn: AGORA_TOKEN_EXPIRY };
  }

  // ── Get Agora token for a call ────────────────────────────────────────────

  async getCallToken(input: AgoraTokenInput): Promise<AgoraTokenResult> {
    const call = await this.requireCall(input.callId);
    const participant = await this.callingRepo.findParticipant(input.callId, input.userId);
    if (!participant) throw new ForbiddenError(CallingMessages.NOT_CALL_PARTICIPANT);
    return this.generateAgoraToken({ ...input, channelName: call.channelName });
  }

  // ── Call history ──────────────────────────────────────────────────────────

  async getCallHistory(query: CallHistoryQuery): Promise<{ calls: CallHistoryItem[]; total: number }> {
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;
    const [calls, total] = await Promise.all([
      this.callingRepo.getUserCallHistory(query.userId, limit, offset),
      this.callingRepo.countUserCalls(query.userId),
    ]);
    const ids = [...new Set(calls.flatMap((c) => (c.receiverId ? [c.callerId, c.receiverId] : [c.callerId])))];
    const users = new Map(
      (ids.length ? await this.deps.users.findManyByIds(ids) : []).map((u) => [u.id, toUserSummary(u)]),
    );
    return {
      calls: calls.map((c) => ({
        ...c,
        caller: users.get(c.callerId) ?? null,
        receiver: c.receiverId ? (users.get(c.receiverId) ?? null) : null,
      })),
      total,
    };
  }

  /** Removes a call from this user's history only – the other person keeps it. */
  async deleteCallLog(callId: string, userId: string): Promise<void> {
    const call = await this.requireCall(callId);
    await this.requireParticipant(call, userId);
    await this.callingRepo.hideCallForUser(callId, userId);
  }

  /** Clears this user's whole call history (other people keep theirs). */
  async clearCallLogs(userId: string): Promise<void> {
    await this.callingRepo.hideAllCallsForUser(userId);
  }

  async getCallById(callId: string): Promise<CallEntity> {
    return this.requireCall(callId);
  }

  async getActiveCall(userId: string): Promise<CallEntity | null> {
    return this.findBusyCall(userId);
  }

  async getCallParticipants(callId: string) {
    return this.callingRepo.getCallParticipants(callId);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  /** Rings the invitees (socket, plus a push for those without a live socket) and starts the missed-call timeout. */
  private async ring(call: CallEntity, receiverIds: string[]): Promise<CallEntity> {
    const ringing = await this.callingRepo.updateCallStatus({ callId: call.id, status: 'ringing' });
    const caller = await this.deps.users.findById(call.callerId);
    const incoming = {
      // The CallKit UUID – identical in the socket event, the FCM push and the VoIP push.
      uuid: callKitUuid(call.id),
      callId: call.id,
      callerId: call.callerId,
      callerName: caller?.name ?? '',
      callerAvatar: caller?.avatarUrl ?? undefined,
      callType: call.callType,
      channelName: call.channelName,
      isGroupCall: call.isGroupCall,
    };
    for (const id of receiverIds) this.deps.realtime.toUser(id, CALL_EVENTS.incoming, incoming);
{{#if NOTIFICATIONS}}

    // Pushed to every receiver: a minimised app may still hold its socket while its JS is frozen. The app and the
    // native Android call screen both ignore a call they already show.
    if (receiverIds.length && this.deps.push) {
      const body = call.callType === 'video' ? CALLING_MESSAGES.incomingVideoCall : CALLING_MESSAGES.incomingAudioCall;
      this.deps
        .push(receiverIds, {
          title: incoming.callerName || body,
          body,
          dataOnly: true,
          ttlSeconds: CALL_TIMEOUT_SECONDS,
          data: {
            // The Android IncomingCallFirebaseMessagingService shows the native call screen for this type.
            type: 'CALL_INCOMING',
            uuid: incoming.uuid,
            callId: call.id,
            callerId: call.callerId,
            callerName: incoming.callerName,
            callerAvatar: incoming.callerAvatar ?? '',
            callType: call.callType,
            channelName: call.channelName,
            isGroupCall: String(call.isGroupCall),
          },
        })
        .catch((error) => this.deps.logger.warn({ err: error, callId: call.id }, 'Incoming call push failed'));
    }
{{/if}}
{{#if VOIP_PUSH}}

    // iOS: a PushKit push rings CallKit even when the app was killed. Sent in addition to the FCM push – the app
    // dedupes by callId / uuid. Only here: every VoIP push must report a call, so "call ended" never goes this way.
    if (receiverIds.length && this.deps.voipPush) {
      this.deps
        .voipPush(
          receiverIds,
          {
            uuid: incoming.uuid,
            callId: call.id,
            callerId: call.callerId,
            callerName: incoming.callerName,
            callerAvatar: incoming.callerAvatar ?? '',
            callType: call.callType,
            channelName: call.channelName,
            isGroupCall: call.isGroupCall,
          },
          CALL_TIMEOUT_SECONDS,
        )
        .catch((error) => this.deps.logger.warn({ err: error, callId: call.id }, 'Incoming call VoIP push failed'));
    }
{{/if}}

    this.startTimer(call.id);
    return ringing;
  }

  /** Ends a call for good: status, every open participant, the ringing timer, and tells everyone else. */
  private async finish(
    call: CallEntity,
    status: CallStatus,
    endReason: CallEndReason,
    byUserId?: string,
  ): Promise<CallEntity> {
    this.clearTimer(call.id);
    const endedAt = new Date();
    const duration = call.answeredAt ? Math.floor((endedAt.getTime() - call.answeredAt.getTime()) / 1000) : 0;
    const updated = await this.callingRepo.updateCallStatus({ callId: call.id, status, endedAt, duration, endReason });

    // Left-over "invited"/"joined" rows would keep these users busy forever.
    const participants = await this.callingRepo.getCallParticipants(call.id);
    for (const p of participants) {
      if (!OPEN_PARTICIPANT_STATUSES.includes(p.status)) continue;
      const next: CallParticipantStatus =
        p.status === 'joined' ? 'left' : status === 'declined' && p.userId === byUserId ? 'declined' : 'missed';
      await this.callingRepo.updateParticipantStatus(call.id, p.userId, next, endedAt);
    }

    const event =
      status === 'declined'
        ? CALL_EVENTS.rejected
        : status === 'cancelled'
          ? CALL_EVENTS.cancelled
          : status === 'missed'
            ? CALL_EVENTS.missed
            : CALL_EVENTS.ended;
    await this.notify(call, byUserId, event, { callId: call.id, endReason }, participants);
    if (!call.isGroupCall && call.receiverId && this.deps.recordCall) {
      this.deps
        .recordCall({
          callerId: call.callerId,
          receiverId: call.receiverId,
          callType: call.callType,
          answered: Boolean(call.answeredAt),
          duration,
        })
        .catch((error) => this.deps.logger.warn({ err: error, callId: call.id }, 'Call not recorded in chat'));
    }
{{#if NOTIFICATIONS}}
    this.stopRinging(call, participants, byUserId);
{{/if}}
    return updated;
  }
{{#if NOTIFICATIONS}}

  /** A killed app rings from the push alone – a silent push takes the native call screen down again, and sends a missed call notification if not answered. */
  private async stopRinging(call: CallEntity, participants: CallParticipantEntity[], byUserId?: string): Promise<void> {
    const ringing = participants
      .filter((p) => (p.status === 'invited' || p.status === 'ringing') && p.userId !== byUserId)
      .map((p) => p.userId);
    if (!ringing.length || !this.deps.push) return;
    this.deps
      .push(ringing, {
        title: '',
        body: '',
        dataOnly: true,
        ttlSeconds: CALL_TIMEOUT_SECONDS,
        data: { type: 'CALL_ENDED', callId: call.id },
      })
      .catch((error) => this.deps.logger.warn({ err: error, callId: call.id }, 'Call ended push failed'));

    // If call was not answered, send a visible missed call notification to the invitees
    if (!call.answeredAt && ringing.length > 0) {
      const caller = await this.deps.users.findById(call.callerId);
      const callerName = caller?.name ?? 'Someone';
      const body = call.callType === 'video' ? CALLING_MESSAGES.missedVideoCall : CALLING_MESSAGES.missedAudioCall;
      this.deps
        .push(ringing, {
          title: callerName,
          body,
          dataOnly: false,
          ttlSeconds: 86400,
          data: {
            type: 'MISSED_CALL',
            callId: call.id,
            callerId: call.callerId,
            callerName,
            callType: call.callType,
          },
        })
        .catch((error) => this.deps.logger.warn({ err: error, callId: call.id }, 'Missed call notification failed'));
    }
  }
{{/if}}

  /** Sends a call event to everyone in the call except `exceptUserId`. */
  private async notify(
    call: CallEntity,
    exceptUserId: string | undefined,
    event: string,
    payload: unknown,
    participants?: CallParticipantEntity[],
  ): Promise<void> {
    const members = participants ?? (await this.callingRepo.getCallParticipants(call.id));
    const userIds = new Set([
      call.callerId,
      ...(call.receiverId ? [call.receiverId] : []),
      ...members.map((p) => p.userId),
    ]);
    for (const id of userIds) if (id !== exceptUserId) this.deps.realtime.toUser(id, event, payload);
  }

  /**
   * The call that keeps `userId` busy, or null. Calls still "ringing" past the timeout (the server restarted,
   * the timer was lost) are closed as missed on the way.
   */
  private async findBusyCall(userId: string): Promise<CallEntity | null> {
    for (let i = 0; i < 10; i++) {
      const call = await this.callingRepo.findActiveCallByUserId(userId);
      if (!call) return null;
      if (!this.isStaleRinging(call)) return call;
      await this.finish(call, 'missed', 'timeout');
    }
    return null;
  }

  /** Closes every call `userId` still has open. */
  private async releaseOpenCalls(userId: string): Promise<void> {
    for (let i = 0; i < 10; i++) {
      const call = await this.callingRepo.findActiveCallByUserId(userId);
      if (!call) return;
      if (RINGING_STATUSES.includes(call.status)) {
        await (call.callerId === userId
          ? this.finish(call, 'cancelled', 'cancelled', userId)
          : this.finish(call, 'declined', 'declined', userId));
      } else {
        await this.finish(call, 'ended', 'normal', userId);
      }
    }
  }

  private isStaleRinging(call: CallEntity): boolean {
    return (
      RINGING_STATUSES.includes(call.status) &&
      Date.now() - new Date(call.createdAt).getTime() > CALL_TIMEOUT_SECONDS * 1000
    );
  }

  private startTimer(callId: string): void {
    this.clearTimer(callId);
    const timer = setTimeout(() => {
      this.timers.delete(callId);
      this.markMissed(callId).catch((error) =>
        this.deps.logger.warn({ err: error, callId }, 'Marking call missed failed'),
      );
    }, CALL_TIMEOUT_SECONDS * 1000);
    timer.unref();
    this.timers.set(callId, timer);
  }

  private clearTimer(callId: string): void {
    const timer = this.timers.get(callId);
    if (timer) clearTimeout(timer);
    this.timers.delete(callId);
  }

  private async requireCall(callId: string): Promise<CallEntity> {
    const call = await this.callingRepo.findCallById(callId);
    if (!call) throw new NotFoundError(CallingMessages.CALL_NOT_FOUND);
    return call;
  }

  private async requireParticipant(call: CallEntity, userId: string): Promise<void> {
    if (call.callerId === userId || call.receiverId === userId) return;
    if (await this.callingRepo.findParticipant(call.id, userId)) return;
    throw new ForbiddenError(CallingMessages.NOT_CALL_PARTICIPANT);
  }

  /** Converts a userId string to a numeric Agora UID (deterministic, stable per user). */
  private uidFromUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = (hash << 5) - hash + userId.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash) % 4294967295 || 1;
  }

  static get callTimeoutSeconds(): number {
    return CALL_TIMEOUT_SECONDS;
  }
}
