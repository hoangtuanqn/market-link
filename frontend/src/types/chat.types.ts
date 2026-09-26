/**
 * Person-to-person chat (FR-110…115). Not to be confused with the FR-090 chatbot at /api/v1/chat.
 *
 * Field names match the backend exactly (modules/conversation/resources/*.java), never guessed: ParticipantResource
 * uses `userId`, not `id`.
 */

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
  width: number | null;
  height: number | null;
};

export type ChatMessageItem = {
  id: number;
  conversationId: number;
  senderId: number;
  kind: 'text' | 'image';
  body?: string;
  productId?: number | null;
  orderId?: number | null;
  attachment?: ChatAttachment;
  createdAt: string;
};

/**
 * /user/topic/conversations. "hidden" belongs to Plan 4B (an admin hiding a message); declared now so the switch branch
 * is not missing it, but 4A does not handle it yet.
 */
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

/** /user/topic/typing and /user/topic/presence. */
export type TypingFrame = { conversationId: number; userId: number; typing: boolean };
export type PresenceFrame = { userId: number; online: boolean; lastSeenAt: string | null };

export type ReportReason = 'spam' | 'abuse' | 'scam' | 'other';
export type ReportStatus = 'new' | 'reviewed' | 'actioned';

/** The admin's queue (AdminReportListItemResource). */
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

/** One message in the context window (spec §8.3: the reported message + up to 5 messages on each side). */
export type ModeratedMessage = {
  id: number;
  senderId: number;
  senderName: string;
  kind: 'text' | 'image';
  body?: string;
  hasPhoto: boolean;
  attachmentId?: number;
  reported: boolean;
  hidden: boolean;
  createdAt: string;
};

export type ReportDetail = Omit<ReportListItem, 'senderName' | 'preview'> & { context: ModeratedMessage[] };
