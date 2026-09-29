import { api } from '{{IMPORT:api.client}}';
import type { Conversation, MemberRole } from '{{IMPORT:chat.types}}';
import { CHAT_ENDPOINTS } from '../chatEndpoints';
import { normalizeConversation } from './chatService';

/** Group requests (the backend's /chat/groups routes). Changes are for admins, except leaving. */
export const groupService = {
  /** You become the group's admin. `avatarUrl`: chatService.uploadImage() first. */
  create: async (input: { title: string; participantIds: string[]; avatarUrl?: string | null }) =>
    normalizeConversation(await api.post<Conversation>(CHAT_ENDPOINTS.GROUPS, input)),

  update: async (conversationId: string, changes: { title?: string; avatarUrl?: string | null }) =>
    normalizeConversation(await api.patch<Conversation>(CHAT_ENDPOINTS.GROUP(conversationId), changes)),

  addMembers: async (conversationId: string, userIds: string[]) =>
    normalizeConversation(await api.post<Conversation>(CHAT_ENDPOINTS.GROUP_MEMBERS(conversationId), { userIds })),

  removeMember: async (conversationId: string, userId: string) =>
    normalizeConversation(await api.delete<Conversation>(CHAT_ENDPOINTS.GROUP_MEMBER(conversationId, userId))),

  setRole: async (conversationId: string, userId: string, role: MemberRole) =>
    normalizeConversation(await api.patch<Conversation>(CHAT_ENDPOINTS.GROUP_MEMBER(conversationId, userId), { role })),

  /** When the last admin leaves, the longest-standing member becomes admin. */
  leave: (conversationId: string) => api.post<null>(CHAT_ENDPOINTS.LEAVE_GROUP(conversationId)),
};
