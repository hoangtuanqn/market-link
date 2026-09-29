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

class ConversationApi {
  static list = async (params: { page: number; size: number }) => {
    const response = await privateApi.get<ApiResponse<PageType<ConversationSummary>>>('/conversations', {
      params,
    });
    return response.data;
  };

  static open = async (farmerId: number) => {
    const response = await privateApi.post<ApiResponse<ConversationSummary>>('/conversations', {
      farmerId,
    });
    return response.data;
  };

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

  static uploadMedia = async (
    file: File,
    { onProgress, signal }: { onProgress?: (percent: number) => void; signal?: AbortSignal } = {},
  ) => {
    const form = new FormData();
    form.append('file', file);
    const response = await privateApi.post<ApiResponse<ChatAttachment>>('/attachments', form, {
      headers: { 'Content-Type': undefined },
      timeout: 0,
      signal,
      onUploadProgress: (event) => {
        if (onProgress && event.total) onProgress(Math.round((event.loaded / event.total) * 100));
      },
    });
    return response.data;
  };

  static streamUrl = async (attachmentId: number) => {
    const response = await privateApi.get<ApiResponse<StreamUrl>>(`/attachments/${attachmentId}/stream-url`);
    return response.data;
  };

  static photoBlob = async (attachmentId: number) => {
    const response = await privateApi.get<Blob>(`/attachments/${attachmentId}`, { responseType: 'blob', timeout: 0 });
    return URL.createObjectURL(response.data);
  };

  static report = async (messageId: number, body: { reason: ReportReason; note?: string }) => {
    const response = await privateApi.post<ApiResponse<unknown>>(`/messages/${messageId}/report`, body);
    return response.data;
  };
}

export default ConversationApi;
