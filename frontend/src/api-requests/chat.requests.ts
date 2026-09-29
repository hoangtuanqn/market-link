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
  /** `order` comes from the Farmer tools (get_my_orders, get_cutoff_status) and links to the farmer order page. */
  type: 'product' | 'market' | 'farmer' | 'order';
  id: number;
  title: string;
  subtitle: string | null;
};
/**
 * FR-093, FR-094: an action the assistant suggests. Nothing has happened yet — pressing the button calls the ordinary
 * endpoint for that action, which checks the role, the ownership and the state transition again.
 */
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
/** FR-093: the Farmer Overview banner. Counted on the server; the sentence is built from i18n here. */
export type FarmerBriefingDto = {
  marketsToday: string[];
  ordersToday: number;
  waitingToBeAccepted: number;
  cutoffAlreadyPassed: number;
  soldOutProducts: number;
  lowStockProducts: number;
};
export type ChatMessageDto = { role: 'user' | 'bot'; message: string; intent: string | null; createdAt: string };

/**
 * `privateApi` when signed in so the backend can filter history by user, `publicApi` for a guest (client-made session
 * key).
 */
const api = () => (Session.getRawUser() ? privateApi : publicApi);

/**
 * Where the person is while they ask, so "this order" resolves. Shaped values only, no names and no descriptions: the
 * server rejects anything else, because this is the one part of the prompt the client fills in.
 */
export type PageContextDto = {
  /** The route pattern; left out on the home page, whose pattern is empty. */
  page?: string;
  recordType?: string;
  recordRef?: string;
  /** The cart as it stands in the browser. There is no cart table, so this is the only way the assistant can see it. */
  cart?: { productId: number; quantity: number }[];
};

/** FR-090…092 — intent → prepared SQL on the server (R-04); the session key is a client-made UUID. */
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
