import type { ChatParticipant } from '@/types/chat.types';

export const displayName = (p: ChatParticipant) => p.stallName ?? p.fullName;
