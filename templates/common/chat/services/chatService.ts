import { CHAT_ENDPOINTS } from '../chatEndpoints';
import type { ChatMessage, Conversation } from '../types/chat';

export const DUMMY_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv_1',
    title: 'Sarah Jenkins',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    unreadCount: 2,
    updatedAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    participants: [
      { id: 'usr_sarah', name: 'Sarah Jenkins', isOnline: true },
    ],
    lastMessage: {
      id: 'msg_10',
      conversationId: 'conv_1',
      senderId: 'usr_sarah',
      senderName: 'Sarah Jenkins',
      type: 'text',
      text: 'Hey! Did you check out the new design specs?',
      createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
      status: 'delivered',
      isMe: false,
    },
  },
  {
    id: 'conv_2',
    title: 'Mobile Dev Team',
    avatar: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150',
    isGroup: true,
    unreadCount: 0,
    updatedAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    participants: [
      { id: 'usr_alex', name: 'Alex' },
      { id: 'usr_dev', name: 'Dev Team' },
    ],
    lastMessage: {
      id: 'msg_9',
      conversationId: 'conv_2',
      senderId: 'usr_alex',
      senderName: 'Alex',
      type: 'image',
      text: 'Here is the app demo preview screenshot',
      mediaUrl: 'https://images.unsplash.com/photo-1551650975-87deedd944c3?w=600',
      createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
      status: 'read',
      isMe: false,
    },
  },
  {
    id: 'conv_3',
    title: 'Michael Scott',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    unreadCount: 0,
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    participants: [
      { id: 'usr_michael', name: 'Michael Scott', isOnline: false },
    ],
    lastMessage: {
      id: 'msg_8',
      conversationId: 'conv_3',
      senderId: 'me',
      senderName: 'Me',
      type: 'audio',
      mediaUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
      duration: 15,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      status: 'read',
      isMe: true,
    },
  },
];

export const DUMMY_MESSAGES: Record<string, ChatMessage[]> = {
  conv_1: [
    {
      id: 'msg_1',
      conversationId: 'conv_1',
      senderId: 'usr_sarah',
      senderName: 'Sarah Jenkins',
      type: 'text',
      text: 'Hi there! Welcome to the new React Native app chat!',
      createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      status: 'read',
      isMe: false,
    },
    {
      id: 'msg_2',
      conversationId: 'conv_1',
      senderId: 'me',
      senderName: 'Me',
      type: 'text',
      text: 'Awesome! It supports real-time sockets and media messaging!',
      createdAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
      status: 'read',
      isMe: true,
    },
    {
      id: 'msg_3',
      conversationId: 'conv_1',
      senderId: 'usr_sarah',
      senderName: 'Sarah Jenkins',
      type: 'image',
      text: 'Take a look at this high-res preview:',
      mediaUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800',
      createdAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
      status: 'read',
      isMe: false,
    },
    {
      id: 'msg_4',
      conversationId: 'conv_1',
      senderId: 'me',
      senderName: 'Me',
      type: 'video',
      text: 'Check this promo sample video',
      mediaUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      thumbnailUrl: 'https://images.unsplash.com/photo-1536240478700-b869070f9279?w=600',
      duration: 15,
      createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      status: 'read',
      isMe: true,
    },
    {
      id: 'msg_5',
      conversationId: 'conv_1',
      senderId: 'usr_sarah',
      senderName: 'Sarah Jenkins',
      type: 'audio',
      mediaUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
      duration: 24,
      createdAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
      status: 'read',
      isMe: false,
    },
    {
      id: 'msg_6',
      conversationId: 'conv_1',
      senderId: 'me',
      senderName: 'Me',
      type: 'document',
      fileName: 'Architecture_Documentation.pdf',
      fileSize: '2.4 MB',
      mediaUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      createdAt: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
      status: 'read',
      isMe: true,
    },
    {
      id: 'msg_10',
      conversationId: 'conv_1',
      senderId: 'usr_sarah',
      senderName: 'Sarah Jenkins',
      type: 'text',
      text: 'Hey! Did you check out the new design specs?',
      createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
      status: 'delivered',
      isMe: false,
    },
  ],
};

export const chatService = {
  async fetchConversations(): Promise<Conversation[]> {
    // Replace with apiClient.get(CHAT_ENDPOINTS.GET_CONVERSATIONS)
    await new Promise(res => setTimeout(() => res(true), 400));
    return DUMMY_CONVERSATIONS;
  },

  async fetchMessages(conversationId: string): Promise<ChatMessage[]> {
    // Replace with apiClient.get(CHAT_ENDPOINTS.GET_MESSAGES(conversationId))
    await new Promise(res => setTimeout(() => res(true), 300));
    return DUMMY_MESSAGES[conversationId] || [];
  },

  async sendMessage(conversationId: string, message: Partial<ChatMessage>): Promise<ChatMessage> {
    // Replace with apiClient.post(CHAT_ENDPOINTS.SEND_MESSAGE(conversationId), message)
    await new Promise(res => setTimeout(() => res(true), 200));
    const newMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      conversationId,
      senderId: 'me',
      senderName: 'Me',
      type: message.type || 'text',
      text: message.text,
      mediaUrl: message.mediaUrl,
      thumbnailUrl: message.thumbnailUrl,
      fileName: message.fileName,
      fileSize: message.fileSize,
      duration: message.duration,
      createdAt: new Date().toISOString(),
      status: 'sent',
      isMe: true,
    };
    return newMessage;
  },
};
