import { z } from 'zod';
import type { ApiDocGroup } from '{{IMPORT:ex.docs.helpers}}';
import { InitiateCallSchema, InitiateGroupCallSchema, RegisterVoipTokenSchema } from '{{IMPORT:ex.calling.schemas}}';

// ── schemas used only by the OpenAPI document ─────────────────────────────────

const callParams = z.object({ callId: z.string().min(1).meta({ description: 'The call id' }) });

const historyQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
  offset: z.coerce.number().int().min(0).default(0).optional(),
});

const userSummarySchema = z.object({ id: z.string(), name: z.string(), avatar: z.string().nullable() }).meta({ id: 'CallUser' });

const callSchema = z
  .object({
    id: z.string(),
    callerId: z.string(),
    receiverId: z.string().optional().meta({ description: 'One-to-one calls only' }),
    callType: z.enum(['audio', 'video']),
    isGroupCall: z.boolean(),
    channelName: z.string().meta({ description: 'Agora channel of the call' }),
    status: z.enum(['initiating', 'ringing', 'connecting', 'connected', 'reconnecting', 'busy', 'declined', 'missed', 'cancelled', 'ended', 'failed']),
    startedAt: z.iso.datetime().optional(),
    answeredAt: z.iso.datetime().optional(),
    endedAt: z.iso.datetime().optional(),
    duration: z.number().optional().meta({ description: 'Seconds, set when the call ends' }),
    endReason: z.enum(['normal', 'declined', 'missed', 'cancelled', 'busy', 'failed', 'timeout']).optional(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .meta({ id: 'Call' });

const participantSchema = z
  .object({
    id: z.string(),
    callId: z.string(),
    userId: z.string(),
    status: z.enum(['invited', 'ringing', 'joined', 'left', 'declined', 'missed']),
    role: z.enum(['host', 'participant']),
    joinedAt: z.iso.datetime().optional(),
    leftAt: z.iso.datetime().optional(),
    uid: z.number().meta({ description: 'Agora uid this user joins the channel with – match it to remote video / audio' }),
    user: userSummarySchema.nullable(),
  })
  .meta({ id: 'CallParticipant' });

const historySchema = z.object({
  calls: z.array(callSchema.extend({ caller: userSummarySchema.nullable(), receiver: userSummarySchema.nullable() })),
  total: z.number(),
});

const agoraTokenSchema = z
  .object({ token: z.string(), appId: z.string(), channelName: z.string(), uid: z.number(), expiresIn: z.number() })
  .meta({ id: 'AgoraToken' });

/** Swagger docs of calling.routes.ts. Live signaling (`call:incoming`, `call:accepted`…): see the Socket.IO server. */
export const callingDocs: ApiDocGroup = {
  tag: 'Calling',
  endpoints: [
    {
      method: 'post',
      path: '/calls',
      summary: 'Start a one-to-one call (the receiver gets `call:incoming`)',
      status: 201,
      auth: true,
      body: InitiateCallSchema,
      response: callSchema,
      errors: [400, 401, 403, 404, 409, 422],
    },
    {
      method: 'post',
      path: '/calls/group',
      summary: 'Start a group call (every participant gets `call:incoming`)',
      status: 201,
      auth: true,
      body: InitiateGroupCallSchema,
      response: callSchema,
      errors: [400, 401, 404, 422],
    },
    {
      method: 'post',
      path: '/calls/voip-token',
      summary: 'Save the iOS VoIP (PushKit) token of your device (no deviceId: your most recently active iOS device)',
      auth: true,
      body: RegisterVoipTokenSchema,
      errors: [401, 404, 422],
    },
    {
      method: 'get',
      path: '/calls/history',
      summary: 'Your call history, newest first',
      auth: true,
      query: historyQuery,
      response: historySchema,
      errors: [401],
    },
    {
      method: 'delete',
      path: '/calls/history',
      summary: 'Clear your call history (the others keep theirs)',
      auth: true,
      errors: [401],
    },
    {
      method: 'get',
      path: '/calls/active',
      summary: 'Your current (ringing or connected) call, or null',
      auth: true,
      response: z.object({ call: callSchema.nullable() }),
      errors: [401],
    },
    {
      method: 'get',
      path: '/calls/:callId',
      summary: 'One call',
      auth: true,
      params: callParams,
      response: callSchema,
      errors: [401, 404],
    },
    {
      method: 'delete',
      path: '/calls/:callId',
      summary: 'Remove a call from your history (the others keep it)',
      auth: true,
      params: callParams,
      errors: [401, 403, 404],
    },
    {
      method: 'post',
      path: '/calls/:callId/accept',
      summary: 'Accept a ringing call (the caller gets `call:accepted`)',
      auth: true,
      params: callParams,
      response: callSchema,
      errors: [400, 401, 403, 404],
    },
    {
      method: 'post',
      path: '/calls/:callId/reject',
      summary: 'Decline a ringing call (the caller gets `call:rejected`)',
      auth: true,
      params: callParams,
      response: callSchema,
      errors: [400, 401, 403, 404],
    },
    {
      method: 'post',
      path: '/calls/:callId/end',
      summary: 'Hang up (the others get `call:ended`)',
      auth: true,
      params: callParams,
      response: callSchema,
      errors: [400, 401, 403, 404],
    },
    {
      method: 'post',
      path: '/calls/:callId/end-for-all',
      summary: 'End the call for everyone – host only',
      auth: true,
      params: callParams,
      response: callSchema,
      errors: [400, 401, 403, 404],
    },
    {
      method: 'post',
      path: '/calls/:callId/cancel',
      summary: 'Cancel your outgoing call before it is answered (receivers get `call:cancelled`)',
      auth: true,
      params: callParams,
      response: callSchema,
      errors: [400, 401, 403, 404],
    },
    {
      method: 'post',
      path: '/calls/:callId/join',
      summary: 'Join a group call (the others get `call:participant-joined`)',
      auth: true,
      params: callParams,
      response: callSchema,
      errors: [400, 401, 403, 404],
    },
    {
      method: 'post',
      path: '/calls/:callId/leave',
      summary: 'Leave a group call (the others get `call:participant-left`)',
      auth: true,
      params: callParams,
      errors: [400, 401, 403, 404],
    },
    {
      method: 'post',
      path: '/calls/:callId/agora-token',
      summary: 'Agora RTC token to join the call channel (needs AGORA_APP_ID / AGORA_APP_CERTIFICATE)',
      auth: true,
      params: callParams,
      response: agoraTokenSchema,
      errors: [401, 403, 404],
    },
    {
      method: 'get',
      path: '/calls/:callId/participants',
      summary: 'Who is in the call',
      auth: true,
      params: callParams,
      response: z.object({ participants: z.array(participantSchema) }),
      errors: [401, 404],
    },
  ],
};
