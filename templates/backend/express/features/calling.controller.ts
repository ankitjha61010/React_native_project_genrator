// ─── Calling Controller (Express) ─────────────────────────────────────────────

import type { Request, Response } from 'express';
import type { CallingService } from '{{IMPORT:app.callingService}}';
import { currentUser } from '{{IMPORT:ex.mw.auth}}';
import { sendSuccess } from '{{IMPORT:ex.respond}}';
import { CALLING_MESSAGES } from '{{IMPORT:messages.calling}}';

function getCallId(req: Request): string {
  return String(req.params['callId'] ?? '');
}

export class CallingController {
  constructor(private readonly callingService: CallingService) {}

  // POST /calls – initiate one-to-one call
  initiateCall = async (req: Request, res: Response): Promise<void> => {
    const callerId = currentUser(req).id;
    const { receiverId, callType } = req.body as { receiverId: string; callType: 'audio' | 'video' };
    const call = await this.callingService.initiateCall({ callerId, receiverId, callType });
    sendSuccess(res, CALLING_MESSAGES.callInitiated, call, { status: 201 });
  };

  // POST /calls/group – initiate group call
  initiateGroupCall = async (req: Request, res: Response): Promise<void> => {
    const callerId = currentUser(req).id;
    const { participantIds, callType } = req.body as { participantIds: string[]; callType: 'audio' | 'video' };
    const call = await this.callingService.initiateGroupCall({ callerId, participantIds, callType });
    sendSuccess(res, CALLING_MESSAGES.groupCallInitiated, call, { status: 201 });
  };

  // POST /calls/:callId/accept
  acceptCall = async (req: Request, res: Response): Promise<void> => {
    const call = await this.callingService.acceptCall(getCallId(req), currentUser(req).id);
    sendSuccess(res, CALLING_MESSAGES.callAccepted, call);
  };

  // POST /calls/:callId/reject
  rejectCall = async (req: Request, res: Response): Promise<void> => {
    const call = await this.callingService.rejectCall(getCallId(req), currentUser(req).id);
    sendSuccess(res, CALLING_MESSAGES.callRejected, call);
  };

  // POST /calls/:callId/end
  endCall = async (req: Request, res: Response): Promise<void> => {
    const call = await this.callingService.endCall(getCallId(req), currentUser(req).id);
    sendSuccess(res, CALLING_MESSAGES.callEnded, call);
  };

  // POST /calls/:callId/end-for-all
  endCallForAll = async (req: Request, res: Response): Promise<void> => {
    const call = await this.callingService.endCallForAll(getCallId(req), currentUser(req).id);
    sendSuccess(res, CALLING_MESSAGES.callEndedForAll, call);
  };

  // POST /calls/:callId/cancel
  cancelCall = async (req: Request, res: Response): Promise<void> => {
    const call = await this.callingService.cancelCall(getCallId(req), currentUser(req).id);
    sendSuccess(res, CALLING_MESSAGES.callCancelled, call);
  };

  // POST /calls/:callId/join
  joinGroupCall = async (req: Request, res: Response): Promise<void> => {
    const call = await this.callingService.joinGroupCall(getCallId(req), currentUser(req).id);
    sendSuccess(res, CALLING_MESSAGES.joinedGroupCall, call);
  };

  // POST /calls/:callId/leave
  leaveGroupCall = async (req: Request, res: Response): Promise<void> => {
    await this.callingService.leaveGroupCall(getCallId(req), currentUser(req).id);
    sendSuccess(res, CALLING_MESSAGES.leftGroupCall, null);
  };

  // POST /calls/:callId/agora-token
  getAgoraToken = async (req: Request, res: Response): Promise<void> => {
    const result = await this.callingService.getCallToken({ callId: getCallId(req), userId: currentUser(req).id });
    sendSuccess(res, CALLING_MESSAGES.tokenGenerated, result);
  };

  // GET /calls/:callId
  getCall = async (req: Request, res: Response): Promise<void> => {
    const call = await this.callingService.getCallById(getCallId(req));
    sendSuccess(res, CALLING_MESSAGES.callRetrieved, call);
  };

  // GET /calls/history
  getCallHistory = async (req: Request, res: Response): Promise<void> => {
    const limit = Number(req.query['limit'] ?? 20);
    const offset = Number(req.query['offset'] ?? 0);
    const result = await this.callingService.getCallHistory({ userId: currentUser(req).id, limit, offset });
    sendSuccess(res, CALLING_MESSAGES.historyRetrieved, result);
  };

  // DELETE /calls/history – clear this user's call history
  clearCallHistory = async (req: Request, res: Response): Promise<void> => {
    await this.callingService.clearCallLogs(currentUser(req).id);
    sendSuccess(res, CALLING_MESSAGES.callLogsCleared, null);
  };

  // DELETE /calls/:callId – remove one call from this user's history
  deleteCallLog = async (req: Request, res: Response): Promise<void> => {
    await this.callingService.deleteCallLog(getCallId(req), currentUser(req).id);
    sendSuccess(res, CALLING_MESSAGES.callLogDeleted, null);
  };

  // GET /calls/active
  getActiveCall = async (req: Request, res: Response): Promise<void> => {
    const call = await this.callingService.getActiveCall(currentUser(req).id);
    sendSuccess(res, CALLING_MESSAGES.activeCallRetrieved, { call });
  };

  // GET /calls/:callId/participants
  getCallParticipants = async (req: Request, res: Response): Promise<void> => {
    const participants = await this.callingService.getCallParticipants(getCallId(req));
    sendSuccess(res, CALLING_MESSAGES.participantsRetrieved, { participants });
  };
}
