/** Every message of the notifications feature – change the wording here. */
export const NOTIFICATIONS_MESSAGES = {
  list: 'Notifications',
  unreadCount: 'Unread count',
  allRead: 'All marked as read',
  read: 'Marked as read',
  deleted: 'Notification deleted',
  cleared: 'Notifications cleared',
  broadcastSent: 'Broadcast sent',
  broadcasts: 'Broadcasts',
  broadcastDeleted: 'Broadcast deleted',
  broadcastsCleared: 'All broadcasts deleted',
  // ── errors ─────────────────────────────────────────────────────────────────
  notFound: { message: 'Notification not found', code: 'NOTIFICATION_NOT_FOUND' },
  broadcastNotFound: { message: 'Broadcast not found', code: 'BROADCAST_NOT_FOUND' },
} as const;
