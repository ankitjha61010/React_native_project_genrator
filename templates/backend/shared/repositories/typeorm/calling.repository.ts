import { DataSource, IsNull } from 'typeorm';
import type { ICallingRepository, CreateCallInput, UpdateCallStatusInput } from '{{IMPORT:contract.calling}}';
import type { CallEntity, CallParticipantEntity } from '{{IMPORT:domain.call}}';
import { CallOrmEntity, CallParticipantOrmEntity } from '{{IMPORT:typeorm.calling}}';

function mapCall(e: CallOrmEntity): CallEntity {
  return {
    id: e.id,
    callerId: e.callerId,
    receiverId: e.receiverId,
    callType: e.callType as CallEntity['callType'],
    isGroupCall: e.isGroupCall,
    channelName: e.channelName,
    status: e.status as CallEntity['status'],
    startedAt: e.startedAt,
    answeredAt: e.answeredAt,
    endedAt: e.endedAt,
    duration: e.duration,
    endReason: e.endReason as CallEntity['endReason'],
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  };
}

function mapParticipant(e: CallParticipantOrmEntity): CallParticipantEntity {
  return {
    id: e.id,
    callId: e.callId,
    userId: e.userId,
    joinedAt: e.joinedAt,
    leftAt: e.leftAt,
    status: e.status as CallParticipantEntity['status'],
    role: e.role as CallParticipantEntity['role'],
    hiddenAt: e.hiddenAt ?? undefined,
  };
}

const ACTIVE_STATUSES = ['initiating', 'ringing', 'connecting', 'connected', 'reconnecting'];

export class TypeOrmCallingRepository implements ICallingRepository {
  private readonly callRepo;
  private readonly participantRepo;

  constructor(ds: DataSource) {
    this.callRepo = ds.getRepository(CallOrmEntity);
    this.participantRepo = ds.getRepository(CallParticipantOrmEntity);
  }

  async createCall(input: CreateCallInput): Promise<CallEntity> {
    const call = this.callRepo.create({ ...input, status: 'initiating' });
    return mapCall(await this.callRepo.save(call));
  }

  async findCallById(callId: string): Promise<CallEntity | null> {
    const call = await this.callRepo.findOneBy({ id: callId });
    return call ? mapCall(call) : null;
  }

  async findActiveCallByUserId(userId: string): Promise<CallEntity | null> {
    const call = await this.callRepo
      .createQueryBuilder('call')
      .leftJoin('call.participants', 'p')
      .where('call.status IN (:...statuses)', { statuses: ACTIVE_STATUSES })
      .andWhere('(call.callerId = :uid OR call.receiverId = :uid OR (p.userId = :uid AND p.status IN (:...pStatuses)))', {
        uid: userId,
        pStatuses: ['invited', 'ringing', 'joined'],
      })
      .getOne();
    return call ? mapCall(call) : null;
  }

  async updateCallStatus(input: UpdateCallStatusInput): Promise<CallEntity> {
    await this.callRepo.update(input.callId, {
      status: input.status,
      ...(input.endReason && { endReason: input.endReason }),
      ...(input.answeredAt && { answeredAt: input.answeredAt }),
      ...(input.endedAt && { endedAt: input.endedAt }),
      ...(input.duration !== undefined && { duration: input.duration }),
    });
    return mapCall((await this.callRepo.findOneByOrFail({ id: input.callId })));
  }

  async getUserCallHistory(userId: string, limit: number, offset: number): Promise<CallEntity[]> {
    const calls = await this.callRepo
      .createQueryBuilder('call')
      // Calls they took part in and have not deleted from their history.
      .innerJoin('call.participants', 'p', 'p.userId = :uid AND p.hiddenAt IS NULL', { uid: userId })
      .distinct(true)
      .orderBy('call.createdAt', 'DESC')
      .take(limit)
      .skip(offset)
      .getMany();
    return calls.map(mapCall);
  }

  async countUserCalls(userId: string): Promise<number> {
    return this.callRepo
      .createQueryBuilder('call')
      // Calls they took part in and have not deleted from their history.
      .innerJoin('call.participants', 'p', 'p.userId = :uid AND p.hiddenAt IS NULL', { uid: userId })
      .distinct(true)
      .getCount();
  }

  async addParticipant(callId: string, userId: string, role: CallParticipantEntity['role'] = 'participant'): Promise<CallParticipantEntity> {
    const existing = await this.participantRepo.findOneBy({ callId, userId });
    if (existing) {
      existing.role = role;
      return mapParticipant(await this.participantRepo.save(existing));
    }
    const p = this.participantRepo.create({ callId, userId, role, status: 'invited' });
    return mapParticipant(await this.participantRepo.save(p));
  }

  async updateParticipantStatus(callId: string, userId: string, status: CallParticipantEntity['status'], leftAt?: Date): Promise<void> {
    await this.participantRepo.update({ callId, userId }, { status, ...(leftAt && { leftAt }) });
  }

  async getCallParticipants(callId: string): Promise<CallParticipantEntity[]> {
    const ps = await this.participantRepo.findBy({ callId });
    return ps.map(mapParticipant);
  }

  async findParticipant(callId: string, userId: string): Promise<CallParticipantEntity | null> {
    const p = await this.participantRepo.findOneBy({ callId, userId });
    return p ? mapParticipant(p) : null;
  }

  async hideCallForUser(callId: string, userId: string): Promise<void> {
    await this.participantRepo.update({ callId, userId }, { hiddenAt: new Date() });
  }

  async hideAllCallsForUser(userId: string): Promise<void> {
    await this.participantRepo.update({ userId, hiddenAt: IsNull() }, { hiddenAt: new Date() });
  }
}
