import type { ApiResponse } from '@/types/api.types';
import type {
  AuthResultType,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  ResetTokenType,
  SocialProvider,
} from '@/types/auth.types';
import { privateApi, publicApi } from '@/utils/axiosInstance';

class AuthApi {
  /** Trả nguyên response chung { success, message, data } để hiển thị đúng message của backend. */
  static login = async (input: LoginInput) => {
    const response = await publicApi.post<ApiResponse<AuthResultType>>('/auth/login', input);
    return response.data;
  };

  static register = async (input: RegisterInput) => {
    const response = await publicApi.post<ApiResponse<AuthResultType>>('/auth/register', input);
    return response.data.data;
  };

  /** `code` là authorization code Google/Facebook trả về redirect_uri của frontend. */
  static loginWithSocial = async (provider: SocialProvider, code: string) => {
    const response = await publicApi.post<ApiResponse<AuthResultType>>(`/auth/${provider}`, { code });
    return response.data.data;
  };

  /** FR-007: luôn trả cùng một message dù email có tồn tại hay không. */
  static verifyResetToken = async (token: string) => {
    const response = await publicApi.post<ApiResponse<ResetTokenType>>('/auth/reset-password/verify', { token });
    return response.data;
  };

  static resetPassword = async (input: ResetPasswordInput) => {
    const response = await publicApi.post<ApiResponse<null>>('/auth/reset-password', input);
    return response.data;
  };

  static forgotPassword = async (email: string) => {
    const response = await publicApi.post<ApiResponse<null>>('/auth/forgot-password', { email });
    return response.data;
  };

  /** Refresh token nằm trong cookie HttpOnly, không gửi qua body. */
  static refreshToken = async () => {
    const response = await publicApi.post<ApiResponse<AuthResultType>>('/auth/refresh');
    return response.data.data;
  };

  static logout = async () => {
    const response = await privateApi.post<ApiResponse<null>>('/auth/logout');
    return response.data;
  };
}
export default AuthApi;
