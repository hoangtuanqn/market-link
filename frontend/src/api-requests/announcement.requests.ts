import type { ApiResponse, PageType } from '@/types/api.types';
import type { Announcement, AnnouncementInput } from '@/types/notification.types';
import { privateApi } from '@/utils/axiosInstance';

class AnnouncementApi {
  static live = async () => {
    const response = await privateApi.get<ApiResponse<Announcement | null>>('/announcements/active');
    return response.data;
  };

  static adminList = async (page = 1, size = 20) => {
    const response = await privateApi.get<ApiResponse<PageType<Announcement>>>('/admin/announcements', {
      params: { page, size },
    });
    return response.data;
  };

  static create = async (input: AnnouncementInput) => {
    const response = await privateApi.post<ApiResponse<Announcement>>('/admin/announcements', input);
    return response.data;
  };

  static takeDown = async (id: number) => {
    const response = await privateApi.delete<ApiResponse<null>>(`/admin/announcements/${id}`);
    return response.data;
  };
}

export default AnnouncementApi;
