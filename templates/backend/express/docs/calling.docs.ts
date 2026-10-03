// ─── Calling API Documentation (OpenAPI / Swagger) ───────────────────────────
// Auto-generated stub – expand with your actual schemas.

export const callingDocs = {
  '/calls': {
    post: {
      tags: ['Calling'],
      summary: 'Initiate a one-to-one call',
      security: [{ bearerAuth: [] }],
    },
  },
  '/calls/group': {
    post: { tags: ['Calling'], summary: 'Initiate a group call', security: [{ bearerAuth: [] }] },
  },
  '/calls/voip-token': {
    post: {
      tags: ['Calling'],
      summary: "Save the iOS VoIP (PushKit) token – body { voipToken, deviceId? }; no deviceId: your most recently active iOS device",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['voipToken'],
              properties: {
                voipToken: { type: 'string', minLength: 10, maxLength: 512 },
                deviceId: { type: 'string', minLength: 1, maxLength: 128 },
              },
            },
          },
        },
      },
    },
  },
  '/calls/history': {
    get: { tags: ['Calling'], summary: 'Get call history', security: [{ bearerAuth: [] }] },
    delete: {
      tags: ['Calling'],
      summary: "Clear the user's call history (others keep theirs)",
      security: [{ bearerAuth: [] }],
    },
  },
  '/calls/active': {
    get: { tags: ['Calling'], summary: 'Get active call', security: [{ bearerAuth: [] }] },
  },
  '/calls/{callId}': {
    get: { tags: ['Calling'], summary: 'Get call by ID', security: [{ bearerAuth: [] }] },
    delete: { tags: ['Calling'], summary: "Remove a call from the user's history", security: [{ bearerAuth: [] }] },
  },
  '/calls/{callId}/accept': {
    post: { tags: ['Calling'], summary: 'Accept a call', security: [{ bearerAuth: [] }] },
  },
  '/calls/{callId}/reject': {
    post: { tags: ['Calling'], summary: 'Reject a call', security: [{ bearerAuth: [] }] },
  },
  '/calls/{callId}/end': {
    post: { tags: ['Calling'], summary: 'End a call', security: [{ bearerAuth: [] }] },
  },
  '/calls/{callId}/end-for-all': {
    post: { tags: ['Calling'], summary: 'End call for everyone (host only)', security: [{ bearerAuth: [] }] },
  },
  '/calls/{callId}/cancel': {
    post: { tags: ['Calling'], summary: 'Cancel an outgoing call', security: [{ bearerAuth: [] }] },
  },
  '/calls/{callId}/join': {
    post: { tags: ['Calling'], summary: 'Join a group call', security: [{ bearerAuth: [] }] },
  },
  '/calls/{callId}/leave': {
    post: { tags: ['Calling'], summary: 'Leave a group call', security: [{ bearerAuth: [] }] },
  },
  '/calls/{callId}/agora-token': {
    post: { tags: ['Calling'], summary: 'Get Agora RTC token for a call', security: [{ bearerAuth: [] }] },
  },
  '/calls/{callId}/participants': {
    get: { tags: ['Calling'], summary: 'Get call participants', security: [{ bearerAuth: [] }] },
  },
};
