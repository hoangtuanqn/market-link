import type { AddressParts } from './address.types';
import type { RoleType, UserType } from './user.types';

export type LoginInput = {
  email: string;
  password: string;
  rememberMe?: boolean;
  requiredRole?: RoleType;
};

export type RegisterInput = {
  fullName: string;
  phone: string;
  email: string;
  addressParts: AddressParts;
  password: string;
  confirmPassword: string;
  language?: string;
  website?: string;
  signupToken?: string;
};

export type SignupStartedType = {
  email: string;
  codeExpiresInSeconds: number;
  resendAvailableInSeconds: number;
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

export type AuthResultType = {
  accessToken: string;
  user: UserType;
};

export type LoginResultType = Omit<AuthResultType, 'accessToken'> & {
  accessToken: string | null;
  mfaRequired?: boolean;
  mfaToken?: string | null;
  mfaSetupRequired?: boolean;
};

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

export type MfaSetupType = {
  secret: string;
  otpauthUri: string;
};

export type MfaRecoveryCodesType = {
  codes: string[];
};

export type MfaEnabledType = MfaRecoveryCodesType & {
  accessToken: string;
};
