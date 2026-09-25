import type { ApiResponse } from '@/types/api.types';
import type { UserType } from '@/types/user.types';
import type {
  AuthResultType,
  AuthorizeUrlType,
  ChangePasswordInput,
  LoginInput,
  LoginResultType,
  MfaVerifyInput,
  RegisterInput,
  ResetPasswordInput,
  ResetTokenType,
  SetPasswordInput,
  UpdateProfileInput,
  SocialProvider,
} from '@/types/auth.types';
import { privateApi, publicApi } from '@/utils/axiosInstance';

class AuthApi {
  /** Trả nguyên response chung { success, message, data } để hiển thị đúng message của backend. */
  static login = async (input: LoginInput) => {
    const response = await publicApi.post<ApiResponse<LoginResultType>>('/auth/login', input);
    return response.data;
  };

  /** FR-008: bước 2 của đăng nhập admin; mã đúng thì backend cấp accessToken + cookie refresh như login thường. */
  static verifyMfa = async (input: MfaVerifyInput) => {
    const response = await publicApi.post<ApiResponse<AuthResultType>>('/auth/mfa/verify', input);
    return response.data;
  };

  /** FR-001. Trả nguyên response chung; thành công thì backend đăng nhập luôn (accessToken + cookie refresh). */
  static register = async (input: RegisterInput) => {
    const response = await publicApi.post<ApiResponse<AuthResultType>>('/auth/register', input);
    return response.data;
  };

  /** URL trang đăng nhập Google (client_id, redirect_uri lấy từ backend); `state` do FE sinh để chống CSRF. */
  static googleAuthorizeUrl = async (state: string) => {
    const response = await publicApi.get<ApiResponse<AuthorizeUrlType>>('/auth/google/authorize-url', {
      params: { state },
    });
    return response.data;
  };

  /** `code` là authorization code Google trả về redirect_uri của frontend. */
  static loginWithSocial = async (provider: SocialProvider, code: string) => {
    const response = await publicApi.post<ApiResponse<LoginResultType>>(`/auth/${provider}`, { code });
    return response.data;
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

  /** Đặt mật khẩu lần đầu cho tài khoản tạo qua Google (cần đăng nhập). */
  static setPassword = async (input: SetPasswordInput) => {
    const response = await privateApi.post<ApiResponse<null>>('/auth/set-password', input);
    return response.data;
  };

  /** Refresh token nằm trong cookie HttpOnly, không gửi qua body. */
  static refreshToken = async () => {
    const response = await publicApi.post<ApiResponse<AuthResultType>>('/auth/refresh');
    return response.data.data;
  };

  /** Hồ sơ của chính user đang đăng nhập (trang Account). */
  static getMe = async () => {
    const response = await privateApi.get<ApiResponse<UserType>>('/auth/me');
    return response.data;
  };

  /** Sửa họ tên, số điện thoại, địa chỉ; email không đổi được. */
  static updateMe = async (input: UpdateProfileInput) => {
    const response = await privateApi.put<ApiResponse<UserType>>('/auth/me', input);
    return response.data;
  };

  /** Đổi mật khẩu; thành công thì backend đăng xuất mọi thiết bị (kể cả phiên này). */
  static changePassword = async (input: ChangePasswordInput) => {
    const response = await privateApi.post<ApiResponse<null>>('/auth/change-password', input);
    return response.data;
  };

  static logout = async () => {
    const response = await privateApi.post<ApiResponse<null>>('/auth/logout');
    return response.data;
  };
}
export default AuthApi;
