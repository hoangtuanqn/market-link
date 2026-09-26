import type { ApiResponse } from '@/types/api.types';
import type { FarmerApplicationInput, FarmerProfileType, UploadedFileType } from '@/types/farmer.types';
import { privateApi } from '@/utils/axiosInstance';

/** FR-002 (second route) — a signed-in customer applies to become a Farmer. */
class FarmerApi {
  static apply = async (input: FarmerApplicationInput) => {
    const response = await privateApi.post<ApiResponse<FarmerProfileType>>('/farmer/apply', input);
    return response.data;
  };

  /** `data: null` if the account never applied — not an error. */
  static myApplication = async () => {
    const response = await privateApi.get<ApiResponse<FarmerProfileType | null>>('/farmer/apply');
    return response.data;
  };

  /** Withdraw the application while it is still pending; after that the account can apply again from scratch. */
  static withdraw = async () => {
    const response = await privateApi.delete<ApiResponse<null>>('/farmer/apply');
    return response.data;
  };

  /** Attached images/videos, uploaded before submitting the main form (docs/prototype/customer/become-farmer.html). */
  static uploadFile = async (file: File, kind: 'photo' | 'video') => {
    const form = new FormData();
    form.append('file', file);
    const response = await privateApi.post<ApiResponse<UploadedFileType>>('/farmer/apply/uploads', form, {
      params: { kind },
      // Drop the default application/json header so the browser sets multipart/form-data with the boundary itself.
      headers: { 'Content-Type': undefined },
    });
    return response.data;
  };
}

export default FarmerApi;
