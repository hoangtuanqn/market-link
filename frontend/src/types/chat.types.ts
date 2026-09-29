export type ChatParticipant = {
  userId: number;
  fullName: string;
  role: string;
  image: string | null;
  online: boolean;
  lastSeenAt: string | null;
  farmerId?: number;
  stallName?: string;
};

export type ConversationSummary = {
  id: number;
  other: ChatParticipant;
  lastMessageText: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  createdAt: string;
  otherReadAt?: string;
};

export type ChatAttachment = {
  attachmentId: number;
  url: string;
  mime: string;
  width?: number | null;
  height?: number | null;
};

export type StreamUrl = { url: string; expiresAt: string };

export type ChatMessageItem = {
  id: number;
  conversationId: number;
  senderId: number;
  kind: 'text' | 'image' | 'video';
  body?: string;
  productId?: number | null;
  orderId?: number | null;
  attachment?: ChatAttachment;
  createdAt: string;
};

export type ConversationEventFrame = {
  type: 'updated' | 'read' | 'hidden';
  conversationId: number;
  messageId?: number;
  lastMessageText?: string;
  lastMessageAt?: string;
  unreadCount?: number;
  readerId?: number;
  readAt?: string;
};

export type TypingFrame = { conversationId: number; userId: number; typing: boolean };
export type PresenceFrame = { userId: number; online: boolean; lastSeenAt: string | null };

export type ReportReason = 'spam' | 'abuse' | 'scam' | 'other';
export type ReportStatus = 'new' | 'reviewed' | 'actioned';

export type ReportListItem = {
  reportId: number;
  messageId: number;
  conversationId: number;
  reason: ReportReason;
  note?: string;
  status: ReportStatus;
  reporterName: string;
  senderName: string;
  preview?: string;
  reportedAt: string;
};

export type ModeratedMessage = {
  id: number;
  senderId: number;
  senderName: string;
  kind: 'text' | 'image' | 'video';
  body?: string;
  hasPhoto: boolean;
  hasVideo: boolean;
  attachmentId?: number;
  reported: boolean;
  hidden: boolean;
  createdAt: string;
};

export type ReportDetail = Omit<ReportListItem, 'senderName' | 'preview'> & { context: ModeratedMessage[] };
