import type { ApiResponse, PageType } from '@/types/api.types';
import type { NotificationItem, NotificationPreferences } from '@/types/notification.types';
import { privateApi } from '@/utils/axiosInstance';

/** FR-042 — notifications of the signed-in user (docs/api-contract.md §9). */
class NotificationApi {
  static list = async (params: { isRead?: boolean; page: number; size: number }) => {
    const response = await privateApi.get<ApiResponse<PageType<NotificationItem>>>('/notifications', { params });
    return response.data;
  };

  static unreadCount = async () => {
    const response = await privateApi.get<ApiResponse<{ count: number }>>('/notifications/unread-count');
    return response.data;
  };

  static read = async (id: number) => {
    const response = await privateApi.patch<ApiResponse<null>>(`/notifications/${id}/read`);
    return response.data;
  };

  static readAll = async () => {
    const response = await privateApi.patch<ApiResponse<{ updated: number }>>('/notifications/read-all');
    return response.data;
  };

  static getPreferences = async () => {
    const response = await privateApi.get<ApiResponse<NotificationPreferences>>('/notifications/preferences');
    return response.data;
  };

  static savePreferences = async (preferences: NotificationPreferences) => {
    const response = await privateApi.put<ApiResponse<NotificationPreferences>>(
      '/notifications/preferences',
      preferences,
    );
    return response.data;
  };

  /** N3 — the server's public VAPID key; null when the server has not enabled Web Push. */
  static pushPublicKey = async () => {
    const response = await privateApi.get<ApiResponse<{ publicKey: string | null }>>('/notifications/push/public-key');
    return response.data;
  };

  static subscribePush = async (subscription: PushSubscriptionJSON) => {
    const response = await privateApi.post<ApiResponse<null>>('/notifications/push-subscriptions', {
      endpoint: subscription.endpoint,
      keys: subscription.keys,
    });
    return response.data;
  };

  static unsubscribePush = async (endpoint: string) => {
    const response = await privateApi.delete<ApiResponse<null>>('/notifications/push-subscriptions', {
      data: { endpoint },
    });
    return response.data;
  };

  static sendTest = async () => {
    const response = await privateApi.post<ApiResponse<null>>('/notifications/test');
    return response.data;
  };
}

export default NotificationApi;
