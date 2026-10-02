// ─── Calling API Endpoints ─────────────────────────────────────────────────
// All requests go through the existing axios apiClient (with auth token + optional encryption).

import { api } from '{{IMPORT:api.client}}';
import type { Call, CallParticipant, AgoraTokenResult } from './types/calling.types';

// POST /calls – initiate one-to-one call
export const initiateCall = (receiverId: string, callType: 'audio' | 'video') =>
  api.post<Call>('/calls', { receiverId, callType });

// POST /calls/group – initiate group call
export const initiateGroupCall = (participantIds: string[], callType: 'audio' | 'video') =>
  api.post<Call>('/calls/group', { participantIds, callType });

// POST /calls/:callId/accept
export const acceptCall = (callId: string) =>
  api.post<Call>(`/calls/${callId}/accept`);

// POST /calls/:callId/reject
export const rejectCall = (callId: string) =>
  api.post<Call>(`/calls/${callId}/reject`);

// POST /calls/:callId/end
export const endCall = (callId: string) =>
  api.post<Call>(`/calls/${callId}/end`);

// POST /calls/:callId/end-for-all (host only)
export const endCallForAll = (callId: string) =>
  api.post<Call>(`/calls/${callId}/end-for-all`);

// POST /calls/:callId/cancel (caller hangs up before answer)
export const cancelCall = (callId: string) =>
  api.post<Call>(`/calls/${callId}/cancel`);

// POST /calls/:callId/join
export const joinGroupCall = (callId: string) =>
  api.post<Call>(`/calls/${callId}/join`);

// POST /calls/:callId/leave
export const leaveGroupCall = (callId: string) =>
  api.post<void>(`/calls/${callId}/leave`);

// POST /calls/:callId/agora-token – get Agora RTC token (backend signs it with CERTIFICATE)
export const getAgoraToken = (callId: string) =>
  api.post<AgoraTokenResult>(`/calls/${callId}/agora-token`);

// GET /calls/:callId
export const getCall = (callId: string) =>
  api.get<Call>(`/calls/${callId}`);

// GET /calls/history
export const getCallHistory = (limit = 20, offset = 0) =>
  api.get<{ calls: Call[]; total: number }>('/calls/history', { params: { limit, offset } });

// DELETE /calls/history – clear my call history (the other people keep theirs)
export const clearCallHistory = () =>
  api.delete<null>('/calls/history');

// DELETE /calls/:callId – remove one call from my history
export const deleteCallLog = (callId: string) =>
  api.delete<null>(`/calls/${callId}`);

// GET /calls/active
export const getActiveCall = () =>
  api.get<{ call: Call | null }>('/calls/active');

// GET /calls/:callId/participants
export const getCallParticipants = (callId: string) =>
  api.get<{ participants: CallParticipant[] }>(`/calls/${callId}/participants`);

// POST /calls/voip-token – register or update iOS VoIP PushKit token for incoming calls
export const registerVoipToken = (voipToken: string) =>
  api.post<null>('/calls/voip-token', { voipToken });
