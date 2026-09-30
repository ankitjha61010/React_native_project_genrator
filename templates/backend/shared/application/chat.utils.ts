import type { MessageType, SendableMessageType } from '{{IMPORT:domain.chat}}';

/** Which uploads may be sent, and as which message type. */
const MEDIA_TYPES: Array<[RegExp, SendableMessageType]> = [
  [/^image\/(jpeg|png|gif|webp|heic|heif)$/, 'image'],
  [/^video\/(mp4|quicktime|3gpp|webm)$/, 'video'],
  [/^audio\/(mpeg|mp4|aac|x-m4a|m4a|ogg|wav|webm|3gpp|x-wav)$/, 'audio'],
  [/^(application\/(pdf|msword|zip|vnd\.openxmlformats-officedocument\.[\w.]+|vnd\.ms-(excel|powerpoint))|text\/(plain|csv))$/, 'document'],
];

/** `image/png` → `image`; undefined for files that can't be sent. */
export function messageTypeOf(mimeType: string): SendableMessageType | undefined {
  return MEDIA_TYPES.find(([pattern]) => pattern.test(mimeType))?.[1];
}

/** 2_516_582 → "2.4 MB". */
export function humanSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(Math.max(bytes, 1)) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

/** The text of a push notification for a message. */
export function messagePreview(message: { type: MessageType; text: string | null; fileName: string | null }): string {
  if (message.type === 'text' || message.type === 'system') return message.text ?? '';
  const label = { image: 'Photo', video: 'Video', audio: 'Voice message', document: message.fileName ?? 'Document' }[message.type];
  return `📎 ${label}`;
}
