import { Router } from 'express';
import type { Services } from '{{IMPORT:app.container}}';
import { requireAuth } from '{{IMPORT:ex.mw.auth}}';
import { upload } from '{{IMPORT:ex.mw.upload}}';
import { ChatController } from '{{IMPORT:ex.chat.controller}}';

/** `/chat` – conversations, messages{{#if GROUP_CHAT}}, groups{{/if}} and media uploads. */
export function chatRoutes(services: Services): Router {
  const router = Router();
  const chat = new ChatController(services.chat);

  // Every /chat route needs a signed-in user.
  router.use(requireAuth(services.sessions));

  router.get('/conversations', chat.listConversations);
  router.post('/conversations', chat.startConversation);
  router.get('/conversations/:conversationId', chat.getConversation);
  router.delete('/conversations/:conversationId', chat.deleteConversation);
  router.get('/conversations/:conversationId/messages', chat.listMessages);
  router.post('/conversations/:conversationId/messages', chat.sendMessage);
  router.post('/conversations/:conversationId/read', chat.markRead);
  router.delete('/conversations/:conversationId/messages/:messageId', chat.deleteMessage);
{{#if GROUP_CHAT}}
  // Groups (changes are for admins, see ChatService).
  router.post('/groups', chat.createGroup);
  router.patch('/groups/:conversationId', chat.updateGroup);
  router.post('/groups/:conversationId/members', chat.addMembers);
  router.delete('/groups/:conversationId/members/:userId', chat.removeMember);
  router.patch('/groups/:conversationId/members/:userId', chat.setMemberRole);
  router.post('/groups/:conversationId/leave', chat.leaveGroup);
{{/if}}
  router.post('/upload', upload('file'), chat.upload);
  router.post('/upload-voice', upload('file'), chat.uploadVoice);
  return router;
}
