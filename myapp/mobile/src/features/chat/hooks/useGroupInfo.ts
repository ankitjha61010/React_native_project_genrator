import { useCallback, useEffect, useState } from 'react';
import { errorMessage } from '@data/api/apiErrors';
import type { LocalFile } from '@data/api/userApi';
import type { Conversation, MemberRole } from '@features/chat/types/chat';
import { SOCKET_EVENTS } from '@services/socket/socketEvents';
import { socketService } from '@services/socket/socketService';
import { flash } from '@utils/flashMessage';
import { chatService } from '../services/chatService';
import { groupService } from '../services/groupService';

/**
 * Group info: name, image, members and admins. Admins change them; everybody can leave.
 * Changes made by other admins arrive live (chat:conversation_updated).
 */
export function useGroupInfo(conversationId: string) {
  const [group, setGroup] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  /** What is being saved right now (one action at a time). */
  const [busy, setBusy] = useState<string | null>(null);
  /** You left / were removed – the screen closes. */
  const [removed, setRemoved] = useState(false);

  const load = useCallback(async () => {
    try {
      setGroup(await chatService.fetchConversation(conversationId));
    } catch (error) {
      flash.error({ message: errorMessage(error) });
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    load();
    const subscriptions = [
      socketService.on<{ conversationId: string }>(SOCKET_EVENTS.CONVERSATION_UPDATED, event => {
        if (event.conversationId === conversationId) load();
      }),
      socketService.on<{ conversationId: string }>(SOCKET_EVENTS.CONVERSATION_REMOVED, event => {
        if (event.conversationId === conversationId) setRemoved(true);
      }),
    ];
    return () => subscriptions.forEach(off => off());
  }, [conversationId, load]);

  /** Runs one change, shows errors, keeps the group up to date. */
  const run = useCallback(async (key: string, action: () => Promise<Conversation | null>): Promise<boolean> => {
    setBusy(key);
    try {
      const updated = await action();
      if (updated) setGroup(updated);
      return true;
    } catch (error) {
      flash.error({ message: errorMessage(error) });
      return false;
    } finally {
      setBusy(null);
    }
  }, []);

  return {
    group,
    loading,
    busy,
    removed,
    isAdmin: group?.myRole === 'admin',
    rename: (title: string) => run('title', () => groupService.update(conversationId, { title })),
    changeImage: (image: LocalFile) =>
      run('image', async () => groupService.update(conversationId, { avatarUrl: await chatService.uploadImage(image.uri, image.fileName, image.mimeType) })),
    addMembers: (userIds: string[]) => run('members', () => groupService.addMembers(conversationId, userIds)),
    removeMember: (userId: string) => run(userId, () => groupService.removeMember(conversationId, userId)),
    setRole: (userId: string, role: MemberRole) => run(userId, () => groupService.setRole(conversationId, userId, role)),
    leave: () =>
      run('leave', async () => {
        await groupService.leave(conversationId);
        return null;
      }),
  };
}
