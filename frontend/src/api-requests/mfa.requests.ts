import type { ApiResponse } from '@/types/api.types';
import type { MfaRecoveryCodesType, MfaSetupType, MfaStatusType } from '@/types/auth.types';
import { privateApi } from '@/utils/axiosInstance';

/** FR-008: an admin turns two-step verification on / off for themself (the backend only allows the admin role). */
class MfaApi {
  static status = async () => {
    const response = await privateApi.get<ApiResponse<MfaStatusType>>('/auth/mfa');
    return response.data;
  };

  /** A new key, not on until the first code is confirmed. */
  static setup = async () => {
    const response = await privateApi.post<ApiResponse<MfaSetupType>>('/auth/mfa/setup');
    return response.data;
  };

  /** Returns 10 recovery codes, only once. */
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
