import type { ChatParticipant } from '@/types/chat.types';

/** Khách nhắn cho một sạp: hiện tên stall; người kia là khách thì hiện tên người. */
export const displayName = (p: ChatParticipant) => p.stallName ?? p.fullName;
