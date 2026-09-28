import { Schema, model, type InferSchemaType, type Types } from 'mongoose';

const deviceSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    token: { type: String, required: true, unique: true, maxlength: 512 },
    platform: { type: String, required: true, maxlength: 16 },
  },
  { timestamps: true, collection: 'devices' },
);

export type DeviceDocument = InferSchemaType<typeof deviceSchema> & { _id: Types.ObjectId; userId: Types.ObjectId; createdAt: Date; updatedAt: Date };
export const DeviceModel = model('Device', deviceSchema);

const notificationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, required: true, maxlength: 20 },
    title: { type: String, required: true, maxlength: 200 },
    body: { type: String, required: true, maxlength: 1000 },
    data: { type: Schema.Types.Mixed, default: {} },
    readAt: { type: Date, default: null },
    broadcastId: { type: Schema.Types.ObjectId, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'notifications', minimize: false },
);
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, readAt: 1 });

export type NotificationDocument = InferSchemaType<typeof notificationSchema> & { _id: Types.ObjectId; userId: Types.ObjectId; broadcastId: Types.ObjectId | null; createdAt: Date };
export const NotificationModel = model('Notification', notificationSchema);

const broadcastSchema = new Schema(
  {
    title: { type: String, required: true, maxlength: 200 },
    body: { type: String, required: true, maxlength: 1000 },
    type: { type: String, required: true, maxlength: 20 },
    data: { type: Schema.Types.Mixed, default: {} },
    audience: { type: String, required: true, maxlength: 16 },
    sentById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    recipientCount: { type: Number, required: true, default: 0 },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'broadcasts', minimize: false },
);

export type BroadcastDocument = InferSchemaType<typeof broadcastSchema> & { _id: Types.ObjectId; sentById: Types.ObjectId; createdAt: Date };
export const BroadcastModel = model('Broadcast', broadcastSchema);
