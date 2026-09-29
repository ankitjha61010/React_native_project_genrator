import type { ErrorMessage } from '{{IMPORT:core.messages}}';

/** Every message of the chat feature – change the wording here. */
export const CHAT_MESSAGES = {
  conversations: 'Conversations',
  conversation: 'Conversation',
  conversationDeleted: 'Conversation deleted',
  messages: 'Messages',
  messageSent: 'Message sent',
  markedRead: 'Marked as read',
  messageDeleted: 'Message deleted',
  fileUploaded: 'File uploaded',
  voiceNoteUploaded: 'Voice note uploaded',
  /** Shown instead of a missing name. */
  untitled: 'Chat',
  deletedUser: 'Deleted user',
  /** Push title when the sender is unknown. */
  newMessagePush: 'New message',
{{#if GROUP_CHAT}}
  groupCreated: 'Group created',
  groupUpdated: 'Group updated',
  membersAdded: 'Members added',
  memberRemoved: 'Member removed',
  roleChanged: 'Role changed',
  leftGroup: 'You left the group',
{{/if}}
  // ── errors ─────────────────────────────────────────────────────────────────
  conversationNotFound: { message: 'Conversation not found', code: 'CONVERSATION_NOT_FOUND' },
  messageNotFound: { message: 'Message not found', code: 'MESSAGE_NOT_FOUND' },
  participantsNotFound: { message: 'Some participants were not found', code: 'USER_NOT_FOUND' },
  noParticipants: { message: 'Pick at least one other participant', code: 'NO_PARTICIPANTS' },
  tooManyParticipants: { message: 'A direct chat has exactly one other participant', code: 'TOO_MANY_PARTICIPANTS' },
  emptyMessage: { message: 'A text message needs text', code: 'EMPTY_MESSAGE' },
  mediaRequired: { message: 'Upload the file first and send its mediaUrl', code: 'MEDIA_REQUIRED' },
  notYourMessage: { message: 'You can only delete your own messages', code: 'NOT_YOUR_MESSAGE' },
  invalidFileType: (mimeType: string): ErrorMessage => ({ message: `Files of type ${mimeType} can't be sent`, code: 'INVALID_FILE_TYPE' }),
{{#if GROUP_CHAT}}
  titleRequired: { message: 'A group needs a name', code: 'TITLE_REQUIRED' },
  notAGroup: { message: 'This conversation is not a group', code: 'NOT_A_GROUP' },
  adminOnly: { message: 'Only group admins can do this', code: 'ADMIN_ONLY' },
  notAMember: { message: 'This user is not a member of the group', code: 'NOT_A_MEMBER' },
  removeYourself: { message: 'Use "Leave group" to remove yourself', code: 'USE_LEAVE' },
{{/if}}
} as const satisfies Record<string, string | ErrorMessage | ((...args: never[]) => ErrorMessage)>;
