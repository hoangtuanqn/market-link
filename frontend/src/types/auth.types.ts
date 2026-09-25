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
