import type { RoleType, UserType } from './user.types';

export type LoginInput = {
  email: string;
  password: string;
  /** False: the session ends when the browser closes (a session refresh cookie). */
  rememberMe?: boolean;
  /**
   * FR-004: the admin page sends 'admin'; a wrong role makes the backend return 403 ROLE_NOT_ALLOWED and issue no token
   * / cookie.
   */
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
 * FR-008: an admin with two-step verification on → login (and Google sign-in) does not issue a session yet:
 * `mfaRequired = true`, `accessToken = null`, send `mfaToken` with the code to POST /auth/mfa/verify.
 */
export type LoginResultType = Omit<AuthResultType, 'accessToken'> & {
  accessToken: string | null;
  mfaRequired?: boolean;
  mfaToken?: string | null;
};

/** Send `code` (6 digits) or `recoveryCode` (xxxx-xxxx-xxxx). */
export type MfaVerifyInput = {
  mfaToken: string;
  code?: string;
  recoveryCode?: string;
};

export type MfaStatusType = {
  enabled: boolean;
  recoveryCodesLeft: number;
};

/** `otpauthUri` contains the secret key: the QR is drawn in the browser, not sent to an outside service. */
export type MfaSetupType = {
  secret: string;
  otpauthUri: string;
};

export type MfaRecoveryCodesType = {
  codes: string[];
};
