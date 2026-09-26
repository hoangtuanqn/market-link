import type { ApiResponse } from '@/types/api.types';
import type { FarmerApplicationInput, FarmerProfileType, UploadedFileType } from '@/types/farmer.types';
import { privateApi } from '@/utils/axiosInstance';

/** FR-002 (second route) — customer đang đăng nhập xin thành Farmer. */
class FarmerApi {
  static apply = async (input: FarmerApplicationInput) => {
    const response = await privateApi.post<ApiResponse<FarmerProfileType>>('/farmer/apply', input);
    return response.data;
  };

  /** `data: null` nếu tài khoản chưa từng nộp đơn — không phải lỗi. */
  static myApplication = async () => {
    const response = await privateApi.get<ApiResponse<FarmerProfileType | null>>('/farmer/apply');
    return response.data;
  };

  /** Rút đơn khi còn đang chờ duyệt; sau đó tài khoản nộp lại từ đầu được. */
  static withdraw = async () => {
    const response = await privateApi.delete<ApiResponse<null>>('/farmer/apply');
    return response.data;
  };

  /** Ảnh/video đính kèm, tải lên trước khi gửi form chính (docs/prototype/customer/become-farmer.html). */
  static uploadFile = async (file: File, kind: 'photo' | 'video') => {
    const form = new FormData();
    form.append('file', file);
    const response = await privateApi.post<ApiResponse<UploadedFileType>>('/farmer/apply/uploads', form, {
      params: { kind },
      // Bỏ header mặc định application/json để trình duyệt tự set multipart/form-data kèm boundary.
      headers: { 'Content-Type': undefined },
    });
    return response.data;
  };
}

export default FarmerApi;
