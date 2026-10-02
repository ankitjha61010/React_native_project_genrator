import type { ICallingRepository, CreateCallInput, UpdateCallStatusInput } from '{{IMPORT:contract.calling}}';
import type { CallEntity, CallParticipantEntity, CallStatus } from '{{IMPORT:domain.call}}';
import { CallModel, CallParticipantModel } from '{{IMPORT:mongoose.calling}}';

function mapCall(doc: any): CallEntity {
  return {
    id: String(doc._id),
    callerId: String(doc.callerId),
    receiverId: doc.receiverId ? String(doc.receiverId) : undefined,
    callType: doc.callType,
    isGroupCall: doc.isGroupCall,
    channelName: doc.channelName,
    status: doc.status,
    startedAt: doc.startedAt,
    answeredAt: doc.answeredAt,
    endedAt: doc.endedAt,
    duration: doc.duration,
    endReason: doc.endReason,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function mapParticipant(doc: any): CallParticipantEntity {
  return {
    id: String(doc._id),
    callId: String(doc.callId),
    userId: String(doc.userId),
    joinedAt: doc.joinedAt,
    leftAt: doc.leftAt,
    status: doc.status,
    role: doc.role,
    hiddenAt: doc.hiddenAt ?? undefined,
  };
}

const ACTIVE_STATUSES: CallStatus[] = ['initiating', 'ringing', 'connecting', 'connected', 'reconnecting'];

export class MongooseCallingRepository implements ICallingRepository {
  async createCall(input: CreateCallInput): Promise<CallEntity> {
    const call = await CallModel.create({
      callerId: input.callerId,
      receiverId: input.receiverId,
      callType: input.callType,
      isGroupCall: input.isGroupCall,
      channelName: input.channelName,
      status: 'initiating',
    });
    return mapCall(call);
  }

  async findCallById(callId: string): Promise<CallEntity | null> {
    const call = await CallModel.findById(callId).lean();
    return call ? mapCall(call) : null;
  }

  async findActiveCallByUserId(userId: string): Promise<CallEntity | null> {
    const call = await CallModel.findOne({
      $or: [{ callerId: userId }, { receiverId: userId }],
      status: { $in: ACTIVE_STATUSES },
    }).lean();
    return call ? mapCall(call) : null;
  }

  async updateCallStatus(input: UpdateCallStatusInput): Promise<CallEntity> {
    const update: Record<string, any> = { status: input.status };
    if (input.endReason) update['endReason'] = input.endReason;
    if (input.answeredAt) update['answeredAt'] = input.answeredAt;
    if (input.endedAt) update['endedAt'] = input.endedAt;
    if (input.duration !== undefined) update['duration'] = input.duration;

    const call = await CallModel.findByIdAndUpdate(input.callId, { $set: update }, { returnDocument: 'after' }).lean();
    return mapCall(call);
  }

  async getUserCallHistory(userId: string, limit: number, offset: number): Promise<CallEntity[]> {
    const calls = await CallModel.find({
      _id: { $in: await this.visibleCallIds(userId) },
      status: { $in: ['ended', 'missed', 'declined', 'cancelled', 'failed'] },
    })
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .lean();
    return calls.map(mapCall);
  }

  async countUserCalls(userId: string): Promise<number> {
    return CallModel.countDocuments({
      _id: { $in: await this.visibleCallIds(userId) },
      status: { $in: ['ended', 'missed', 'declined', 'cancelled', 'failed'] },
    });
  }

  /** Calls in this user's history: they took part and have not deleted them. */
  private async visibleCallIds(userId: string) {
    return (await CallParticipantModel.find({ userId, hiddenAt: null }).select('callId').lean()).map((p) => p.callId);
  }

  async addParticipant(
    callId: string,
    userId: string,
    role: CallParticipantEntity['role'] = 'participant',
  ): Promise<CallParticipantEntity> {
    const p = await CallParticipantModel.findOneAndUpdate(
      { callId, userId },
      { $setOnInsert: { callId, userId, status: 'invited' }, $set: { role } },
      { upsert: true, returnDocument: 'after' },
    ).lean();
    return mapParticipant(p!);
  }

  async updateParticipantStatus(
    callId: string,
    userId: string,
    status: CallParticipantEntity['status'],
    leftAt?: Date,
  ): Promise<void> {
    const update: Record<string, any> = { status };
    if (leftAt) update['leftAt'] = leftAt;
    await CallParticipantModel.updateMany({ callId, userId }, { $set: update });
  }

  async getCallParticipants(callId: string): Promise<CallParticipantEntity[]> {
    const ps = await CallParticipantModel.find({ callId }).lean();
    return ps.map(mapParticipant);
  }

  async findParticipant(callId: string, userId: string): Promise<CallParticipantEntity | null> {
    const p = await CallParticipantModel.findOne({ callId, userId }).lean();
    return p ? mapParticipant(p) : null;
  }

  async hideCallForUser(callId: string, userId: string): Promise<void> {
    await CallParticipantModel.updateOne({ callId, userId }, { $set: { hiddenAt: new Date() } });
  }

  async hideAllCallsForUser(userId: string): Promise<void> {
    await CallParticipantModel.updateMany({ userId, hiddenAt: null }, { $set: { hiddenAt: new Date() } });
  }
}
