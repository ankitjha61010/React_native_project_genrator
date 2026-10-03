export const CALLING_MESSAGES = {
  callNotFound: { message: 'Call not found.', code: 'CALL_NOT_FOUND' },
  callAlreadyEnded: { message: 'Call has already ended.', code: 'CALL_ALREADY_ENDED' },
  userBusy: { message: 'User is currently busy on another call.', code: 'USER_BUSY' },
  notParticipant: { message: 'You are not a participant in this call.', code: 'NOT_CALL_PARTICIPANT' },
  unauthorizedEndCall: { message: 'Only the host can end the call for everyone.', code: 'UNAUTHORIZED_END_CALL' },
  agoraTokenFailed: { message: 'Failed to generate call token.', code: 'AGORA_TOKEN_FAILED' },
  callTimeout: { message: 'Call timed out.', code: 'CALL_TIMEOUT' },
  invalidState: { message: 'Invalid call state transition.', code: 'INVALID_CALL_STATE' },
  notGroupCall: { message: 'Not a group call.', code: 'NOT_A_GROUP_CALL' },
  cannotCallSelf: { message: 'You cannot call yourself.', code: 'CANNOT_CALL_SELF' },
  cannotCallBlocked: { message: 'Cannot call this user.', code: 'USER_BLOCKED' },

  // Success messages
  callInitiated: 'Call initiated.',
  groupCallInitiated: 'Group call initiated.',
  callAccepted: 'Call accepted.',
  callRejected: 'Call rejected.',
  callEnded: 'Call ended.',
  callEndedForAll: 'Call ended for everyone.',
  callCancelled: 'Call cancelled.',
  joinedGroupCall: 'Joined group call.',
  leftGroupCall: 'Left group call.',
  tokenGenerated: 'Token generated.',
  callRetrieved: 'Call retrieved.',
  historyRetrieved: 'Call history retrieved.',
  activeCallRetrieved: 'Active call retrieved.',
  participantsRetrieved: 'Participants retrieved.',
  callLogDeleted: 'Call removed from history.',
  callLogsCleared: 'Call history cleared.',
  voipTokenSaved: 'VoIP push token saved.',
  /** No push notifications module: there are no devices to keep the token on. */
  voipTokenIgnored: 'VoIP push is not enabled on this server – token not stored.',

  // Incoming call push (the caller's name is the title)
  incomingAudioCall: 'Incoming audio call',
  incomingVideoCall: 'Incoming video call',
  missedAudioCall: 'Missed voice call',
  missedVideoCall: 'Missed video call',
} as const;

export const CallingMessages = {
  CALL_NOT_FOUND: CALLING_MESSAGES.callNotFound,
  CALL_ALREADY_ENDED: CALLING_MESSAGES.callAlreadyEnded,
  USER_BUSY: CALLING_MESSAGES.userBusy,
  NOT_CALL_PARTICIPANT: CALLING_MESSAGES.notParticipant,
  UNAUTHORIZED_END_CALL: CALLING_MESSAGES.unauthorizedEndCall,
  AGORA_TOKEN_FAILED: CALLING_MESSAGES.agoraTokenFailed,
  CALL_TIMEOUT: CALLING_MESSAGES.callTimeout,
  INVALID_CALL_STATE: CALLING_MESSAGES.invalidState,
  NOT_GROUP_CALL: CALLING_MESSAGES.notGroupCall,
  CANNOT_CALL_SELF: CALLING_MESSAGES.cannotCallSelf,
  CANNOT_CALL_BLOCKED: CALLING_MESSAGES.cannotCallBlocked,
} as const;
