import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
{{#if SWAGGER}}
import { ApiTags } from '@nestjs/swagger';
{{/if}}
import { CallingService } from '{{IMPORT:app.callingService}}';
import type { User } from '{{IMPORT:domain.user}}';
import { CurrentUser } from '{{IMPORT:nest.decorators}}';
import { Endpoint } from '{{IMPORT:nest.endpoint}}';
import { CallHistoryQueryDto, InitiateCallDto, InitiateGroupCallDto } from '{{IMPORT:nest.calling.dto}}';
import { CALLING_MESSAGES } from '{{IMPORT:messages.calling}}';

/** `/calls` – Agora audio / video calls: start, answer, end, tokens, history. */
{{#if SWAGGER}}
@ApiTags('Calling')
{{/if}}
@Controller('calls')
export class CallingController {
  constructor(private readonly calling: CallingService) {}

  @Post()
  @Endpoint({ summary: 'Start a one-to-one call', message: CALLING_MESSAGES.callInitiated, status: 201, errors: [400, 401, 404, 409, 422], bearer: true })
  initiateCall(@CurrentUser() user: User, @Body() dto: InitiateCallDto) {
    return this.calling.initiateCall({ callerId: user.id, receiverId: dto.receiverId, callType: dto.callType });
  }

  @Post('group')
  @Endpoint({ summary: 'Start a group call', message: CALLING_MESSAGES.groupCallInitiated, status: 201, errors: [400, 401, 404, 422], bearer: true })
  initiateGroupCall(@CurrentUser() user: User, @Body() dto: InitiateGroupCallDto) {
    return this.calling.initiateGroupCall({ callerId: user.id, participantIds: dto.participantIds, callType: dto.callType });
  }

  @Get('history')
  @Endpoint({ summary: 'Your call history', message: CALLING_MESSAGES.historyRetrieved, errors: [401, 422], bearer: true })
  history(@CurrentUser() user: User, @Query() query: CallHistoryQueryDto) {
    return this.calling.getCallHistory({ userId: user.id, limit: query.limit ?? 20, offset: query.offset ?? 0 });
  }

  @Delete('history')
  @Endpoint({ summary: 'Clear your call history (the others keep theirs)', message: CALLING_MESSAGES.callLogsCleared, response: null, errors: [401], bearer: true })
  async clearHistory(@CurrentUser() user: User) {
    await this.calling.clearCallLogs(user.id);
  }

  @Get('active')
  @Endpoint({ summary: 'Your current call', message: CALLING_MESSAGES.activeCallRetrieved, errors: [401], bearer: true })
  async active(@CurrentUser() user: User) {
    return { call: await this.calling.getActiveCall(user.id) };
  }

  @Get(':callId')
  @Endpoint({ summary: 'One call', message: CALLING_MESSAGES.callRetrieved, errors: [401, 404], bearer: true })
  getCall(@Param('callId') callId: string) {
    return this.calling.getCallById(callId);
  }

  @Delete(':callId')
  @Endpoint({ summary: 'Remove a call from your history', message: CALLING_MESSAGES.callLogDeleted, response: null, errors: [401, 404], bearer: true })
  async deleteLog(@CurrentUser() user: User, @Param('callId') callId: string) {
    await this.calling.deleteCallLog(callId, user.id);
  }

  @Post(':callId/accept')
  @Endpoint({ summary: 'Answer a call', message: CALLING_MESSAGES.callAccepted, status: 200, errors: [400, 401, 404], bearer: true })
  accept(@CurrentUser() user: User, @Param('callId') callId: string) {
    return this.calling.acceptCall(callId, user.id);
  }

  @Post(':callId/reject')
  @Endpoint({ summary: 'Decline a call', message: CALLING_MESSAGES.callRejected, status: 200, errors: [400, 401, 404], bearer: true })
  reject(@CurrentUser() user: User, @Param('callId') callId: string) {
    return this.calling.rejectCall(callId, user.id);
  }

  @Post(':callId/end')
  @Endpoint({ summary: 'Hang up', message: CALLING_MESSAGES.callEnded, status: 200, errors: [400, 401, 404], bearer: true })
  end(@CurrentUser() user: User, @Param('callId') callId: string) {
    return this.calling.endCall(callId, user.id);
  }

  @Post(':callId/end-for-all')
  @Endpoint({ summary: 'End a group call for everyone', message: CALLING_MESSAGES.callEndedForAll, status: 200, errors: [400, 401, 403, 404], bearer: true })
  endForAll(@CurrentUser() user: User, @Param('callId') callId: string) {
    return this.calling.endCallForAll(callId, user.id);
  }

  @Post(':callId/cancel')
  @Endpoint({ summary: 'Cancel a call before it is answered', message: CALLING_MESSAGES.callCancelled, status: 200, errors: [400, 401, 404], bearer: true })
  cancel(@CurrentUser() user: User, @Param('callId') callId: string) {
    return this.calling.cancelCall(callId, user.id);
  }

  @Post(':callId/join')
  @Endpoint({ summary: 'Join a group call', message: CALLING_MESSAGES.joinedGroupCall, status: 200, errors: [400, 401, 404], bearer: true })
  join(@CurrentUser() user: User, @Param('callId') callId: string) {
    return this.calling.joinGroupCall(callId, user.id);
  }

  @Post(':callId/leave')
  @Endpoint({ summary: 'Leave a group call', message: CALLING_MESSAGES.leftGroupCall, status: 200, response: null, errors: [400, 401, 404], bearer: true })
  async leave(@CurrentUser() user: User, @Param('callId') callId: string) {
    await this.calling.leaveGroupCall(callId, user.id);
  }

  @Post(':callId/agora-token')
  @Endpoint({ summary: 'Agora RTC token for this call', message: CALLING_MESSAGES.tokenGenerated, status: 200, errors: [401, 403, 404], bearer: true })
  agoraToken(@CurrentUser() user: User, @Param('callId') callId: string) {
    return this.calling.getCallToken({ callId, userId: user.id });
  }

  @Get(':callId/participants')
  @Endpoint({ summary: 'Who is in the call', message: CALLING_MESSAGES.participantsRetrieved, errors: [401, 404], bearer: true })
  async participants(@Param('callId') callId: string) {
    return { participants: await this.calling.getCallParticipants(callId) };
  }
}
