import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { errorMessage } from '{{IMPORT:api.errors}}';
import { translate } from '{{IMPORT:i18n.index}}';
import { flash } from '{{IMPORT:utils.flashMessage}}';
import { chatService } from '../services/chatService';

export type ChatAction = 'clear' | 'clearAll' | 'delete' | 'block';

/**
 * "Clear chat", "Clear all chats" and "Delete chat" – each asks first. Everything happens for
 * you only: the other members keep their messages. `onDeleted`: the chat is gone (leave the screen).
 */
export function useChatActions(conversationId: string, onDeleted?: () => void) {
  /** The action running right now (its button shows a spinner). */
  const [busy, setBusy] = useState<ChatAction | null>(null);

  const run = useCallback(async (action: ChatAction, request: () => Promise<unknown>, done: string) => {
    setBusy(action);
    try {
      await request();
      flash.success({ message: done });
      if (action === 'delete') onDeleted?.();
    } catch (error) {
      flash.error({ message: errorMessage(error) });
    } finally {
      setBusy(null);
    }
  }, [onDeleted]);

  /** Asks "Are you sure…?" with Cancel / <confirm>. */
  const confirm = (title: string, message: string, confirmLabel: string, onConfirm: () => void) =>
    Alert.alert(title, message, [
      { text: translate('common', 'cancel'), style: 'cancel' },
      { text: confirmLabel, style: 'destructive', onPress: onConfirm },
    ]);

  return {
    busy,
    clearChat: () =>
      confirm(translate('common', 'clearChat'), translate('common', 'clearChatConfirm'), translate('common', 'clear'), () =>
        run('clear', () => chatService.clearConversation(conversationId), translate('common', 'chatCleared')),
      ),
    clearAllChats: () =>
      confirm(translate('common', 'clearAllChats'), translate('common', 'clearAllChatsConfirm'), translate('common', 'clear'), () =>
        run('clearAll', () => chatService.clearAllConversations(), translate('common', 'allChatsCleared')),
      ),
    deleteChat: () =>
      confirm(translate('common', 'deleteChat'), translate('common', 'deleteChatConfirm'), translate('common', 'delete'), () =>
        run('delete', () => chatService.deleteConversation(conversationId), translate('common', 'chatDeleted')),
      ),
  };
}
