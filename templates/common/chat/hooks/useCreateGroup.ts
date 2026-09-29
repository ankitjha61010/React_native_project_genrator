import { useCallback, useState } from 'react';
import { errorMessage } from '{{IMPORT:api.errors}}';
import type { LocalFile } from '{{IMPORT:api.user}}';
import type { Conversation } from '{{IMPORT:chat.types}}';
import { flash } from '{{IMPORT:utils.flashMessage}}';
import { chatService } from '../services/chatService';
import { groupService } from '../services/groupService';

/** New group: name, image, members. The creator becomes the admin. */
export function useCreateGroup() {
  const [title, setTitle] = useState('');
  const [image, setImage] = useState<LocalFile | null>(null);
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  const toggleMember = useCallback((userId: string) => setMemberIds(ids => (ids.includes(userId) ? ids.filter(id => id !== userId) : [...ids, userId])), []);

  /** Uploads the image (if any), creates the group. Resolves the new conversation, or null. */
  const create = useCallback(async (): Promise<Conversation | null> => {
    if (!title.trim() || !memberIds.length) return null;
    setCreating(true);
    try {
      const avatarUrl = image ? await chatService.uploadImage(image.uri, image.fileName, image.mimeType) : null;
      return await groupService.create({ title: title.trim(), participantIds: memberIds, avatarUrl });
    } catch (error) {
      flash.error({ message: errorMessage(error) });
      return null;
    } finally {
      setCreating(false);
    }
  }, [image, memberIds, title]);

  return { title, setTitle, image, setImage, memberIds, toggleMember, canCreate: Boolean(title.trim()) && memberIds.length > 0, creating, create };
}
