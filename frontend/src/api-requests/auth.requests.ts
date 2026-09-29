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
  SignupStartedType,
  SignupVerifyInput,
  UpdateProfileInput,
  SocialProvider,
} from '@/types/auth.types';
import { privateApi, publicApi } from '@/utils/axiosInstance';

class AuthApi {
  static login = async (input: LoginInput) => {
    const response = await publicApi.post<ApiResponse<LoginResultType>>('/auth/login', input);
    return response.data;
  };

  static verifyMfa = async (input: MfaVerifyInput) => {
    const response = await publicApi.post<ApiResponse<AuthResultType>>('/auth/mfa/verify', input);
    return response.data;
  };

  static register = async (input: RegisterInput) => {
    const response = await publicApi.post<ApiResponse<SignupStartedType>>('/auth/register', input);
    return response.data;
  };

  static verifySignup = async (input: SignupVerifyInput) => {
    const response = await publicApi.post<ApiResponse<AuthResultType>>('/auth/register/verify', input);
    return response.data;
  };

  static resendSignupCode = async (email: string, signupToken: string) => {
    const response = await publicApi.post<ApiResponse<SignupStartedType>>('/auth/register/resend', {
      email,
      signupToken,
    });
    return response.data;
  };

  static googleAuthorizeUrl = async (state: string) => {
    const response = await publicApi.get<ApiResponse<AuthorizeUrlType>>('/auth/google/authorize-url', {
      params: { state },
    });
    return response.data;
  };

  static loginWithSocial = async (provider: SocialProvider, code: string) => {
    const response = await publicApi.post<ApiResponse<LoginResultType>>(`/auth/${provider}`, { code });
    return response.data;
  };

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

  static setPassword = async (input: SetPasswordInput) => {
    const response = await privateApi.post<ApiResponse<null>>('/auth/set-password', input);
    return response.data;
  };

  static refreshToken = async () => {
    const response = await publicApi.post<ApiResponse<AuthResultType>>('/auth/refresh');
    return response.data.data;
  };

  static getMe = async () => {
    const response = await privateApi.get<ApiResponse<UserType>>('/auth/me');
    return response.data;
  };

  static updateMe = async (input: UpdateProfileInput) => {
    const response = await privateApi.put<ApiResponse<UserType>>('/auth/me', input);
    return response.data;
  };

  static uploadAvatar = async (photo: Blob) => {
    const form = new FormData();
    form.append('file', photo, 'avatar.jpg');
    const response = await privateApi.put<ApiResponse<UserType>>('/auth/me/avatar', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 30000,
    });
    return response.data;
  };

  static removeAvatar = async () => {
    const response = await privateApi.delete<ApiResponse<UserType>>('/auth/me/avatar');
    return response.data;
  };

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
