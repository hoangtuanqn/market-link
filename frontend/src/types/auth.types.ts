import type { UserType } from './user.types';

export type LoginInput = {
  email: string;
  password: string;
  /** False: phiên kết thúc khi đóng trình duyệt (cookie refresh dạng phiên). */
  rememberMe?: boolean;
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

export type SetPasswordInput = {
  password: string;
  confirmPassword: string;
};

export type ResetTokenType = {
  email: string;
};

export type SocialProvider = 'google' | 'facebook';

export type AuthorizeUrlType = {
  url: string;
};

/** Same shape for login, register and refresh: the refresh token itself travels in an HttpOnly cookie. */
export type AuthResultType = {
  accessToken: string;
  user: UserType;
};
