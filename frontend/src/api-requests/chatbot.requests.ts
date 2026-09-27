import type { ApiResponse } from '@/types/api.types';
import { privateApi } from '@/utils/axiosInstance';

/** One result card under a reply; `id` opens /products/:id, /markets/:id or /stalls/:id. */
export type ChatbotResult = {
  type: 'product' | 'market' | 'farmer';
  id: number;
  title: string;
  subtitle: string | null;
};

export type ChatbotReply = {
  reply: string;
  /** FR-092 intent, e.g. FIND_PRODUCT; UNKNOWN when no lookup was needed. */
  intent: string;
  results: ChatbotResult[];
};

export type ChatbotHistoryItem = {
  role: 'user' | 'bot';
  message: string;
  /** Stored intent: an enum name, or "AI:<tools>" when Claude answered (e.g. "AI:search_products"). */
  intent: string | null;
  createdAt: string;
};

/**
 * FR-090…092 — the assistant (docs/api-contract.md §11). Sent through privateApi so a signed-in customer's token goes
 * along: the server then lets Claude answer and attaches the history to the account.
 */
class ChatbotApi {
  static send = async (sessionKey: string, message: string) => {
    const response = await privateApi.post<ApiResponse<ChatbotReply>>('/chat', { sessionKey, message });
    return response.data;
  };

  static history = async (sessionKey: string) => {
    const response = await privateApi.get<ApiResponse<ChatbotHistoryItem[]>>('/chat/history', {
      params: { sessionKey },
    });
    return response.data;
  };
}

export default ChatbotApi;
