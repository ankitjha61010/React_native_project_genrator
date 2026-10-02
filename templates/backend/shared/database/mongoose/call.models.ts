import { Schema, model, type Document, type Types } from 'mongoose';

// ─── Call Document ────────────────────────────────────────────────────────────

export interface ICallDocument extends Document {
  callerId: Types.ObjectId;
  receiverId?: Types.ObjectId;
  callType: 'audio' | 'video';
  isGroupCall: boolean;
  channelName: string;
  status: 'initiating' | 'ringing' | 'connecting' | 'connected' | 'reconnecting' | 'busy' | 'declined' | 'missed' | 'cancelled' | 'ended' | 'failed';
  startedAt?: Date;
  answeredAt?: Date;
  endedAt?: Date;
  duration?: number;
  endReason?: 'normal' | 'declined' | 'missed' | 'cancelled' | 'busy' | 'failed' | 'timeout';
  createdAt: Date;
  updatedAt: Date;
}

const CallSchema = new Schema<ICallDocument>(
  {
    callerId: { type: Schema.Types.ObjectId, required: true, index: true },
    receiverId: { type: Schema.Types.ObjectId, index: true },
    callType: { type: String, enum: ['audio', 'video'], required: true },
    isGroupCall: { type: Boolean, default: false },
    channelName: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: ['initiating', 'ringing', 'connecting', 'connected', 'reconnecting', 'busy', 'declined', 'missed', 'cancelled', 'ended', 'failed'],
      default: 'initiating',
      index: true,
    },
    startedAt: Date,
    answeredAt: Date,
    endedAt: Date,
    duration: Number,
    endReason: { type: String, enum: ['normal', 'declined', 'missed', 'cancelled', 'busy', 'failed', 'timeout'] },
  },
  { timestamps: true },
);

CallSchema.index({ createdAt: -1 });

export const CallModel = model<ICallDocument>('Call', CallSchema);

// ─── CallParticipant Document ─────────────────────────────────────────────────

export interface ICallParticipantDocument extends Document {
  callId: Types.ObjectId;
  userId: Types.ObjectId;
  joinedAt?: Date;
  leftAt?: Date;
  status: 'invited' | 'ringing' | 'joined' | 'left' | 'declined' | 'missed';
  role: 'host' | 'participant';
  hiddenAt?: Date;
}

const CallParticipantSchema = new Schema<ICallParticipantDocument>({
  callId: { type: Schema.Types.ObjectId, required: true, ref: 'Call', index: true },
  userId: { type: Schema.Types.ObjectId, required: true, index: true },
  joinedAt: Date,
  leftAt: Date,
  status: { type: String, enum: ['invited', 'ringing', 'joined', 'left', 'declined', 'missed'], default: 'invited' },
  role: { type: String, enum: ['host', 'participant'], default: 'participant' },
  // Deleted from this user's call history.
  hiddenAt: Date,
});

CallParticipantSchema.index({ callId: 1, userId: 1 }, { unique: true });

export const CallParticipantModel = model<ICallParticipantDocument>('CallParticipant', CallParticipantSchema);
