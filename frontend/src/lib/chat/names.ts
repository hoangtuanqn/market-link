import type { ChatParticipant } from '@/types/chat.types';

/** A customer messages a stall: show the stall's name; when the other person is the customer, show their name. */
export const displayName = (p: ChatParticipant) => p.stallName ?? p.fullName;
