import type { ApiResponse } from '@/types/api.types';
import type { FarmerApplicationInput, FarmerProfileType, UploadedFileType } from '@/types/farmer.types';
import { privateApi } from '@/utils/axiosInstance';

class FarmerApi {
  static apply = async (input: FarmerApplicationInput) => {
    const response = await privateApi.post<ApiResponse<FarmerProfileType>>('/farmer/apply', input);
    return response.data;
  };

  static myApplication = async () => {
    const response = await privateApi.get<ApiResponse<FarmerProfileType | null>>('/farmer/apply');
    return response.data;
  };

  static withdraw = async () => {
    const response = await privateApi.delete<ApiResponse<null>>('/farmer/apply');
    return response.data;
  };

  static uploadFile = async (file: File, kind: 'photo' | 'video') => {
    const form = new FormData();
    form.append('file', file);
    const response = await privateApi.post<ApiResponse<UploadedFileType>>('/farmer/apply/uploads', form, {
      params: { kind },
      headers: { 'Content-Type': undefined },
      timeout: 0,
    });
    return response.data;
  };
}

export default FarmerApi;
