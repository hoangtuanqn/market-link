/**
 * Chat người–người (FR-110…115). Không nhầm với chatbot FR-090 ở /api/v1/chat.
 *
 * Tên trường lấy đúng theo backend (modules/conversation/resources/*.java), không đoán: ParticipantResource dùng
 * `userId` chứ không phải `id`.
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
 * /user/topic/conversations. "hidden" là của Plan 4B (admin ẩn một tin); khai sẵn để nhánh switch không thiếu, nhưng 4A
 * chưa xử lý nó.
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

/** /user/topic/typing và /user/topic/presence. */
export type TypingFrame = { conversationId: number; userId: number; typing: boolean };
export type PresenceFrame = { userId: number; online: boolean; lastSeenAt: string | null };

export type ReportReason = 'spam' | 'abuse' | 'scam' | 'other';
export type ReportStatus = 'new' | 'reviewed' | 'actioned';

/** Hàng đợi của admin (AdminReportListItemResource). */
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

/** Một tin trong cửa sổ ngữ cảnh (spec §8.3: tin bị báo + tối đa 5 tin mỗi bên). */
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
