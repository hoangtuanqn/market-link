import type { RoleType, UserType } from './user.types';

export type LoginInput = {
  email: string;
  password: string;
  /** False: phiên kết thúc khi đóng trình duyệt (cookie refresh dạng phiên). */
  rememberMe?: boolean;
  /** FR-004: trang admin gửi 'admin'; sai role thì backend trả 403 ROLE_NOT_ALLOWED và không cấp token / cookie. */
  requiredRole?: RoleType;
};

export type RegisterInput = {
  fullName: string;
  phone: string;
  email: string;
  address: string;
  password: string;
  confirmPassword: string;
};

export type ResetPasswordInput = {
  token: string;
  newPassword: string;
  confirmPassword: string;
};

export type UpdateProfileInput = {
  fullName: string;
  phone: string;
  address: string;
};

export type ChangePasswordInput = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export type SetPasswordInput = {
  password: string;
  confirmPassword: string;
};

export type ResetTokenType = {
  email: string;
};

export type SocialProvider = 'google';

export type AuthorizeUrlType = {
  url: string;
};

/** Same shape for login, register and refresh: the refresh token itself travels in an HttpOnly cookie. */
export type AuthResultType = {
  accessToken: string;
  user: UserType;
};

/**
 * FR-008: admin đã bật xác thực hai bước → login (và đăng nhập Google) chưa cấp phiên: `mfaRequired = true`,
 * `accessToken = null`, gửi `mfaToken` kèm mã tới POST /auth/mfa/verify.
 */
export type LoginResultType = Omit<AuthResultType, 'accessToken'> & {
  accessToken: string | null;
  mfaRequired?: boolean;
  mfaToken?: string | null;
};

/** Gửi `code` (6 số) hoặc `recoveryCode` (xxxx-xxxx-xxxx). */
export type MfaVerifyInput = {
  mfaToken: string;
  code?: string;
  recoveryCode?: string;
};

export type MfaStatusType = {
  enabled: boolean;
  recoveryCodesLeft: number;
};

/** `otpauthUri` chứa khoá bí mật: QR vẽ ngay trong trình duyệt, không gửi cho dịch vụ bên ngoài. */
export type MfaSetupType = {
  secret: string;
  otpauthUri: string;
};

export type MfaRecoveryCodesType = {
  codes: string[];
};
