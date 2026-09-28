import type { ApiResponse, PageType } from '@/types/api.types';
import type { ChatAttachment, ChatMessageItem, ConversationSummary, ReportReason, StreamUrl } from '@/types/chat.types';
import { privateApi } from '@/utils/axiosInstance';

type SendBody = {
  kind?: 'text' | 'image' | 'video';
  body?: string;
  productId?: number;
  orderId?: number;
  attachmentId?: number;
};

/** FR-110…115 — person-to-person chat (docs/api-contract.md §12). */
class ConversationApi {
  static list = async (params: { page: number; size: number }) => {
    const response = await privateApi.get<ApiResponse<PageType<ConversationSummary>>>('/conversations', {
      params,
    });
    return response.data;
  };

  /** Idempotent: if a thread with this person already exists, it is returned as is. */
  static open = async (farmerId: number) => {
    const response = await privateApi.post<ApiResponse<ConversationSummary>>('/conversations', {
      farmerId,
    });
    return response.data;
  };

  /** Keyset pagination: `before` is the id of the oldest message currently held; the API returns newest → oldest. */
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

  /**
   * A photo or a video up to 50 MB (FR-115). The field name must be `file` — the backend reads @RequestParam
   * MultipartFile file. No timeout: the instance's 10 s would cut off any video on a phone connection; the person can
   * cancel through `signal` instead.
   */
  static uploadMedia = async (
    file: File,
    { onProgress, signal }: { onProgress?: (percent: number) => void; signal?: AbortSignal } = {},
  ) => {
    const form = new FormData();
    form.append('file', file);
    const response = await privateApi.post<ApiResponse<ChatAttachment>>('/attachments', form, {
      // Drop the default application/json header: with it axios sends the FormData as JSON ("{"file":{}}") instead of
      // multipart/form-data, and the server never sees a file. The browser sets the multipart boundary itself.
      headers: { 'Content-Type': undefined },
      timeout: 0,
      signal,
      onUploadProgress: (event) => {
        if (onProgress && event.total) onProgress(Math.round((event.loaded / event.total) * 100));
      },
    });
    return response.data;
  };

  /**
   * FR-115: a `<video>` cannot send the Authorization header either, so it plays from a signed link that expires after
   * five minutes. The url is relative to the API origin.
   */
  static streamUrl = async (attachmentId: number) => {
    const response = await privateApi.get<ApiResponse<StreamUrl>>(`/attachments/${attachmentId}/stream-url`);
    return response.data;
  };

  /**
   * The JWT travels in the `Authorization` header, not a cookie, so `<img src="/api/v1/attachments/5">` returns 401. It
   * must be loaded with axios and wrapped as a blob URL — and the caller must revoke it on leaving the screen.
   */
  static photoBlob = async (attachmentId: number) => {
    const response = await privateApi.get<Blob>(`/attachments/${attachmentId}`, { responseType: 'blob' });
    return URL.createObjectURL(response.data);
  };

  /** FR-116. Reporting the same message twice → 409 (uq_report_once). */
  static report = async (messageId: number, body: { reason: ReportReason; note?: string }) => {
    const response = await privateApi.post<ApiResponse<unknown>>(`/messages/${messageId}/report`, body);
    return response.data;
  };
}

export default ConversationApi;
