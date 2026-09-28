import type { AddressParts } from './address.types';
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
  addressParts: AddressParts;
  password: string;
  confirmPassword: string;
  /** FR-009: language of the code email (i18n.resolvedLanguage). */
  language?: string;
  /** FR-009: honeypot, always empty from a person. */
  website?: string;
  /** FR-009: the token from an earlier submit of the same address in this tab, so that sign-up is corrected. */
  signupToken?: string;
};

/** FR-009: register and resend answer with this — no account exists yet. */
export type SignupStartedType = {
  email: string;
  codeExpiresInSeconds: number;
  resendAvailableInSeconds: number;
  /** Only this browser holds it; verify and resend send it back. */
  signupToken: string;
};

export type SignupVerifyInput = {
  email: string;
  code: string;
  signupToken: string;
};

export type ResetPasswordInput = {
  token: string;
  newPassword: string;
  confirmPassword: string;
};

export type UpdateProfileInput = {
  fullName: string;
  phone: string;
  /** Required for customers and farmers; an admin may leave it out to keep the address on file. */
  addressParts?: AddressParts;
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
 * `mfaRequired = true`, `accessToken = null`, send `mfaToken` with the code to POST /auth/mfa/verify. In that answer
 * `user` only carries `email`: the rest of the profile comes with the session, after the code.
 */
export type LoginResultType = Omit<AuthResultType, 'accessToken'> & {
  accessToken: string | null;
  mfaRequired?: boolean;
  mfaToken?: string | null;
  mfaSetupRequired?: boolean;
};

/** Send `code` (6 digits) or `recoveryCode` (xxxx-xxxx-xxxx). */
export type MfaVerifyInput = {
  mfaToken: string;
  code?: string;
  recoveryCode?: string;
};

export type MfaStatusType = {
  enabled: boolean;
  setupRequired?: boolean;
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

/**
 * FR-008: turning two-step verification on signs out every earlier session, this one included; the new access token
 * comes back here (the refresh cookie is replaced too).
 */
export type MfaEnabledType = MfaRecoveryCodesType & {
  accessToken: string;
};
