// ─── useCallSocket hook ────────────────────────────────────────────────────────
// Subscribes to Socket.IO calling events and bridges them to the useCall hook.
// This hook should be mounted globally (e.g. in App.tsx) once the user is
// authenticated, so incoming calls can be received in any app state.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect } from 'react';
import { socketService } from '{{IMPORT:socket.service}}';
import type { IncomingCallData, CallEndedEvent } from '../types/calling.types';

export const CALL_EVENTS = {
  incoming: 'call:incoming',
  ringing: 'call:ringing',
  accepted: 'call:accepted',
  rejected: 'call:rejected',
  busy: 'call:busy',
  cancelled: 'call:cancelled',
  connected: 'call:connected',
  ended: 'call:ended',
  missed: 'call:missed',
  participantJoined: 'call:participant-joined',
  participantLeft: 'call:participant-left',
  mute: 'call:mute',
  camera: 'call:camera',
  reconnecting: 'call:reconnecting',
  failed: 'call:failed',
} as const;

export interface CallSocketHandlers {
  onIncomingCall?: (data: IncomingCallData) => void;
  onCallAccepted?: (callId: string) => void;
  onCallRejected?: (callId: string) => void;
  onCallEnded?: (data: CallEndedEvent) => void;
  onCallCancelled?: (callId: string) => void;
  onCallBusy?: (callId: string) => void;
  onCallMissed?: (callId: string) => void;
  onParticipantJoined?: (callId: string, userId: string) => void;
  onParticipantLeft?: (callId: string, userId: string) => void;
  onCallReconnecting?: (callId: string) => void;
  onCallFailed?: (callId: string) => void;
}

export function useCallSocket(handlers: CallSocketHandlers): void {
  useEffect(() => {
    const unsubs: Array<() => void> = [
      socketService.on<IncomingCallData>(CALL_EVENTS.incoming, data => handlers.onIncomingCall?.(data)),
      socketService.on<{ callId: string }>(CALL_EVENTS.accepted, ({ callId }) => handlers.onCallAccepted?.(callId)),
      socketService.on<{ callId: string }>(CALL_EVENTS.rejected, ({ callId }) => handlers.onCallRejected?.(callId)),
      socketService.on<CallEndedEvent>(CALL_EVENTS.ended, data => handlers.onCallEnded?.(data)),
      socketService.on<{ callId: string }>(CALL_EVENTS.cancelled, ({ callId }) => handlers.onCallCancelled?.(callId)),
      socketService.on<{ callId: string }>(CALL_EVENTS.busy, ({ callId }) => handlers.onCallBusy?.(callId)),
      socketService.on<{ callId: string }>(CALL_EVENTS.missed, ({ callId }) => handlers.onCallMissed?.(callId)),
      socketService.on<{ callId: string; userId: string }>(CALL_EVENTS.participantJoined, ({ callId, userId }) =>
        handlers.onParticipantJoined?.(callId, userId),
      ),
      socketService.on<{ callId: string; userId: string }>(CALL_EVENTS.participantLeft, ({ callId, userId }) =>
        handlers.onParticipantLeft?.(callId, userId),
      ),
      socketService.on<{ callId: string }>(CALL_EVENTS.reconnecting, ({ callId }) => handlers.onCallReconnecting?.(callId)),
      socketService.on<{ callId: string }>(CALL_EVENTS.failed, ({ callId }) => handlers.onCallFailed?.(callId)),
    ];

    return () => {
      unsubs.forEach(u => u());
    };
  }, [handlers]);
}
