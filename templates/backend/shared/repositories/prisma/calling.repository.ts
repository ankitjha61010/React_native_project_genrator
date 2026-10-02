import type { PrismaClient } from '{{IMPORT:db.connection}}';
import type { ICallingRepository, CreateCallInput, UpdateCallStatusInput } from '{{IMPORT:contract.calling}}';
import type { CallEntity, CallParticipantEntity, CallStatus } from '{{IMPORT:domain.call}}';

function mapCall(raw: any): CallEntity {
  return {
    id: raw.id,
    callerId: raw.callerId,
    receiverId: raw.receiverId ?? undefined,
    callType: raw.callType,
    isGroupCall: raw.isGroupCall,
    channelName: raw.channelName,
    status: raw.status,
    startedAt: raw.startedAt ?? undefined,
    answeredAt: raw.answeredAt ?? undefined,
    endedAt: raw.endedAt ?? undefined,
    duration: raw.duration ?? undefined,
    endReason: raw.endReason ?? undefined,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

function mapParticipant(raw: any): CallParticipantEntity {
  return {
    id: raw.id,
    callId: raw.callId,
    userId: raw.userId,
    joinedAt: raw.joinedAt ?? undefined,
    leftAt: raw.leftAt ?? undefined,
    status: raw.status,
    role: raw.role,
    hiddenAt: raw.hiddenAt ?? undefined,
  };
}

export class PrismaCallingRepository implements ICallingRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createCall(input: CreateCallInput): Promise<CallEntity> {
    const call = await this.prisma.call.create({
      data: {
        callerId: input.callerId,
        receiverId: input.receiverId,
        callType: input.callType,
        isGroupCall: input.isGroupCall,
        channelName: input.channelName,
        status: 'initiating',
      },
    });
    return mapCall(call);
  }

  async findCallById(callId: string): Promise<CallEntity | null> {
    const call = await this.prisma.call.findUnique({ where: { id: callId } });
    return call ? mapCall(call) : null;
  }

  async findActiveCallByUserId(userId: string): Promise<CallEntity | null> {
    const active: CallStatus[] = ['initiating', 'ringing', 'connecting', 'connected', 'reconnecting'];
    const call = await this.prisma.call.findFirst({
      where: {
        status: { in: active },
        OR: [
          { callerId: userId },
          { receiverId: userId },
          { participants: { some: { userId, status: { in: ['invited', 'ringing', 'joined'] } } } },
        ],
      },
    });
    return call ? mapCall(call) : null;
  }

  async updateCallStatus(input: UpdateCallStatusInput): Promise<CallEntity> {
    const call = await this.prisma.call.update({
      where: { id: input.callId },
      data: {
        status: input.status,
        endReason: input.endReason,
        answeredAt: input.answeredAt,
        endedAt: input.endedAt,
        duration: input.duration,
      },
    });
    return mapCall(call);
  }

  async getUserCallHistory(userId: string, limit: number, offset: number): Promise<CallEntity[]> {
    const calls = await this.prisma.call.findMany({
      // Calls they took part in and have not deleted from their history.
      where: { participants: { some: { userId, hiddenAt: null } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
    return calls.map(mapCall);
  }

  async countUserCalls(userId: string): Promise<number> {
    return this.prisma.call.count({
      // Calls they took part in and have not deleted from their history.
      where: { participants: { some: { userId, hiddenAt: null } } },
    });
  }

  async addParticipant(callId: string, userId: string, role: CallParticipantEntity['role'] = 'participant'): Promise<CallParticipantEntity> {
    const p = await this.prisma.callParticipant.upsert({
      where: { callId_userId: { callId, userId } },
      create: { callId, userId, role, status: 'invited' },
      update: { role },
    });
    return mapParticipant(p);
  }

  async updateParticipantStatus(callId: string, userId: string, status: CallParticipantEntity['status'], leftAt?: Date): Promise<void> {
    await this.prisma.callParticipant.updateMany({
      where: { callId, userId },
      data: { status, leftAt },
    });
  }

  async getCallParticipants(callId: string): Promise<CallParticipantEntity[]> {
    const ps = await this.prisma.callParticipant.findMany({ where: { callId } });
    return ps.map(mapParticipant);
  }

  async findParticipant(callId: string, userId: string): Promise<CallParticipantEntity | null> {
    const p = await this.prisma.callParticipant.findUnique({ where: { callId_userId: { callId, userId } } });
    return p ? mapParticipant(p) : null;
  }

  async hideCallForUser(callId: string, userId: string): Promise<void> {
    await this.prisma.callParticipant.updateMany({ where: { callId, userId }, data: { hiddenAt: new Date() } });
  }

  async hideAllCallsForUser(userId: string): Promise<void> {
    await this.prisma.callParticipant.updateMany({ where: { userId, hiddenAt: null }, data: { hiddenAt: new Date() } });
  }
}
