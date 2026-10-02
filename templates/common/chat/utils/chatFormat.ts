import { i18n, translate } from '{{IMPORT:i18n.index}}';
import type { ChatMessage, ReplyTo } from '{{IMPORT:chat.types}}';

/** One row of the chat room list: a message, or the date above the messages of one day. */
export type ChatListItem = { kind: 'message'; key: string; message: ChatMessage } | { kind: 'date'; key: string; label: string };

/** Local calendar day, e.g. "2026-9-28" – messages of the same day share it. */
const dayOf = (date: Date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

/** "Today", "Yesterday", or "28 September 2026" (month name in the app's language). */
export function dateLabel(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  if (dayOf(date) === dayOf(now)) return translate('common', 'today');
  if (dayOf(date) === dayOf(yesterday)) return translate('common', 'yesterday');
  const month = date.toLocaleDateString(i18n.language, { month: 'long' });
  return `${date.getDate()} ${month} ${date.getFullYear()}`;
}

/**
 * Newest first (the inverted chat list) with one date row per day. In an inverted list a row is
 * drawn above the ones before it in the array, so the date goes right after the oldest message
 * of its day – it appears once, above that day's messages (system messages included).
 */
export function withDateSeparators(newestFirst: ChatMessage[], now: Date = new Date()): ChatListItem[] {
  const items: ChatListItem[] = [];
  newestFirst.forEach((message, index) => {
    items.push({ kind: 'message', key: message.id, message });
    const older = newestFirst[index + 1];
    const day = dayOf(new Date(message.createdAt));
    if (!older || dayOf(new Date(older.createdAt)) !== day) items.push({ kind: 'date', key: `date-${day}`, label: dateLabel(message.createdAt, now) });
  });
  return items;
}

/** A call recorded in the chat (`CALL` / `MISSED_CALL` system message), or undefined for other messages. */
export function callLog(message: ChatMessage): { callType: 'audio' | 'video'; answered: boolean } | undefined {
  if (message.type !== 'system' || (message.event !== 'CALL' && message.event !== 'MISSED_CALL')) return undefined;
  return { callType: message.text === 'video' ? 'video' : 'audio', answered: message.event === 'CALL' };
}

/** "2:14" / "1:02:05". */
function talkTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = String(seconds % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

/** "Voice call · 2:14", "Video call · No answer" (you called), "Missed voice call" (they called). */
function callLogText(message: ChatMessage, myId: string | undefined): string {
  const log = callLog(message)!;
  const video = log.callType === 'video';
  const name = translate('common', video ? 'videoCall' : 'voiceCall');
  if (log.answered) return `${name} · ${talkTime(message.duration ?? 0)}`;
  const iCalled = message.actor?.id === myId;
  if (iCalled) return `${name} · ${translate('common', 'noAnswer')}`;
  return translate('common', video ? 'missedVideoCall' : 'missedVoiceCall');
}

/** "You added Rahul", "Abhishek added you", "Abhishek added Rahul"; calls: "Missed voice call"… */
export function systemMessageText(message: ChatMessage, myId: string | undefined): string {
  if (callLog(message)) return callLogText(message, myId);
  const actor = message.actor?.id === myId ? undefined : message.actor?.name;
  const target = message.target?.id === myId ? undefined : message.target?.name;
  switch (message.event) {
    case 'MEMBER_ADDED':
      if (!actor) return translate('common', 'youAdded', { value1: target ?? '' });
      if (!target) return translate('common', 'addedYou', { value1: actor });
      return translate('common', 'memberAdded', { value1: actor, value2: target });
    default:
      return message.text ?? '';
  }
}

/** The media label of a message type ("📷 Photo"), or undefined for text. */
function mediaLabel(type: ChatMessage['type'], fileName?: string): string | undefined {
  switch (type) {
    case 'image':
      return `📷 ${translate('common', 'photo')}`;
    case 'video':
      return `🎥 ${translate('common', 'video')}`;
    case 'audio':
      return `🎙️ ${translate('common', 'voiceMessage')}`;
    case 'document':
      return `📄 ${fileName ?? translate('common', 'document')}`;
    default:
      return undefined;
  }
}

/** The last-message line of the chat list. */
export function messagePreview(message: ChatMessage | undefined, myId: string | undefined): string {
  if (!message) return translate('common', 'startChat');
  if (message.type === 'system') return systemMessageText(message, myId);
  return mediaLabel(message.type, message.fileName) ?? message.text ?? '';
}

/** The quote of a reply: its text, or "📷 Photo", or "This message was deleted". */
export function replyPreview(reply: ReplyTo): string {
  if (reply.deleted) return translate('common', 'deletedMessage');
  return mediaLabel(reply.type, reply.text) ?? reply.text ?? '';
}
