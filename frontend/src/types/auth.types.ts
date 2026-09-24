import type { UserType } from './user.types';

export type LoginInput = {
  email: string;
  password: string;
};

export type RegisterInput = {
  fullName: string;
  phone: string;
  email: string;
  address: string;
  password: string;
  confirmPassword: string;
};

export type SocialProvider = 'google' | 'facebook';

/** Same shape for login, register and refresh: the refresh token itself travels in an HttpOnly cookie. */
export type AuthResultType = {
  accessToken: string;
  user: UserType;
};
