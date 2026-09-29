import type { ApiResponse } from '@/types/api.types';
import { privateApi, publicApi } from '@/utils/axiosInstance';
import Session from '@/utils/session';

export type ChatIntent =
  | 'GREETING'
  | 'HELP'
  | 'FIND_PRODUCT'
  | 'PRODUCT_DETAIL'
  | 'MARKET_HOURS'
  | 'FARMER_AVAILABILITY'
  | 'PICKUP_WINDOW'
  | 'UNKNOWN';
export type ChatResultDto = {
  type: 'product' | 'market' | 'farmer' | 'order';
  id: number;
  title: string;
  subtitle: string | null;
};
export type ProposedActionDto = {
  action:
    | 'accept_order'
    | 'decline_order'
    | 'ready_order'
    | 'complete_order'
    | 'approve_farmer'
    | 'reject_farmer'
    | 'suspend_farmer';
  id: number;
  label: string;
  detail: string;
};
export type ChatReplyDto = {
  reply: string;
  intent: ChatIntent;
  results: ChatResultDto[];
  actions: ProposedActionDto[];
};
export type FarmerBriefingDto = {
  marketsToday: string[];
  ordersToday: number;
  waitingToBeAccepted: number;
  cutoffAlreadyPassed: number;
  soldOutProducts: number;
  lowStockProducts: number;
};
export type ChatMessageDto = { role: 'user' | 'bot'; message: string; intent: string | null; createdAt: string };

const api = () => (Session.getRawUser() ? privateApi : publicApi);

export type PageContextDto = {
  page?: string;
  recordType?: string;
  recordRef?: string;
  cart?: { productId: number; quantity: number }[];
};

class ChatApi {
  static ask = async (sessionKey: string, message: string, context?: PageContextDto) => {
    const response = await api().post<ApiResponse<ChatReplyDto>>('/chat', { sessionKey, message, context });
    return response.data.data;
  };
  static farmerBriefing = async () => {
    const response = await privateApi.get<ApiResponse<FarmerBriefingDto>>('/chat/farmer-briefing');
    return response.data.data;
  };
  static history = async (sessionKey: string) => {
    const response = await api().get<ApiResponse<ChatMessageDto[]>>('/chat/history', { params: { sessionKey } });
    return response.data.data;
  };
}
export default ChatApi;
