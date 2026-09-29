import type { ApiResponse } from '@/types/api.types';
import type { MfaEnabledType, MfaRecoveryCodesType, MfaSetupType, MfaStatusType } from '@/types/auth.types';
import { privateApi } from '@/utils/axiosInstance';

class MfaApi {
  static status = async () => {
    const response = await privateApi.get<ApiResponse<MfaStatusType>>('/auth/mfa');
    return response.data;
  };

  static setup = async () => {
    const response = await privateApi.post<ApiResponse<MfaSetupType>>('/auth/mfa/setup');
    return response.data;
  };

  static enable = async (code: string) => {
    const response = await privateApi.post<ApiResponse<MfaEnabledType>>('/auth/mfa/enable', { code });
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
