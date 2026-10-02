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

export type InitiateCallDto = z.infer<typeof InitiateCallSchema>;
export type InitiateGroupCallDto = z.infer<typeof InitiateGroupCallSchema>;
export type AgoraTokenDto = z.infer<typeof AgoraTokenSchema>;
