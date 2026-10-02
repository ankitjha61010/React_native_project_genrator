import { Router } from 'express';
import type { Services } from '{{IMPORT:app.container}}';
import { requireAuth } from '{{IMPORT:ex.mw.auth}}';
import { CallingController } from '{{IMPORT:ex.calling.controller}}';

export function callingRoutes(services: Services): Router {
  const router = Router();
  const controller = new CallingController(services.calling);

  // All calling routes require authentication
  router.use(requireAuth(services.sessions));

  // One-to-one call
  router.post('/', controller.initiateCall);
  // Group call
  router.post('/group', controller.initiateGroupCall);
  // Call history
  router.get('/history', controller.getCallHistory);
  router.delete('/history', controller.clearCallHistory);
  // Active call
  router.get('/active', controller.getActiveCall);

  // Per-call operations
  router.get('/:callId', controller.getCall);
  router.delete('/:callId', controller.deleteCallLog);
  router.post('/:callId/accept', controller.acceptCall);
  router.post('/:callId/reject', controller.rejectCall);
  router.post('/:callId/end', controller.endCall);
  router.post('/:callId/end-for-all', controller.endCallForAll);
  router.post('/:callId/cancel', controller.cancelCall);
  router.post('/:callId/join', controller.joinGroupCall);
  router.post('/:callId/leave', controller.leaveGroupCall);
  router.post('/:callId/agora-token', controller.getAgoraToken);
  router.get('/:callId/participants', controller.getCallParticipants);

  return router;
}
