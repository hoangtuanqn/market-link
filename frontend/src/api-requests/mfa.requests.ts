import type { ApiResponse } from '@/types/api.types';
import type { MfaRecoveryCodesType, MfaSetupType, MfaStatusType } from '@/types/auth.types';
import { privateApi } from '@/utils/axiosInstance';

/** FR-008: admin bật / tắt xác thực hai bước cho chính mình (backend chỉ cho role admin). */
class MfaApi {
  static status = async () => {
    const response = await privateApi.get<ApiResponse<MfaStatusType>>('/auth/mfa');
    return response.data;
  };

  /** Khoá mới, chưa bật tới khi xác nhận mã đầu tiên. */
  static setup = async () => {
    const response = await privateApi.post<ApiResponse<MfaSetupType>>('/auth/mfa/setup');
    return response.data;
  };

  /** Trả 10 mã khôi phục, chỉ một lần. */
  static enable = async (code: string) => {
    const response = await privateApi.post<ApiResponse<MfaRecoveryCodesType>>('/auth/mfa/enable', { code });
    return response.data;
  };

  static disable = async (code: string) => {
    const response = await privateApi.post<ApiResponse<null>>('/auth/mfa/disable', { code });
    return response.data;
  };

  static regenerateRecoveryCodes = async (code: string) => {
    const response = await privateApi.post<ApiResponse<MfaRecoveryCodesType>>('/auth/mfa/recovery-codes', { code });
    return response.data;
  };
}

export default MfaApi;
