import { z } from 'zod';

export const InitiateCallSchema = z.object({
  receiverId: z.string().min(1),
  callType: z.enum(['audio', 'video']),
});

export const InitiateGroupCallSchema = z.object({
  participantIds: z.array(z.string().min(1)).min(1),
  callType: z.enum(['audio', 'video']),
});

export const AgoraTokenSchema = z.object({
  role: z.enum(['publisher', 'subscriber']).optional(),
});

/** POST /calls/voip-token – the iOS app's PushKit token (the app usually sends no deviceId). */
export const RegisterVoipTokenSchema = z
  .object({
    voipToken: z.string().min(10).max(512).meta({ description: 'The iOS VoIP (PushKit) push token' }),
    deviceId: z.string().min(1).max(128).optional().meta({ description: "The install's device id – default: your most recently active iOS device" }),
  })
  .meta({ id: 'RegisterVoipTokenRequest' });

export type InitiateCallDto = z.infer<typeof InitiateCallSchema>;
export type InitiateGroupCallDto = z.infer<typeof InitiateGroupCallSchema>;
export type AgoraTokenDto = z.infer<typeof AgoraTokenSchema>;
export type RegisterVoipTokenDto = z.infer<typeof RegisterVoipTokenSchema>;
