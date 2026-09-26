import type { ApiResponse, PageType } from '@/types/api.types';
import type { ChatAttachment, ChatMessageItem, ConversationSummary } from '@/types/chat.types';
import { privateApi } from '@/utils/axiosInstance';

type SendBody = {
  kind?: 'text' | 'image';
  body?: string;
  productId?: number;
  orderId?: number;
  attachmentId?: number;
};

/** FR-110…115 — chat người–người (docs/api-contract.md §12). */
class ConversationApi {
  static list = async (params: { page: number; size: number }) => {
    const response = await privateApi.get<ApiResponse<PageType<ConversationSummary>>>('/conversations', {
      params,
    });
    return response.data;
  };

  /** Idempotent: đã có thread với người này thì trả lại cái cũ. */
  static open = async (farmerUserId: number) => {
    const response = await privateApi.post<ApiResponse<ConversationSummary>>('/conversations', {
      farmerUserId,
    });
    return response.data;
  };

  /** Phân trang keyset: `before` là id tin cũ nhất đang có; API trả mới → cũ. */
  static messages = async (id: number, params: { before?: number; size: number }) => {
    const response = await privateApi.get<ApiResponse<ChatMessageItem[]>>(`/conversations/${id}/messages`, {
      params,
    });
    return response.data;
  };

  static send = async (id: number, body: SendBody) => {
    const response = await privateApi.post<ApiResponse<ChatMessageItem>>(`/conversations/${id}/messages`, body);
    return response.data;
  };

  static markRead = async (id: number) => {
    const response = await privateApi.post<ApiResponse<null>>(`/conversations/${id}/read`);
    return response.data;
  };

  static unreadCount = async () => {
    const response = await privateApi.get<ApiResponse<{ count: number }>>('/conversations/unread-count');
    return response.data;
  };

  /** Field name phải là `file` — backend đọc @RequestParam MultipartFile file. */
  static uploadPhoto = async (file: File) => {
    const form = new FormData();
    form.append('file', file);
    const response = await privateApi.post<ApiResponse<ChatAttachment>>('/attachments', form);
    return response.data;
  };

  /**
   * JWT đi ở header `Authorization`, không ở cookie, nên `<img src="/api/v1/attachments/5">` trả 401. Phải tải bằng
   * axios rồi bọc thành blob URL — và người gọi phải revoke lúc rời màn.
   */
  static photoBlob = async (attachmentId: number) => {
    const response = await privateApi.get<Blob>(`/attachments/${attachmentId}`, { responseType: 'blob' });
    return URL.createObjectURL(response.data);
  };
}

export default ConversationApi;
